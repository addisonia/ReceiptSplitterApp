// src/screens/Chat.tsx
import React, { useState, useEffect, useRef, memo, useCallback } // Added memo and useCallback
from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StatusBar,
  Modal,
  Dimensions,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { auth, database } from "../firebase";
import { User, onAuthStateChanged } from "firebase/auth";
import { ref, onValue, push, set, remove, get, child } from "firebase/database";
import ChatSkeleton from "../components/ChatSkeleton";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../types/RootStackParams";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Icon from "react-native-vector-icons/Feather";
import { useTheme } from "../context/ThemeContext";
import { colors } from "../components/ColorThemes";
import * as Clipboard from "expo-clipboard";

import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

type ChatNavProp = NativeStackNavigationProp<RootStackParamList, "Chat">;

interface FirebaseMessageData {
  senderName?: string;
  text?: string;
  timestamp?: number;
  senderUid?: string;
  type?: string;
  receiptData?: any;
}

interface Message {
  key: string;
  senderName: string;
  text: string;
  timestamp: number;
  senderUid?: string;
  type?: string;
  receiptData?: any;
}

interface GroupChatData {
  id: string;
  name: string;
  creator: string;
  participants: Record<string, boolean>;
}

type ReceiptData = {
  name: string;
  items: ItemType[];
  buyers: BuyerType[];
  tax: number;
  time_and_date: string;
};

type ItemType = {
  item: string;
  price: number;
  quantity: number;
  buyers: BuyerType[];
};

type BuyerType = {
  name: string;
  selected: boolean[];
};

// Normalizing functions (unchanged)
function normalizeBuyer(rawBuyer: any): BuyerType {
  if (typeof rawBuyer === "string") {
    return { name: rawBuyer, selected: [] };
  }
  if (rawBuyer && typeof rawBuyer === "object") {
    let realName = "";
    if (typeof rawBuyer.name === "string") {
      realName = rawBuyer.name;
    } else {
      realName = JSON.stringify(rawBuyer.name ?? "???");
    }
    const sel = Array.isArray(rawBuyer.selected)
      ? rawBuyer.selected.filter((val: any) => typeof val === "boolean")
      : [];
    return { name: realName, selected: sel };
  }
  return { name: "UnknownBuyer", selected: [] };
}

function normalizeItem(rawItem: any): ItemType {
  let iName = "";
  if (typeof rawItem.item === "string") {
    iName = rawItem.item;
  } else if (rawItem.item && typeof rawItem.item === "object") {
    iName = JSON.stringify(rawItem.item);
  } else {
    iName = "Unnamed";
  }
  const priceNum =
    typeof rawItem.price === "number" && !isNaN(rawItem.price)
      ? rawItem.price
      : 0;
  const qty =
    typeof rawItem.quantity === "number" && rawItem.quantity > 0
      ? rawItem.quantity
      : 1;

  let itemBuyers: BuyerType[] = [];
  if (Array.isArray(rawItem.buyers)) {
    itemBuyers = rawItem.buyers.map(normalizeBuyer);
  } else if (Array.isArray(rawItem.selectedBy)) {
    itemBuyers = rawItem.selectedBy.map((nameStr: string) => ({
      name: nameStr,
      selected: Array(qty).fill(true),
    }));
  }

  return {
    item: iName,
    price: priceNum,
    quantity: qty,
    buyers: itemBuyers,
  };
}

function normalizeReceiptData(receiptKey: string, rawData: any): ReceiptData {
  const t =
    typeof rawData.time_and_date === "string" ? rawData.time_and_date : "";
  let topBuyers: BuyerType[] = [];
  if (Array.isArray(rawData.buyers)) {
    topBuyers = rawData.buyers.map(normalizeBuyer);
  }

  const rawItems = Array.isArray(rawData.items) ? rawData.items : [];
  const items: ItemType[] = rawItems.map(normalizeItem);

  let theTax = 0;
  if (typeof rawData.tax === "number" && !isNaN(rawData.tax)) {
    theTax = rawData.tax;
  }

  return {
    name: receiptKey,
    items,
    buyers: topBuyers,
    tax: theTax,
    time_and_date: t,
  };
}

async function scheduleLocalNotification(messageText: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "New Group Chat Message",
      body: messageText,
    },
    trigger: null, // Sends immediately
  });
}

const Chat = () => {
  const { theme, mode } = useTheme();
  const navigation = useNavigation<ChatNavProp>();

  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [initialLoad, setInitialLoad] = useState(true);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState("global");
  const [groupChatsMap, setGroupChatsMap] = useState<
    Record<string, GroupChatData>
  >({});
  const [groupChatArray, setGroupChatArray] = useState<GroupChatData[]>([]);

  const [newMessageText, setNewMessageText] = useState("");
  const [expandedMessages, setExpandedMessages] = useState<
    Record<string, boolean>
  >({});

  const [lastGlobalSendTime, setLastGlobalSendTime] = useState<number>(0);
  const [lastGroupSendTime, setLastGroupSendTime] = useState<number>(0);

  const [myFriends, setMyFriends] = useState<Record<string, string>>({});
  const [outgoingRequests, setOutgoingRequests] = useState<Set<string>>(
    new Set()
  );

  const [popupVisible, setPopupVisible] = useState(false);
  const [popupX, setPopupX] = useState(0);
  const [popupY, setPopupY] = useState(0);
  const [popupTargetUid, setPopupTargetUid] = useState<string | null>(null);
  const [popupTargetName, setPopupTargetName] = useState<string | null>(null);
  const [isTargetFriend, setIsTargetFriend] = useState(false);
  const [longPressedMessage, setLongPressedMessage] = useState<Message | null>(
    null
  );

  const [participantUsernames, setParticipantUsernames] = useState<string[]>(
    []
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);

  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportAdditionalInfo, setReportAdditionalInfo] = useState("");
  const [reportConfirmation, setReportConfirmation] = useState<string | null>(
    null
  );

  const userColors = [
    "#c177d9", "#77d997", "#d97777", "#d9d177", "#77b7d9",
    "#a477d9", "#d9a477", "#9afbfc", "#ff9a76", "#baff66",
    "#ff66dc", "#66ffed", "#ffee66", "#ff6666", "#66c7ff",
    "#d966ff", "#ffb266", "#66ff8c", "#ff66a3", "#c4ff66",
  ];

  const [assignedColors, setAssignedColors] = useState<{
    [name: string]: string;
  }>({});

  const titleBarTextColor =
    mode === "yuck" || mode === "dark" || mode === "random"
      ? "#ffffff"
      : "#000";

  useEffect(() => {
    (async () => {
      if (Constants.isDevice) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("No notification permissions granted.");
        }
      }
    })();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsSignedIn(true);
        fetchChatUsernameFromDB(currentUser.uid);

        const friendsRef = ref(database, `users/${currentUser.uid}/friends`);
        onValue(friendsRef, (snap) => {
          const data = snap.val() || {};
          setMyFriends(data);
        });

        const outRef = ref(database, `outgoingRequests/${currentUser.uid}`);
        onValue(outRef, (snap) => {
          if (!snap.exists()) {
            setOutgoingRequests(new Set());
          } else {
            setOutgoingRequests(new Set(Object.keys(snap.val())));
          }
        });

        loadUserGroups(currentUser.uid);
      } else {
        setIsSignedIn(false);
        setUsername("Guest");
        // Clear user-specific data on sign out
        setMyFriends({});
        setOutgoingRequests(new Set());
        setGroupChatsMap({});
        setGroupChatArray([]);
        setMessages([]); // Clear messages
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const fetchChatUsernameFromDB = (uid: string) => {
    const usernameRef = ref(database, `users/${uid}/username`);
    onValue(usernameRef, (snapshot) => {
      const dbUsername = snapshot.val();
      if (dbUsername) {
        setUsername(dbUsername);
      } else {
        setUsername("Loading..."); // Or handle as anonymous/guest if no username
      }
    }, (error) => {
      console.error("Error fetching username:", error);
      setUsername("Error");
    });
  };

  const loadUserGroups = (uid: string) => {
    const userGroupsRef = ref(database, `users/${uid}/groups`);
    onValue(userGroupsRef, (snapshot) => {
      const groupIdsObj = snapshot.val() || {};
      const groupIds = Object.keys(groupIdsObj);
      const newMap: Record<string, GroupChatData> = {};
      let groupsProcessed = 0;

      if (groupIds.length === 0) {
        setGroupChatsMap({});
        setGroupChatArray([]);
        return;
      }

      groupIds.forEach((gid) => {
        const singleGroupRef = ref(database, `groupChats/${gid}`);
        // Use get() for one-time fetch or ensure onValue detaches properly
        onValue(singleGroupRef, (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            const groupData: GroupChatData = {
              id: gid,
              name: val.name,
              creator: val.creator,
              participants: val.participants || {},
            };
            newMap[gid] = groupData;
          }
          groupsProcessed++;
          if (groupsProcessed === groupIds.length) {
            // This logic ensures we update state only after all groups are processed
            // It's a bit complex with nested onValue, consider simplifying if possible
            setGroupChatsMap((prevMap) => {
              const merged = { ...prevMap, ...newMap };
              // Clean up groups that the user is no longer part of
              Object.keys(merged).forEach(key => {
                if (!groupIds.includes(key)) {
                  delete merged[key];
                }
              });
              setGroupChatArray(Object.values(merged));
              return merged;
            });
          }
        }, { onlyOnce: true }); // Fetch group details once or manage listeners carefully
      });
    }, (error) => {
      console.error("Error loading user groups:", error);
    });
  };

  useEffect(() => {
    if (!isSignedIn) {
      setMessages([]); // Clear messages if not signed in
      return;
    }
    
    let messagesRefPath: string;
    if (selectedChat === "global") {
      // OPTIMIZATION: If global chat messages are under a single flat node, adjust this path.
      // Example: messagesRefPath = "global_chat_messages";
      // For now, assuming the existing structure:
      messagesRefPath = "chat/messages"; 
    } else {
      messagesRefPath = `groupChats/${selectedChat}/messages`;
    }

    const currentMessagesRef = ref(database, messagesRefPath);
    const unsubscribe = onValue(currentMessagesRef, (snapshot) => {
      const data = snapshot.val();
      const messagesArray: Message[] = [];

      if (data) {
        if (selectedChat === "global") {
          // Original global chat processing
          Object.entries(data).forEach(([_, userMessages]) => {
            if (typeof userMessages === "object" && userMessages !== null) {
              Object.entries(userMessages).forEach(([msgId, raw]) => {
                const msgData = raw as FirebaseMessageData;
                messagesArray.push({
                  key: msgId,
                  senderName: msgData.senderName ?? "",
                  text: msgData.text ?? "",
                  timestamp: msgData.timestamp ?? 0,
                  senderUid: msgData.senderUid,
                  type: msgData.type ?? "text",
                  receiptData: msgData.receiptData,
                });
              });
            }
          });
        } else {
          // Group chat processing (already flat)
          Object.entries(data).forEach(([msgId, raw]) => {
            const msgData = raw as FirebaseMessageData;
            messagesArray.push({
              key: msgId,
              senderName: msgData.senderName ?? "",
              text: msgData.text ?? "",
              timestamp: msgData.timestamp ?? 0,
              senderUid: msgData.senderUid,
              type: msgData.type ?? "text",
              receiptData: msgData.receiptData,
            });
          });
        }
        messagesArray.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(messagesArray);
      } else {
        setMessages([]);
      }
      setInitialLoad(false); // Moved here to ensure it's set after first data load or no data
    }, (error) => {
      console.error(`Error fetching messages for ${selectedChat}:`, error);
      setMessages([]);
      setInitialLoad(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isSignedIn, selectedChat]);


  useEffect(() => {
    if (selectedChat === "global") {
      setParticipantUsernames([]);
      return;
    }
    const groupData = groupChatsMap[selectedChat];
    if (!groupData || !groupData.participants) {
      setParticipantUsernames([]);
      return;
    }
    const participantUids = Object.keys(groupData.participants);
    const promises = participantUids.map(async (uid) => {
      try {
        const snap = await get(child(ref(database), `users/${uid}/username`));
        return snap.exists() ? snap.val() : "Unknown";
      } catch (error) {
        console.error(`Error fetching username for UID ${uid}:`, error);
        return "Error";
      }
    });
    Promise.all(promises).then((names) => {
      setParticipantUsernames(names.filter(name => name !== "Error"));
    });
  }, [selectedChat, groupChatsMap]);

  useEffect(() => {
    const uniqueNames = Array.from(new Set(messages.map((m) => m.senderName)));
    const newAssignedColors = { ...assignedColors };
    let colorIndex = Object.keys(newAssignedColors).length % userColors.length; // Start from a new index if needed

    uniqueNames.forEach((name) => {
      if (!newAssignedColors[name]) {
        newAssignedColors[name] = userColors[colorIndex];
        colorIndex = (colorIndex + 1) % userColors.length;
      }
    });
    // Only update if there's an actual change to prevent unnecessary re-renders
    if (JSON.stringify(newAssignedColors) !== JSON.stringify(assignedColors)) {
        setAssignedColors(newAssignedColors);
    }
  }, [messages]); // Removed assignedColors and userColors from deps as they don't need to trigger this effect directly.

  const handleSendMessage = async () => {
    if (!isSignedIn) {
      setCooldownMessage("Sign in to send messages.");
      setTimeout(() => setCooldownMessage(null), 2000);
      return;
    }
    if (!user || !username || username === "Loading...") {
      setCooldownMessage("Waiting for username. Try again soon.");
      setTimeout(() => setCooldownMessage(null), 2000);
      return;
    }
    if (!newMessageText.trim()) return;

    const currentTime = Date.now();
    const isGlobalChat = selectedChat === "global";
    const lastSendTime = isGlobalChat ? lastGlobalSendTime : lastGroupSendTime;
    const cooldown = isGlobalChat ? 5000 : 1000; // 5s for global, 1s for group

    if (currentTime - lastSendTime < cooldown) {
      const remainingTime = Math.ceil(
        (cooldown - (currentTime - lastSendTime)) / 1000
      );
      setCooldownMessage(
        `Please wait ${remainingTime} second${
          remainingTime > 1 ? "s" : ""
        } before sending again.`
      );
      setTimeout(() => setCooldownMessage(null), 2000);
      return;
    }
    
    const messagePayload = {
      text: newMessageText.trim(),
      senderName: username,
      timestamp: currentTime,
      senderUid: user.uid, // user is guaranteed to be non-null here
      type: "text", // Default type
    };

    try {
      if (isGlobalChat) {
        // IMPORTANT: For global chat, if you change to a flat structure like 'global_chat_messages',
        // this path needs to change. E.g., ref(database, 'global_chat_messages')
        // The current structure `chat/messages/${username}` stores messages under the sender's username in global.
        const messagesRef = ref(database, `chat/messages/${username}`); 
        const newMessageRef = push(messagesRef);
        await set(newMessageRef, messagePayload);
        setLastGlobalSendTime(currentTime);
        await scheduleLocalNotification(`New message in Global Chat from ${username}`);
      } else {
        const groupMessagesRef = ref(
          database,
          `groupChats/${selectedChat}/messages`
        );
        const newGroupMsgRef = push(groupMessagesRef);
        await set(newGroupMsgRef, messagePayload);
        setLastGroupSendTime(currentTime);
        await scheduleLocalNotification(
          `New group message in ${groupChatsMap[selectedChat]?.name ?? "Group"} from ${username}`
        );
      }
      setNewMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Could not send message. Please try again.");
    }
  };

  // OPTIMIZATION: Wrap handleBubblePress in useCallback
  const handleBubblePress = useCallback((msgKey: string) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [msgKey]: !prev[msgKey],
    }));
  }, []); // setExpandedMessages has a stable identity

  // OPTIMIZATION: Wrap handleBubbleLongPress in useCallback
  const handleBubbleLongPress = useCallback((
    isCurrentUserMessage: boolean,
    targetUid: string | undefined,
    targetName: string | undefined,
    pageX: number,
    pageY: number,
    messageItem: Message
  ) => {
    if (isCurrentUserMessage || !targetUid || !targetName) return;
    const friendUids = Object.keys(myFriends);
    setIsTargetFriend(friendUids.includes(targetUid));
    setLongPressedMessage(messageItem);
    setPopupTargetUid(targetUid);
    setPopupTargetName(targetName);

    const screenHeight = Dimensions.get("window").height;
    const inputAreaHeight = 70; 
    const popupHeight = selectedChat === "global" ? 200 : (messageItem.type === "receipt" ? 150 : 200) ; // Adjusted for receipt popup

    const adjustedY = Math.min(
      pageY,
      screenHeight - inputAreaHeight - popupHeight - 10 
    );

    setPopupX(pageX);
    setPopupY(adjustedY);
    setPopupVisible(true);
  }, [myFriends, selectedChat]); // Dependencies for useCallback

  const handleCopyMessage = async () => {
    if (!longPressedMessage) return;
    try {
      await Clipboard.setStringAsync(longPressedMessage.text || "");
      Alert.alert("Copied", "Message content copied to clipboard.");
    } catch (e) {
      Alert.alert("Error", "Could not copy message.");
    }
    setPopupVisible(false);
  };

  const handleAddFriend = async () => {
    if (!popupTargetUid || !user || !username ) return;
    if (outgoingRequests.has(popupTargetUid)) {
      Alert.alert("Request Pending",`Waiting on response from ${popupTargetName || 'user'}.`);
      setPopupVisible(false);
      return;
    }
    const myUid = user.uid;
    // const usernameSnap = await get(ref(database, `users/${myUid}/username`)); // username is already in state
    // let localName = "Unknown";
    // if (usernameSnap.exists()) {
    //   localName = usernameSnap.val();
    // }
    const frRef = ref(database, `friendRequests/${popupTargetUid}`);
    const newReqRef = push(frRef);
    try {
      await set(newReqRef, {
        fromUid: myUid,
        fromUsername: username, // Use state username
      });
      await set(
        ref(database, `outgoingRequests/${myUid}/${popupTargetUid}`),
        true
      );
      setPopupVisible(false);
      Alert.alert("Friend request sent", `Sent to ${popupTargetName || 'user'}.`);
    } catch (error) {
        console.error("Error sending friend request:", error);
        Alert.alert("Error", "Could not send friend request.");
    }
  };

  const confirmRemoveFriend = () => {
    if (!popupTargetUid || !popupTargetName || !user) return;
    Alert.alert(
      "Remove Friend",
      `Are you sure you want to remove ${popupTargetName}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setPopupVisible(false),
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => doRemoveFriend(popupTargetUid),
        },
      ]
    );
  };

  const doRemoveFriend = async (friendUid: string) => {
    if (!user) return;
    setPopupVisible(false);
    const myUid = user.uid;
    try {
      await remove(ref(database, `users/${myUid}/friends/${friendUid}`));
      await remove(ref(database, `users/${friendUid}/friends/${myUid}`));
      await remove(ref(database, `outgoingRequests/${myUid}/${friendUid}`));
      await remove(ref(database, `outgoingRequests/${friendUid}/${myUid}`));
      Alert.alert("Friend Removed", `${popupTargetName || 'User'} has been removed from your friends.`);
    } catch (error) {
        console.error("Error removing friend:", error);
        Alert.alert("Error", "Could not remove friend.");
    }
  };

  const handleMessage = () => {
    if (!popupTargetUid || !popupTargetName) return;
    setPopupVisible(false);
    navigation.navigate("DM", {
      friendUid: popupTargetUid,
      friendUsername: popupTargetName,
    });
  };

  const handleLeaveGroup = () => {
    if (!user || selectedChat === "global") return;
    Alert.alert("Leave Group", `Are you sure you want to leave ${groupChatsMap[selectedChat]?.name || 'this group'}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            await remove(
              ref(
                database,
                `groupChats/${selectedChat}/participants/${user.uid}`
              )
            );
            await remove(
              ref(database, `users/${user.uid}/groups/${selectedChat}`)
            );
            Alert.alert("Group Left", `You have left ${groupChatsMap[selectedChat]?.name || 'the group'}.`);
            setSelectedChat("global"); // Switch to global chat
          } catch (err) {
            console.error("Error leaving group:", err);
            Alert.alert("Error", "Could not leave group.");
          }
        },
      },
    ]);
  };

  const handleTopRightIconPress = () => {
    if (selectedChat !== "global") {
      handleLeaveGroup();
    } else {
      navigation.navigate("GroupChat");
    }
  };

  const handleUploadReceipt = () => {
    if (!username || selectedChat === "global") return;
    navigation.navigate("UploadReceipt", {
      groupId: selectedChat,
      myUsername: username,
    });
  };

  const handleImportReceipt = async () => {
    if (
      !longPressedMessage ||
      !longPressedMessage.receiptData ||
      !longPressedMessage.senderUid
    ) {
      Alert.alert("Error", "Receipt data is missing.");
      return;
    }
    setPopupVisible(false);

    const receiptName = longPressedMessage.receiptData.name;
    if (!receiptName) {
      Alert.alert("Error", "Receipt name not found in message.");
      return;
    }

    const senderUid = longPressedMessage.senderUid;
    const receiptRef = ref(database, `receipts/${senderUid}/${receiptName}`);

    try {
      const snapshot = await get(receiptRef);
      if (snapshot.exists()) {
        const receiptData = normalizeReceiptData(receiptName, snapshot.val());
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "MainTabs",
              params: {
                screen: "Split", // Assuming 'Split' is a screen in 'MainTabs'
                params: { importedReceipt: receiptData },
              },
            },
          ],
        });
      } else {
        Alert.alert(
          "Error",
          `Receipt "${receiptName}" not found in sender's receipts.`
        );
      }
    } catch (error) {
      console.error("Error fetching receipt:", error);
      Alert.alert("Error", "Failed to import receipt. Please try again.");
    }
  };

  const handleOpenReportModal = () => {
    if (!popupTargetUid || !popupTargetName || !longPressedMessage) {
      Alert.alert("Error", "Cannot report user. Information missing.");
      return;
    }
    setPopupVisible(false); 
    setIsReportModalVisible(true);
  };

  const handleCloseReportModal = () => {
    setIsReportModalVisible(false);
    setReportReason("");
    setReportAdditionalInfo("");
  };

  const handleSubmitReport = async () => {
    if (
      !user ||
      !username ||
      !popupTargetUid ||
      !popupTargetName ||
      !longPressedMessage
    ) {
      Alert.alert("Error", "Could not submit report. Missing information.");
      handleCloseReportModal();
      return;
    }

    if (!reportReason.trim()) {
      Alert.alert("Reason Required", "Please provide a reason for the report.");
      return;
    }

    const reportData = {
      reportedUid: popupTargetUid,
      reportedUsername: popupTargetName,
      reporterUid: user.uid,
      reporterUsername: username,
      reason: reportReason.trim(),
      additionalInfo: reportAdditionalInfo.trim(),
      timestamp: Date.now(),
      messageId: longPressedMessage.key,
      messageText: longPressedMessage.text, 
      chatType: selectedChat === "global" ? "global" : "group",
      chatId: selectedChat, 
    };

    try {
      const reportsRef = ref(database, "userReports");
      const newReportRef = push(reportsRef);
      await set(newReportRef, reportData);

      setReportConfirmation("Report sent successfully.");
      setTimeout(() => setReportConfirmation(null), 3000); 
      handleCloseReportModal();
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
      setReportConfirmation("Failed to send report.");
      setTimeout(() => setReportConfirmation(null), 3000);
    }
  };

  const currentChatName =
    selectedChat === "global"
      ? "Global Chat"
      : groupChatsMap[selectedChat]?.name || "Loading Group...";


  // OPTIMIZATION: Wrap MessageItem with React.memo
  // Note: For memo to be effective, props passed to MessageItem should be stable or primitive.
  // 'item' is an object, so if its reference changes, MessageItem will re-render.
  // However, FlatList's data prop handling combined with keyExtractor should manage this well.
  // The main benefit here is if other props (not present currently) were to cause re-renders.
  const MessageItem = memo(({ item }: { item: Message }) => {
    // Ensure user state is accessed safely, especially during initial loads or sign-out
    const isCurrentUserMessage = user ? item.senderUid === user.uid : false;
    const isExpanded = expandedMessages[item.key] || false;
    // console.log(`Rendering MessageItem: ${item.key}, Sender: ${item.senderName}`); // For debugging re-renders

    if (item.type === "receipt" && item.receiptData) {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleBubblePress(item.key)} // Using memoized handleBubblePress
          onLongPress={(e) => {
            const { pageX, pageY } = e.nativeEvent;
            handleBubbleLongPress( // Using memoized handleBubbleLongPress
              isCurrentUserMessage,
              item.senderUid,
              item.senderName,
              pageX,
              pageY,
              item
            );
          }}
          style={[
            styles.messageBubble,
            styles.receiptBubble,
            { maxWidth: "95%" },
            isCurrentUserMessage
              ? styles.currentUserReceipt
              : styles.otherUserReceipt,
          ]}
        >
          <Text
            style={[
              styles.senderName,
              isCurrentUserMessage
                ? styles.currentUserSenderName
                : { color: assignedColors[item.senderName] || "#fff" }, // Fallback color
            ]}
          >
            {item.senderName} uploaded a receipt
          </Text>
          <Text style={styles.receiptTitle}>
            {item.receiptData.name || "Unnamed Receipt"}
          </Text>
          {isExpanded && (
            <>
              <Text style={styles.receiptDate}>
                Date:{" "}
                {item.receiptData.time_and_date // Corrected from item.receiptData.date
                  ? new Date(item.receiptData.time_and_date).toLocaleString()
                  : "N/A"}
              </Text>
              <Text style={styles.receiptDate}>
                Tax: ${item.receiptData.tax?.toFixed(2) ?? "0.00"}
              </Text>
              <View style={styles.receiptItemsContainer}>
                {Array.isArray(item.receiptData.items) &&
                  item.receiptData.items.map((rItem: any, index: number) => {
                    const price = rItem.price || 0;
                    const qty = rItem.quantity || 1;
                    const itemTotal = price * qty;
                    const filteredBuyers = (rItem.buyers || []).filter(
                      (b: any) =>
                        Array.isArray(b.selected) &&
                        b.selected.some((val: boolean) => val)
                    );
                    const buyerNames = filteredBuyers
                      .map((b: any) => b.name)
                      .join(", ");

                    return (
                      <View key={index} style={styles.receiptItemRow}>
                        <Text style={styles.receiptItemText}>
                          {rItem.item || "Unnamed"} (x{qty}) - $
                          {itemTotal.toFixed(2)}
                        </Text>
                        <Text style={styles.receiptItemBuyers}>
                          Buyers: {buyerNames || "None"}
                        </Text>
                      </View>
                    );
                  })}
              </View>
              <Text style={styles.receiptTimestamp}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
            </>
          )}
        </TouchableOpacity>
      );
    }

    // Regular text message
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleBubblePress(item.key)} // Using memoized handleBubblePress
        onLongPress={(e) => {
          const { pageX, pageY } = e.nativeEvent;
          handleBubbleLongPress( // Using memoized handleBubbleLongPress
            isCurrentUserMessage,
            item.senderUid,
            item.senderName,
            pageX,
            pageY,
            item
          );
        }}
        style={[
          styles.messageBubble,
          { maxWidth: "80%" },
          isCurrentUserMessage
            ? styles.currentUserMessage
            : styles.otherUserMessage,
        ]}
      >
        <Text
          style={[
            styles.senderName,
            isCurrentUserMessage
              ? styles.currentUserSenderName
              : { color: assignedColors[item.senderName] || "#fff" }, // Fallback color
          ]}
        >
          {item.senderName}:
        </Text>
        <Text
          style={[
            styles.messageText,
            isCurrentUserMessage
              ? styles.currentUserText
              : styles.otherUserText,
          ]}
        >
          {item.text}
        </Text>
        {isExpanded && ( // Changed from isExpandedText to isExpanded for consistency
          <Text
            style={
              isCurrentUserMessage ? styles.selfTimestamp : styles.timestamp
            }
          >
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  });
  MessageItem.displayName = 'MessageItem'; // For better debugging

  if (!isSignedIn && initialLoad) { // Show skeleton only on initial load when not signed in
    return (
      <View
        style={[
          styles.signInMessageContainer,
          { backgroundColor: theme.offWhite2 },
        ]}
      >
        <ChatSkeleton />
      </View>
    );
  }
  if (!isSignedIn && !initialLoad) { // If not signed in after initial load, show a sign-in prompt
      return (
          <View style={[styles.container, styles.centeredMessage, { backgroundColor: theme.offWhite2 }]}>
              <Text style={{color: titleBarTextColor, fontSize: 18}}>Please sign in to view chats.</Text>
              {/* Optionally, add a sign-in button here */}
          </View>
      )
  }


  return (
    <View style={[styles.container, { backgroundColor: theme.offWhite2 }]}>
      <StatusBar barStyle={mode === "dark" || mode === "yuck" || mode === "random" ? "light-content" : "dark-content"} />
      {/* Header */}
      <View
        style={[styles.headerContainer, { backgroundColor: theme.offWhite2 }]}
      >
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <FontAwesome
            name="users" // Consider a more profile-like icon, e.g., 'user-circle'
            size={26}
            color={theme.yellow}
            style={styles.icon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerTitleWrapper}
          onPress={() => setDropdownOpen(true)}
        >
          <Text style={[styles.headerText, { color: titleBarTextColor }]}>
            {currentChatName}
          </Text>
          <FontAwesome
            name="chevron-down"
            size={16}
            color={theme.yellow}
            style={{ marginLeft: 5 }}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleTopRightIconPress}>
          {selectedChat !== "global" ? (
            <FontAwesome
              name="minus-circle" // More indicative for "leave group"
              size={26}
              color="red"
              style={styles.icon}
            />
          ) : (
            <FontAwesome
              name="plus-circle" // More indicative for "create group"
              size={26}
              color={theme.yellow}
              style={styles.icon}
            />
          )}
        </TouchableOpacity>
      </View>

      {selectedChat !== "global" && participantUsernames.length > 0 && (
        <View style={styles.participantList}>
          <Text style={styles.participantText} numberOfLines={1} ellipsizeMode="tail">
            {participantUsernames.join(", ")}
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => <MessageItem item={item} />}
        keyExtractor={(item) => `${selectedChat}-${item.key}`} // Key should be unique per item
        contentContainerStyle={styles.messagesContainer}
        onScroll={(e) => {
          const { contentOffset, layoutMeasurement, contentSize } =
            e.nativeEvent;
          // A common threshold to show scroll to bottom button is when user is not near the bottom.
          const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - layoutMeasurement.height / 2; // e.g. half screen from bottom
          setShowScrollDown(!isNearBottom && contentSize.height > layoutMeasurement.height); // Only show if scrollable
        }}
        scrollEventThrottle={150} // Adjusted throttle
        onContentSizeChange={() => {
          // Scroll to end only if user was already near the bottom or it's an initial load of messages
          if (!showScrollDown && flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }}
        // OPTIMIZATION: Add FlatList performance props
        initialNumToRender={15} // Render 15 items initially
        maxToRenderPerBatch={10} // Render 10 items per batch during scroll
        windowSize={10} // Virtualization window size (items above/below viewport)
        // For getItemLayout, you need to know the height of your items.
        // If heights are variable, this is harder. If they are mostly fixed, it helps a lot.
        // Example (if all items were, say, 70 pixels high):
        // getItemLayout={(data, index) => (
        //   {length: 70, offset: 70 * index, index}
        // )}
        ListEmptyComponent={
            !initialLoad && messages.length === 0 ? ( // Show only after initial load attempt and if messages are empty
                <View style={styles.centeredMessage}>
                    <Text style={{color: titleBarTextColor, fontSize: 16}}>No messages yet. Start the conversation!</Text>
                </View>
            ) : null
        }
      />

      {showScrollDown && (
        <TouchableOpacity
          style={styles.scrollToBottomButton}
          onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
        >
          <FontAwesome name="chevron-down" size={22} color="#FFF" />
        </TouchableOpacity>
      )}

      {(cooldownMessage || reportConfirmation) && (
        <View style={styles.cooldownPopup}>
          <Text style={styles.cooldownText}>
            {cooldownMessage || reportConfirmation}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined} // 'height' can sometimes cause issues
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0} // Adjust as needed
      >
        <View style={styles.inputArea}>
          {selectedChat !== "global" && (
            <TouchableOpacity
              onPress={handleUploadReceipt}
              style={styles.receiptIcon}
            >
              <FontAwesome name="file-text-o" size={24} color={theme.yellow} />
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#ccc"
            value={newMessageText}
            onChangeText={setNewMessageText}
            onSubmitEditing={handleSendMessage} // Usually for hardware keyboards
            returnKeyType="send"
            blurOnSubmit={false} // Keep keyboard open after send if desired, or true to close
            // multiline // If you want multiline input
          />
          <Pressable style={styles.sendButton} onPress={handleSendMessage} disabled={!newMessageText.trim()}>
            <Text style={styles.sendButtonText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Popup modal for message actions */}
      <Modal visible={popupVisible} transparent animationType="fade" onRequestClose={() => setPopupVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setPopupVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        {popupVisible && longPressedMessage && ( // Ensure longPressedMessage is not null
          <Animated.View // Consider removing Animated.View if not using animations here, or implement them
            style={[
              styles.popupContainer,
              {
                top: popupY,
                left: Math.min(popupX, Dimensions.get("window").width - (styles.popupContainer.width || 180) - 10), // ensure it stays on screen
              },
            ]}
          >
            {longPressedMessage.type !== "receipt" && (
              <>
                <TouchableOpacity
                  onPress={handleCopyMessage}
                  style={styles.popupItem}
                >
                  <View style={styles.popupItemContent}>
                    <Icon name="copy" size={18} color="#fff" style={styles.popupIcon} />
                    <Text style={styles.popupText}>Copy</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.popupDivider} />
              </>
            )}

            {!isTargetFriend ? (
              <TouchableOpacity onPress={handleAddFriend} style={styles.popupItem} >
                <View style={styles.popupItemContent}>
                  <Icon name="user-plus" size={18} color="#fff" style={styles.popupIcon} />
                  <Text style={styles.popupText}>Add Friend</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={confirmRemoveFriend} style={styles.popupItem} >
                <View style={styles.popupItemContent}>
                  <Icon name="user-x" size={18} color="red" style={styles.popupIcon} />
                  <Text style={styles.popupText}>Remove Friend</Text>
                </View>
              </TouchableOpacity>
            )}
            <View style={styles.popupDivider} />
            <TouchableOpacity onPress={handleMessage} style={styles.popupItem}>
              <View style={styles.popupItemContent}>
                <Icon name="message-circle" size={18} color="#fff" style={styles.popupIcon} />
                <Text style={styles.popupText}>Message</Text>
              </View>
            </TouchableOpacity>

            {selectedChat === "global" &&
              popupTargetUid &&
              popupTargetUid !== user?.uid && ( 
                <>
                  <View style={styles.popupDivider} />
                  <TouchableOpacity onPress={handleOpenReportModal} style={styles.popupItem} >
                    <View style={styles.popupItemContent}>
                      <Icon name="alert-triangle" size={18} color={"red"} style={styles.popupIcon} />
                      <Text style={[styles.popupText, { color: "red" }]}>
                        Report User
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            {longPressedMessage.type === "receipt" && (
              <>
                <View style={styles.popupDivider} />
                <TouchableOpacity onPress={handleImportReceipt} style={styles.popupItem} >
                  <View style={styles.popupItemContent}>
                    <Icon name="download-cloud" size={18} color="#fff" style={styles.popupIcon} />
                    <Text style={styles.popupText}>Import Receipt</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        )}
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={isReportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseReportModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.reportModalKeyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        >
          <TouchableWithoutFeedback onPress={handleCloseReportModal}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <View style={styles.reportModalContainer}>
            <Text style={styles.reportModalTitle}>
              Report {popupTargetName || "User"}
            </Text>
            <Text style={styles.reportInputLabel}>
              Why are you reporting this player?
            </Text>
            <TextInput
              style={styles.reportInput}
              placeholder="e.g., Spamming, Harassment, etc."
              placeholderTextColor="#999"
              value={reportReason}
              onChangeText={setReportReason}
              multiline
            />
            <Text style={styles.reportInputLabel}>
              Additional Information (optional):
            </Text>
            <TextInput
              style={[styles.reportInput, styles.reportInputMulti]}
              placeholder="Provide any extra details or context."
              placeholderTextColor="#999"
              value={reportAdditionalInfo}
              onChangeText={setReportAdditionalInfo}
              multiline
              numberOfLines={4}
            />
            <View style={styles.reportActionsContainer}>
              <TouchableOpacity
                style={[styles.reportButton, styles.reportCancelButton]}
                onPress={handleCloseReportModal}
              >
                <Text style={styles.reportButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportButton, styles.reportSubmitButton]}
                onPress={handleSubmitReport}
                disabled={!reportReason.trim()} // Disable if no reason
              >
                <Text style={styles.reportButtonText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Chat Selection Dropdown Modal */}
      <Modal
        transparent
        visible={dropdownOpen}
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDropdownOpen(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.dropdownPanel}>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[styles.dropdownItem, styles.globalChatItem]}
              onPress={() => {
                setSelectedChat("global");
                setDropdownOpen(false);
              }}
            >
              <FontAwesome name="globe" size={16} color={theme.yellow} style={styles.dropdownIcon} />
              <Text style={[styles.dropdownItemText, styles.globalChatText]}>
                Global Chat
              </Text>
            </TouchableOpacity>

            {groupChatArray.length > 0 && <View style={styles.divider} />}

            {groupChatArray.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedChat(g.id);
                  setDropdownOpen(false);
                }}
              >
                <FontAwesome name="users" size={16} color="#fff" style={styles.dropdownIcon} />
                <Text style={styles.dropdownItemText}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Chat;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 15,
    // backgroundColor: 'white', // Set by theme
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Reduced opacity
    shadowRadius: 2,  // Reduced radius
    elevation: 3,     // Reduced elevation
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc', // Softer border
  },
  headerTitleWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  icon: {
    marginHorizontal: 10,
  },
  participantList: {
    backgroundColor: "#193f54", // Consider theme variable
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#0a2f44', // Darker border for contrast
  },
  participantText: {
    color: "#ddd", // Consider theme variable
    fontSize: 12,
  },
  messagesContainer: {
    paddingVertical: 10, // Reduced padding
    paddingHorizontal: 10,
    flexGrow: 1, // Ensure it can grow
  },
  messageBubble: {
    paddingVertical: 8, // Fine-tuned padding
    paddingHorizontal: 12,
    borderRadius: 15, // Slightly more rounded
    marginBottom: 8,
    elevation: 1, // Subtle shadow for bubbles
  },
  currentUserMessage: {
    backgroundColor: colors.yellow, // From theme
    alignSelf: "flex-end",
    borderTopRightRadius: 5, // Differentiates current user bubble
  },
  otherUserMessage: {
    backgroundColor: "#0C3A50", // Consider theme variable
    alignSelf: "flex-start",
    borderTopLeftRadius: 5, // Differentiates other user bubble
  },
  scrollToBottomButton: {
    position: "absolute",
    right: 20,
    bottom: 80, // Ensure it's above input area
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 44,  // Touch target size
    height: 44, // Touch target size
    borderRadius: 22, // Circular
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: 5,
  },
  senderName: {
    fontWeight: "bold",
    marginBottom: 4, // Increased spacing
    fontSize: 13, // Slightly smaller sender name
  },
  currentUserSenderName: {
    color: "black",
  },
  messageText: {
    fontSize: 15, // Slightly smaller message text for more content
    lineHeight: 20, // Improved readability
  },
  currentUserText: {
    color: "black",
  },
  otherUserText: {
    color: "white",
  },
  timestamp: {
    marginTop: 6, // Increased spacing
    fontSize: 11, // Smaller timestamp
    color: "#bbb", // Lighter color
    alignSelf: 'flex-start',
  },
  selfTimestamp: {
    marginTop: 6,
    fontSize: 11,
    color: "#555", // Darker for better contrast on light bubble
    alignSelf: 'flex-end',
  },
  cooldownPopup: {
    position: "absolute",
    bottom: 75, // Ensure above input
    left: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    zIndex: 1000,
    elevation: 6,
  },
  cooldownText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  inputArea: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.yellow, // From theme
    alignItems: "center",
    backgroundColor: '#104050', // Darker background for input area
  },
  receiptIcon: {
    padding: 8, // Increased touch area
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10, // Increased padding
    paddingHorizontal: 15,
    borderRadius: 25, // More rounded
    backgroundColor: "#2a3b4c", // Darker input field
    marginRight: 8,
    // borderColor: colors.yellow, // Border can be subtle
    // borderWidth: 1,
    color: "white",
    fontSize: 16,
  },
  sendButton: {
    paddingVertical: 10,
    paddingHorizontal: 18, // Wider button
    backgroundColor: colors.yellow, // From theme
    borderRadius: 25, // Match input
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
  },
  dropdownPanel: {
    position: "absolute",
    top: Platform.OS === 'ios' ? (Dimensions.get('window').height > 800 ? 90 : 75) : 65, // Adjust based on header height & notch
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20, // Give some space from screen edges
  },
  dropdownContainer: {
    width: "90%", // Max width
    maxWidth: 350, // Cap width on larger screens
    backgroundColor: "#114B68", // Consider theme variable
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14, // Increased padding
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  dropdownItemText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  globalChatItem: {
    backgroundColor: "rgba(243, 210, 90, 0.15)", // Theme color with alpha
    borderRadius: 8,
    marginHorizontal: 8,
  },
  globalChatText: {
    color: colors.yellow, // From theme
    fontWeight: "bold",
  },
  dropdownIcon: {
    marginRight: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 8,
    marginHorizontal: 12,
  },
  signInMessageContainer: {
    flex: 1,
    // backgroundColor is set by theme
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  popupContainer: {
    position: "absolute",
    width: 200, // Increased width for more options
    backgroundColor: "#1E2A38", // Darker, more modern
    borderRadius: 12,
    padding: 8, // Adjusted padding
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, // Slightly stronger shadow
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)", // Slightly more visible border
  },
  popupItem: {
    paddingVertical: 12, // Increased touch area
    paddingHorizontal: 12,
    borderRadius: 8,
    // backgroundColor: 'transparent', // Allow hover/active effect if added later
  },
  popupItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  popupIcon: {
    marginRight: 12,
  },
  popupText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  popupDivider: {
    height: StyleSheet.hairlineWidth, // Thinner divider
    backgroundColor: "rgba(255, 255, 255, 0.2)", // More visible
    marginVertical: 6, // Adjusted spacing
    marginHorizontal: 4,
  },
  receiptBubble: {
    backgroundColor: "#194D33", // Consider theme variable
    // alignSelf is set based on user
  },
  currentUserReceipt: {
    alignSelf: "flex-end",
    borderTopRightRadius: 5,
  },
  otherUserReceipt: {
    alignSelf: "flex-start",
    borderTopLeftRadius: 5,
  },
  receiptTitle: {
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 4,
    fontSize: 15,
  },
  receiptDate: {
    color: "#ddd",
    marginVertical: 2,
    fontSize: 12,
  },
  receiptItemsContainer: {
    marginTop: 6,
    marginBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 6,
  },
  receiptItemRow: {
    marginBottom: 5,
  },
  receiptItemText: {
    color: "#fff",
    fontSize: 13,
  },
  receiptItemBuyers: {
    color: "#ccc",
    fontSize: 11,
    marginLeft: 10,
    fontStyle: 'italic',
  },
  receiptTimestamp: {
    marginTop: 8,
    fontSize: 11,
    color: "#ccc",
    alignSelf: 'flex-start', // Or flex-end based on user
  },
  reportModalKeyboardAvoidingView: {
    flex: 1,
    justifyContent: "flex-end", 
  },
  reportModalContainer: {
    backgroundColor: "#1E2A38", 
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Extra padding for home indicator
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  reportModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20, // Increased margin
    textAlign: "center",
  },
  reportInputLabel: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 8, // Increased margin
    marginTop: 10,
  },
  reportInput: {
    backgroundColor: "#2a3b4c",
    color: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 50,
    textAlignVertical: "top", 
    borderColor: "#455a64",
    borderWidth: 1,
    marginBottom: 15,
  },
  reportInputMulti: {
    minHeight: 100,
  },
  reportActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  reportButton: {
    flex: 1,
    paddingVertical: 14, // Increased padding
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  reportCancelButton: {
    backgroundColor: "#4F5D75", 
  },
  reportSubmitButton: {
    backgroundColor: "red", 
  },
  reportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});


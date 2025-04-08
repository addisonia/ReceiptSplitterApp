// src/screens/Chat.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
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

const SPLIT_STORAGE_KEY = "@split_state";

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

const Chat = () => {
  const { theme, mode } = useTheme();
  const navigation = useNavigation<ChatNavProp>();

  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

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

  const userColors = [
    "#c177d9",
    "#77d997",
    "#d97777",
    "#d9d177",
    "#77b7d9",
    "#a477d9",
    "#d9a477",
    "#9afbfc",
    "#ff9a76",
    "#baff66",
    "#ff66dc",
    "#66ffed",
    "#ffee66",
    "#ff6666",
    "#66c7ff",
    "#d966ff",
    "#ffb266",
    "#66ff8c",
    "#ff66a3",
    "#c4ff66",
  ];

  const [assignedColors, setAssignedColors] = useState<{
    [name: string]: string;
  }>({});

  const titleBarTextColor =
    mode === "yuck" || mode === "dark" || mode === "random"
      ? "#ffffff"
      : "#000";

  const flatListRef = useRef<FlatList<Message>>(null);

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
        setUsername("Loading...");
      }
    });
  };

  const loadUserGroups = (uid: string) => {
    const userGroupsRef = ref(database, `users/${uid}/groups`);
    onValue(userGroupsRef, (snapshot) => {
      const groupIdsObj = snapshot.val() || {};
      const groupIds = Object.keys(groupIdsObj);
      const newMap: Record<string, GroupChatData> = {};

      groupIds.forEach((gid) => {
        const singleGroupRef = ref(database, `groupChats/${gid}`);
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
          setGroupChatsMap((prev) => {
            const merged = { ...prev, ...newMap };
            for (const k of Object.keys(merged)) {
              if (!groupIds.includes(k)) {
                delete merged[k];
              }
            }
            const arr = Object.values(merged);
            setGroupChatArray(arr);
            return merged;
          });
        });
      });

      if (groupIds.length === 0) {
        setGroupChatsMap({});
        setGroupChatArray([]);
      }
    });
  };

  useEffect(() => {
    if (!isSignedIn) return;
    let unsubscribe: () => void;

    if (selectedChat === "global") {
      const messagesRef = ref(database, "chat/messages");
      unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        const messagesArray: Message[] = [];

        if (data) {
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
          messagesArray.sort((a, b) => a.timestamp - b.timestamp);
          setMessages(messagesArray);
        } else {
          setMessages([]);
        }
      });
    } else {
      const groupMessagesRef = ref(
        database,
        `groupChats/${selectedChat}/messages`
      );
      unsubscribe = onValue(groupMessagesRef, (snapshot) => {
        const data = snapshot.val();
        const messagesArray: Message[] = [];

        if (data) {
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
          messagesArray.sort((a, b) => a.timestamp - b.timestamp);
          setMessages(messagesArray);
        } else {
          setMessages([]);
        }
      });
    }
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
    if (!groupData) {
      setParticipantUsernames([]);
      return;
    }
    const participantUids = Object.keys(groupData.participants || {});
    const promises = participantUids.map(async (uid) => {
      const snap = await get(child(ref(database), `users/${uid}/username`));
      return snap.exists() ? snap.val() : "Unknown";
    });
    Promise.all(promises).then((names) => {
      setParticipantUsernames(names);
    });
  }, [selectedChat, groupChatsMap]);

  useEffect(() => {
    const uniqueNames = Array.from(new Set(messages.map((m) => m.senderName)));
    const updatedMap = { ...assignedColors };

    let colorCount = Object.keys(updatedMap).length;
    uniqueNames.forEach((name) => {
      if (!updatedMap[name]) {
        updatedMap[name] = userColors[colorCount % userColors.length];
        colorCount++;
      }
    });

    if (Object.keys(updatedMap).length !== Object.keys(assignedColors).length) {
      setAssignedColors(updatedMap);
    }
  }, [messages, assignedColors, userColors]);

  const handleSendMessage = () => {
    if (!isSignedIn) {
      setCooldownMessage("Sign in to send messages.");
      setTimeout(() => setCooldownMessage(null), 2000);
      return;
    }
    if (!username || username === "Loading...") {
      setCooldownMessage("Waiting for username. Try again soon.");
      setTimeout(() => setCooldownMessage(null), 2000);
      return;
    }
    if (!newMessageText.trim()) return;

    const currentTime = Date.now();
    const isGlobalChat = selectedChat === "global";
    const lastSendTime = isGlobalChat ? lastGlobalSendTime : lastGroupSendTime;
    const cooldown = isGlobalChat ? 5000 : 1000;

    if (currentTime - lastSendTime < cooldown) {
      const remainingTime = Math.ceil(
        (cooldown - (currentTime - lastSendTime)) / 1000
      );
      setCooldownMessage(
        `Please wait ${remainingTime} second${remainingTime > 1 ? "s" : ""}`
      );
      setTimeout(() => setCooldownMessage(null), 2000);
      return;
    }

    if (isGlobalChat) {
      const messagesRef = ref(database, `chat/messages/${username}`);
      const newMessageRef = push(messagesRef);
      const messagePayload = {
        text: newMessageText.trim(),
        senderName: username,
        timestamp: currentTime,
        senderUid: user?.uid || "unknown-uid",
      };
      set(newMessageRef, messagePayload).then(() => {
        setNewMessageText("");
        setLastGlobalSendTime(currentTime);
      });
    } else {
      const groupMessagesRef = ref(
        database,
        `groupChats/${selectedChat}/messages`
      );
      const newGroupMsgRef = push(groupMessagesRef);
      const messagePayload = {
        text: newMessageText.trim(),
        senderName: username,
        timestamp: currentTime,
        senderUid: user?.uid || "unknown-uid",
      };
      set(newGroupMsgRef, messagePayload).then(() => {
        setNewMessageText("");
        setLastGroupSendTime(currentTime);
      });
    }
  };

  const handleBubblePress = (msgKey: string) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [msgKey]: !prev[msgKey],
    }));
  };

  const handleBubbleLongPress = (
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
    const popupHeight = 150;

    const adjustedY = Math.min(
      pageY,
      screenHeight - inputAreaHeight - popupHeight - 10
    );

    setPopupX(pageX);
    setPopupY(adjustedY);
    setPopupVisible(true);
  };

  const handleCopyMessage = () => {
    if (!longPressedMessage) return;
    // Clipboard.setString is deprecated; use setStringAsync if available
    navigator.clipboard
      ? navigator.clipboard.writeText(longPressedMessage.text || "")
      : console.warn("Clipboard API not available");
    setPopupVisible(false);
  };

  const handleAddFriend = async () => {
    if (!popupTargetUid || !user) return;
    if (outgoingRequests.has(popupTargetUid)) {
      Alert.alert(`Waiting on response from ${popupTargetName}`);
      setPopupVisible(false);
      return;
    }
    const myUid = user.uid;
    const usernameSnap = await get(ref(database, `users/${myUid}/username`));
    let localName = "Unknown";
    if (usernameSnap.exists()) {
      localName = usernameSnap.val();
    }
    const frRef = ref(database, `friendRequests/${popupTargetUid}`);
    const newReqRef = push(frRef);
    await set(newReqRef, {
      fromUid: myUid,
      fromUsername: localName,
    });
    await set(
      ref(database, `outgoingRequests/${myUid}/${popupTargetUid}`),
      true
    );
    setPopupVisible(false);
    Alert.alert("Friend request sent", `Sent to ${popupTargetName}.`);
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
    await remove(ref(database, `users/${myUid}/friends/${friendUid}`));
    await remove(ref(database, `users/${friendUid}/friends/${myUid}`));
    await remove(ref(database, `outgoingRequests/${myUid}/${friendUid}`));
    await remove(ref(database, `outgoingRequests/${friendUid}/${myUid}`));
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
    if (!user) return;
    Alert.alert(
      "Leave Group",
      "Are you sure you want to leave this groupchat?",
      [
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
              setSelectedChat("global");
            } catch (err) {
              console.error("Error leaving group:", err);
            }
          },
        },
      ]
    );
  };

  const handleTopRightIconPress = () => {
    if (selectedChat !== "global") {
      handleLeaveGroup();
    } else {
      navigation.navigate("GroupChat");
    }
  };

  const handleUploadReceipt = () => {
    if (!username) return;
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
                screen: "Split",
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

  const currentChatName =
    selectedChat === "global"
      ? "Global Chat"
      : groupChatsMap[selectedChat]?.name || "Unknown Group";

  if (!isSignedIn) {
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

  const MessageItem = React.memo(({ item }: { item: Message }) => {
    const isCurrentUserMessage = user ? item.senderUid === user.uid : false;
    const isExpanded = expandedMessages[item.key] || false;

    if (item.type === "receipt" && item.receiptData) {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setExpandedMessages((prev) => ({
              ...prev,
              [item.key]: !prev[item.key],
            }));
          }}
          onLongPress={(e) => {
            const { pageX, pageY } = e.nativeEvent;
            handleBubbleLongPress(
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
                : { color: assignedColors[item.senderName] || "#fff" },
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
                {item.receiptData.date
                  ? new Date(item.receiptData.date).toLocaleString()
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

    const isExpandedText = expandedMessages[item.key] || false;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleBubblePress(item.key)}
        onLongPress={(e) => {
          const { pageX, pageY } = e.nativeEvent;
          handleBubbleLongPress(
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
              : { color: assignedColors[item.senderName] || "#fff" },
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
        {isExpandedText && (
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

  return (
    <View style={[styles.container, { backgroundColor: theme.offWhite2 }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: theme.offWhite2 }]}>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <FontAwesome
            name="users"
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
              name="minus"
              size={26}
              color="red"
              style={styles.icon}
            />
          ) : (
            <FontAwesome
              name="plus"
              size={26}
              color={theme.yellow}
              style={styles.icon}
            />
          )}
        </TouchableOpacity>
      </View>
  
      {/* Participant list (only when in a group) */}
      {selectedChat !== "global" && participantUsernames.length > 0 && (
        <View style={styles.participantList}>
          <Text style={styles.participantText}>
            {participantUsernames.join(", ")}
          </Text>
        </View>
      )}
  
      {/* One FlatList with scroll-to-end */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => <MessageItem item={item} />}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.messagesContainer}
        removeClippedSubviews
        windowSize={5}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
      />
  
      {/* Cooldown popup */}
      {cooldownMessage && (
        <View style={styles.cooldownPopup}>
          <Text style={styles.cooldownText}>{cooldownMessage}</Text>
        </View>
      )}
  
      {/* Input area */}
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
          onSubmitEditing={handleSendMessage}
          returnKeyType="send"
        />
        <Pressable style={styles.sendButton} onPress={handleSendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
  
      {/* Popup modal */}
      <Modal visible={popupVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setPopupVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        {popupVisible && (
          <Animated.View
            style={[
              styles.popupContainer,
              {
                top: popupY,
                left: Math.min(popupX, Dimensions.get("window").width - 180),
              },
            ]}
          >
            {/* ... same popup items ... */}
          </Animated.View>
        )}
      </Modal>
  
      {/* Dropdown for switching chats */}
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
              <FontAwesome
                name="globe"
                size={16}
                color={theme.yellow}
                style={styles.dropdownIcon}
              />
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
                <FontAwesome
                  name="users"
                  size={16}
                  color="#fff"
                  style={styles.dropdownIcon}
                />
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
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
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
    backgroundColor: "#193f54",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  participantText: {
    color: "#ddd",
    fontSize: 12,
  },
  messagesContainer: {
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  currentUserMessage: {
    backgroundColor: colors.yellow,
    alignSelf: "flex-end",
  },
  otherUserMessage: {
    backgroundColor: "#0C3A50",
    alignSelf: "flex-start",
  },
  senderName: {
    fontWeight: "bold",
    marginBottom: 3,
  },
  currentUserSenderName: {
    color: "black",
  },
  messageText: {
    fontSize: 16,
  },
  currentUserText: {
    color: "black",
  },
  otherUserText: {
    color: "white",
  },
  timestamp: {
    marginTop: 5,
    fontSize: 12,
    color: "#ccc",
  },
  selfTimestamp: {
    marginTop: 5,
    fontSize: 12,
    color: "#333",
  },
  cooldownPopup: {
    position: "absolute",
    bottom: 70,
    left: 10,
    right: 10,
    backgroundColor: "rgba(128, 128, 128, 0.9)",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cooldownText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  inputArea: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.yellow,
    alignItems: "center",
  },
  receiptIcon: {
    padding: 5,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#114B68",
    marginRight: 8,
    borderColor: colors.yellow,
    borderWidth: 1,
    color: "white",
  },
  sendButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.yellow,
    borderRadius: 20,
  },
  sendButtonText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
  },
  dropdownPanel: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  dropdownContainer: {
    width: "80%",
    backgroundColor: "#114B68",
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
    paddingVertical: 12,
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
    backgroundColor: "rgba(243, 210, 90, 0.15)",
    borderRadius: 8,
    marginHorizontal: 8,
  },
  globalChatText: {
    color: colors.yellow,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  popupContainer: {
    position: "absolute",
    width: 180,
    backgroundColor: "#1E2A38",
    borderRadius: 12,
    padding: 6,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  popupItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
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
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 5,
    marginHorizontal: 2,
  },
  receiptBubble: {
    backgroundColor: "#194D33",
  },
  currentUserReceipt: {
    alignSelf: "flex-end",
  },
  otherUserReceipt: {
    alignSelf: "flex-start",
  },
  receiptTitle: {
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 4,
  },
  receiptDate: {
    color: "#ddd",
    marginVertical: 2,
  },
  receiptItemsContainer: {
    marginTop: 5,
    marginBottom: 5,
  },
  receiptItemRow: {
    marginBottom: 4,
  },
  receiptItemText: {
    color: "#fff",
  },
  receiptItemBuyers: {
    color: "#ccc",
    fontSize: 12,
    marginLeft: 10,
  },
  receiptTimestamp: {
    marginTop: 5,
    fontSize: 12,
    color: "#ccc",
  },
});

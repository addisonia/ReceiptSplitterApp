// chat.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Dimensions,
  Alert,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { auth, database } from "../firebase";
import { User, onAuthStateChanged } from "firebase/auth";
import { ref, onValue, push, set, remove, get, child } from "firebase/database";
import colors from "../../constants/colors";
import ChatSkeleton from "../components/ChatSkeleton";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../types/RootStackParams";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// define route type
type ChatNavProp = NativeStackNavigationProp<RootStackParamList, "Chat">;

// define the firebase shape for each message in the db
interface FirebaseMessageData {
  senderName?: string;
  text?: string;
  timestamp?: number;
  senderUid?: string;
  type?: string; // "text" | "receipt" etc.
  receiptData?: any; // more specific type if you'd like
}

// define your local message type
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

const Chat = () => {
  const navigation = useNavigation<ChatNavProp>();

  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);

  // which chat: "global" or a groupId
  const [selectedChat, setSelectedChat] = useState<string>("global");
  const [groupChatsMap, setGroupChatsMap] = useState<
    Record<string, GroupChatData>
  >({});
  const [groupChatArray, setGroupChatArray] = useState<GroupChatData[]>([]);

  // dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // toggling timestamps
  const [expandedMessages, setExpandedMessages] = useState<
    Record<string, boolean>
  >({});

  // friend popup
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupX, setPopupX] = useState(0);
  const [popupY, setPopupY] = useState(0);
  const [popupTargetUid, setPopupTargetUid] = useState<string | null>(null);
  const [popupTargetName, setPopupTargetName] = useState<string | null>(null);
  const [isTargetFriend, setIsTargetFriend] = useState(false);

  // local friend list
  const [myFriends, setMyFriends] = useState<Record<string, string>>({});
  const [outgoingRequests, setOutgoingRequests] = useState<Set<string>>(
    new Set()
  );

  // store the group participants' usernames (for the small text under header)
  const [participantUsernames, setParticipantUsernames] = useState<string[]>(
    []
  );

  // removed auto-scroll code and ref

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsSignedIn(true);
        fetchChatUsernameFromDB(currentUser.uid);

        // watch friend list
        const friendsRef = ref(database, `users/${currentUser.uid}/friends`);
        onValue(friendsRef, (snap) => {
          const data = snap.val() || {};
          setMyFriends(data);
        });

        // watch outgoingRequests
        const outRef = ref(database, `outgoingRequests/${currentUser.uid}`);
        onValue(outRef, (snap) => {
          if (!snap.exists()) {
            setOutgoingRequests(new Set());
          } else {
            setOutgoingRequests(new Set(Object.keys(snap.val())));
          }
        });

        // load the user’s groups in real time
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

  // real-time group data for each group the user has
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
          // after reading each group, update state
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

  // fetch participant usernames for selected group
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
      if (snap.exists()) {
        return snap.val() as string;
      } else {
        return "Unknown";
      }
    });

    Promise.all(promises).then((names) => {
      setParticipantUsernames(names);
    });
  }, [selectedChat, groupChatsMap]);

  // load messages from global or selected group
  useEffect(() => {
    if (!isSignedIn) return;
    let unsubscribe: () => void;

    if (selectedChat === "global") {
      const messagesRef = ref(database, "chat/messages");
      unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        const messagesArray: Message[] = [];

        if (data) {
          // data is an object keyed by username => messages => message object
          // if you have a different schema, adjust accordingly
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
          // data is an object keyed by message id => message fields
          // define a shape so ts doesn't complain
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

  const handleSendMessage = () => {
    if (!isSignedIn) {
      alert("Sign in to send messages.");
      return;
    }
    if (!username || username === "Loading...") {
      alert("Waiting for username. Try again soon.");
      return;
    }
    if (!newMessageText.trim()) return;

    if (selectedChat === "global") {
      const messagesRef = ref(database, `chat/messages/${username}`);
      const newMessageRef = push(messagesRef);
      const messagePayload = {
        text: newMessageText.trim(),
        senderName: username,
        timestamp: Date.now(),
        senderUid: user?.uid || "unknown-uid",
      };

      set(newMessageRef, messagePayload)
        .then(() => setNewMessageText(""))
        .catch((error) => console.error("Error sending message:", error));
    } else {
      const groupMessagesRef = ref(
        database,
        `groupChats/${selectedChat}/messages`
      );
      const newGroupMsgRef = push(groupMessagesRef);
      const messagePayload = {
        text: newMessageText.trim(),
        senderName: username,
        timestamp: Date.now(),
        senderUid: user?.uid || "unknown-uid",
      };

      set(newGroupMsgRef, messagePayload)
        .then(() => setNewMessageText(""))
        .catch((error) => console.error("Error sending group message:", error));
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
    pageY: number
  ) => {
    if (isCurrentUserMessage || !targetUid || !targetName) return;

    const friendUids = Object.keys(myFriends);
    setIsTargetFriend(friendUids.includes(targetUid));

    setPopupTargetUid(targetUid);
    setPopupTargetName(targetName);

    setPopupX(pageX);
    setPopupY(pageY);
    setPopupVisible(true);
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

  // leaving group
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
              // remove user from group participants
              await remove(
                ref(
                  database,
                  `groupChats/${selectedChat}/participants/${user.uid}`
                )
              );
              // remove group from user’s groups
              await remove(
                ref(database, `users/${user.uid}/groups/${selectedChat}`)
              );
              // switch back to global chat
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

  // handle receipt icon for group chats
  const handleUploadReceipt = () => {
    navigation.navigate("UploadReceipt", { groupId: selectedChat });
  };

  // sign-in skeleton
  const renderSignInMessage = () => (
    <View style={styles.signInMessageContainer}>
      <ChatSkeleton />
    </View>
  );

  const currentChatName =
    selectedChat === "global"
      ? "Global Chat"
      : groupChatsMap[selectedChat]?.name || "Unknown Group";

  // message item
  const MessageItem = React.memo(({ item }: { item: Message }) => {
    const isCurrentUserMessage = user ? item.senderUid === user.uid : false;
    const isExpanded = expandedMessages[item.key] || false;

    // if the message is a receipt
    if (item.type === "receipt" && item.receiptData) {
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
              pageY
            );
          }}
          style={[
            styles.messageBubble,
            styles.receiptBubble,
            // expand bubble width
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
                : styles.otherUserSenderName,
                { color: 'lightgray' }
            ]}
          >
            {item.senderName} uploaded a receipt
          </Text>
          <Text style={styles.receiptTitle}>{item.receiptData.name}</Text>

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

              {/* items */}
              <View style={styles.receiptItemsContainer}>
                {Array.isArray(item.receiptData.items) &&
                  item.receiptData.items.map((rItem: any, index: number) => {
                    const price = rItem.price || 0;
                    const qty = rItem.quantity || 1;
                    const itemTotal = price * qty;
                    const buyerNames = (rItem.buyers || [])
                      .map((b: any) => b.name)
                      .join(", ");
                    return (
                      <View key={index} style={styles.receiptItemRow}>
                        <Text style={styles.receiptItemText}>
                          {rItem.item} (x{qty}) - ${itemTotal.toFixed(2)}
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

    // otherwise a normal text message
    const timestampStyle = isCurrentUserMessage
      ? styles.selfTimestamp
      : styles.timestamp;
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
            pageY
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
              : styles.otherUserSenderName,
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
          <Text style={timestampStyle}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  });

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.headerContainer}>
        {isSignedIn && (
          <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
            <FontAwesome
              name="users"
              size={26}
              color={colors.yellow}
              style={styles.icon}
            />
          </TouchableOpacity>
        )}

        {/* center text toggles dropdown */}
        {isSignedIn ? (
          <TouchableOpacity
            style={styles.headerTitleWrapper}
            onPress={() => setDropdownOpen(true)}
          >
            <Text style={styles.headerText}>{currentChatName}</Text>
            <FontAwesome
              name="chevron-down"
              size={16}
              color={colors.yellow}
              style={{ marginLeft: 5 }}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.headerText,
                { textAlign: "center", marginTop: 10 },
              ]}
            >
              You're missing out...
            </Text>
          </View>
        )}

        {isSignedIn && (
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
                color={colors.yellow}
                style={styles.icon}
              />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* participants below header if in a group */}
      {isSignedIn &&
        selectedChat !== "global" &&
        participantUsernames.length > 0 && (
          <View style={styles.participantList}>
            <Text style={styles.participantText}>
              {participantUsernames.join(", ")}
            </Text>
          </View>
        )}

      {/* dropdown modal */}
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
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedChat("global");
                setDropdownOpen(false);
              }}
            >
              <Text style={styles.dropdownItemText}>Global Chat</Text>
            </TouchableOpacity>

            {groupChatArray.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedChat(g.id);
                  setDropdownOpen(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* main content */}
      {isSignedIn ? (
        <>
          <FlatList
            data={messages}
            renderItem={({ item }) => <MessageItem item={item} />}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.messagesContainer}
            removeClippedSubviews
            windowSize={5}
          />

          <View style={styles.inputArea}>
            {/* receipt icon for group chats */}
            {selectedChat !== "global" && (
              <TouchableOpacity
                onPress={handleUploadReceipt}
                style={styles.receiptIcon}
              >
                <FontAwesome
                  name="file-text-o"
                  size={24}
                  color={colors.yellow}
                />
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
        </>
      ) : (
        renderSignInMessage()
      )}

      {/* friend popup */}
      <Modal visible={popupVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setPopupVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>

        {popupVisible && (
          <View
            style={[
              styles.popupContainer,
              {
                top: popupY,
                left: Math.min(popupX, Dimensions.get("window").width - 150),
              },
            ]}
          >
            {isTargetFriend ? (
              <TouchableOpacity
                onPress={confirmRemoveFriend}
                style={styles.popupItem}
              >
                <Text style={[styles.popupText, { color: "red" }]}>
                  Remove Friend
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleAddFriend}
                style={styles.popupItem}
              >
                <Text style={styles.popupText}>Add Friend</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleMessage} style={styles.popupItem}>
              <Text style={styles.popupText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
};

export default Chat;

const styles = StyleSheet.create({
  // comments in lowercase
  container: {
    flex: 1,
    backgroundColor: colors.yuck,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 15,
    backgroundColor: colors.yuck,
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
    color: "white",
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
    color: colors.yellow,
  },
  currentUserSenderName: {
    color: "black",
  },
  otherUserSenderName: {
    color: colors.yellow,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  dropdownPanel: {
    position: "absolute",
    top: 70,
    left: 0,
    right: 0,
  },
  dropdownContainer: {
    marginHorizontal: 20,
    backgroundColor: "#193f54",
    borderRadius: 6,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  dropdownItemText: {
    color: "#fff",
    fontSize: 16,
  },
  signInMessageContainer: {
    flex: 1,
  },
  popupContainer: {
    position: "absolute",
    width: 150,
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 8,
    zIndex: 999,
  },
  popupItem: {
    paddingVertical: 8,
  },
  popupText: {
    color: "#fff",
    fontSize: 16,
  },

  // receipt-specific styles
  receiptBubble: {
    backgroundColor: "#194D33", // subtle green
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

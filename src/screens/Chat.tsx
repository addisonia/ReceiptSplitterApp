// screens/Chat.tsx
import React, { useState, useEffect } from "react";
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
import { ref, onValue, push, set, remove } from "firebase/database";
import colors from "../../constants/colors";
import ChatSkeleton from "../components/ChatSkeleton";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../types/RootStackParams";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type ChatNavProp = NativeStackNavigationProp<RootStackParamList, "Chat">;

interface Message {
  key: string;
  senderName: string;
  text: string;
  timestamp: number;
  senderUid?: string;
}

const Chat = () => {
  const navigation = useNavigation<ChatNavProp>();

  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);

  // track which messages are tapped to show timestamp
  const [expandedMessages, setExpandedMessages] = useState<
    Record<string, boolean>
  >({});

  // popup state
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupX, setPopupX] = useState(0);
  const [popupY, setPopupY] = useState(0);
  const [popupTargetUid, setPopupTargetUid] = useState<string | null>(null);
  const [popupTargetName, setPopupTargetName] = useState<string | null>(null);
  const [isTargetFriend, setIsTargetFriend] = useState(false);

  // local friend list
  const [myFriends, setMyFriends] = useState<Record<string, string>>({});
  // store outgoing requests
  const [outgoingRequests, setOutgoingRequests] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsSignedIn(true);
        // read existing username from DB
        fetchChatUsernameFromDB(currentUser.uid);

        // watch friend list
        const friendsRef = ref(database, `users/${currentUser.uid}/friends`);
        onValue(friendsRef, (snap) => {
          const data = snap.val() || {};
          setMyFriends(data); // data => { friendUid: friendUsername }
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
      } else {
        // not signed in => ephemeral "Guest"
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
        // do NOT create a new name here
        // just show "Loading..." until Home writes a name
        setUsername("Loading...");
      }
    });
  };

  // load messages from "chat/messages"
  useEffect(() => {
    if (!isSignedIn) return;
    const messagesRef = ref(database, "chat/messages");
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const messagesArray: Message[] = [];

      if (data) {
        Object.entries(data).forEach(([_, userMessages]) => {
          if (userMessages && typeof userMessages === "object") {
            Object.entries(userMessages).forEach(([msgId, msgData]) => {
              if (msgData && typeof msgData === "object") {
                messagesArray.push({
                  key: msgId,
                  senderName: msgData.senderName,
                  text: msgData.text,
                  timestamp: msgData.timestamp,
                  senderUid: msgData.senderUid,
                });
              }
            });
          }
        });
        messagesArray.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(messagesArray);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [isSignedIn]);

  const handleSendMessage = () => {
    if (!isSignedIn) {
      alert("Sign in to send messages.");
      return;
    }
    // if username is "Loading...", block sending
    if (!username || username === "Loading...") {
      alert("Waiting for username to finish loading. Try again soon.");
      return;
    }

    if (newMessageText.trim()) {
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

  // add friend
  const handleAddFriend = async () => {
    if (!popupTargetUid || !user) return;
    if (outgoingRequests.has(popupTargetUid)) {
      Alert.alert(`Waiting on response from ${popupTargetName}`);
      setPopupVisible(false);
      return;
    }

    const myUid = user.uid;
    const myNameRef = ref(database, `users/${myUid}/username`);
    let localName = "Unknown";
    await new Promise<void>((resolve) => {
      onValue(
        myNameRef,
        (snap) => {
          if (snap.exists()) {
            localName = snap.val();
          }
          resolve();
        },
        { onlyOnce: true }
      );
    });

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
      `Are you sure you want to remove ${popupTargetName} as your friend?`,
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

  // open DM
  const handleMessage = () => {
    if (!popupTargetUid || !popupTargetName) return;
    setPopupVisible(false);

    navigation.navigate("DM", {
      friendUid: popupTargetUid,
      friendUsername: popupTargetName,
    });
  };

  const MessageItem = React.memo(({ item }: { item: Message }) => {
    const isCurrentUserMessage = user ? item.senderUid === user.uid : false;
    const isExpanded = expandedMessages[item.key] || false;

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
        {isExpanded && (
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  });

  const renderSignInMessage = () => <ChatSkeleton />;

  return (
    <View style={styles.container}>
      {/* Top bar */}
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
        {isSignedIn ? (<Text style={styles.headerText}>Global Chat</Text>) : (<Text style={[styles.headerText, {marginTop: 20}]}>You're missing out...</Text>)}
        {isSignedIn && (
          <TouchableOpacity onPress={() => navigation.navigate("GroupChat")}>
            <FontAwesome
              name="plus"
              size={26}
              color={colors.yellow}
              style={styles.icon}
            />
          </TouchableOpacity>
        )}
      </View>

      {isSignedIn ? (
        <>
          <FlatList
            data={messages}
            renderItem={({ item }) => <MessageItem item={item} />}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.messagesContainer}
            inverted
            removeClippedSubviews
            windowSize={5}
          />
          <View style={styles.inputArea}>
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

      {/* custom popup bubble */}
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
  headerText: {
    flex: 1,
    textAlign: "center",
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  icon: {
    marginHorizontal: 10,
  },
  messagesContainer: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    flexDirection: "column-reverse",
  },
  messageBubble: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    maxWidth: "80%",
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
    color: "white",
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
  inputArea: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.yellow,
    alignItems: "center",
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
});

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
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { adjectives, nouns } from "../components/wordLists";
import { auth, database } from "../firebase";
import { User } from "firebase/auth";
import { ref, onValue, push, set } from "firebase/database";
import colors from "../../constants/colors";
import ChatSkeleton from "../components/ChatSkeleton";
import { useNavigation } from "@react-navigation/native";

interface Message {
  key: string;
  senderName: string;
  text: string;
  timestamp: number;
  senderUid?: string;
}

const Chat = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);

  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsSignedIn(true);
        fetchChatUsernameFromDB(currentUser.uid);
      } else {
        setIsSignedIn(false);
        setUsername(generateRandomUsernameForChat());
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
        const newUsername = generateRandomUsernameForChat();
        setUsername(newUsername);
        set(usernameRef, newUsername).catch((error) => {
          console.error("Error writing username:", error);
        });
      }
    });
  };

  const generateRandomUsernameForChat = () => {
    const randomAdjective =
      adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdjective} ${randomNoun}`;
  };

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
    if (newMessageText && username) {
      const messagesRef = ref(database, `chat/messages/${username}`);
      const newMessageRef = push(messagesRef);
      const messagePayload = {
        text: newMessageText,
        senderName: username,
        timestamp: Date.now(),
        senderUid: user?.uid || "unknown-uid",
      };

      set(newMessageRef, messagePayload)
        .then(() => setNewMessageText(""))
        .catch((error) => console.error("Error sending message:", error));
    }
  };

  const renderSignInMessage = () => <ChatSkeleton />;

  const MessageItem = React.memo(({ item }: { item: Message }) => {
    const isCurrentUserMessage = user ? item.senderUid === user.uid : false;
    return (
      <View
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
      </View>
    );
  });

  return (
    <View style={styles.container}>
      {/* top bar with icons, but only if user is signed in */}
      <View style={styles.headerContainer}>
        {isSignedIn && (
          <>
            <TouchableOpacity
              onPress={() => navigation.navigate("Profile" as never)}
            >
              <FontAwesome
                name="users"
                size={26}
                color={colors.yellow}
                style={styles.icon}
              />
            </TouchableOpacity>
          </>
        )}
        <Text style={styles.headerText}>Global Chat</Text>
        {isSignedIn && (
          <>
            <TouchableOpacity
              onPress={() => navigation.navigate("GroupChat" as never)}
            >
              <FontAwesome
                name="plus"
                size={26}
                color={colors.yellow}
                style={styles.icon}
              />
            </TouchableOpacity>
          </>
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
});

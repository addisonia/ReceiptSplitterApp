// screens/Chat.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
} from "react-native";
import { adjectives, nouns } from "../components/wordLists";
import { auth, database } from "../firebase";
import { User } from "firebase/auth";
import { ref, onValue, push, set } from "firebase/database";
import colors from "../../constants/colors";
import ChatSkeleton from "../components/ChatSkeleton";

interface Message {
  key: string;
  senderName: string;
  text: string;
  timestamp: number;
  senderUid?: string;
}

interface MessageDataInFirebase {
  // Define a new interface for the data structure from Firebase
  senderName: string;
  text: string;
  timestamp: number;
  senderUid?: string;
}

interface MessageItemProps {
  item: Message;
  isCurrentUserMessage: boolean;
}

const Chat = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);

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
          console.error("error writing username to db:", error);
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

    // Listen to the entire messages node
    const messagesRef = ref(database, "chat/messages");
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      console.log("Raw snapshot data:", data);
      const messagesArray: Message[] = [];

      if (data) {
        // data is an object with keys as usernames
        Object.entries(data).forEach(([userKey, userMessages]) => {
          if (userMessages && typeof userMessages === "object") {
            // Loop through each message for that user
            Object.entries(userMessages).forEach(([msgId, msgData]) => {
              console.log("Message:", msgId, msgData);
              // Ensure msgData is an object
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
        // Sort messages by timestamp
        messagesArray.sort((a, b) => a.timestamp - b.timestamp);
        console.log("Final messages array:", messagesArray);
        setMessages(messagesArray);
      } else {
        setMessages([]);
        console.log("No data found in chat/messages");
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
        .catch((error) => console.error("error sending message:", error));
    }
  };

  const MessageItem: React.FC<MessageItemProps> = React.memo(
    ({ item, isCurrentUserMessage }) => (
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
    )
  );

  const renderSignInMessage = () => <ChatSkeleton />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Global Chat</Text>
      {isSignedIn ? (
        <>
          <FlatList
            data={messages}
            renderItem={({ item }) => {
              const isCurrentUserMessage = user
                ? item.senderUid === user.uid
                : false;
              return (
                <MessageItem
                  item={item}
                  isCurrentUserMessage={isCurrentUserMessage}
                />
              );
            }}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yuck,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
    marginTop: 40,
    color: "white",
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
  signInContainer: {
    // Make sure these styles are defined
    flex: 1,
    backgroundColor: colors.yuck,
    justifyContent: "center",
    alignItems: "center",
  },
  signInText: {
    // Make sure these styles are defined
    fontSize: 18,
    color: "white",
  },
});

export default Chat;

// screens/Chat.tsx
import React, { useState, useEffect } from "react";
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

interface Message {
  key: string;
  senderName: string;
  text: string;
  timestamp: number;
}

const Chat = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState("");

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      setUsername(user.email || "Signed In User");
    } else {
      const randomAdjective =
        adjectives[Math.floor(Math.random() * adjectives.length)];
      const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
      setUsername(`${randomAdjective} ${randomNoun}`);
    }
  }, [user]);

  useEffect(() => {
    const messagesRef = ref(database, "chat/messages");
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      console.log("Data from Firebase:", data);
      if (data) {
        const messagesArray = Object.keys(data).map((key) => {
          const messageData = data[key];
          if (
            messageData &&
            typeof messageData === "object" &&
            typeof messageData.text === "string" &&
            typeof messageData.senderName === "string"
          ) {
            return {
              key,
              ...messageData,
            };
          } else {
            console.warn("Invalid message data encountered:", messageData);
            return null;
          }
        });

        const validMessagesArray = messagesArray.filter(
          (message) => message !== null
        ) as Message[];

        validMessagesArray.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(validMessagesArray);
      } else {
        console.log("No data received from Firebase");
        setMessages([]);
      }
    });
  }, []);

  const handleSendMessage = () => {
    if (newMessageText && username) {
      const messagesRef = ref(database, "chat/messages");
      const newMessageRef = push(messagesRef);

      set(newMessageRef, {
        text: newMessageText,
        senderName: username,
        timestamp: Date.now(),
      })
        .then(() => {
          setNewMessageText("");
        })
        .catch((error) => {
          console.error("Error sending message:", error);
        });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Global Chat</Text>
      <FlatList
        data={messages}
        renderItem={({ item }) => {
          if (
            !item ||
            typeof item !== "object" ||
            !item.senderName ||
            !item.text
          ) {
            console.warn("Skipping render of invalid message item:", item);
            return null;
          }
          const isCurrentUserMessage = item.senderName === username;
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
        }}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.messagesContainer}
        inverted={true}
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
      <Text style={styles.usernameDisplay}>Username: {username}</Text>
      {user ? (
        <Text style={{ color: "white", textAlign: "center" }}>Signed in</Text>
      ) : (
        <Text style={{ color: "white", textAlign: "center" }}>
          Not signed in
        </Text>
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
    marginBottom: 20,
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
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    maxWidth: "80%",
  },
  currentUserMessage: {
    backgroundColor: colors.yellow, // Yellow for current user messages
    alignSelf: "flex-end", // Align to the right
  },
  otherUserMessage: {
    backgroundColor: "#0C3A50", // Darker blue for other messages
    alignSelf: "flex-start", // Align to the left
  },
  senderName: {
    fontWeight: "bold",
    marginBottom: 3,
    color: colors.yellow, // Yellow for sender names generally
  },
  currentUserSenderName: {
    color: "black", // Black sender name for current user for contrast
  },
  otherUserSenderName: {
    color: colors.yellow, // Yellow sender name for other users
  },
  messageText: {
    fontSize: 16,
    color: "white", // White message text for all messages
  },
  currentUserText: {
    color: "black", // Black message text for current user for contrast
  },
  otherUserText: {
    color: "white", // White message text for other users
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
  usernameDisplay: {
    textAlign: "center",
    marginTop: 10,
    marginBottom: 5,
    fontSize: 12,
    color: colors.yellow,
  },
});

export default Chat;

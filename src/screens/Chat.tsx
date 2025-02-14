// Chat.tsx
// screens/Chat.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
} from "react-native"; // Import TextInput and Pressable
import { adjectives, nouns } from "../components/wordLists";
import { auth, database } from "../firebase";
import { User } from "firebase/auth";
import { ref, onValue, push, set } from "firebase/database"; // Import push and set

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
  const [newMessageText, setNewMessageText] = useState(""); // State for input text

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
        const messagesArray: Message[] = Object.keys(data).map((key) => ({
          key,
          ...(data[key] as Omit<Message, "key">),
        }));
        messagesArray.sort((a, b) => a.timestamp - b.timestamp); // Sort EARLIEST to LATEST
        console.log("Messages Array:", messagesArray); // **CHECK THIS LOG**
        setMessages(messagesArray);
      } else {
        console.log("No data received from Firebase");
        setMessages([]);
      }
    });
  }, []);

  const handleSendMessage = () => {
    if (newMessageText && username) {
      const messagesRef = ref(database, "chat/messages");
      const newMessageRef = push(messagesRef); // Generate unique key

      set(newMessageRef, {
        // Use set to write data at the new location
        text: newMessageText,
        senderName: username,
        timestamp: Date.now(),
      })
        .then(() => {
          setNewMessageText(""); // Clear input after sending
        })
        .catch((error) => {
          console.error("Error sending message:", error); // Handle errors
        });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Global Chat</Text>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <View style={styles.messageBubble}>
            <Text style={styles.senderName}>{item.senderName}:</Text>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.messagesContainer} // Style for FlatList content
        inverted={true} // Display newest messages at the bottom (optional, but common in chats)
      />

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessageText}
          onChangeText={setNewMessageText}
          onSubmitEditing={handleSendMessage} // Send message on pressing "Enter" (optional)
          returnKeyType="send" // Change "Enter" key to "Send" (optional)
        />
        <Pressable style={styles.sendButton} onPress={handleSendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>

      <Text style={styles.usernameDisplay}>Username: {username}</Text>
      {user ? <Text>Signed in</Text> : <Text>Not signed in</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    marginTop: 40, // Add some top margin to header
  },
  messagesContainer: {
    paddingVertical: 15, // Add padding at the top and bottom of the message list
    paddingHorizontal: 10,
    flexDirection: "column-reverse", // New messages at bottom when inverted is true
  },
  messageBubble: {
    padding: 10,
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    alignSelf: "flex-start", // Default align to left
    maxWidth: "80%", // Prevent message bubbles from taking full width
  },
  senderName: {
    fontWeight: "bold",
    marginBottom: 3,
    color: "#333",
  },
  messageText: {
    fontSize: 16,
    color: "#555",
  },
  inputArea: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "white",
    marginRight: 8,
    borderColor: "#ddd",
    borderWidth: 1,
  },
  sendButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#4a7bff", // Example send button color
    borderRadius: 20,
  },
  sendButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  usernameDisplay: {
    // Added style for username display
    textAlign: "center",
    marginTop: 10,
    marginBottom: 5,
    fontSize: 12,
    color: "grey",
  },
});

export default Chat;

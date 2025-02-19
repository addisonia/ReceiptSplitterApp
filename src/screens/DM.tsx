// screens/DM.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
} from "react-native";
import { auth, database } from "../firebase";
import { ref, onValue, push, set } from "firebase/database";
import colors from "../../constants/colors";
import { RouteProp, useRoute } from "@react-navigation/native";
import { onAuthStateChanged, User } from "firebase/auth";

type DMRouteProp = RouteProp<
  { DM: { friendUid: string; friendUsername: string } },
  "DM"
>;

interface DMMessage {
  key: string;
  senderUid: string;
  senderName: string;
  text: string;
  timestamp: number;
}

const DM = () => {
  const route = useRoute<DMRouteProp>();
  const { friendUid, friendUsername } = route.params;

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [myUsername, setMyUsername] = useState<string>("");
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");

  // watch auth state in case user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const userRef = ref(database, `users/${currentUser.uid}/username`);
    const unsub = onValue(userRef, (snap) => {
      if (snap.exists()) {
        setMyUsername(snap.val());
      }
    });
    return () => unsub();
  }, [currentUser]);

  // define a stable conversation id
  let conversationId = "";
  if (currentUser?.uid) {
    const sortedIds = [currentUser.uid, friendUid].sort();
    conversationId = `${sortedIds[0]}_${sortedIds[1]}`;
  }

  // read messages from DMs/<conversationId>
  useEffect(() => {
    if (!conversationId) return;

    const dmRef = ref(database, `DMs/${conversationId}`);
    const unsubscribe = onValue(dmRef, (snapshot) => {
      const data = snapshot.val();
      const dmArray: DMMessage[] = [];
      if (data) {
        Object.entries(data).forEach(([msgId, raw]) => {
          const msgData = raw as {
            senderUid: string;
            senderName: string;
            text: string;
            timestamp: number;
          };
          dmArray.push({
            key: msgId,
            senderUid: msgData.senderUid,
            senderName: msgData.senderName,
            text: msgData.text,
            timestamp: msgData.timestamp,
          });
        });
        // sort by timestamp
        dmArray.sort((a, b) => a.timestamp - b.timestamp);
      }
      setMessages(dmArray);
    });

    return () => unsubscribe();
  }, [conversationId]);

  // send messages to DMs/<conversationId>
  const handleSendMessage = () => {
    if (!currentUser || !conversationId) return;
    if (!newMessageText.trim()) return;

    const dmRef = ref(database, `DMs/${conversationId}`);
    const newMessageRef = push(dmRef);

    const messagePayload = {
      text: newMessageText.trim(),
      timestamp: Date.now(),
      senderUid: currentUser.uid,
      senderName: myUsername || "Unknown",
    };

    set(newMessageRef, messagePayload)
      .then(() => setNewMessageText(""))
      .catch((err) => console.log("Error sending DM message:", err));
  };

  const renderMessage = ({ item }: { item: DMMessage }) => {
    const isOwnMessage = item.senderUid === currentUser?.uid;
    return (
      <View
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        <Text style={styles.senderName}>{item.senderName}:</Text>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>DM with {friendUsername}</Text>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.messagesContainer}
        inverted
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
    </View>
  );
};

export default DM;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yuck,
    paddingTop: 40,
  },
  header: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  messagesContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    flexDirection: "column-reverse",
  },
  messageBubble: {
    maxWidth: "80%",
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
  },
  ownBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.yellow,
  },
  otherBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#114B68",
  },
  senderName: {
    fontWeight: "bold",
    color: "#000", // visible on both bubble backgrounds
    marginBottom: 3,
  },
  messageText: {
    color: "#000",
  },
  inputArea: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.yellow,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "#114B68",
    marginRight: 8,
    borderColor: colors.yellow,
    borderWidth: 1,
    color: "white",
    paddingHorizontal: 10,
  },
  sendButton: {
    backgroundColor: colors.yellow,
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendButtonText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
  },
});

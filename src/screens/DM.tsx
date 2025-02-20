// screens/DM.tsx
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
import { auth, database } from "../firebase";
import { ref, onValue, push, set } from "firebase/database";
import colors from "../../constants/colors";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { onAuthStateChanged, User } from "firebase/auth";
import { FontAwesome, FontAwesome5 } from "@expo/vector-icons";

// define route params for DM
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
  const navigation = useNavigation();
  const route = useRoute<DMRouteProp>();
  const { friendUid, friendUsername } = route.params;

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [myUsername, setMyUsername] = useState<string>("");
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [expandedMessages, setExpandedMessages] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // fetch my username
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

  // conversation key
  let conversationId = "";
  if (currentUser?.uid) {
    const sortedIds = [currentUser.uid, friendUid].sort();
    conversationId = `${sortedIds[0]}_${sortedIds[1]}`;
  }

  // load messages
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
        dmArray.sort((a, b) => a.timestamp - b.timestamp);
      }
      setMessages(dmArray);
    });

    return () => unsubscribe();
  }, [conversationId]);

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

  const toggleTimestamp = (msgKey: string) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [msgKey]: !prev[msgKey],
    }));
  };

  const renderMessage = ({ item }: { item: DMMessage }) => {
    const isOwn = item.senderUid === currentUser?.uid;
    const isExpanded = expandedMessages[item.key] || false;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => toggleTimestamp(item.key)}
        style={[
          styles.messageBubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        <Text style={styles.senderName}>{item.senderName}:</Text>
        <Text style={styles.messageText}>{item.text}</Text>
        {isExpanded && (
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* top bar with left arrow and DM title */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome5
            name="arrow-left"
            size={24}
            color={colors.yellow}
            style={{ marginRight: 10 }}
          />
        </TouchableOpacity>
        <Text style={styles.header}>{friendUsername}</Text>
        {/* put an empty view to help center the text if needed */}
        <View style={{ width: 24, marginLeft: 10 }} />
      </View>

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
    elevation: 4, // same shadow as global chat
  },
  header: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
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
    color: "#000", // visible on yellow or dark
    marginBottom: 3,
  },
  messageText: {
    color: "#000",
  },
  timestamp: {
    marginTop: 5,
    fontSize: 12,
    color: "#eee",
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

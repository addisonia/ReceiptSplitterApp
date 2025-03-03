import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { auth, database } from "../firebase";
import { ref, onValue, push, set } from "firebase/database";
import colors from "../../constants/colors";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { onAuthStateChanged, User } from "firebase/auth";
import { FontAwesome5 } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/Feather";
import { Clipboard } from "react-native";

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
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupX, setPopupX] = useState(0);
  const [popupY, setPopupY] = useState(0);
  const [longPressedMessage, setLongPressedMessage] = useState<DMMessage | null>(
    null
  );
  const [lastDMSendTime, setLastDMSendTime] = useState<number>(0);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
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

  let conversationId = "";
  if (currentUser?.uid) {
    const sortedIds = [currentUser.uid, friendUid].sort();
    conversationId = `${sortedIds[0]}_${sortedIds[1]}`;
  }

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

    const currentTime = Date.now();
    const cooldown = 1000; // 1s for DMs

    if (currentTime - lastDMSendTime < cooldown) {
      const remainingTime = Math.ceil(
        (cooldown - (currentTime - lastDMSendTime)) / 1000
      );
      setCooldownMessage(
        `Please wait ${remainingTime} second${remainingTime > 1 ? "s" : ""}`
      );
      setTimeout(() => setCooldownMessage(null), 2000);
      return;
    }

    const dmRef = ref(database, `DMs/${conversationId}`);
    const newMessageRef = push(dmRef);

    const messagePayload = {
      text: newMessageText.trim(),
      timestamp: currentTime,
      senderUid: currentUser.uid,
      senderName: myUsername || "Unknown",
    };

    set(newMessageRef, messagePayload)
      .then(() => {
        setNewMessageText("");
        setLastDMSendTime(currentTime);
      })
      .catch((err) => console.log("Error sending DM message:", err));
  };

  const toggleTimestamp = (msgKey: string) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [msgKey]: !prev[msgKey],
    }));
  };

  const handleBubbleLongPress = (
    pageX: number,
    pageY: number,
    messageItem: DMMessage
  ) => {
    setLongPressedMessage(messageItem);

    const screenHeight = Dimensions.get("window").height;
    const inputAreaHeight = 70;
    const popupHeight = 60;

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
    Clipboard.setString(longPressedMessage.text || "");
    setPopupVisible(false);
  };

  const renderMessage = ({ item }: { item: DMMessage }) => {
    const isOwn = item.senderUid === currentUser?.uid;
    const isExpanded = expandedMessages[item.key] || false;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => toggleTimestamp(item.key)}
        onLongPress={(e) => {
          const { pageX, pageY } = e.nativeEvent;
          handleBubbleLongPress(pageX, pageY, item);
        }}
        style={[
          styles.messageBubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        <Text style={styles.senderName}>{item.senderName}:</Text>
        <Text style={styles.messageText}>{item.text}</Text>
        {isExpanded && (
          <Text style={isOwn ? styles.selfTimestamp : styles.timestamp}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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
        <View style={{ width: 24, marginLeft: 10 }} />
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.messagesContainer}
        inverted
      />

      {cooldownMessage && (
        <View style={styles.cooldownPopup}>
          <Text style={styles.cooldownText}>{cooldownMessage}</Text>
        </View>
      )}

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
            <TouchableOpacity
              onPress={handleCopyMessage}
              style={styles.popupItem}
            >
              <View style={styles.popupItemContent}>
                <Icon
                  name="copy"
                  size={18}
                  color="#fff"
                  style={styles.popupIcon}
                />
                <Text style={styles.popupText}>Copy</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Modal>
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
    elevation: 4,
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
    color: "#000",
    marginBottom: 3,
  },
  messageText: {
    color: "#000",
  },
  selfTimestamp: {
    marginTop: 5,
    fontSize: 12,
    color: "black", // Black for current user
  },
  timestamp: {
    marginTop: 5,
    fontSize: 12,
    color: "#eee", // Gray for others
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
    alignItems: "center", // Matches Chat.tsx
  },
  input: {
    flex: 1,
    paddingVertical: 8, // Matches Chat.tsx
    paddingHorizontal: 12, // Matches Chat.tsx
    borderRadius: 20,
    backgroundColor: "#114B68",
    marginRight: 8,
    borderColor: colors.yellow,
    borderWidth: 1,
    color: "white",
  },
  sendButton: {
    paddingVertical: 10, // Matches Chat.tsx
    paddingHorizontal: 16,
    backgroundColor: colors.yellow,
    borderRadius: 20,
    justifyContent: "center",
  },
  sendButtonText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
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
});
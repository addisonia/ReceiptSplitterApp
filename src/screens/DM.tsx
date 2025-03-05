// src/screens/DM.tsx
import React, { useState, useEffect, useCallback } from "react";
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
  Clipboard,
} from "react-native";
import { auth, database } from "../firebase";
import { ref, onValue, push, set } from "firebase/database";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { onAuthStateChanged, User } from "firebase/auth";
import { FontAwesome5 } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/Feather";
import { useTheme } from "../context/ThemeContext";
import { colors } from "../components/ColorThemes";

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
  const { theme, mode } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<DMRouteProp>();
  const { friendUid, friendUsername } = route.params;

  const topTextColor =
    mode === "yuck" || mode === "dark" || mode === "random"
      ? "#ffffff"
      : "#000";

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
  const [longPressedMessage, setLongPressedMessage] =
    useState<DMMessage | null>(null);
  const [lastDMSendTime, setLastDMSendTime] = useState<number>(0);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [assignedColors, setAssignedColors] = useState<{
    [name: string]: string;
  }>({});

  // Same userColors array as in Chat.tsx
  const userColors = [
    "#c177d9", // Lavender Purple
    "#77d997", // Mint Green
    "#d97777", // Soft Red
    "#d9d177", // Pale Yellow
    "#77b7d9", // Sky Blue
    "#a477d9", // Medium Purple
    "#d9a477", // Peach
    "#9afbfc", // Aqua
    "#ff9a76", // Coral
    "#baff66", // Lime Green
    "#ff66dc", // Hot Pink
    "#66ffed", // Turquoise
    "#ffee66", // Bright Yellow
    "#ff6666", // Bright Red
    "#66c7ff", // Electric Blue
    "#d966ff", // Vibrant Purple
    "#ffb266", // Orange
    "#66ff8c", // Neon Green
    "#ff66a3", // Pink
    "#c4ff66", // Chartreuse
  ];

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
        dmArray.sort((a, b) => a.timestamp - b.timestamp); // Newest at bottom
      }
      setMessages(dmArray);
    });

    return () => unsubscribe();
  }, [conversationId]);

  // Assign colors to unique senders, same as Chat.tsx
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
          isOwn
            ? { backgroundColor: theme.yellow, alignSelf: "flex-end" }
            : {
                backgroundColor: "#0C3A50", // Match Chat.tsx
                alignSelf: "flex-start",
              },
        ]}
      >
        <Text
          style={{
            fontWeight: "bold",
            color: isOwn
              ? theme.black
              : assignedColors[item.senderName] || "#fff",
            marginBottom: 3,
          }}
        >
          {item.senderName}:
        </Text>
        <Text style={{ color: isOwn ? theme.black : "#fff" }}>{item.text}</Text>
        {isExpanded && (
          <Text
            style={{
              marginTop: 5,
              fontSize: 12,
              color: isOwn ? "#333" : "#ccc",
            }}
          >
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.offWhite2 }]}>
      <View
        style={[styles.headerContainer, { backgroundColor: theme.offWhite2 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome5
            name="arrow-left"
            size={24}
            color={theme.yellow}
            style={{ marginRight: 10 }}
          />
        </TouchableOpacity>
        <Text style={[styles.header, { color: topTextColor }]}>
          {friendUsername}
        </Text>
        <View style={{ width: 24, marginLeft: 10 }} />
      </View>

      <FlatList
        data={messages} // No reverse, newest at bottom
        renderItem={renderMessage}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.messagesContainer}
      />

      {cooldownMessage && (
        <View style={styles.cooldownPopup}>
          <Text style={styles.cooldownText}>{cooldownMessage}</Text>
        </View>
      )}

      <View style={[styles.inputArea, { borderTopColor: theme.yellow }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: "#114B68", // Match Chat.tsx
              borderColor: theme.yellow,
            },
          ]}
          placeholder="Type a message..."
          placeholderTextColor="#ccc"
          value={newMessageText}
          onChangeText={setNewMessageText}
          onSubmitEditing={handleSendMessage}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.sendButton, { backgroundColor: theme.yellow }]}
          onPress={handleSendMessage}
        >
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
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 15,
    elevation: 4,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  messagesContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  messageBubble: {
    maxWidth: "80%",
    marginBottom: 8,
    padding: 10,
    borderRadius: 10, // Match Chat.tsx
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
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    color: "white",
  },
  sendButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
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

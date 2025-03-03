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
} from "react-native";
import { auth, database } from "../firebase";
import { ref, onValue, push, set } from "firebase/database";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { onAuthStateChanged, User } from "firebase/auth";
import { FontAwesome5 } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/Feather";
import { Clipboard } from "react-native";

/* new theme imports */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import {
  colors,
  offWhiteTheme,
  yuckTheme,
  darkTheme,
  getRandomHexColor,
} from "../components/ColorThemes";

const SPLIT_STORAGE_KEY = "@split_state";

type DMRouteProp = RouteProp<{ DM: { friendUid: string; friendUsername: string } }, "DM">;

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

  // theming
  const [darkMode, setDarkMode] = useState(false);
  const [offWhiteMode, setOffWhiteMode] = useState(false);
  const [yuckMode, setYuckMode] = useState(false);
  const [randomMode, setRandomMode] = useState(false);
  const [randomTheme, setRandomTheme] = useState(colors);

  // load theme on focus
  useFocusEffect(
    useCallback(() => {
      const loadTheme = async () => {
        try {
          const storedData = await AsyncStorage.getItem(SPLIT_STORAGE_KEY);
          if (storedData) {
            const parsed = JSON.parse(storedData);
            if (parsed?.settings) {
              setDarkMode(parsed.settings.darkMode ?? false);
              setOffWhiteMode(parsed.settings.offWhiteMode ?? false);
              setYuckMode(parsed.settings.yuckMode ?? false);
              setRandomMode(parsed.settings.randomMode ?? false);
            }
          }
        } catch (err) {
          console.error("Error loading DM theme:", err);
        }
      };
      loadTheme();
    }, [])
  );

  // random color updates
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (randomMode) {
      intervalId = setInterval(() => {
        setRandomTheme({
          white: getRandomHexColor(),
          offWhite: getRandomHexColor(),
          offWhite2: getRandomHexColor(),
          lightGray: getRandomHexColor(),
          lightGray2: getRandomHexColor(),
          yellow: getRandomHexColor(),
          green: getRandomHexColor(),
          yuck: getRandomHexColor(),
          yuckLight: getRandomHexColor(),
          blood: getRandomHexColor(),
          orange: getRandomHexColor(),
          gray1: getRandomHexColor(),
          black: getRandomHexColor(),
          textDefault: getRandomHexColor(),
          extraYuckLight: getRandomHexColor(),
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [randomMode]);

  // pick the theme
  const currentTheme = randomMode
    ? randomTheme
    : yuckMode
    ? yuckTheme
    : offWhiteMode
    ? offWhiteTheme
    : darkMode
    ? darkTheme
    : colors;

  // top text color: black if offWhite or none, else white
  const isOffWhiteOrNone = offWhiteMode || (!darkMode && !yuckMode && !randomMode);
  const topTextColor = isOffWhiteOrNone ? "#000" : colors.lightGray2;

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [myUsername, setMyUsername] = useState<string>("");
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupX, setPopupX] = useState(0);
  const [popupY, setPopupY] = useState(0);
  const [longPressedMessage, setLongPressedMessage] = useState<DMMessage | null>(null);
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
      const remainingTime = Math.ceil((cooldown - (currentTime - lastDMSendTime)) / 1000);
      setCooldownMessage(`Please wait ${remainingTime} second${remainingTime > 1 ? "s" : ""}`);
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

  const handleBubbleLongPress = (pageX: number, pageY: number, messageItem: DMMessage) => {
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
          isOwn ? { backgroundColor: currentTheme.yellow, alignSelf: "flex-end" }
                : { backgroundColor: currentTheme.offWhite2, alignSelf: "flex-start" },
        ]}
      >
        <Text
          style={{
            fontWeight: "bold",
            color: isOwn ? "#000" : currentTheme.black,
            marginBottom: 3,
          }}
        >
          {item.senderName}:
        </Text>
        <Text style={{ color: isOwn ? "#000" : currentTheme.black }}>
          {item.text}
        </Text>
        {isExpanded && (
          <Text style={{ marginTop: 5, fontSize: 12, color: isOwn ? "#000" : "#333" }}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.offWhite2 }]}>
      {/* header */}
      <View style={[styles.headerContainer, { backgroundColor: currentTheme.offWhite2 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome5
            name="arrow-left"
            size={24}
            color={currentTheme.yellow}
            style={{ marginRight: 10 }}
          />
        </TouchableOpacity>
        {/* friend name in black if offWhite/no theme, white otherwise */}
        <Text style={[styles.header, { color: topTextColor }]}>{friendUsername}</Text>
        <View style={{ width: 24, marginLeft: 10 }} />
      </View>

      <FlatList
        data={[...messages].reverse()} // so that newest at bottom
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

      {/* input row */}
      <View style={[styles.inputArea, { borderTopColor: currentTheme.yellow }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: darkMode ? "#333" : currentTheme.lightGray2,
              borderColor: currentTheme.yellow,
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
          style={[styles.sendButton, { backgroundColor: currentTheme.yellow }]}
          onPress={handleSendMessage}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>

      {/* popup menu for copy */}
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
            <TouchableOpacity onPress={handleCopyMessage} style={styles.popupItem}>
              <View style={styles.popupItemContent}>
                <Icon name="copy" size={18} color="#fff" style={styles.popupIcon} />
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

/* updated styles to remove old references to yuck, etc. */
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
    flexDirection: "column-reverse",
  },
  messageBubble: {
    maxWidth: "80%",
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
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

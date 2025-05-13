// src/screens/DM.tsx   ← replaces the previous file
import React, { useState, useEffect, useRef } from "react";
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
  Animated,
  Dimensions,
  Clipboard,
  Alert,
} from "react-native";
import { auth, database } from "../firebase";
import { ref, onValue, push, set, get } from "firebase/database";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { onAuthStateChanged, User } from "firebase/auth";
import { FontAwesome5, FontAwesome } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/Feather";
import { useTheme } from "../context/ThemeContext";
import { colors } from "../components/ColorThemes";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

/* ---------- types ----------- */
type DMRouteProp = RouteProp<
  { DM: { friendUid: string; friendUsername: string } },
  "DM"
>;

export type BuyerType = { name: string; selected: boolean[] };
export type ItemType = {
  item: string;
  price: number;
  quantity: number;
  buyers: BuyerType[];
};
export type ReceiptData = {
  name: string;
  items: ItemType[];
  buyers: BuyerType[];
  tax: number;
  date?: string;
};

interface DMMessage {
  key: string;
  senderUid: string;
  senderName: string;
  text?: string;
  timestamp: number;
  type?: string;
  receiptData?: ReceiptData;
}

/* ---------- component ----------- */
const DM = () => {
  const { theme, mode } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<DMRouteProp>();
  const { friendUid, friendUsername } = route.params;

  const topTextColor =
    mode === "yuck" || mode === "dark" || mode === "random" ? "#fff" : "#000";

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [myUsername, setMyUsername] = useState("");
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupX, setPopupX] = useState(0);
  const [popupY, setPopupY] = useState(0);
  const [longPressed, setLongPressed] = useState<DMMessage | null>(null);
  const [lastSend, setLastSend] = useState<number>(0);
  const [cooldownMsg, setCooldownMsg] = useState<string | null>(null);
  const [assignedColors, setAssignedColors] = useState<{ [n: string]: string }>(
    {}
  );
  const flatListRef = useRef<FlatList<DMMessage>>(null);

  /* colour palette */
  const userColors = [
    "#c177d9",
    "#77d997",
    "#d97777",
    "#d9d177",
    "#77b7d9",
    "#a477d9",
    "#d9a477",
    "#9afbfc",
    "#ff9a76",
    "#baff66",
    "#ff66dc",
    "#66ffed",
    "#ffee66",
    "#ff6666",
    "#66c7ff",
    "#d966ff",
    "#ffb266",
    "#66ff8c",
    "#ff66a3",
    "#c4ff66",
  ];

  /* conversation id */
  const conversationId =
    currentUser?.uid && friendUid
      ? [currentUser.uid, friendUid].sort().join("_")
      : "";

  /* ---- listeners / initialisation ---- */
  useEffect(() => onAuthStateChanged(auth, (u) => setCurrentUser(u)), []);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onValue(
      ref(database, `users/${currentUser.uid}/username`),
      (snap) => snap.exists() && setMyUsername(snap.val())
    );
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!conversationId) return;
    const dmRef = ref(database, `DMs/${conversationId}`);
    const unsub = onValue(dmRef, (snap) => {
      const arr: DMMessage[] = [];
      snap.forEach((c) => {
        const d = c.val() || {};
        arr.push({
          key: c.key!,
          senderUid: d.senderUid,
          senderName: d.senderName,
          text: d.text,
          timestamp: d.timestamp,
          type: d.type,
          receiptData: d.receiptData,
        });
      });
      arr.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(arr);
      flatListRef.current?.scrollToEnd({ animated: true });
    });
    return () => unsub();
  }, [conversationId]);

  /* bubble colours */
  useEffect(() => {
    const uniq = new Set(messages.map((m) => m.senderName));
    const map = { ...assignedColors };
    let idx = Object.keys(map).length;
    uniq.forEach((n) => {
      if (!map[n]) {
        map[n] = userColors[idx % userColors.length];
        idx++;
      }
    });
    setAssignedColors(map);
  }, [messages]);

  /* send plain text */
  const handleSend = async () => {
    if (!currentUser || !conversationId || !newMessageText.trim()) return;
    const now = Date.now();
    if (now - lastSend < 1000) {
      setCooldownMsg("wait a sec…");
      setTimeout(() => setCooldownMsg(null), 1200);
      return;
    }
    await set(push(ref(database, `DMs/${conversationId}`)), {
      text: newMessageText.trim(),
      timestamp: now,
      senderUid: currentUser.uid,
      senderName: myUsername || "unknown",
    });
    setNewMessageText("");
    setLastSend(now);
  };

  /* upload receipt button */
  const handleUploadReceipt = () => {
    if (!myUsername) return;
    navigation.navigate("UploadReceipt", { dmId: conversationId, myUsername });
  };

  /* toggle / long-press helpers */
  const toggleExpanded = (k: string) =>
    setExpanded((p) => ({ ...p, [k]: !p[k] }));
  const handleLong = (x: number, y: number, item: DMMessage) => {
    setLongPressed(item);
    const screenH = Dimensions.get("window").height;
    setPopupX(x);
    setPopupY(Math.min(y, screenH - 120));
    setPopupVisible(true);
  };
  const copyMsg = () => {
    if (!longPressed) return;
    if ("clipboard" in navigator)
      navigator.clipboard.writeText(longPressed.text ?? "");
    else Clipboard.setString(longPressed.text ?? "");
    setPopupVisible(false);
  };

  /* -------- render each row -------- */
  const Row = ({ item }: { item: DMMessage }) => {
    const own = item.senderUid === currentUser?.uid;
    const isReceipt = item.type === "receipt" && item.receiptData;
    const show = expanded[item.key];

    /* receipt bubble */
    if (isReceipt) {
      const r = item.receiptData!;
      const buyersOf = (it: ItemType) =>
        (it.buyers ?? [])
          .filter((b) => Array.isArray(b.selected) && b.selected.some(Boolean))
          .map((b) => b.name)
          .join(", ");
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => toggleExpanded(item.key)}
          onLongPress={(e) =>
            handleLong(e.nativeEvent.pageX, e.nativeEvent.pageY, item)
          }
          style={[
            styles.messageBubble,
            styles.receiptBubble,
            own ? styles.currentUserReceipt : styles.otherUserReceipt,
          ]}
        >
          <Text
            style={[
              styles.senderName,
              own
                ? styles.currentUserSender
                : { color: assignedColors[item.senderName] || "#fff" },
            ]}
          >
            {item.senderName} uploaded a receipt
          </Text>

          <Text style={styles.receiptTitle}>{r.name}</Text>

          {show && (
            <>
              <Text style={styles.receiptInfo}>
                tax: ${r.tax?.toFixed(2) ?? "0.00"}
              </Text>

              <View style={styles.itemList}>
                {r.items.map((it, i) => {
                  const tot = it.price * it.quantity;
                  return (
                    <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemText}>
                        {it.item} (x{it.quantity}) – ${tot.toFixed(2)}
                      </Text>
                      <Text style={styles.buyerText}>
                        buyers: {buyersOf(it) || "none"}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.timeText}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
            </>
          )}
        </TouchableOpacity>
      );
    }

    /* plain text bubble */
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => toggleExpanded(item.key)}
        onLongPress={(e) =>
          handleLong(e.nativeEvent.pageX, e.nativeEvent.pageY, item)
        }
        style={[
          styles.messageBubble,
          own
            ? { backgroundColor: theme.yellow, alignSelf: "flex-end" }
            : { backgroundColor: "#0C3A50", alignSelf: "flex-start" },
        ]}
      >
        <Text
          style={[
            styles.senderName,
            own
              ? styles.currentUserSender
              : { color: assignedColors[item.senderName] || "#fff" },
          ]}
        >
          {item.senderName}:
        </Text>
        <Text style={{ color: own ? theme.black : "#fff" }}>
          {item.text ?? ""}
        </Text>
        {show && (
          <Text style={styles.timePlain}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  /* ui ------------ */
  return (
    <View style={[styles.container, { backgroundColor: theme.offWhite2 }]}>
      {/* header */}
      <View style={[styles.headerBar, { backgroundColor: theme.offWhite2 }]}>
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

      {/* list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={Row}
        keyExtractor={(i) => i.key}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {cooldownMsg && (
        <View style={styles.cooldownPopup}>
          <Text style={styles.cooldownText}>{cooldownMsg}</Text>
        </View>
      )}

      {/* input row */}
      <View style={[styles.inputArea, { borderTopColor: theme.yellow }]}>
        <TouchableOpacity onPress={handleUploadReceipt} style={styles.iconWrap}>
          <FontAwesome name="file-text-o" size={24} color={theme.yellow} />
        </TouchableOpacity>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: "#114B68", borderColor: theme.yellow },
          ]}
          placeholder="type a message…"
          placeholderTextColor="#ccc"
          value={newMessageText}
          onChangeText={setNewMessageText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.sendButton, { backgroundColor: theme.yellow }]}
          onPress={handleSend}
        >
          <Text style={styles.sendText}>send</Text>
        </Pressable>
      </View>

      {/* popup */}
      <Modal visible={popupVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setPopupVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        {popupVisible && (
          <Animated.View
            style={[
              styles.popup,
              {
                top: popupY,
                left: Math.min(popupX, Dimensions.get("window").width - 180),
              },
            ]}
          >
            <TouchableOpacity onPress={copyMsg} style={styles.popupItem}>
              <View style={styles.popupRow}>
                <Icon
                  name="copy"
                  size={18}
                  color="#fff"
                  style={{ marginRight: 12 }}
                />
                <Text style={styles.popupText}>copy</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Modal>
    </View>
  );
};

export default DM;

/* -------------- styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  header: { fontSize: 20, fontWeight: "bold", flex: 1, textAlign: "center" },

  /* list */
  messagesContainer: { paddingHorizontal: 10, paddingBottom: 10 },
  messageBubble: {
    maxWidth: "95%",
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
  },

  /* plain bubble bits */
  senderName: { fontWeight: "bold", marginBottom: 3 },
  currentUserSender: { color: "#000" },
  timePlain: { marginTop: 5, fontSize: 12, color: "#ccc" },

  /* receipt bubble colours */
  receiptBubble: { backgroundColor: "#194D33" },
  currentUserReceipt: { alignSelf: "flex-end", backgroundColor: "#194D33"},
  otherUserReceipt: { alignSelf: "flex-start" },

  /* receipt bubble text */
  receiptTitle: { fontWeight: "600", color: "#fff", marginTop: 2 },
  receiptInfo: { color: "#ddd", marginTop: 4 },
  itemList: { marginTop: 6 },
  itemRow: { marginBottom: 4 },
  itemText: { color: "#fff" },
  buyerText: { color: "#ccc", fontSize: 12, marginLeft: 10 },
  timeText: { marginTop: 5, fontSize: 12, color: "#ccc" },

  /* cooldown + input */
  cooldownPopup: {
    position: "absolute",
    bottom: 70,
    left: 10,
    right: 10,
    backgroundColor: "rgba(128,128,128,0.9)",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cooldownText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  inputArea: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    alignItems: "center",
  },
  iconWrap: { padding: 5, marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    color: "#fff",
  },
  sendButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: "center",
  },
  sendText: { color: "#000", fontWeight: "bold", fontSize: 16 },

  /* popup */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  popup: {
    position: "absolute",
    width: 180,
    backgroundColor: "#1E2A38",
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  popupItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  popupRow: { flexDirection: "row", alignItems: "center" },
  popupText: { color: "#fff", fontSize: 16, fontWeight: "500" },
});

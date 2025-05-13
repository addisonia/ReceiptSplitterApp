// screens/UploadReceipt.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome";
import colors from "../../constants/colors";
import { auth, database } from "../firebase";
import { ref, onValue, push, set } from "firebase/database";

/* buyer, item, and receipt types */
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
  time_and_date: string;
};

export default function UploadReceipt() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  /* params: may come from a group or from a dm */
  const groupId: string | undefined = route.params?.groupId;
  const dmId: string | undefined = route.params?.dmId;
  const chatUsername: string = route.params?.myUsername ?? "unknown user";

  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [backIconColor, setBackIconColor] = useState(colors.yellow);

  /* load my receipts from firebase */
  useEffect(() => {
    if (!auth.currentUser) return;
    const receiptsRef = ref(database, `receipts/${auth.currentUser.uid}`);
    const unsub = onValue(receiptsRef, (snap) => {
      if (!snap.exists()) return setReceipts([]);
      const data = snap.val() || {};
      const list: ReceiptData[] = Object.keys(data).map((k) =>
        normalizeReceiptData(k, data[k])
      );
      list.sort(
        (a, b) =>
          new Date(b.time_and_date).getTime() -
          new Date(a.time_and_date).getTime()
      );
      setReceipts(list);
    });
    return () => unsub();
  }, []);

  /* user taps a receipt to send */
  async function handleSelectReceipt(r: ReceiptData) {
    if (!auth.currentUser) return;

    /* decide where to post */
    const path = groupId
      ? `groupChats/${groupId}/messages`
      : dmId
      ? `DMs/${dmId}`
      : null;

    if (!path) {
      Alert.alert("no destination chat found.");
      return;
    }

    try {
      const newRef = push(ref(database, path));
      const payload = {
        type: "receipt",
        timestamp: Date.now(),
        senderUid: auth.currentUser.uid,
        senderName: chatUsername,
        receiptData: {
          name: r.name,
          date: r.time_and_date,
          tax: r.tax,
          items: r.items,
          buyers: r.buyers,
        },
      };
      await set(newRef, payload);
      navigation.goBack();
    } catch (err) {
      Alert.alert("error", "unable to upload the receipt.");
      console.error("upload receipt error:", err);
    }
  }

  function handleBack() {
    navigation.goBack();
  }

  const calcTotal = (rcpt: ReceiptData) =>
    rcpt.items.reduce((s, i) => s + i.price * i.quantity, 0) + (rcpt.tax || 0);

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor={colors.yuck} />

      <View style={styles.topBar}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          onPressIn={() => setBackIconColor(colors.green)}
          onPressOut={() => setBackIconColor(colors.yellow)}
        >
          <Icon name="arrow-left" size={24} color={backIconColor} />
        </Pressable>
        <Text style={styles.header}>upload a receipt</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {receipts.map((r) => (
          <Pressable
            key={r.name}
            onPress={() => handleSelectReceipt(r)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: pressed ? colors.graygreen : "#333" },
            ]}
          >
            <Text style={styles.cardText}>{r.name}</Text>
            <Text style={styles.cardSubText}>
              {r.time_and_date
                ? new Date(r.time_and_date).toLocaleString()
                : ""}
            </Text>
            <Text style={styles.cardTotal}>
              total: ${calcTotal(r).toFixed(2)}
            </Text>
          </Pressable>
        ))}

        {receipts.length === 0 && (
          <Text style={styles.emptyText}>no receipts found.</Text>
        )}
      </ScrollView>
    </View>
  );
}

/* helpers */
function normalizeReceiptData(key: string, d: any): ReceiptData {
  return {
    name: key,
    items: Array.isArray(d.items) ? d.items.map(normalizeItem) : [],
    buyers: Array.isArray(d.buyers) ? d.buyers.map(normalizeBuyer) : [],
    tax: typeof d.tax === "number" ? d.tax : 0,
    time_and_date: typeof d.time_and_date === "string" ? d.time_and_date : "",
  };
}
const normalizeBuyer = (b: any): BuyerType => ({
  name: typeof b?.name === "string" ? b.name : "unknownbuyer",
  selected: Array.isArray(b?.selected) ? b.selected : [],
});
const normalizeItem = (it: any): ItemType => ({
  item: typeof it?.item === "string" ? it.item : "unnamed",
  price: typeof it?.price === "number" ? it.price : 0,
  quantity: typeof it?.quantity === "number" ? it.quantity : 1,
  buyers: Array.isArray(it?.buyers) ? it.buyers.map(normalizeBuyer) : [],
});

/* styles in lowercase */
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.yuck },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: colors.yuck,
  },
  backButton: { padding: 10 },
  header: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  headerSpacer: { width: 40 },
  contentContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 20,
  },
  card: {
    padding: 12,
    marginBottom: 15,
    backgroundColor: "#333",
    borderRadius: 6,
    width: "90%",
  },
  cardText: { fontSize: 18, fontWeight: "600", color: "#fff", marginBottom: 5 },
  cardSubText: { fontSize: 12, color: "#ccc", marginBottom: 5 },
  cardTotal: { fontSize: 16, color: "#fff", marginBottom: 10 },
  emptyText: { marginTop: 20, fontSize: 14, color: "#fff" },
});

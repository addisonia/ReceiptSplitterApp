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

/* define buyer, item, and receipt types */
export type BuyerType = {
  name: string;
  selected: boolean[];
};

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

  // the group id passed from Chat
  const groupId = route.params?.groupId;
  // the username from Chat
  const chatUsername = route.params?.myUsername || "Unknown User";

  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [backIconColor, setBackIconColor] = useState(colors.yellow);

  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const receiptsRef = ref(database, `receipts/${userId}`);

    const unsubscribe = onValue(receiptsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setReceipts([]);
        return;
      }
      const data = snapshot.val() || {};
      const loaded = Object.keys(data).map((key) =>
        normalizeReceiptData(key, data[key])
      );
      // sort by most recent date
      loaded.sort(
        (a, b) =>
          new Date(b.time_and_date).getTime() -
          new Date(a.time_and_date).getTime()
      );
      setReceipts(loaded);
    });

    return () => unsubscribe();
  }, []);

  async function handleSelectReceipt(receipt: ReceiptData) {
    try {
      if (!auth.currentUser) return;
      if (!groupId) {
        Alert.alert("No group found.");
        return;
      }
      const groupMessagesRef = ref(database, `groupChats/${groupId}/messages`);
      const newGroupMsgRef = push(groupMessagesRef);

      const userUid = auth.currentUser.uid;
      const senderName = chatUsername; // use the username from chat

      // build a full payload with receipt data
      const messagePayload = {
        type: "receipt",
        timestamp: Date.now(),
        senderUid: userUid,
        senderName: senderName,
        receiptData: {
          name: receipt.name,
          date: receipt.time_and_date,
          tax: receipt.tax,
          items: receipt.items,
          buyers: receipt.buyers,
        },
      };

      await set(newGroupMsgRef, messagePayload);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Unable to upload the receipt.");
      console.error("error uploading receipt:", error);
    }
  }

  function handleBack() {
    navigation.goBack();
  }

  function calculateTotal(receipt: ReceiptData) {
    return (
      receipt.items.reduce((sum, item) => sum + item.price * item.quantity, 0) +
      (receipt.tax || 0)
    );
  }

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
        <Text style={styles.header}>Upload A Receipt</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {receipts.map((receipt) => {
          const totalCost = calculateTotal(receipt);
          return (
            <Pressable
              key={receipt.name}
              onPress={() => handleSelectReceipt(receipt)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: pressed ? colors.graygreen : "#333" },
              ]}
            >
              <Text style={styles.cardText}>{receipt.name}</Text>
              <Text style={styles.cardSubText}>
                {receipt.time_and_date
                  ? new Date(receipt.time_and_date).toLocaleString()
                  : ""}
              </Text>
              <Text style={styles.cardTotal}>
                Total: ${totalCost.toFixed(2)}
              </Text>
            </Pressable>
          );
        })}
        {receipts.length === 0 && (
          <Text style={styles.emptyText}>No receipts found.</Text>
        )}
      </ScrollView>
    </View>
  );
}

// helper functions for normalizing
function normalizeReceiptData(receiptKey: string, rawData: any): ReceiptData {
  return {
    name: receiptKey,
    items: Array.isArray(rawData.items) ? rawData.items.map(normalizeItem) : [],
    buyers: Array.isArray(rawData.buyers)
      ? rawData.buyers.map(normalizeBuyer)
      : [],
    tax: typeof rawData.tax === "number" ? rawData.tax : 0,
    time_and_date:
      typeof rawData.time_and_date === "string" ? rawData.time_and_date : "",
  };
}

function normalizeBuyer(rawBuyer: any): BuyerType {
  return {
    name: typeof rawBuyer.name === "string" ? rawBuyer.name : "UnknownBuyer",
    selected: Array.isArray(rawBuyer.selected) ? rawBuyer.selected : [],
  };
}

function normalizeItem(rawItem: any): ItemType {
  return {
    item: typeof rawItem.item === "string" ? rawItem.item : "Unnamed",
    price: typeof rawItem.price === "number" ? rawItem.price : 0,
    quantity: typeof rawItem.quantity === "number" ? rawItem.quantity : 1,
    buyers: Array.isArray(rawItem.buyers)
      ? rawItem.buyers.map(normalizeBuyer)
      : [],
  };
}

/* styles in lowercase */
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.yuck,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: colors.yuck,
  },
  backButton: {
    padding: 10,
  },
  header: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
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
  cardText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 5,
  },
  cardSubText: {
    fontSize: 12,
    color: "#ccc",
    marginBottom: 5,
  },
  cardTotal: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 10,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 14,
    color: "#fff",
  },
});

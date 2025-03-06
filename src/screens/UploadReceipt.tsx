// src/screens/UploadReceipts.tsx
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, database } from "../firebase";
import { ref, onValue } from "firebase/database";
import Icon from "react-native-vector-icons/FontAwesome";
import { useTheme } from "../context/ThemeContext";

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

function normalizeBuyer(rawBuyer: any): BuyerType {
  if (typeof rawBuyer === "string") {
    return { name: rawBuyer, selected: [] };
  }
  if (rawBuyer && typeof rawBuyer === "object") {
    let realName = "";
    if (typeof rawBuyer.name === "string") {
      realName = rawBuyer.name;
    } else {
      realName = JSON.stringify(rawBuyer.name ?? "???");
    }
    const sel = Array.isArray(rawBuyer.selected)
      ? rawBuyer.selected.filter((val: any) => typeof val === "boolean")
      : [];
    return { name: realName, selected: sel };
  }
  return { name: "UnknownBuyer", selected: [] };
}

function normalizeItem(rawItem: any): ItemType {
  let iName = "";
  if (typeof rawItem.item === "string") {
    iName = rawItem.item;
  } else if (rawItem.item && typeof rawItem.item === "object") {
    iName = JSON.stringify(rawItem.item);
  } else {
    iName = "Unnamed";
  }
  const priceNum =
    typeof rawItem.price === "number" && !isNaN(rawItem.price)
      ? rawItem.price
      : 0;
  const qty =
    typeof rawItem.quantity === "number" && rawItem.quantity > 0
      ? rawItem.quantity
      : 1;
  let itemBuyers: BuyerType[] = [];
  if (Array.isArray(rawItem.buyers)) {
    itemBuyers = rawItem.buyers.map(normalizeBuyer);
  } else if (Array.isArray(rawItem.selectedBy)) {
    itemBuyers = rawItem.selectedBy.map((nameStr: string) => ({
      name: nameStr,
      selected: Array(qty).fill(true),
    }));
  } else {
    itemBuyers = [];
  }
  return {
    item: iName,
    price: priceNum,
    quantity: qty,
    buyers: itemBuyers,
  };
}

function normalizeReceiptData(receiptKey: string, rawData: any): ReceiptData {
  const t =
    typeof rawData.time_and_date === "string" ? rawData.time_and_date : "";
  let topBuyers: BuyerType[] = [];
  if (Array.isArray(rawData.buyers)) {
    topBuyers = rawData.buyers.map(normalizeBuyer);
  } else {
    topBuyers = [];
  }
  const rawItems = Array.isArray(rawData.items) ? rawData.items : [];
  const items: ItemType[] = rawItems.map(normalizeItem);
  let theTax = 0;
  if (typeof rawData.tax === "number" && !isNaN(rawData.tax)) {
    theTax = rawData.tax;
  }
  return {
    name: receiptKey,
    items,
    buyers: topBuyers,
    tax: theTax,
    time_and_date: t,
  };
}

export default function UploadReceipts() {
  const { theme, mode } = useTheme();
  const navigation = useNavigation<any>();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [backIconColor, setBackIconColor] = useState(theme.yellow);

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
      loaded.sort(
        (a, b) =>
          new Date(b.time_and_date).getTime() -
          new Date(a.time_and_date).getTime()
      );
      setReceipts(loaded);
    });

    return () => unsubscribe();
  }, []);

  function handleSelectReceipt(receipt: ReceiptData) {
    navigation.navigate("MainTabs", {
      screen: "Split",
      params: { importedReceipt: receipt },
    });
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
    <View style={[styles.mainContainer, { backgroundColor: theme.offWhite2 }]}>
      <StatusBar
        barStyle={
          mode === "offWhite" || mode === "default"
            ? "dark-content"
            : "light-content"
        }
        backgroundColor={theme.offWhite2}
      />

      <View style={[styles.topBar, { backgroundColor: theme.offWhite2 }]}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          onPressIn={() => setBackIconColor(theme.green)}
          onPressOut={() => setBackIconColor(theme.yellow)}
        >
          <Icon name="arrow-left" size={24} color={backIconColor} />
        </Pressable>
        {/* text color changes based on mode to make it darker in offWhite/default */}
        <Text
          style={[
            styles.header,
            {
              color:
                mode === "offWhite" || mode === "default" ? "#222" : "#fff",
            },
          ]}
        >
          Import Receipts
        </Text>
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
                {
                  backgroundColor:
                    mode === "dark"
                      ? pressed
                        ? theme.offWhite
                        : theme.lightGray2
                      : mode === "yuck"
                      ? pressed
                        ? theme.green
                        : theme.yellow
                      : mode === "default"
                      ? pressed
                        ? theme.offWhite2
                        : theme.lightGray2
                      : pressed
                      ? theme.lightGray
                      : "#b3ad9d",
                },
              ]}
            >
              <Text
                style={[
                  styles.cardText,
                  { color: mode === "dark" ? "#fff" : "#222" },
                ]}
              >
                {receipt.name}
              </Text>
              <Text
                style={[
                  styles.cardSubText,
                  { color: mode === "dark" ? "#ccc" : "#555" },
                ]}
              >
                {receipt.time_and_date
                  ? new Date(receipt.time_and_date).toLocaleString()
                  : ""}
              </Text>
              <Text
                style={[
                  styles.cardTotal,
                  { color: mode === "dark" ? "#fff" : "#222" },
                ]}
              >
                Total: ${totalCost.toFixed(2)}
              </Text>
            </Pressable>
          );
        })}
        {receipts.length === 0 && (
          <Text
            style={[
              styles.emptyText,
              { color: mode === "dark" ? "#fff" : "#222" },
            ]}
          >
            No receipts found.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backButton: {
    padding: 10,
  },
  header: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
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
    borderRadius: 6,
    width: "90%",
  },
  cardText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 5,
  },
  cardSubText: {
    fontSize: 12,
    marginBottom: 5,
  },
  cardTotal: {
    fontSize: 16,
    marginBottom: 10,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 14,
  },
});

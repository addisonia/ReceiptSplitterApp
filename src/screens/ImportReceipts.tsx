// ImportReceipts.tsx
import React, { useEffect, useState } from "react";
import { ScrollView, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, database } from "../firebase";
import { ref, onValue } from "firebase/database";

// The same types your Split screen expects
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

// A helper to force a weird/old data "buyer" into the { name: string, selected: boolean[] } shape.
function normalizeBuyer(rawBuyer: any): BuyerType {
  // handle the case rawBuyer is a string (old format had just names in an array)
  if (typeof rawBuyer === "string") {
    return { name: rawBuyer, selected: [] };
  }

  // if it's already an object, read `.name` and `.selected`
  if (rawBuyer && typeof rawBuyer === "object") {
    let realName = "";
    if (typeof rawBuyer.name === "string") {
      realName = rawBuyer.name;
    } else {
      // fallback: if .name is not a string, just string-ify it
      realName = JSON.stringify(rawBuyer.name ?? "???");
    }
    const sel = Array.isArray(rawBuyer.selected)
      ? rawBuyer.selected.filter((val: any) => typeof val === "boolean")
      : [];

    return { name: realName, selected: sel };
  }

  // fallback if rawBuyer is null, undefined, or weird
  return { name: "UnknownBuyer", selected: [] };
}

// Force an item into the shape your Split screen expects
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

  // if the old format had "selectedBy" = ["Alice","Bob"], transform it
  // if the new format has "buyers" = [ { name, selected } ], normalize them
  let itemBuyers: BuyerType[] = [];
  if (Array.isArray(rawItem.buyers)) {
    itemBuyers = rawItem.buyers.map(normalizeBuyer);
  } else if (Array.isArray(rawItem.selectedBy)) {
    // old approach: item.selectedBy = ['Alice', 'Bob']
    itemBuyers = rawItem.selectedBy.map((nameStr: string) => ({
      name: nameStr,
      selected: Array(qty).fill(true),
    }));
  } else {
    // fallback: no buyer info
    itemBuyers = [];
  }

  return {
    item: iName,
    price: priceNum,
    quantity: qty,
    buyers: itemBuyers,
  };
}

// Force the entire receipt object into shape
function normalizeReceiptData(receiptKey: string, rawData: any): ReceiptData {
  // time
  const t =
    typeof rawData.time_and_date === "string" ? rawData.time_and_date : "";

  // top-level buyers
  let topBuyers: BuyerType[] = [];
  if (Array.isArray(rawData.buyers)) {
    topBuyers = rawData.buyers.map(normalizeBuyer);
  } else {
    // fallback: no explicit top-level buyers
    topBuyers = [];
  }

  // items
  const rawItems = Array.isArray(rawData.items) ? rawData.items : [];
  const items: ItemType[] = rawItems.map(normalizeItem);

  // tax
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

export default function ImportReceipts() {
  const navigation = useNavigation<any>();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);

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

      // Convert each raw receipt into the shape your Split screen expects
      const loaded = Object.keys(data).map((key) =>
        normalizeReceiptData(key, data[key])
      );

      // Sort by date descending (newest first)
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
    // now we pass a fully normalized receipt to Split
    navigation.navigate("MainTabs", {
      screen: "Split",
      params: { importedReceipt: receipt },
    });
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Import Receipts</Text>
      {receipts.map((receipt) => (
        <Pressable
          key={receipt.name}
          onPress={() => handleSelectReceipt(receipt)}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: pressed ? "#ffe600" : "#ffff99" },
          ]}
        >
          <Text style={styles.cardText}>{receipt.name}</Text>
          <Text style={styles.cardSubText}>
            {receipt.time_and_date
              ? new Date(receipt.time_and_date).toLocaleString()
              : ""}
          </Text>
        </Pressable>
      ))}
      {receipts.length === 0 && (
        <Text style={styles.emptyText}>No receipts found.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "yellow",
    padding: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  card: {
    padding: 15,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 5,
  },
  cardText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  cardSubText: {
    fontSize: 12,
    color: "#555",
  },
  emptyText: {
    marginTop: 20,
    fontSize: 14,
    color: "#333",
  },
});

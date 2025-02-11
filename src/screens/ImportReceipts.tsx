// src/screens/ImportReceipts.tsx

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { auth, database } from "../firebase";
import { ref, onValue } from "firebase/database";

// define the shape of a single "Receipt"
export type ReceiptData = {
  name: string;
  items: any[];
  buyers: any[];
  tax: number;
  time_and_date: string;
};

export default function ImportReceipts() {
  // navigation
  const navigation = useNavigation<any>();

  // local state to hold the list of receipts
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);

  useEffect(() => {
    // fetch receipts from your realtime db
    if (!auth.currentUser) return;

    const userId = auth.currentUser.uid;
    const receiptsRef = ref(database, `receipts/${userId}`);

    const unsubscribe = onValue(receiptsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() || {};
        // transform the object into an array
        const loadedReceipts: ReceiptData[] = Object.keys(data).map((key) => ({
          name: key,
          items: data[key].items || [],
          buyers: data[key].buyers || [],
          tax: data[key].tax || 0,
          time_and_date: data[key].time_and_date,
        }));
        setReceipts(loadedReceipts);
      } else {
        setReceipts([]);
      }
    });

    // cleanup listener
    return () => unsubscribe();
  }, []);

  // called when user taps a receipt
  const handleSelectReceipt = (receipt: ReceiptData) => {
    navigation.navigate("MainTabs", {
      screen: "Split",
      params: { importedReceipt: receipt },
    });
    
  };

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
            {receipt.time_and_date ? new Date(receipt.time_and_date).toLocaleString() : ""}
          </Text>
        </Pressable>
      ))}
      {receipts.length === 0 && (
        <Text style={styles.emptyText}>No receipts found.</Text>
      )}
    </ScrollView>
  );
}

// styles
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

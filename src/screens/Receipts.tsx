import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
// firebase imports
import { getDatabase, ref, get } from "firebase/database";
import { auth } from "../firebase"; // import your configured auth
import Icon from "react-native-vector-icons/FontAwesome";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/RootStackParams"; // or wherever your types are
import colors from "../../constants/colors";

type ReceiptsScreenProp = StackNavigationProp<RootStackParamList, "Receipts">;

const Receipts = () => {
  const navigation = useNavigation<ReceiptsScreenProp>();

  // store the receipts in local state
  const [receipts, setReceipts] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [homeIconColor, setHomeIconColor] = useState(colors.yellow);

  const user = auth.currentUser;

  // fetch receipts on mount if user is valid
  useEffect(() => {
    let isMounted = true;
    const fetchReceipts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const db = getDatabase();
        const userReceiptsRef = ref(db, `receipts/${user.uid}`);
        const snapshot = await get(userReceiptsRef);
        if (!isMounted) return;
        if (snapshot.exists()) {
          setReceipts(snapshot.val());
        } else {
          setReceipts(null);
        }
      } catch (error) {
        console.error("Error fetching receipts:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReceipts();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // navigate home
  const goHome = () => {
    setHomeIconColor(colors.green);
    navigation.navigate("MainTabs"); // or "MainTabs", whichever you prefer
  };

  // helper to render each receipt
  const renderReceipts = () => {
    if (!receipts) {
      return <Text style={styles.noReceiptsText}>No receipts found.</Text>;
    }
    // convert object to an array of [receiptName, data], then sort by date
    const sortedEntries = Object.entries(receipts).sort((a, b) => {
      const dateA = new Date(a[1].time_and_date);
      const dateB = new Date(b[1].time_and_date);
      return dateB.getTime() - dateA.getTime(); // descending
    });

    return sortedEntries.map(([receiptName, receiptData]) => {
      // compute total cost
      let totalCost = 0;
      if (receiptData.items) {
        totalCost =
          receiptData.items.reduce(
            (sum: number, item: any) => sum + item.price * item.quantity,
            0
          ) + (receiptData.tax || 0);
      }
      const dateString = new Date(receiptData.time_and_date).toLocaleString();

      return (
        <View key={receiptName} style={styles.receiptCard}>
          <Text style={styles.receiptTitle}>{receiptName}</Text>
          <Text style={styles.receiptDate}>Date: {dateString}</Text>
          <Text style={styles.receiptCost}>Total: ${totalCost.toFixed(2)}</Text>

          {receiptData.items && receiptData.items.length > 0 ? (
            receiptData.items.map((item: any, idx: number) => (
              <Text key={idx} style={styles.itemText}>
                {item.item} (x{item.quantity}) - ${item.price.toFixed(2)} each
              </Text>
            ))
          ) : (
            <Text style={styles.noItemsText}>No items in this receipt</Text>
          )}
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* top row with home button */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={goHome}
          onPressIn={() => setHomeIconColor(colors.green)}
          onPressOut={() => setHomeIconColor(colors.yellow)}
        >
          <Icon name="home" size={30} color={homeIconColor} />
        </TouchableOpacity>

        <Text style={styles.screenTitle}>Receipts</Text>

        {/* Invisible spacer so "Receipts" text remains centered */}
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.contentArea}>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <ScrollView style={styles.scrollArea}>{renderReceipts()}</ScrollView>
        )}
      </View>
    </View>
  );
};

export default Receipts;

// write comments in lowercase
const { width: screenWidth } = Dimensions.get("window");
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yuck,
    paddingTop: 40,
    alignItems: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // ensures elements are spaced apart
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical: 10,
    top: -10,
  },

  homeButton: {
    padding: 10, // increases tap area
  },

  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    flex: 1, // makes it take up available space while centering
  },

  contentArea: {
    flex: 1,
    width: "90%",
  },
  scrollArea: {
    flex: 1,
    marginTop: 10,
  },
  noReceiptsText: {
    color: "#fff",
    marginTop: 20,
    fontSize: 16,
  },
  receiptCard: {
    backgroundColor: "#333",
    marginBottom: 15,
    padding: 12,
    borderRadius: 6,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 5,
  },
  receiptDate: {
    color: "#ccc",
    marginBottom: 5,
  },
  receiptCost: {
    color: "#fff",
    marginBottom: 10,
  },
  itemText: {
    color: "#fff",
  },
  noItemsText: {
    color: "#fff",
    fontStyle: "italic",
  },
});

// src/screens/Receipts.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Animated,
} from "react-native";
import { getDatabase, ref, get, remove } from "firebase/database";
import { auth } from "../firebase";
import Icon from "react-native-vector-icons/FontAwesome";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/RootStackParams";
import { useTheme } from "../context/ThemeContext";
import colors from "../../constants/colors";

type ReceiptsScreenProp = StackNavigationProp<RootStackParamList, "Receipts">;

const Receipts = () => {
  const { theme, mode } = useTheme();
  const navigation = useNavigation<ReceiptsScreenProp>();

  const [receipts, setReceipts] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [homeIconColor, setHomeIconColor] = useState(
    mode === "yuck" ? "#e3d400" : theme.yellow
  );
  const [editMode, setEditMode] = useState(false);
  const [editIconColor, setEditIconColor] = useState(
    mode === "yuck" ? "#e3d400" : theme.yellow
  );
  const [expandedReceipts, setExpandedReceipts] = useState<{
    [key: string]: boolean;
  }>({});

  const user = auth.currentUser;

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
        console.error("error fetching receipts:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReceipts();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const goHome = () => {
    setHomeIconColor(mode === "yuck" ? "#08f800" : theme.green);
    navigation.navigate("MainTabs", { screen: "Home" });
    setTimeout(
      () => setHomeIconColor(mode === "yuck" ? "#e3d400" : theme.yellow),
      200
    );
  };

  const toggleEditMode = () => {
    setEditMode((prev) => !prev);
  };

  const toggleExpand = (receiptName: string) => {
    setExpandedReceipts((prev) => ({
      ...prev,
      [receiptName]: !prev[receiptName],
    }));
  };

  const deleteReceipt = async (receiptName: string) => {
    if (!user) return;
    try {
      const db = getDatabase();
      await remove(ref(db, `receipts/${user.uid}/${receiptName}`));
      setReceipts((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        delete updated[receiptName];
        return updated;
      });
    } catch (error) {
      console.error("error deleting receipt:", error);
    }
  };

  const ShakingTrash = ({ onPress }: { onPress: () => void }) => {
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, [shakeAnim]);

    const rotation = shakeAnim.interpolate({
      inputRange: [-1, 1],
      outputRange: ["-10deg", "10deg"],
    });

    return (
      <TouchableOpacity onPress={onPress} style={styles.trashButton}>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Icon name="trash" size={20} color="red" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderReceipts = () => {
    if (!receipts) {
      return <Text style={styles.noReceiptsText}>no receipts found.</Text>;
    }
    const sortedEntries = Object.entries(receipts).sort((a, b) => {
      const dateA = new Date(a[1].time_and_date);
      const dateB = new Date(b[1].time_and_date);
      return dateB.getTime() - dateA.getTime();
    });

    return sortedEntries.map(([receiptName, receiptData]) => {
      let totalCost = 0;
      if (receiptData.items) {
        totalCost =
          receiptData.items.reduce(
            (sum: number, item: any) => sum + item.price * item.quantity,
            0
          ) + (receiptData.tax || 0);
      }
      const dateString = new Date(receiptData.time_and_date).toLocaleString();
      const isExpanded = !!expandedReceipts[receiptName];

      return (
        <View key={receiptName} style={styles.receiptCard}>
          {editMode && (
            <ShakingTrash onPress={() => deleteReceipt(receiptName)} />
          )}
          <Text style={styles.receiptTitle}>{receiptName}</Text>
          <Text style={styles.receiptDate}>date: {dateString}</Text>
          <Text style={styles.receiptCost}>total: ${totalCost.toFixed(2)}</Text>

          {isExpanded && receiptData.items && receiptData.items.length > 0 && (
            <>
              {receiptData.items.map((item: any, idx: number) => {
                const selectedBuyers = item.buyers
                  ? item.buyers.filter((b: any) =>
                      Array.isArray(b.selected)
                        ? b.selected.includes(true)
                        : b.selected
                    )
                  : [];
                return (
                  <View key={idx} style={styles.itemContainer}>
                    <Text style={styles.itemText}>
                      {item.item} (x{item.quantity}) - ${item.price.toFixed(2)}
                    </Text>
                    {selectedBuyers.length > 0 && (
                      <Text style={styles.buyersText}>
                        buyers:{" "}
                        {selectedBuyers.map((b: any) => b.name).join(", ")}
                      </Text>
                    )}
                  </View>
                );
              })}
            </>
          )}

          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => toggleExpand(receiptName)}
          >
            <Icon
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      );
    });
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: mode === "yuck" ? "#5c540b" : theme.offWhite2 },
      ]}
    >
      <StatusBar
        barStyle={
          mode === "offWhite" || mode === "default"
            ? "dark-content"
            : "light-content"
        }
        backgroundColor={mode === "yuck" ? "#5c540b" : theme.offWhite2}
      />

      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={goHome}
          onPressIn={() =>
            setHomeIconColor(mode === "yuck" ? "#08f800" : theme.green)
          }
          onPressOut={() =>
            setHomeIconColor(mode === "yuck" ? "#e3d400" : theme.yellow)
          }
        >
          <Icon name="home" size={30} color={homeIconColor} />
        </TouchableOpacity>

        <Text
          style={[
            styles.screenTitle,
            { color: mode === "dark" ? colors.offWhite : mode === "yuck" ? "white" : "#333" },
          ]}
        >
          Receipts
        </Text>

        <TouchableOpacity
          style={styles.editButton}
          onPress={toggleEditMode}
          onPressIn={() =>
            setEditIconColor(mode === "yuck" ? "#08f800" : theme.green)
          }
          onPressOut={() =>
            setEditIconColor(mode === "yuck" ? "#e3d400" : theme.yellow)
          }
        >
          <Icon name="trash" size={30} color={editIconColor} />
        </TouchableOpacity>
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

const { width: screenWidth } = Dimensions.get("window");
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    alignItems: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical: 10,
    top: -10,
  },
  homeButton: {
    padding: 10,
  },
  editButton: {
    padding: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    flex: 1,
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
    position: "relative",
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
  itemContainer: {
    marginBottom: 5,
  },
  itemText: {
    color: "#fff",
  },
  buyersText: {
    color: "#aaa",
    fontSize: 14,
    marginLeft: 10,
  },
  noItemsText: {
    color: "#fff",
    fontStyle: "italic",
  },
  expandButton: {
    position: "absolute",
    bottom: 5,
    right: 5,
    padding: 5,
  },
  trashButton: {
    position: "absolute",
    top: 5,
    right: 12,
    zIndex: 1,
  },
});

// src/screens/Split.tsx

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Animated,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { auth, database } from "../firebase";
import { ref, get, set } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../types/RootStackParams";

import {
  colors,
  offWhiteTheme,
  yuckTheme,
  darkTheme,
  getRandomHexColor,
} from "../components/ColorThemes";
import SettingsButton from "../components/SettingsButton";

type BuyerObject = {
  name: string;
  selected: boolean[];
};

type ItemType = {
  item: string;
  price: number;
  quantity: number;
  buyers: BuyerObject[];
  tempQuantity?: string;
};

export type ReceiptData = {
  name: string;
  items: ItemType[];
  buyers: BuyerObject[];
  tax: number;
  time_and_date: string;
};

type ImportedReceiptParam = {
  importedReceipt?: ReceiptData;
};

type SplitRouteProp = RouteProp<RootStackParamList, "Split">;

type SplitState = {
  receiptName: string;
  buyers: BuyerObject[];
  tax: number;
  items: ItemType[];
  settings: {
    darkMode: boolean;
    offWhiteMode: boolean;
    yuckMode: boolean;
    randomMode: boolean;
    splitTaxEvenly: boolean;
  };
};

// ----------------------------
// Checkbox Component
// ----------------------------
type CheckBoxProps = {
  value: boolean;
  onValueChange: () => void;
  theme: typeof colors;
};

const CheckBox: React.FC<CheckBoxProps> = ({ value, onValueChange, theme }) => {
  const isYuckTheme = theme.extraYuckLight === "#d7d4b5";
  const isDarkTheme = theme.offWhite2 === "#121212";

  let backgroundColor = theme.white;
  if (value) {
    backgroundColor = theme.green;
  } else {
    if (isYuckTheme) {
      backgroundColor = theme.extraYuckLight;
    } else if (isDarkTheme) {
      backgroundColor = theme.textDefault;
    } else {
      backgroundColor = theme.white;
    }
  }
  const checkColor = isYuckTheme && value ? theme.extraYuckLight : theme.white;

  return (
    <TouchableOpacity
      onPress={onValueChange}
      style={[checkboxStyles.box, { backgroundColor }]}
    >
      {value && <FontAwesome5 name="check" size={12} color={checkColor} />}
    </TouchableOpacity>
  );
};

const checkboxStyles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: colors.gray1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 5,
  },
});

const Split: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<SplitRouteProp>();
  const { importedReceipt } = route.params || {};

  const [receiptName, setReceiptName] = useState<string>("untitled receipt");
  const [buyers, setBuyers] = useState<BuyerObject[]>([]);
  const [tax, setTax] = useState<number>(0);
  const [taxInput, setTaxInput] = useState<string>("");
  const [itemNameInput, setItemNameInput] = useState<string>("");
  const [itemPriceInput, setItemPriceInput] = useState<string>("");
  const [items, setItems] = useState<ItemType[]>([]);

  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [offWhiteMode, setOffWhiteMode] = useState<boolean>(false);
  const [yuckMode, setYuckMode] = useState<boolean>(false);
  const [randomMode, setRandomMode] = useState<boolean>(false);
  const [splitTaxEvenly, setSplitTaxEvenly] = useState<boolean>(true);

  const [isEditingReceiptName, setIsEditingReceiptName] =
    useState<boolean>(false);
  const [showSignInBanner, setShowSignInBanner] = useState<boolean>(false);
  const [bannerOpacity] = useState<Animated.Value>(new Animated.Value(0));
  const [saveButtonColor, setSaveButtonColor] = useState<string>(colors.yellow);
  const [importButtonColor, setImportButtonColor] = useState<string>(
    colors.yellow
  );
  const [showSavedBanner, setShowSavedBanner] = useState<boolean>(false);
  const [savedBannerOpacity] = useState<Animated.Value>(new Animated.Value(0));

  // random mode theme
  const [randomTheme, setRandomTheme] = useState<typeof colors>(colors);

  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const SPLIT_STORAGE_KEY: string = "@split_state";
  const importedReceiptUsed = useRef<boolean>(false);

  // ----------------------------
  // Initial load from cache (runs once)
  useEffect(() => {
    const initializeSplit = async () => {
      try {
        const storedData = await AsyncStorage.getItem(SPLIT_STORAGE_KEY);
        let initialSplitState: SplitState = {
          receiptName: "untitled receipt",
          buyers: [],
          tax: 0,
          items: [],
          settings: {
            darkMode: false,
            offWhiteMode: false,
            yuckMode: false,
            randomMode: false,
            splitTaxEvenly: true,
          },
        };

        if (storedData) {
          initialSplitState = JSON.parse(storedData);
        }

        // Always apply theme settings from cache on initial mount
        if (initialSplitState.settings) {
          setDarkMode(initialSplitState.settings.darkMode ?? false);
          setOffWhiteMode(initialSplitState.settings.offWhiteMode ?? false);
          setYuckMode(initialSplitState.settings.yuckMode ?? false);
          setRandomMode(initialSplitState.settings.randomMode ?? false);
          setSplitTaxEvenly(initialSplitState.settings.splitTaxEvenly ?? true);
        }

        // Apply receipt-related state from cache only if no imported receipt
        if (!importedReceipt) {
          setReceiptName(initialSplitState.receiptName ?? "untitled receipt");
          setBuyers(initialSplitState.buyers ?? []);
          setTax(initialSplitState.tax ?? 0);
          setItems(initialSplitState.items ?? []);
        }

        // Handle initial imported receipt if present
        if (importedReceipt && !importedReceiptUsed.current) {
          const safeItems = (importedReceipt.items ?? []).map(
            (it: ItemType) => {
              let safeQuantity = it.quantity;
              if (
                typeof safeQuantity !== "number" ||
                isNaN(safeQuantity) ||
                safeQuantity < 1
              ) {
                safeQuantity = 1;
              }
              return { ...it, quantity: safeQuantity };
            }
          );
          setReceiptName(importedReceipt.name || "untitled receipt");
          setBuyers(importedReceipt.buyers || []);
          setItems(safeItems);
          setTax(importedReceipt.tax || 0);
          importedReceiptUsed.current = true;
          navigation.setParams({ importedReceipt: undefined });
          // console.log("Initial Imported Receipt Applied:", {
          //   receiptName: importedReceipt.name,
          //   buyers: importedReceipt.buyers,
          //   items: safeItems,
          //   tax: importedReceipt.tax,
          // });
        }
      } catch (error) {
        console.log("Error during initialization:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeSplit();
  }, []); // Empty dependency array for initial mount only

  // Handle subsequent imported receipts (e.g., from chat.tsx or importreceipts.tsx)
  useEffect(() => {
    if (importedReceipt && !importedReceiptUsed.current) {
      const safeItems = (importedReceipt.items ?? []).map((it: ItemType) => {
        let safeQuantity = it.quantity;
        if (
          typeof safeQuantity !== "number" ||
          isNaN(safeQuantity) ||
          safeQuantity < 1
        ) {
          safeQuantity = 1;
        }
        return { ...it, quantity: safeQuantity };
      });
      setReceiptName(importedReceipt.name || "untitled receipt");
      setBuyers(importedReceipt.buyers || []);
      setItems(safeItems);
      setTax(importedReceipt.tax || 0);
      importedReceiptUsed.current = true;
      navigation.setParams({ importedReceipt: undefined });
      // console.log("Dynamic Imported Receipt Applied:", {
      //   receiptName: importedReceipt.name,
      //   buyers: importedReceipt.buyers,
      //   items: safeItems,
      //   tax: importedReceipt.tax,
      // });
    }
  }, [route.params?.importedReceipt, navigation]); // Re-run when importedReceipt changes, no theme reset

  // Save on blur (unchanged, but ensures theme persists)
  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", async () => {
      try {
        const dataToStore: SplitState = {
          receiptName,
          buyers,
          tax,
          items,
          settings: {
            darkMode,
            offWhiteMode,
            yuckMode,
            randomMode,
            splitTaxEvenly,
          },
        };
        await AsyncStorage.setItem(
          SPLIT_STORAGE_KEY,
          JSON.stringify(dataToStore)
        );
      } catch (error) {
        console.log("Failed to save state on blur:", error);
      }
    });
    return unsubscribe;
  }, [
    navigation,
    receiptName,
    buyers,
    tax,
    items,
    darkMode,
    offWhiteMode,
    yuckMode,
    randomMode,
    splitTaxEvenly,
  ]);

  // ----------------------------
  // Random Colors effect
  // ----------------------------
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

  // determine current theme
  const currentTheme = randomMode
    ? randomTheme
    : yuckMode
    ? yuckTheme
    : offWhiteMode
    ? offWhiteTheme
    : darkMode
    ? darkTheme
    : colors;

  // text color logic
  const nonButtonTextColor = yuckMode
    ? currentTheme.extraYuckLight
    : darkMode
    ? currentTheme.textDefault
    : currentTheme.black;

  const effectiveImportButtonColor =
    randomMode || offWhiteMode || yuckMode || darkMode
      ? currentTheme.yellow
      : importButtonColor;

  const effectiveSaveButtonColor =
    randomMode || offWhiteMode || yuckMode || darkMode
      ? currentTheme.yellow
      : saveButtonColor;

  // banner animations
  const fadeOutBanner = () => {
    setTimeout(() => {
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowSignInBanner(false);
        setSaveButtonColor(colors.yellow);
        setImportButtonColor(colors.yellow);
      });
    }, 1500);
  };

  const showReceiptSavedBanner = () => {
    setShowSavedBanner(true);
    savedBannerOpacity.setValue(0);
    Animated.timing(savedBannerOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(savedBannerOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowSavedBanner(false);
        });
      }, 1500);
    });
  };

  // handlers
  const handleSaveReceipt = async () => {
    if (!auth.currentUser) {
      setShowSignInBanner(true);
      setSaveButtonColor("red");
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(fadeOutBanner);
      return;
    }
    setSaveButtonColor(currentTheme.green);
    setTimeout(() => setSaveButtonColor(currentTheme.yellow), 100);
    try {
      const userId = auth.currentUser.uid;
      let finalReceiptName = receiptName.trim() || "untitled receipt";
      const userReceiptsRef = ref(database, `receipts/${userId}`);
      const snapshot = await get(userReceiptsRef);
      if (snapshot.exists()) {
        let suffix = 1;
        let candidateName = finalReceiptName;
        while (snapshot.child(candidateName).exists()) {
          suffix++;
          candidateName = `${finalReceiptName} (${suffix})`;
        }
        finalReceiptName = candidateName;
      }
      const receiptRef = ref(
        database,
        `receipts/${userId}/${finalReceiptName}`
      );
      await set(receiptRef, {
        name: finalReceiptName,
        items,
        buyers,
        tax,
        time_and_date: new Date().toISOString(),
      });
      showReceiptSavedBanner();
    } catch (error) {
      console.log("save error:", error);
      setSaveButtonColor(currentTheme.yellow);
      Alert.alert("Error", "failed to save receipt.");
    }
  };

  const handleImportReceipt = () => {
    if (!auth.currentUser) {
      setShowSignInBanner(true);
      setImportButtonColor("red");
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(fadeOutBanner);
      return;
    }
    navigation.navigate("ImportReceipts");
  };

  const handleAddTax = () => {
    const parsedTax = parseFloat(taxInput);
    setTax(!isNaN(parsedTax) ? parsedTax : 0);
    setTaxInput("");
  };

  const handleSubmitItem = () => {
    const name = itemNameInput.trim();
    if (!name) return;
    let price: number;
    try {
      // eslint-disable-next-line no-eval
      price = eval(itemPriceInput);
      if (isNaN(price) || price <= 0) throw new Error();
    } catch {
      Alert.alert("Invalid Price", "please enter a valid price.");
      return;
    }
    const newItem: ItemType = {
      item: name,
      price,
      quantity: 1,
      buyers: buyers.map((b) => ({ name: b.name, selected: [true] })),
    };
    setItems((prev) => [...prev, newItem]);
    setItemNameInput("");
    setItemPriceInput("");
  };

  const finalizeQuantity = (itemIndex: number) => {
    setItems((prevItems) =>
      prevItems.map((item, idx) => {
        if (idx !== itemIndex) return item;
        const finalVal = item.tempQuantity ?? item.quantity.toString();
        const newQuantity = parseInt(finalVal, 10);
        if (isNaN(newQuantity) || newQuantity < 1) {
          const { tempQuantity, ...rest } = item;
          return { ...rest, quantity: 1 };
        }
        const updatedBuyers = item.buyers.map((buyer) => {
          const newSelected = buyer.selected.slice(0, newQuantity);
          while (newSelected.length < newQuantity) {
            newSelected.push(true);
          }
          return { ...buyer, selected: newSelected };
        });
        return {
          ...item,
          quantity: newQuantity,
          buyers: updatedBuyers,
          tempQuantity: undefined,
        };
      })
    );
  };

  const toggleBuyerSelection = (
    itemIndex: number,
    buyerIndex: number,
    qtyIndex: number
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        const updatedBuyers = item.buyers.map((buyer, j) => {
          if (j !== buyerIndex) return buyer;
          const newSelected = [...buyer.selected];
          newSelected[qtyIndex] = !newSelected[qtyIndex];
          return { ...buyer, selected: newSelected };
        });
        return { ...item, buyers: updatedBuyers };
      })
    );
  };

  const [buyerNameInput, setBuyerNameInput] = useState<string>("");
  const handleAddBuyer = () => {
    const name = buyerNameInput.trim();
    if (!name) return;
    let newName = name;
    let duplicateCount = 1;
    while (buyers.find((b) => b.name === newName)) {
      duplicateCount++;
      newName = `${name} (${duplicateCount})`;
    }
    const newBuyer: BuyerObject = { name: newName, selected: [] };
    setBuyers((prev) => [...prev, newBuyer]);
    setItems((prevItems) =>
      prevItems.map((item) => ({
        ...item,
        buyers: [
          ...item.buyers,
          { name: newName, selected: Array(item.quantity).fill(true) },
        ],
      }))
    );
    setBuyerNameInput("");
    setTimeout(() => buyerRef.current?.focus(), 0);
  };

  const calculateBuyerOwes = () => {
    const buyerTotals = buyers.map(() => 0);
    let totalCostWithoutTax = 0;
    items.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        const selectedBuyers = item.buyers.filter((b) => b.selected[i]);
        if (selectedBuyers.length === 0) continue;
        const itemCostPerBuyer = item.price / selectedBuyers.length;
        selectedBuyers.forEach((b) => {
          const buyerIndex = buyers.findIndex((by) => by.name === b.name);
          if (buyerIndex !== -1) {
            buyerTotals[buyerIndex] += itemCostPerBuyer;
            totalCostWithoutTax += itemCostPerBuyer;
          }
        });
      }
    });
    if (buyers.length === 0) return buyerTotals;
    if (items.length === 0 && tax > 0) {
      const taxPerBuyer = tax / buyers.length;
      return buyerTotals.map((total) => total + taxPerBuyer);
    } else if (splitTaxEvenly) {
      const taxPerBuyer = tax / buyers.length;
      return buyerTotals.map((total) => total + taxPerBuyer);
    } else {
      if (totalCostWithoutTax > 0) {
        return buyerTotals.map((total) => {
          if (total === 0) return total;
          const taxContribution = (total / totalCostWithoutTax) * tax;
          return total + taxContribution;
        });
      }
      return buyerTotals;
    }
  };

  const buyerTotals = calculateBuyerOwes();
  const calculateTotalCost = () => {
    let total = 0;
    items.forEach((item) => {
      total += item.price * item.quantity;
    });
    return total + tax;
  };

  const handleClearData = () => {
    setReceiptName("untitled receipt");
    setBuyers([]);
    setItems([]);
    setTax(0);
  };

  const goHome = () => {
    navigation.navigate("MainTabs", { screen: "Home" });
  };

  function safeString(val: any): string {
    return typeof val === "string" ? val : JSON.stringify(val);
  }

  const buyerRef = useRef<TextInput | null>(null);
  const itemNameRef = useRef<TextInput | null>(null);
  const priceRef = useRef<TextInput | null>(null);

  if (!isInitialized) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#000000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  // checkmark color for editing receipt name
  const checkmarkColor = darkMode
    ? currentTheme.textDefault
    : yuckMode
    ? currentTheme.black
    : currentTheme.black;

  // revert the displayed name color in yuck theme to extraYuckLight
  const displayReceiptNameColor = yuckMode
    ? currentTheme.extraYuckLight
    : nonButtonTextColor;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: currentTheme.offWhite2 }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={currentTheme.offWhite2} // Dynamically match the theme
          translucent={Platform.OS === "android"}
        />
        <KeyboardAvoidingView
          style={[
            styles.container,
            darkMode ? darkStyles.container : null,
            { backgroundColor: currentTheme.offWhite2 },
          ]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
        {/* Sign-In Banner */}
        {showSignInBanner && (
          <Animated.View
            style={[
              styles.signInBanner,
              { opacity: bannerOpacity, backgroundColor: "red" },
            ]}
          >
            <Text
              style={[styles.signInBannerText, { color: currentTheme.white }]}
            >
              {importButtonColor === "red"
                ? "Sign In To Import Receipts"
                : "Sign In To Save Receipts"}
            </Text>
          </Animated.View>
        )}

        {/* "Receipt Saved" Banner */}
        {showSavedBanner && (
          <Animated.View
            style={[
              styles.savedBanner,
              {
                opacity: savedBannerOpacity,
                backgroundColor: currentTheme.green,
              },
            ]}
          >
            <Text
              style={[styles.savedBannerText, { color: currentTheme.white }]}
            >
              Receipt Saved
            </Text>
          </Animated.View>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Top Buttons */}
          <View style={styles.topButtonsContainer}>
            <Pressable style={styles.topButton} onPress={goHome}>
              {({ pressed }) => (
                <FontAwesome5
                  name="home"
                  size={24}
                  color={pressed ? currentTheme.green : currentTheme.yellow}
                />
              )}
            </Pressable>

            <View style={styles.centerButtonsContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.topButton,
                  {
                    backgroundColor: pressed
                      ? currentTheme.lightGray
                      : effectiveImportButtonColor,
                    borderWidth: 1,
                    borderColor: currentTheme.black,
                    paddingHorizontal: 10,
                  },
                ]}
                onPress={handleImportReceipt}
              >
                <Text
                  style={[styles.buttonText, { color: currentTheme.black }]}
                >
                  Import
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.topButton,
                  {
                    backgroundColor: pressed
                      ? currentTheme.lightGray
                      : effectiveSaveButtonColor,
                    borderWidth: 1,
                    borderColor: currentTheme.black,
                    paddingHorizontal: 10,
                    marginHorizontal: 10,
                  },
                ]}
                onPress={handleSaveReceipt}
              >
                <Text
                  style={[styles.buttonText, { color: currentTheme.black }]}
                >
                  Save
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.topButton,
                  styles.clearDataButton,
                  {
                    backgroundColor: pressed
                      ? currentTheme.green
                      : currentTheme.yellow,
                  },
                ]}
                onPress={handleClearData}
              >
                <Text
                  style={[styles.buttonText, { color: currentTheme.black }]}
                >
                  Reset
                </Text>
              </Pressable>
            </View>

            <SettingsButton
              currentTheme={currentTheme}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              offWhiteMode={offWhiteMode}
              setOffWhiteMode={setOffWhiteMode}
              yuckMode={yuckMode}
              setYuckMode={setYuckMode}
              randomMode={randomMode}
              setRandomMode={setRandomMode}
              splitTaxEvenly={splitTaxEvenly}
              setSplitTaxEvenly={setSplitTaxEvenly}
              colors={colors}
            />
          </View>

          {/* Receipt Name */}
          <View
            style={[
              styles.receiptNameContainer,
              darkMode
                ? darkStyles.receiptNameContainer
                : { backgroundColor: currentTheme.lightGray2 },
              offWhiteMode && { backgroundColor: currentTheme.offWhite2 },
            ]}
          >
            {isEditingReceiptName ? (
              <View style={{ position: "relative", width: "100%" }}>
                <View style={{ alignItems: "center" }}>
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        width: "80%",
                        textAlign: "center",
                        color: yuckMode
                          ? currentTheme.black
                          : nonButtonTextColor,
                        borderColor: currentTheme.gray1,
                        backgroundColor: yuckMode
                          ? currentTheme.extraYuckLight
                          : undefined,
                      },
                      darkMode ? darkStyles.inputField : null,
                    ]}
                    value={receiptName}
                    onChangeText={setReceiptName}
                    autoFocus
                    onBlur={() => setIsEditingReceiptName(false)}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => setIsEditingReceiptName(false)}
                  style={{
                    position: "absolute",
                    right: "0%",
                    top: "50%",
                    transform: [{ translateY: -10 }],
                  }}
                >
                  <FontAwesome5 name="check" size={20} color={checkmarkColor} />
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={{
                  position: "relative",
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 18,
                    color: displayReceiptNameColor,
                  }}
                >
                  {receiptName}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsEditingReceiptName(true)}
                  style={{
                    position: "absolute",
                    right: 15,
                    top: "50%",
                    transform: [{ translateY: -10 }],
                  }}
                >
                  <FontAwesome5
                    name="pencil-alt"
                    size={20}
                    color={
                      darkMode ? currentTheme.textDefault : currentTheme.black
                    }
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Buyers & Tax */}
          <View style={styles.rowContainer}>
            <View
              style={[
                styles.formContainer,
                styles.buyersForm,
                darkMode
                  ? darkStyles.buyersForm
                  : { backgroundColor: currentTheme.lightGray },
              ]}
            >
              <Text
                style={[
                  styles.alignedLabel,
                  { color: nonButtonTextColor, marginBottom: 4 },
                ]}
              >
                Buyers:
              </Text>
              <TextInput
                ref={buyerRef}
                style={[
                  styles.inputField,
                  {
                    width: "75%",
                    textAlign: "center",
                    backgroundColor: yuckMode
                      ? currentTheme.extraYuckLight
                      : currentTheme.offWhite2,
                    color: yuckMode ? currentTheme.black : currentTheme.black,
                    borderColor: currentTheme.gray1,
                  },
                  darkMode ? darkStyles.inputField : null,
                ]}
                placeholder="Enter a buyer"
                placeholderTextColor={darkMode ? "#999" : currentTheme.black}
                value={buyerNameInput}
                onChangeText={setBuyerNameInput}
                onSubmitEditing={handleAddBuyer}
                returnKeyType="done"
              />
              <Pressable
                onPress={handleAddBuyer}
                style={({ pressed }) => [
                  styles.addButton,
                  styles.borderBlack,
                  styles.addBuyersTaxButtons,
                  {
                    width: "75%",
                    backgroundColor: pressed
                      ? currentTheme.green
                      : currentTheme.yellow,
                  },
                ]}
              >
                <Text style={styles.buttonText}>Add</Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.formContainer,
                styles.taxForm,
                darkMode
                  ? darkStyles.taxForm
                  : { backgroundColor: currentTheme.lightGray },
              ]}
            >
              <Text
                style={[
                  styles.alignedLabel,
                  { color: nonButtonTextColor, marginBottom: 4 },
                ]}
              >
                Tax:
              </Text>
              <TextInput
                style={[
                  styles.inputField,
                  {
                    width: "75%",
                    backgroundColor: yuckMode
                      ? currentTheme.extraYuckLight
                      : currentTheme.offWhite2,
                    color: yuckMode ? currentTheme.black : currentTheme.black,
                    borderColor: currentTheme.gray1,
                  },
                  darkMode ? darkStyles.inputField : null,
                ]}
                placeholder="0.00"
                placeholderTextColor={darkMode ? "#999" : currentTheme.black}
                keyboardType="numeric"
                value={taxInput}
                onChangeText={setTaxInput}
                onSubmitEditing={handleAddTax}
                returnKeyType="done"
              />
              <Pressable
                onPress={handleAddTax}
                style={({ pressed }) => [
                  styles.addButton,
                  styles.borderBlack,
                  styles.addBuyersTaxButtons,
                  {
                    width: "75%",
                    backgroundColor: pressed
                      ? currentTheme.green
                      : currentTheme.yellow,
                  },
                ]}
              >
                <Text style={styles.buttonText}>Add</Text>
              </Pressable>
            </View>
          </View>

          {/* Item Form */}
          <View
            style={[
              styles.itemForm,
              { backgroundColor: currentTheme.lightGray2 },
              offWhiteMode && { backgroundColor: currentTheme.lightGray },
              darkMode ? darkStyles.itemForm : null,
            ]}
          >
            <View style={[styles.itemInputRow, { justifyContent: "center" }]}>
              <Text style={[styles.itemLabel, { color: nonButtonTextColor }]}>
                Item:
              </Text>
              <TextInput
                ref={itemNameRef}
                style={[
                  styles.inputField,
                  styles.itemInput,
                  {
                    backgroundColor: yuckMode
                      ? currentTheme.extraYuckLight
                      : darkMode
                      ? "#1e1e1e"
                      : currentTheme.offWhite2,
                    color: yuckMode
                      ? currentTheme.black
                      : darkMode
                      ? "#ffffff"
                      : currentTheme.black,
                    borderColor: currentTheme.gray1,
                  },
                ]}
                value={itemNameInput}
                onChangeText={setItemNameInput}
                onSubmitEditing={() => {
                  priceRef.current?.focus();
                }}
                returnKeyType="next"
              />
            </View>
            <View style={[styles.itemInputRow, { justifyContent: "center" }]}>
              <Text style={[styles.itemLabel, { color: nonButtonTextColor }]}>
                Price: $
              </Text>
              <TextInput
                ref={priceRef}
                style={[
                  styles.inputField,
                  styles.itemInput,
                  {
                    backgroundColor: yuckMode
                      ? currentTheme.extraYuckLight
                      : darkMode
                      ? "#1e1e1e"
                      : currentTheme.offWhite2,
                    color: yuckMode
                      ? currentTheme.black
                      : darkMode
                      ? "#ffffff"
                      : currentTheme.black,
                    borderColor: currentTheme.gray1,
                  },
                ]}
                value={itemPriceInput}
                onChangeText={setItemPriceInput}
                keyboardType="numeric"
                onSubmitEditing={() => {
                  handleSubmitItem();
                  setTimeout(() => itemNameRef.current?.focus(), 0);
                }}
                returnKeyType="done"
              />
            </View>
            <Pressable
              onPress={() => {
                handleSubmitItem();
                setTimeout(() => itemNameRef.current?.focus(), 0);
              }}
              style={({ pressed }) => [
                styles.submitItemButton,
                styles.borderBlack,
                {
                  width: "70%",
                  backgroundColor: pressed
                    ? currentTheme.green
                    : currentTheme.yellow,
                },
              ]}
            >
              <Text style={styles.buttonText}>Add</Text>
            </Pressable>
          </View>

          {/* Cost Per Buyer */}
          <View style={styles.costPerBuyerSection}>
            <Text style={[styles.sectionTitle, { color: nonButtonTextColor }]}>
              Cost per Buyer:
            </Text>
            {buyers.length > 0 ? (
              buyers.map((buyer, index) => (
                <Text
                  key={index}
                  style={[styles.buyerCostText, { color: nonButtonTextColor }]}
                >
                  {safeString(buyer.name)}: $
                  {buyerTotals[index]?.toFixed(2) || "0.00"}
                </Text>
              ))
            ) : (
              <Text
                style={[styles.buyerCostText, { color: nonButtonTextColor }]}
              >
                No buyers added.
              </Text>
            )}
          </View>

          {/* Tax & Total */}
          <Text style={[styles.displayText, { color: nonButtonTextColor }]}>
            Tax Amount: ${tax.toFixed(2)}
          </Text>
          <Text style={[styles.displayText, { color: nonButtonTextColor }]}>
            Total Cost: ${calculateTotalCost().toFixed(2)}
          </Text>

          {/* Grid Titles */}
          <View
            style={[styles.gridTitles, darkMode ? darkStyles.gridTitles : null]}
          >
            <Text
              style={[
                styles.gridCell,
                styles.firstGridCell,
                styles.gridTitleText,
                { flex: 1, color: nonButtonTextColor },
                darkMode ? darkStyles.gridCell : null,
              ]}
            >
              Item
            </Text>
            <Text
              style={[
                styles.gridCell,
                styles.gridTitleText,
                { flex: 0.5, color: nonButtonTextColor },
                darkMode ? darkStyles.gridCell : null,
              ]}
            >
              Price
            </Text>
            <Text
              style={[
                styles.gridCell,
                styles.gridTitleText,
                { flex: 0.4, color: nonButtonTextColor },
                darkMode ? darkStyles.gridCell : null,
              ]}
            >
              Qty
            </Text>
            <Text
              style={[
                styles.gridCell,
                styles.gridTitleText,
                { flex: 1.1, color: nonButtonTextColor },
                darkMode ? darkStyles.gridCell : null,
              ]}
            >
              Buyers
            </Text>
          </View>

          {/* Items Grid */}
          {items.map((item, itemIndex) => (
            <View
              key={itemIndex}
              style={[styles.gridRow, darkMode ? darkStyles.gridRow : null]}
            >
              <View
                style={[
                  styles.gridCell,
                  styles.firstGridCell,
                  { flex: 1 },
                  darkMode ? darkStyles.gridCell : null,
                ]}
              >
                <View style={styles.cellInner}>
                  <TouchableOpacity
                    onPress={() =>
                      setItems((prev) =>
                        prev.filter((_, idx) => idx !== itemIndex)
                      )
                    }
                    style={styles.trashIcon}
                  >
                    {/* less bright red for dark mode => currentTheme.blood */}
                    <FontAwesome5
                      name="trash"
                      size={16}
                      color={currentTheme.blood}
                    />
                  </TouchableOpacity>
                  <Text
                    style={[styles.itemNameText, { color: nonButtonTextColor }]}
                  >
                    {safeString(item.item)}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.gridCell,
                  { flex: 0.5 },
                  darkMode ? darkStyles.gridCell : null,
                ]}
              >
                <View style={styles.cellInner}>
                  <Text style={{ color: nonButtonTextColor }}>
                    ${item.price.toFixed(2)}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.gridCell,
                  { flex: 0.4 },
                  darkMode ? darkStyles.gridCell : null,
                ]}
              >
                <View style={styles.cellInner}>
                  <TextInput
                    style={[
                      styles.quantityInput,
                      {
                        backgroundColor: yuckMode
                          ? currentTheme.yuck
                          : darkMode
                          ? "#333333"
                          : currentTheme.offWhite2,
                        borderColor: yuckMode
                          ? currentTheme.extraYuckLight
                          : darkMode
                          ? "#555555"
                          : currentTheme.gray1,
                        color: yuckMode
                          ? currentTheme.extraYuckLight
                          : darkMode
                          ? "#ffffff"
                          : currentTheme.black,
                      },
                      darkMode ? darkStyles.quantityInput : null,
                    ]}
                    keyboardType="numeric"
                    value={
                      item.tempQuantity !== undefined
                        ? item.tempQuantity
                        : item.quantity.toString()
                    }
                    onChangeText={(val) => {
                      setItems((prev) =>
                        prev.map((it, i) => {
                          if (i !== itemIndex) return it;
                          return { ...it, tempQuantity: val };
                        })
                      );
                    }}
                    onBlur={() => finalizeQuantity(itemIndex)}
                  />
                </View>
              </View>
              <View
                style={[
                  styles.gridCell,
                  { flex: 1.1 },
                  darkMode ? darkStyles.gridCell : null,
                ]}
              >
                <View style={styles.cellInner}>
                  {Array.from({ length: item.quantity }).map((_, qtyIndex) => (
                    <View key={qtyIndex} style={styles.buyerRow}>
                      {item.buyers.map((buyer, buyerIndex) => (
                        <TouchableOpacity
                          key={buyerIndex}
                          style={styles.buyerContainer}
                          onPress={() =>
                            toggleBuyerSelection(
                              itemIndex,
                              buyerIndex,
                              qtyIndex
                            )
                          }
                        >
                          <CheckBox
                            value={buyer.selected[qtyIndex]}
                            onValueChange={() =>
                              toggleBuyerSelection(
                                itemIndex,
                                buyerIndex,
                                qtyIndex
                              )
                            }
                            theme={currentTheme}
                          />
                          <Text
                            style={[
                              styles.buyerLabel,
                              { color: nonButtonTextColor },
                            ]}
                          >
                            {safeString(buyer.name)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Split;

// ----------------------------
// Styles
// ----------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite2,
  },
  scrollContent: {
    paddingBottom: 30,
    paddingHorizontal: 10,
  },
  topButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    height: 60,
    paddingHorizontal: 15,
  },
  topButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  centerButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  clearDataButton: {
    borderWidth: 1,
    borderColor: colors.black,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  receiptNameContainer: {
    backgroundColor: colors.lightGray2,
    padding: 25,
    marginBottom: 10,
  },
  inputField: {
    borderWidth: 1,
    borderColor: colors.gray1,
    padding: 5,
    backgroundColor: colors.offWhite2,
    color: colors.black,
  },
  alignedLabel: {
    marginRight: 10,
    fontSize: 16,
  },
  addButton: {
    padding: 5,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  borderBlack: {
    borderWidth: 1,
    borderColor: colors.black,
  },
  addBuyersTaxButtons: {
    marginTop: 10,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  formContainer: {
    flex: 1,
    padding: 15,
    alignItems: "center",
  },
  buyersForm: {
    backgroundColor: "rgb(176,209,209)",
    marginRight: 5,
  },
  taxForm: {
    backgroundColor: "rgb(216,177,168)",
    marginLeft: 5,
  },
  itemForm: {
    backgroundColor: "#dfddbf",
    padding: 20,
    marginBottom: 10,
    alignItems: "center",
  },
  itemInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
  },
  itemLabel: {
    width: 50,
    textAlign: "right",
    marginRight: 10,
  },
  itemInput: {
    width: 150,
    padding: 5,
  },
  submitItemButton: {
    width: "60%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    marginTop: 10,
  },
  costPerBuyerSection: {
    alignItems: "center",
    marginVertical: 30,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 5,
    fontWeight: "bold",
  },
  buyerCostText: {
    fontSize: 16,
    marginVertical: 2,
  },
  displayText: {
    textAlign: "center",
    fontWeight: "bold",
    marginTop: 10,
    fontSize: 16,
  },
  firstGridCell: {
    borderLeftWidth: 2,
    borderBlockColor: "black",
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    justifyContent: "center",
  },
  gridTitles: {
    flexDirection: "row",
    marginHorizontal: 0,
    marginTop: 40,
    borderTopWidth: 3,
    borderBottomWidth: 3,
    borderColor: "black",
    minHeight: 30,
  },
  gridTitleText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  gridRow: {
    flexDirection: "row",
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: "black",
    alignItems: "stretch",
  },
  gridCell: {
    borderRightWidth: 2,
    borderColor: "black",
    flexDirection: "row",
    flexShrink: 1,
    flexWrap: "wrap",
  },
  cellInner: {
    // center vertically
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    position: "relative",
  },
  itemNameText: {
    // keep the text from overlapping the trash icon
    marginLeft: 25,
    flexWrap: "wrap",
  },
  trashIcon: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: colors.gray1,
    textAlign: "center",
    textAlignVertical: "center",
    padding: 5,
    width: 40,
  },
  buyerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
    flexWrap: "wrap",
  },
  buyerContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    width: "100%",
    marginRight: 5,
  },
  buyerLabel: {
    fontSize: 12,
    flexWrap: "wrap",
    flexShrink: 1,
  },
  signInBanner: {
    position: "absolute",
    width: "100%",
    top: 60,
    padding: 8,
    zIndex: 10,
  },
  signInBannerText: {
    fontWeight: "600",
    textAlign: "center",
  },
  savedBanner: {
    position: "absolute",
    width: "100%",
    top: 100,
    padding: 8,
    zIndex: 10,
  },
  savedBannerText: {
    fontWeight: "600",
    textAlign: "center",
  },
});

const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
  },
  receiptNameContainer: {
    backgroundColor: "#121212",
  },
  buyersForm: {
    backgroundColor: "#1e1e1e",
  },
  taxForm: {
    backgroundColor: "#1e1e1e",
  },
  itemForm: {
    backgroundColor: "#1e1e1e",
  },
  inputField: {
    backgroundColor: "#333333",
    color: "#ffffff",
    borderColor: "#555555",
  },
  gridTitles: {
    borderColor: "#555555",
  },
  gridRow: {
    borderColor: "#555555",
  },
  gridCell: {
    borderColor: "#555555",
  },
  quantityInput: {
    borderColor: "#555555",
    backgroundColor: "#333333",
    color: "#ffffff",
  },
});

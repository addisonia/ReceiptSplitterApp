// src/screens/Split.tsx

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { auth, database } from "../firebase";
import { ref, get, set } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../types/RootStackParams";

const colors = {
  white: "#ffffff",
  offWhite: "#ede7d8",
  offWhite2: "rgba(255, 255, 255, 0.78)",
  lightGray: "#f0f0f0",
  lightGray2: "#dfdfdf",
  yellow: "#e3d400",
  green: "#08f800",
  yuck: "#5c540b",
  yuckLight: "#9e9b7b",
  blood: "rgb(182,57,11)",
  orange: "#de910d",
  gray1: "#a4a4a4",
  black: "#000000",
};

// define prop types for our checkbox
type CheckBoxProps = {
  value: boolean;
  onValueChange: () => void;
};

const CheckBox: React.FC<CheckBoxProps> = ({ value, onValueChange }) => {
  return (
    <TouchableOpacity
      onPress={onValueChange}
      style={[
        checkboxStyles.box,
        { backgroundColor: value ? colors.green : colors.white },
      ]}
    >
      {value && <FontAwesome5 name="check" size={12} color={colors.white} />}
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

type BuyerObject = {
  name: string | any;        // sometimes might be an object from old data
  selected: boolean[];
};

type ItemType = {
  item: string | any;        // sometimes might be an object from old data
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

const Split = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<SplitRouteProp>();
  const { importedReceipt } = route.params || {};

  // basic states
  const [receiptName, setReceiptName] = useState("untitled receipt");
  const [buyers, setBuyers] = useState<BuyerObject[]>([]);
  const [tax, setTax] = useState(0);
  const [taxInput, setTaxInput] = useState("");
  const [itemNameInput, setItemNameInput] = useState("");
  const [itemPriceInput, setItemPriceInput] = useState("");
  const [items, setItems] = useState<ItemType[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [splitTaxEvenly, setSplitTaxEvenly] = useState(true);

  // references
  const buyerRef = useRef<TextInput | null>(null);
  const itemNameRef = useRef<TextInput | null>(null);
  const priceRef = useRef<TextInput | null>(null);

  // sign in banner
  const [showSignInBanner, setShowSignInBanner] = useState(false);
  const [bannerOpacity] = useState(new Animated.Value(0));

  // save button color
  const [saveButtonColor, setSaveButtonColor] = useState(colors.yellow);

  // import button color
  const [importButtonColor, setImportButtonColor] = useState(colors.yellow);

  // success banner for "Receipt Saved"
  const [showSavedBanner, setShowSavedBanner] = useState(false);
  const [savedBannerOpacity] = useState(new Animated.Value(0));

  // local storage key
  const SPLIT_STORAGE_KEY = "@split_state";

  // save to cache whenever states change
  useEffect(() => {
    const saveToCache = async () => {
      try {
        const dataToStore = {
          receiptName,
          buyers,
          tax,
          items,
        };
        await AsyncStorage.setItem(
          SPLIT_STORAGE_KEY,
          JSON.stringify(dataToStore)
        );
      } catch (error) {
        console.log("Failed to save to cache:", error);
      }
    };
    saveToCache();
  }, [receiptName, buyers, tax, items]);

  // load data
  useEffect(() => {
    const loadData = async () => {
      try {
        if (route.params?.importedReceipt) {
          console.log("Using route.params.importedReceipt");
          // fix items to have a safe quantity
          const safeItems = (route.params.importedReceipt.items ?? []).map(
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

          setReceiptName(
            route.params.importedReceipt.name || "untitled receipt"
          );
          setBuyers(route.params.importedReceipt.buyers || []);
          setItems(safeItems);
          setTax(route.params.importedReceipt.tax || 0);
        } else {
          console.log("No route params, trying local storage");
          const storedData = await AsyncStorage.getItem(SPLIT_STORAGE_KEY);
          if (storedData) {
            const parsed = JSON.parse(storedData);
            setReceiptName(parsed.receiptName ?? "untitled receipt");
            setBuyers(parsed.buyers ?? []);
            setTax(parsed.tax ?? 0);
            setItems(parsed.items ?? []);
          } else {
            setReceiptName("untitled receipt");
            setBuyers([]);
            setItems([]);
            setTax(0);
          }
        }
      } catch (error) {
        console.log("Failed to load data:", error);
      }
    };

    loadData();
  }, []);

  // extra re-save to cache
  useEffect(() => {
    const saveToCache = async () => {
      try {
        const dataToStore = {
          receiptName,
          buyers,
          tax,
          items,
        };
        await AsyncStorage.setItem(
          SPLIT_STORAGE_KEY,
          JSON.stringify(dataToStore)
        );
      } catch (error) {
        console.log("Failed to save to cache:", error);
      }
    };
    saveToCache();
  }, [receiptName, buyers, tax, items]);

  // fade out sign-in banner
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

  // fade in/out "Receipt Saved"
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

  // handle save
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

    setSaveButtonColor(colors.green);
    setTimeout(() => setSaveButtonColor(colors.yellow), 100);

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
      console.log("Save error:", error);
      setSaveButtonColor(colors.yellow);
      Alert.alert("Error", "Failed to save receipt.");
    }
  };

  // handle import
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

  // add tax
  const handleAddTax = () => {
    const parsedTax = parseFloat(taxInput);
    setTax(!isNaN(parsedTax) ? parsedTax : 0);
    setTaxInput("");
  };

  // add item
  const handleSubmitItem = () => {
    const name = itemNameInput.trim();
    if (!name) return;
    let price: number;
    try {
      price = eval(itemPriceInput);
      if (isNaN(price) || price <= 0) throw new Error();
    } catch {
      Alert.alert("Invalid Price", "Please enter a valid price.");
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

  // finalize quantity
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

  // toggle buyer selection
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

  // new buyer
  const [buyerNameInput, setBuyerNameInput] = useState("");
  const handleAddBuyer = () => {
    const name = buyerNameInput.trim();
    if (!name) return;
    let newName = name;
    let duplicateCount = 1;

    while (buyers.find((b) => b.name === newName)) {
      duplicateCount++;
      newName = `${name} (${duplicateCount})`;
    }
    const newBuyer = { name: newName, selected: [] };
    setBuyers((prev) => [...prev, newBuyer]);

    // also add buyer to existing items
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

  // cost per buyer
  const calculateBuyerOwes = () => {
    const buyerTotals = buyers.map(() => 0);
    let totalCostWithoutTax = 0;

    items.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        const selectedBuyers = item.buyers.filter((b) => b.selected[i]);
        if (selectedBuyers.length === 0) continue;
        const itemCostPerBuyer = item.price / selectedBuyers.length;
        selectedBuyers.forEach((b) => {
          const buyerIndex = buyers.findIndex((buyer) => buyer.name === b.name);
          if (buyerIndex !== -1) {
            buyerTotals[buyerIndex] += itemCostPerBuyer;
            totalCostWithoutTax += itemCostPerBuyer;
          }
        });
      }
    });

    if (buyers.length === 0) return buyerTotals;

    if (items.length === 0 && tax > 0) {
      // no items but there's tax => split evenly
      const taxPerBuyer = tax / buyers.length;
      return buyerTotals.map((total) => total + taxPerBuyer);
    } else if (splitTaxEvenly) {
      // user wants to split tax evenly
      const taxPerBuyer = tax / buyers.length;
      return buyerTotals.map((total) => total + taxPerBuyer);
    } else {
      // split tax proportionally
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

  // total
  const calculateTotalCost = () => {
    let total = 0;
    items.forEach((item) => {
      total += item.price * item.quantity;
    });
    return total + tax;
  };

  // clear data
  const handleClearData = () => {
    setReceiptName("untitled receipt");
    setBuyers([]);
    setItems([]);
    setTax(0);
  };

  // go home
  const goHome = () => {
    navigation.navigate("MainTabs", { screen: "Home" });
  };

  // Safe string function to avoid crashing if old data is an object
  function safeString(val: any) {
    return typeof val === "string" ? val : JSON.stringify(val);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, darkMode ? darkStyles.container : null]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* sign-in banner */}
      {showSignInBanner && (
        <Animated.View style={[styles.signInBanner, { opacity: bannerOpacity }]}>
          <Text style={styles.signInBannerText}>
            {importButtonColor === "red"
              ? "Sign In To Import Receipts"
              : "Sign In To Save Receipts"}
          </Text>
        </Animated.View>
      )}

      {/* "Receipt Saved" banner */}
      {showSavedBanner && (
        <Animated.View style={[styles.savedBanner, { opacity: savedBannerOpacity }]}>
          <Text style={styles.savedBannerText}>Receipt Saved</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* top buttons */}
        <View style={styles.topButtonsContainer}>
          {/* home */}
          <Pressable style={styles.topButton} onPress={goHome}>
            {({ pressed }) => (
              <FontAwesome5
                name="home"
                size={24}
                color={pressed ? colors.green : colors.yellow}
              />
            )}
          </Pressable>

          {/* import / save / reset / settings */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* import */}
            <Pressable
              style={({ pressed }) => [
                styles.topButton,
                {
                  backgroundColor: pressed ? colors.lightGray : importButtonColor,
                  borderWidth: 1,
                  borderColor: colors.black,
                  marginRight: 10,
                  justifyContent: "center",
                  paddingHorizontal: 10,
                },
              ]}
              onPress={handleImportReceipt}
            >
              <Text style={[styles.buttonText, { color: colors.black }]}>Import</Text>
            </Pressable>

            {/* save */}
            <Pressable
              style={({ pressed }) => [
                styles.topButton,
                {
                  backgroundColor: pressed ? colors.lightGray : saveButtonColor,
                  borderWidth: 1,
                  borderColor: colors.black,
                  marginRight: 10,
                  justifyContent: "center",
                  paddingHorizontal: 10,
                },
              ]}
              onPress={handleSaveReceipt}
            >
              <Text style={[styles.buttonText, { color: colors.black }]}>Save</Text>
            </Pressable>

            {/* reset */}
            <Pressable
              style={({ pressed }) => [
                styles.topButton,
                styles.clearDataButton,
                {
                  backgroundColor: pressed ? colors.green : colors.yellow,
                  marginRight: 40,
                  justifyContent: "center",
                },
              ]}
              onPress={handleClearData}
            >
              <Text style={[styles.buttonText, { color: colors.black }]}>Reset</Text>
            </Pressable>

            {/* settings */}
            <Pressable
              style={styles.settingsButton}
              onPress={() => setShowSettings(true)}
            >
              {({ pressed }) => (
                <FontAwesome5
                  name="cog"
                  size={24}
                  color={pressed ? colors.green : colors.yellow}
                />
              )}
            </Pressable>
          </View>
        </View>

        {/* receipt name text input */}
        <View
          style={[
            styles.receiptNameContainer,
            darkMode ? darkStyles.receiptNameContainer : null,
          ]}
        >
          <TextInput
            style={[
              styles.inputField,
              { flex: 1 },
              darkMode ? darkStyles.inputField : null,
            ]}
            value={receiptName}
            onChangeText={setReceiptName}
          />
        </View>

        {/* buyers + tax row */}
        <View style={styles.rowContainer}>
          {/* buyers form */}
          <View
            style={[
              styles.formContainer,
              styles.buyersForm,
              darkMode ? darkStyles.buyersForm : null,
            ]}
          >
            <Text
              style={[
                styles.alignedLabel,
                { color: darkMode ? colors.white : colors.black },
              ]}
            >
              Buyers:
            </Text>
            <TextInput
              ref={buyerRef}
              style={[
                styles.inputField,
                { width: "75%" },
                darkMode ? darkStyles.inputField : null,
              ]}
              placeholder="Enter a buyer"
              placeholderTextColor={darkMode ? "#999" : "#000"}
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
                  backgroundColor: pressed ? colors.green : colors.yellow,
                },
              ]}
            >
              <Text style={styles.buttonText}>Add</Text>
            </Pressable>
          </View>

          {/* tax form */}
          <View
            style={[
              styles.formContainer,
              styles.taxForm,
              darkMode ? darkStyles.taxForm : null,
            ]}
          >
            <Text
              style={[
                styles.alignedLabel,
                { color: darkMode ? colors.white : colors.black },
              ]}
            >
              Tax:
            </Text>
            <TextInput
              style={[
                styles.inputField,
                { width: "75%" },
                darkMode ? darkStyles.inputField : null,
              ]}
              placeholder="0.00"
              placeholderTextColor={darkMode ? "#999" : "#000"}
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
                  backgroundColor: pressed ? colors.green : colors.yellow,
                },
              ]}
            >
              <Text style={styles.buttonText}>Add</Text>
            </Pressable>
          </View>
        </View>

        {/* item form */}
        <View style={styles.itemForm}>
          <View style={[styles.itemInputRow, { justifyContent: "center" }]}>
            <Text style={styles.itemLabel}>Item:</Text>
            <TextInput
              ref={itemNameRef}
              style={[styles.itemInput]}
              value={itemNameInput}
              onChangeText={setItemNameInput}
              onSubmitEditing={() => {
                priceRef.current?.focus();
              }}
              returnKeyType="next"
            />
          </View>
          <View style={[styles.itemInputRow, { justifyContent: "center" }]}>
            <Text style={styles.itemLabel}>Price: $</Text>
            <TextInput
              ref={priceRef}
              style={[styles.itemInput]}
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
                backgroundColor: pressed ? colors.green : colors.yellow,
              },
            ]}
          >
            <Text style={styles.buttonText}>Add</Text>
          </Pressable>
        </View>

        {/* cost per buyer */}
        <View style={styles.costPerBuyerSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: darkMode ? colors.white : colors.black },
            ]}
          >
            Cost per Buyer:
          </Text>
          {buyers.length > 0 ? (
            buyers.map((buyer, index) => (
              <Text
                key={index}
                style={[
                  styles.buyerCostText,
                  { color: darkMode ? colors.white : colors.black },
                ]}
              >
                {/** SAFE PRINT: if buyer.name isn't a string, show JSON */}
                {safeString(buyer.name)}: ${buyerTotals[index]?.toFixed(2) || "0.00"}
              </Text>
            ))
          ) : (
            <Text
              style={[
                styles.buyerCostText,
                { color: darkMode ? colors.white : colors.black },
              ]}
            >
              No buyers added.
            </Text>
          )}
        </View>

        {/* tax & total */}
        <Text
          style={[
            styles.displayText,
            { color: darkMode ? colors.white : colors.black },
          ]}
        >
          Tax Amount: ${tax.toFixed(2)}
        </Text>
        <Text
          style={[
            styles.displayText,
            { color: darkMode ? colors.white : colors.black },
          ]}
        >
          Total Cost: ${calculateTotalCost().toFixed(2)}
        </Text>

        {/* grid titles */}
        <View
          style={[styles.gridTitles, darkMode ? darkStyles.gridTitles : null]}
        >
          <Text
            style={[
              styles.gridCell,
              styles.firstGridCell,
              styles.gridTitleText,
              { flex: 0.9, color: darkMode ? colors.offWhite2 : colors.black },
              darkMode ? darkStyles.gridCell : null,
            ]}
          >
            Item
          </Text>
          <Text
            style={[
              styles.gridCell,
              styles.gridTitleText,
              { flex: 0.5, color: darkMode ? colors.offWhite2 : colors.black },
              darkMode ? darkStyles.gridCell : null,
            ]}
          >
            Price
          </Text>
          <Text
            style={[
              styles.gridCell,
              styles.gridTitleText,
              { flex: 0.4, color: darkMode ? colors.offWhite2 : colors.black },
              darkMode ? darkStyles.gridCell : null,
            ]}
          >
            Qty
          </Text>
          <Text
            style={[
              styles.gridCell,
              styles.gridTitleText,
              { flex: 1.2, color: darkMode ? colors.offWhite2 : colors.black },
              darkMode ? darkStyles.gridCell : null,
            ]}
          >
            Buyers
          </Text>
        </View>

        {/* items */}
        {items.map((item, itemIndex) => (
          <View
            key={itemIndex}
            style={[styles.gridRow, darkMode ? darkStyles.gridRow : null]}
          >
            <View
              style={[
                styles.gridCell,
                styles.firstGridCell,
                { flex: 0.9 },
                darkMode ? darkStyles.gridCell : null,
              ]}
            >
              <View style={styles.cellInner}>
                <TouchableOpacity
                  onPress={() =>
                    setItems((prev) => prev.filter((_, idx) => idx !== itemIndex))
                  }
                  style={styles.trashIcon}
                >
                  <FontAwesome5 name="trash" size={16} color="red" />
                </TouchableOpacity>
                <Text
                  style={[
                    styles.itemNameText,
                    { color: darkMode ? colors.offWhite2 : colors.black },
                  ]}
                >
                  {/** SAFE PRINT: if item.item isn't a string, show JSON */}
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
                <Text
                  style={{
                    color: darkMode ? colors.offWhite2 : colors.black,
                  }}
                >
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
                    !darkMode
                      ? {
                          backgroundColor: colors.offWhite2,
                          color: colors.black,
                        }
                      : {},
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
                { flex: 1.2 },
                darkMode ? darkStyles.gridCell : null,
              ]}
            >
              <View style={styles.cellInner}>
                {Array.from({ length: item.quantity }).map((_, qtyIndex) => (
                  <View key={qtyIndex} style={styles.buyerRow}>
                    {item.buyers.map((buyer, buyerIndex) => (
                      <View key={buyerIndex} style={styles.buyerContainer}>
                        <CheckBox
                          value={buyer.selected[qtyIndex]}
                          onValueChange={() =>
                            toggleBuyerSelection(itemIndex, buyerIndex, qtyIndex)
                          }
                        />
                        <Text
                          style={[
                            styles.buyerLabel,
                            {
                              color: darkMode ? colors.offWhite2 : colors.black,
                            },
                          ]}
                        >
                          {safeString(buyer.name)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* settings modal */}
      <Modal visible={showSettings} animationType="none" transparent>
        <TouchableWithoutFeedback onPress={() => setShowSettings(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.settingsModal}>
                <Text style={[styles.modalTitle, { color: colors.black }]}>
                  Settings
                </Text>
                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: colors.black }]}>
                    Dark Mode
                  </Text>
                  <Switch value={darkMode} onValueChange={setDarkMode} />
                </View>
                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: colors.black }]}>
                    Split Tax Evenly
                  </Text>
                  <Switch
                    value={splitTaxEvenly}
                    onValueChange={setSplitTaxEvenly}
                  />
                </View>
                <Pressable
                  onPress={() => setShowSettings(false)}
                  style={({ pressed }) => [
                    styles.closeButton,
                    { backgroundColor: pressed ? colors.green : colors.yellow },
                  ]}
                >
                  <Text style={[styles.buttonText, { color: colors.black }]}>
                    Close
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default Split;

/** STYLES */
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
  },
  topButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  clearDataButton: {
    borderWidth: 1,
    borderColor: colors.black,
  },
  settingsButton: {
    padding: 5,
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
    justifyContent: "center",
  },
  itemInput: {
    width: 150,
    borderWidth: 1,
    padding: 5,
    backgroundColor: colors.offWhite2,
    color: colors.black,
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    position: "relative",
  },
  itemNameText: {
    textAlign: "center",
    flexWrap: "wrap",
    width: "100%",
    marginLeft: 10,
  },
  trashIcon: {
    position: "absolute",
    top: 5,
    left: 5,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  settingsModal: {
    width: "80%",
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  settingLabel: {
    fontSize: 16,
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  signInBanner: {
    position: "absolute",
    width: "100%",
    top: 60,
    backgroundColor: "red",
    padding: 8,
    zIndex: 10,
  },
  signInBannerText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
  savedBanner: {
    position: "absolute",
    width: "100%",
    top: 100,
    backgroundColor: "green",
    padding: 8,
    zIndex: 10,
  },
  savedBannerText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
});

// dark mode
const darkStyles = StyleSheet.create({
  container: {
    backgroundColor: "#1d1d1d",
  },
  receiptNameContainer: {
    backgroundColor: "#1e1e1e",
  },
  buyersForm: {
    backgroundColor: "#6d86b0",
  },
  taxForm: {
    backgroundColor: "#7b584f",
  },
  itemForm: {
    backgroundColor: "#67654d",
  },
  inputField: {
    backgroundColor: colors.offWhite2,
    color: "#1d1d1d",
    borderColor: "#1d1d1d",
  },
  gridTitles: {
    borderColor: colors.offWhite2,
  },
  gridRow: {
    borderColor: colors.offWhite2,
  },
  gridCell: {
    borderColor: colors.offWhite2,
  },
  quantityInput: {
    borderColor: "#1d1d1d",
    backgroundColor: "#1d1d1d",
    color: colors.offWhite2,
  },
});

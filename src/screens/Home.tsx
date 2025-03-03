import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  StatusBar,
  Image,
  Text,
  Animated,
  TextInput,
} from "react-native";
import AppText from "../../components/AppText";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/RootStackParams";
// import colors from "../../constants/colors";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { auth, database } from "../firebase";
import { User, signOut } from "firebase/auth";
import PrivacyPolicy from "../components/PrivacyPolicy";
// removed: no longer importing `child` or `onValue`; we only use get() and update().
import { ref, get, update } from "firebase/database";
import Receipts from "./Receipts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  colors,
  offWhiteTheme,
  yuckTheme,
  darkTheme,
  getRandomHexColor,
} from "../components/ColorThemes";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

const SPLIT_STORAGE_KEY = "@split_state";

const screenWidth = Dimensions.get("window").width;
const buttonWidth = screenWidth * 0.5;
const buttonHeight = buttonWidth / 2;

// we keep this session tracking object if you’d like to avoid regenerating random usernames in the same session
const generatedForUid: { [uid: string]: boolean } = {};

const Home = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const [user, setUser] = useState<User | null>(null);
  const [isSignInModalVisible, setSignInModalVisible] = useState(false);

  const [showSignInBanner, setShowSignInBanner] = useState(false);
  const bannerOpacity = useState(new Animated.Value(0))[0];

  const [username, setUsername] = useState<string>("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  const [gameIconColor, setGameIconColor] = useState(colors.yellow);
  const [userIconColor, setUserIconColor] = useState(colors.yellow);
  const [receiptIconColor, setReceiptIconColor] = useState(colors.yellow);
  const [privacyIconColor, setPrivacyIconColor] = useState(colors.yellow);
  const [buttonBgColor, setButtonBgColor] = useState(colors.yellow);
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);

  const [darkMode, setDarkMode] = useState(false);
  const [offWhiteMode, setOffWhiteMode] = useState(false);
  const [yuckMode, setYuckMode] = useState(false);
  const [randomMode, setRandomMode] = useState(false);
  const [randomTheme, setRandomTheme] = useState(colors);

  // load theme from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedData = await AsyncStorage.getItem(SPLIT_STORAGE_KEY);
        if (storedData) {
          const parsed = JSON.parse(storedData);
          if (parsed?.settings) {
            setDarkMode(parsed.settings.darkMode ?? false);
            setOffWhiteMode(parsed.settings.offWhiteMode ?? false);
            setYuckMode(parsed.settings.yuckMode ?? false);
            setRandomMode(parsed.settings.randomMode ?? false);
          }
        }
      } catch (error) {
        console.log("Error loading theme:", error);
      }
    })();
  }, []);

  // if randomMode is on, update colors every second (like in Split)
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

  // figure out which theme object to use
  const currentTheme = randomMode
    ? randomTheme
    : yuckMode
    ? yuckTheme
    : offWhiteMode
    ? offWhiteTheme
    : darkMode
    ? darkTheme
    : colors;

  // pick a text color for "Receipt" / "Splitter"
  const titleTextColor =
    offWhiteMode || (!darkMode && !yuckMode && !randomMode)
      ? "#000" // black
      : colors.lightGray2; // white (or whatever color you want in dark/yuck/random)

  useFocusEffect(
    useCallback(() => {
      const loadTheme = async () => {
        try {
          const storedData = await AsyncStorage.getItem(SPLIT_STORAGE_KEY);
          if (storedData) {
            const parsed = JSON.parse(storedData);
            if (parsed?.settings) {
              setDarkMode(parsed.settings.darkMode ?? false);
              setOffWhiteMode(parsed.settings.offWhiteMode ?? false);
              setYuckMode(parsed.settings.yuckMode ?? false);
              setRandomMode(parsed.settings.randomMode ?? false);
            }
          }
        } catch (error) {
          console.log("Error loading theme:", error);
        }
      };
      loadTheme();
    }, [])
  );

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchOrCreateUsername(currentUser.uid);
      } else {
        setUsername(generateRandomUsername());
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // changed: this no longer references the global "usernames" node. only reads/writes to users/<uid>/username.
  const fetchOrCreateUsername = async (uid: string) => {
    if (generatedForUid[uid]) {
      // we've already fetched or created a username in this session
      const finalSnap = await get(ref(database, `users/${uid}/username`));
      if (finalSnap.exists()) {
        setUsername(finalSnap.val());
      } else {
        setUsername("Loading...");
      }
      return;
    }

    try {
      const snap = await get(ref(database, `users/${uid}/username`));
      if (snap.exists()) {
        const existingName = snap.val();
        setUsername(existingName);
      } else {
        // no username in db, generate a random one
        const newRand = generateRandomUsername();
        setUsername(newRand);
        await setUsernameInDB(uid, newRand);
      }
      generatedForUid[uid] = true;
    } catch (err) {
      console.error("Error in fetchOrCreateUsername:", err);
    }
  };

  // changed: we only write to `users/<uid>/username`. we do not write to `usernames/<someUserName>`.
  const setUsernameInDB = async (uid: string, newUsername: string) => {
    try {
      const userRef = ref(database, `users/${uid}/username`);
      const currSnap = await get(userRef);
      const currVal = currSnap.val();

      if (currVal === newUsername) {
        return; // no change needed
      }

      // simply update the username under the user’s path
      await update(ref(database), {
        [`users/${uid}/username`]: newUsername,
      });
    } catch (error) {
      console.error("Error writing username to DB:", error);
    }
  };

  const generateRandomUsername = (): string => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars[randomIndex];
    }
    return result;
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSignInModalVisible(false);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // changed: removed the code that checks if “usernames/<newUsername>” already exists and the updates to that node.
  const handleUsernameSubmit = async () => {
    if (!user) return;
    const newUsername = username.trim();
    if (!newUsername) {
      alert("Username cannot be empty.");
      return;
    }

    try {
      const currentUsernameRef = ref(database, `users/${user.uid}/username`);
      const currentUsernameSnapshot = await get(currentUsernameRef);
      const currentUsername = currentUsernameSnapshot.val();

      // if unchanged, close the edit field
      if (currentUsername === newUsername) {
        setIsEditingUsername(false);
        return;
      }

      const updates: { [key: string]: any } = {};
      updates[`users/${user.uid}/username`] = newUsername;

      // you may still want to move existing messages if you store them under "chat/messages/<username>"
      if (currentUsername) {
        const oldMessagesRef = ref(
          database,
          `chat/messages/${currentUsername}`
        );
        const messagesSnapshot = await get(oldMessagesRef);

        if (messagesSnapshot.exists()) {
          const messagesData = messagesSnapshot.val();
          Object.keys(messagesData).forEach((messageKey) => {
            const message = messagesData[messageKey];
            updates[`chat/messages/${newUsername}/${messageKey}`] = {
              ...message,
              senderName: newUsername,
            };
            updates[`chat/messages/${currentUsername}/${messageKey}`] = null;
          });
        }
      }

      await update(ref(database), updates);
      setIsEditingUsername(false);
    } catch (error) {
      console.error("Error updating username:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update username."
      );
    }
  };

  const handleReceiptsPress = () => {
    if (!user) {
      setReceiptIconColor("red");
      setShowSignInBanner(true);

      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(bannerOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowSignInBanner(false);
            setReceiptIconColor(colors.yellow);
          });
        }, 1500);
      });
    } else {
      navigation.navigate("Receipts");
    }
  };

  const handleStartSnake = () => {
    navigation.navigate("Snake");
  };

  const handleStartSplitting = () => {
    navigation.navigate("Split", {});
  };

  const renderAuthContent = () => {
    if (user) {
      return (
        <View style={styles.authContainer}>
          {isEditingUsername ? (
            <TextInput
              style={[styles.modalTitle, styles.editableUsername]}
              value={username}
              onChangeText={setUsername}
              onBlur={handleUsernameSubmit}
              onSubmitEditing={handleUsernameSubmit}
              autoFocus
            />
          ) : (
            <Pressable onPress={() => setIsEditingUsername(true)}>
              <AppText style={styles.modalTitle}>Hello: {username}</AppText>
            </Pressable>
          )}

          {user.photoURL && (
            <Image
              source={{ uri: user.photoURL }}
              style={styles.profileImage}
            />
          )}
          <AppText style={styles.userEmail}>{user.email}</AppText>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.signOutButtonPressed,
            ]}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      );
    }
    // user not signed in yet
    return (
      <View style={styles.authContainer}>
        <AppText style={styles.modalTitle}>Sign In To Receipt Splitter</AppText>
        <GoogleSignInButton
          onSuccess={() => setSignInModalVisible(false)}
          style={({ pressed }) =>
            pressed ? { backgroundColor: colors.green } : undefined
          }
        />
      </View>
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: currentTheme.offWhite2 }]}
    >
      {/* icon row */}
      <View style={styles.iconRow}>
        <Pressable
          onPressIn={() => setGameIconColor(colors.green)}
          onPressOut={() => setGameIconColor(colors.yellow)}
          onPress={handleStartSnake}
          style={styles.iconButton}
        >
          <FontAwesome5 name="gamepad" size={24} color={gameIconColor} />
        </Pressable>

        <Pressable
          onPressIn={() => setUserIconColor(colors.green)}
          onPressOut={() => setUserIconColor(colors.yellow)}
          onPress={() => setSignInModalVisible(true)}
          style={styles.iconButton}
        >
          <FontAwesome5 name="user" size={24} color={userIconColor} />
          {user && <View style={styles.authBadge} />}
        </Pressable>

        <Pressable
          onPressIn={() => {
            if (!user) {
              setReceiptIconColor("red");
            } else {
              setReceiptIconColor(colors.green);
            }
          }}
          onPressOut={() => setReceiptIconColor(colors.yellow)}
          onPress={handleReceiptsPress}
          style={styles.iconButton}
        >
          <FontAwesome5 name="receipt" size={24} color={receiptIconColor} />
        </Pressable>

        <Pressable
          onPressIn={() => setPrivacyIconColor(colors.green)}
          onPressOut={() => setPrivacyIconColor(colors.yellow)}
          onPress={() => setPrivacyModalVisible(true)}
          style={styles.iconButton}
        >
          <FontAwesome5 name="shield-alt" size={24} color={privacyIconColor} />
        </Pressable>
      </View>

      {showSignInBanner && (
        <Animated.View
          style={[
            styles.bannerContainer,
            {
              opacity: bannerOpacity,
              transform: [{ translateY: 0 }],
            },
          ]}
        >
          <Text style={styles.bannerText}>Sign In To Access Receipts</Text>
        </Animated.View>
      )}

      <View style={styles.titleContainer}>
        <AppText
          style={[styles.title, styles.boldText, { color: titleTextColor }]}
        >
          Receipt
        </AppText>
        <AppText
          style={[
            styles.title,
            styles.titleSpacing,
            styles.boldText,
            { color: titleTextColor },
          ]}
        >
          Splitter
        </AppText>
      </View>

      <View style={styles.bottom}>
        <Pressable
          style={[styles.startButton, { backgroundColor: buttonBgColor }]}
          onPress={handleStartSplitting}
          onPressIn={() => setButtonBgColor(colors.green)}
          onPressOut={() => setButtonBgColor(colors.yellow)}
        >
          <AppText style={[styles.buttonText, styles.boldText]}>
            Start Splitting
          </AppText>
        </Pressable>
      </View>

      <PrivacyPolicy
        isVisible={isPrivacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
      />

      <Modal
        visible={isSignInModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSignInModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSignInModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.modalContainer, styles.theming]}>
                {renderAuthContent()}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: colors.yuck,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRow: {
    flexDirection: "row",
    position: "absolute",
    top: 40,
    width: "100%",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  iconButton: {
    padding: 10,
  },
  authBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: "white",
  },
  bannerContainer: {
    position: "absolute",
    width: "100%",
    left: 0,
    alignItems: "center",
    top: Dimensions.get("window").height * 0.6,
    backgroundColor: "red",
    padding: 8,
    zIndex: 20,
  },
  bannerText: {
    color: "white",
    fontWeight: "600",
  },
  titleContainer: {
    position: "absolute",
    top: Dimensions.get("window").height * 0.25,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  title: {
    fontSize: 50,
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  titleSpacing: {
    marginTop: 20,
  },
  boldText: {
    fontWeight: "bold",
  },
  bottom: {
    position: "absolute",
    bottom: screenWidth / 4,
    width: "100%",
    alignItems: "center",
    zIndex: 5,
  },
  startButton: {
    width: buttonWidth,
    height: buttonHeight,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 24,
    color: "black",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    height: Dimensions.get("window").height * 0.4,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  theming: {
    backgroundColor: colors.yuck,
    borderWidth: 2,
    borderColor: colors.yellow,
  },
  authContainer: {
    alignItems: "center",
    padding: 20,
    width: "100%",
  },
  modalTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  editableUsername: {
    borderBottomWidth: 1,
    borderBottomColor: colors.yellow,
    marginHorizontal: 20,
    textAlign: "center",
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 20,
    color: "white",
  },
  signOutButton: {
    backgroundColor: "#FF0000",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#8B0000",
  },
  signOutButtonPressed: {
    backgroundColor: "#8B0000",
    opacity: 0.8,
  },
  signOutText: {
    color: "white",
    fontWeight: "600",
  },
});

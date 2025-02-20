import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Image,
  Text,
  Animated,
  TextInput,
} from "react-native";
import AppText from "../../components/AppText";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/RootStackParams";
import colors from "../../constants/colors";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { auth, database } from "../firebase";
import { User, signOut } from "firebase/auth";
import PrivacyPolicy from "../components/PrivacyPolicy";
import { adjectives, nouns } from "../components/wordLists";
import { ref, get, update } from "firebase/database";
import Receipts from "./Receipts";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

const screenWidth = Dimensions.get("window").width;
const buttonWidth = screenWidth * 0.5;
const buttonHeight = buttonWidth / 2;

// NEW: an object that tracks if we've already generated a random name for a given UID in this session.
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

  // CHANGED: we do a single get() call, then decide whether to create a random name
  const fetchOrCreateUsername = async (uid: string) => {
    // if we've already created a name for this user in this session, skip
    if (generatedForUid[uid]) {
      console.log("Already generated username this session for UID:", uid);
      // but still do a get(...) to see if DB has a final name
      const finalSnap = await get(ref(database, `users/${uid}/username`));
      if (finalSnap.exists()) {
        setUsername(finalSnap.val());
      } else {
        // fallback if DB is still empty
        setUsername("Loading...");
      }
      return;
    }

    console.log("fetchOrCreateUsername for", uid);
    try {
      const snap = await get(ref(database, `users/${uid}/username`));
      if (snap.exists()) {
        const existingName = snap.val();
        console.log("Found existing username:", existingName);
        setUsername(existingName);
      } else {
        // no name in DB, see if we have not generated yet
        const newRand = generateRandomUsername();
        console.log("No username in DB. Generating name:", newRand);

        setUsername(newRand);
        await setUsernameInDB(uid, newRand);
      }
      // mark that we have created or loaded a name for this user
      generatedForUid[uid] = true;
    } catch (err) {
      console.error("Error in fetchOrCreateUsername:", err);
    }
  };

  const setUsernameInDB = async (uid: string, newUsername: string) => {
    try {
      console.log("setUsernameInDB -> newUsername:", newUsername);
      const userRef = ref(database, `users/${uid}/username`);
      const userNameRef = ref(database, `usernames/${newUsername}`);

      const currSnap = await get(userRef);
      const currVal = currSnap.val();
      if (currVal === newUsername) {
        console.log("Name already set. no update needed");
        return;
      }

      const nameSnap = await get(userNameRef);
      if (nameSnap.exists()) {
        console.log(
          "That random name is taken somehow. generating new again or throw error"
        );
        // in your case, you might do:
        // throw new Error("Username already taken");
        // or generate again, but let's keep it simple
      }

      const updates: { [key: string]: any } = {};
      updates[`users/${uid}/username`] = newUsername;
      updates[`usernames/${newUsername}`] = uid;

      if (currVal) {
        updates[`usernames/${currVal}`] = null;
      }

      console.log("Applying updates:", updates);
      await update(ref(database), updates);
    } catch (error) {
      console.error("Error writing username to DB:", error);
    }
  };

  const generateRandomUsername = (): string => {
    // pick from alphanumeric
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars[randomIndex];
    }
    return result; // e.g. "A1b2C3d4E5f6"
  };

  // no changes below here
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSignInModalVisible(false);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleUsernameSubmit = async () => {
    console.log("handleUsernameSubmit function called!");
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

      if (currentUsername === newUsername) {
        setIsEditingUsername(false);
        return;
      }

      const usernameCheckRef = ref(database, `usernames/${newUsername}`);
      const usernameSnapshot = await get(usernameCheckRef);

      if (usernameSnapshot.exists()) {
        alert("Username already taken. Please choose another one.");
        return;
      }

      const updates: { [key: string]: any } = {};
      updates[`users/${user.uid}/username`] = newUsername;
      updates[`usernames/${newUsername}`] = user.uid;

      if (currentUsername) {
        updates[`usernames/${currentUsername}`] = null;
      }

      // Update existing messages
      if (currentUsername) {
        console.log("handleUsernameSubmit: Updating existing messages...");
        const oldMessagesRef = ref(
          database,
          `chat/messages/${currentUsername}`
        );
        console.log(
          "handleUsernameSubmit: Fetching messages from path:",
          oldMessagesRef.toString()
        );

        const messagesSnapshot = await get(oldMessagesRef);

        if (messagesSnapshot.exists()) {
          console.log("handleUsernameSubmit: Messages snapshot exists!");

          const messagesData = messagesSnapshot.val();
          console.log("handleUsernameSubmit: Messages data:", messagesData);

          Object.keys(messagesData).forEach((messageKey) => {
            const message = messagesData[messageKey];
            console.log(
              "handleUsernameSubmit: Processing message key:",
              messageKey,
              "message:",
              message
            );

            updates[`chat/messages/${newUsername}/${messageKey}`] = {
              ...message,
              senderName: newUsername,
            };
            updates[`chat/messages/${currentUsername}/${messageKey}`] = null;
            console.log(
              "handleUsernameSubmit: Update prepared for message key:",
              messageKey
            );
          });
        } else {
          console.log(
            "handleUsernameSubmit: No messages snapshot exists for old username."
          );
        }
      } else {
        console.log(
          "handleUsernameSubmit: No currentUsername to update messages from."
        );
      }

      console.log("handleUsernameSubmit: Final updates object:", updates);
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
              onBlur={() => {
                console.log("TextInput onBlur event triggered!");
                handleUsernameSubmit();
              }}
              onSubmitEditing={() => {
                console.log("TextInput onSubmitEditing event triggered!");
                handleUsernameSubmit();
              }}
              autoFocus
            />
          ) : (
            <Pressable
              onPress={() => {
                console.log("Username Pressable onPress triggered!");
                setIsEditingUsername(true);
              }}
            >
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
    <View style={styles.container}>
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
        <AppText style={[styles.title, styles.boldText]}>Receipt</AppText>
        <AppText style={[styles.title, styles.titleSpacing, styles.boldText]}>
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
    backgroundColor: colors.yuck,
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

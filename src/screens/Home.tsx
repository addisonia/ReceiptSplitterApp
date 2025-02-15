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
import { auth, database } from "../firebase"; // Make sure database is imported here
import { User, signOut } from "firebase/auth";
import PrivacyPolicy from "../components/PrivacyPolicy";
import { adjectives, nouns } from "../components/wordLists";
import { ref, set, onValue, get, update } from "firebase/database"; // Import database functions

// import receipts
import Receipts from "./Receipts";

type HomeScreenNavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    "Home"
>;

const screenWidth = Dimensions.get("window").width;
const buttonWidth = screenWidth * 0.5;
const buttonHeight = buttonWidth / 2;

const Home = () => {
    const navigation = useNavigation<HomeScreenNavigationProp>();

    // track auth
    const [user, setUser] = useState<User | null>(null);
    const [isSignInModalVisible, setSignInModalVisible] = useState(false);

    // banner message
    const [showSignInBanner, setShowSignInBanner] = useState(false);
    const bannerOpacity = useState(new Animated.Value(0))[0];

    // new states for username and editing
    const [username, setUsername] = useState<string>("");
    const [isEditingUsername, setIsEditingUsername] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
            // Make callback async
            setUser(currentUser);
            if (currentUser) {
                await fetchUsernameFromDB(currentUser.uid); // Fetch username on sign-in
            } else {
                setUsername(generateRandomUsername()); // Random username for signed-out users
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const fetchUsernameFromDB = async (uid: string) => {
        const usernameRef = ref(database, `users/${uid}/username`);

        return new Promise<void>((resolve) => {
            // Return a Promise to manage async operation
            onValue(
                usernameRef,
                (snapshot) => {
                    const dbUsername = snapshot.val();
                    if (dbUsername) {
                        setUsername(dbUsername); // Use username from database if it exists
                        resolve(); // Resolve promise once username is fetched
                    } else {
                        const generatedName = generateRandomUsername();
                        setUsername(generatedName); // Generate a new one if not in DB
                        setUsernameInDB(uid, generatedName); // And save it to DB
                        resolve(); // Resolve after generating and saving default username
                    }
                },
                {
                    onlyOnce: true, // Fetch username only once
                }
            );
        });
    };

    const setUsernameInDB = async (uid: string, newUsername: string) => {
        try {
            const usernameRef = ref(database, `usernames/${newUsername}`);
            const currentUsernameRef = ref(database, `users/${uid}/username`);

            // Fetch the current username
            const currentUsernameSnapshot = await get(currentUsernameRef);
            const currentUsername = currentUsernameSnapshot.val();

            if (currentUsername === newUsername) return; // No need to update if unchanged

            // Check if new username already exists
            const usernameSnapshot = await get(usernameRef);
            if (usernameSnapshot.exists()) {
                throw new Error("Username already exists");
            }

            // Prepare atomic updates
            const updates: { [key: string]: any } = {};

            // Assign new username
            updates[`users/${uid}/username`] = newUsername;
            updates[`usernames/${newUsername}`] = uid;

            // Check if the old username exists before deleting it
            if (currentUsername) {
                const oldUsernameRef = ref(database, `usernames/${currentUsername}`);
                const oldUsernameSnap = await get(oldUsernameRef);
                if (oldUsernameSnap.exists()) {
                    updates[`usernames/${currentUsername}`] = null;
                }
            }

            // Execute updates
            console.log("Attempting username update with:");
            console.log("  User UID:", uid);
            console.log("  New Username:", newUsername);
            console.log("  Value being written to usernames node:", uid);
            console.log("  Auth UID in rule context (expected):", user?.uid);

            await update(ref(database), updates);
        } catch (error) {
            console.error("Error writing username to database:", error);
            throw error;
        }
    };

    const generateRandomUsername = () => {
        const randomAdjective =
            adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${randomAdjective} ${randomNoun}`;
    };

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
  
        // Check username availability
        const usernameCheckRef = ref(database, `usernames/${newUsername}`);
        const usernameSnapshot = await get(usernameCheckRef);
  
        if (usernameSnapshot.exists()) {
          alert("Username already taken. Please choose another one.");
          return;
        }
  
  
        // Prepare atomic updates
        const updates: { [key: string]: any } = {};
        updates[`users/${user.uid}/username`] = newUsername;
        updates[`usernames/${newUsername}`] = user.uid;
  
        // 2. Remove old username reference
        if (currentUsername) {
          updates[`usernames/${currentUsername}`] = null;
        }
  
        // 3. Update existing messages
        if (currentUsername) {
          console.log("handleUsernameSubmit: Updating existing messages..."); // <--- LOG 1: Section entry
          const oldMessagesRef = ref(
            database,
            `chat/messages/${currentUsername}`
          );
          console.log("handleUsernameSubmit: Fetching messages from path:", oldMessagesRef.toString()); // <--- LOG 2: Path being fetched
  
          const messagesSnapshot = await get(oldMessagesRef);
  
          if (messagesSnapshot.exists()) {
            console.log("handleUsernameSubmit: Messages snapshot exists!"); // <--- LOG 3: Snapshot exists
  
            const messagesData = messagesSnapshot.val();
            console.log("handleUsernameSubmit: Messages data:", messagesData); // <--- LOG 4: Messages Data
  
            Object.keys(messagesData).forEach((messageKey) => {
              const message = messagesData[messageKey]; // Get individual message
              console.log("handleUsernameSubmit: Processing message key:", messageKey, "message:", message); // <--- LOG 5: Message processing
  
              // Move messages to new username path
              updates[`chat/messages/${newUsername}/${messageKey}`] = {
                ...message, // Use spread operator to copy all existing message data
                senderName: newUsername,
              };
              // Remove old messages
              updates[`chat/messages/${currentUsername}/${messageKey}`] = null;
              console.log("handleUsernameSubmit: Update prepared for message key:", messageKey); // <--- LOG 6: Update prepared
            });
          } else {
            console.log("handleUsernameSubmit: No messages snapshot exists for old username."); // <--- LOG 7: No snapshot
          }
        } else {
          console.log("handleUsernameSubmit: No currentUsername to update messages from."); // <--- LOG 8: No currentUsername
        }
  
  
        // Execute all updates atomically
        console.log("handleUsernameSubmit: Final updates object:", updates); // <--- LOG 9: Final updates object
        await update(ref(database), updates);
        setIsEditingUsername(false);
      } catch (error) {
        console.error("Error updating username:", error);
        alert(
          error instanceof Error ? error.message : "Failed to update username."
        );
      }
    };

    // icon states
    const [gameIconColor, setGameIconColor] = useState(colors.yellow);
    const [userIconColor, setUserIconColor] = useState(colors.yellow);
    const [receiptIconColor, setReceiptIconColor] = useState(colors.yellow);
    const [privacyIconColor, setPrivacyIconColor] = useState(colors.yellow);

    // main button background
    const [buttonBgColor, setButtonBgColor] = useState(colors.yellow);

    // privacy policy modal visibility
    const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);

    const handleStartSnake = () => {
        navigation.navigate("Snake");
    };

    const handleStartSplitting = () => {
        navigation.navigate("Split", {});
    };

    // helper to render sign-in or sign-out content
    const renderAuthContent = () => {
        if (user) {
            return (
                <View style={styles.authContainer}>
                    {/* Editable Username */}
                    {isEditingUsername ? (
                        <TextInput
                            style={[styles.modalTitle, styles.editableUsername]}
                            value={username}
                            onChangeText={setUsername}
                            onBlur={() => {
                                console.log("TextInput onBlur event triggered!"); // <--- ADDED LOG
                                handleUsernameSubmit();
                            }}
                            onSubmitEditing={() => {
                                console.log("TextInput onSubmitEditing event triggered!"); // <--- ADDED LOG
                                handleUsernameSubmit();
                            }}
                            autoFocus={true}
                        />
                    ) : (
                        <Pressable onPress={() => {
                            console.log("Username Pressable onPress triggered!"); // <--- ADDED LOG
                            setIsEditingUsername(true);
                        }}>
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

    // handle receipts press
    const handleReceiptsPress = () => {
        if (!user) {
            // user not signed in
            setReceiptIconColor("red");
            setShowSignInBanner(true);

            // fade in banner
            Animated.timing(bannerOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                // wait 1.5s then fade out
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
            // user signed in, navigate
            navigation.navigate("Receipts");
        }
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

            {/* flashing banner if user not signed in */}
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

            {/* title */}
            <View style={styles.titleContainer}>
                <AppText style={[styles.title, styles.boldText]}>Receipt</AppText>
                <AppText style={[styles.title, styles.titleSpacing, styles.boldText]}>
                    Splitter
                </AppText>
            </View>

            {/* main bottom button */}
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

            {/* privacy policy modal */}
            <PrivacyPolicy
                isVisible={isPrivacyModalVisible}
                onClose={() => setPrivacyModalVisible(false)}
            />

            {/* sign-in modal */}
            <Modal
                visible={isSignInModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSignInModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setSignInModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={() => { }}>
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

// write comments in lowercase
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
        top: Dimensions.get("window").height * 0.6, // about 3/5 of the screen
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
        textShadowColor: "rgba(0, 0, 0, 0.75)",
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
        // height: "40%",  <--- remove percentage height
        height: Dimensions.get("window").height * 0.4, // Set fixed height in pixels
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
        // new style for editable username
        borderBottomWidth: 1,
        borderBottomColor: colors.yellow,
        marginHorizontal: 20, // Add some horizontal margin if needed
        textAlign: "center", // Keep text centered
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

export default Home;
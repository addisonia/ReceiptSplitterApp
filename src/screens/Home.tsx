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
} from "react-native";
import AppText from "../../components/AppText";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/RootStackParams";
import colors from "../../constants/colors";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { auth } from "../firebase";
import { User, signOut } from "firebase/auth";
import PrivacyPolicy from "../components/PrivacyPolicy";

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

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSignInModalVisible(false);
    } catch (error) {
      console.error("Sign out error:", error);
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
    navigation.navigate("Split");
  };

  // helper to render sign-in or sign-out content
  const renderAuthContent = () => {
    if (user) {
      return (
        <View style={styles.authContainer}>
          <AppText style={styles.modalTitle}>Signed In</AppText>
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
          <Text style={styles.bannerText}>Please Sign In To Access Receipts</Text>
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
    height: "40%",
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

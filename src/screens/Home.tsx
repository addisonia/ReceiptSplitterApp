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
} from "react-native";
import AppText from "../../components/AppText";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/RootStackParams";
import colors from "../../constants/colors";
import { WebView } from "react-native-webview";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { auth } from "../firebase";
import { User, signOut } from "firebase/auth";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

const screenWidth = Dimensions.get("window").width;
const buttonWidth = screenWidth * 0.5;
const buttonHeight = buttonWidth / 2;

const htmlContent = `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <style>
        body {
          background-color: white;
          font-family: Arial, sans-serif;
          padding: 20px;
          font-size: 20px; 
          line-height: 1.8;
          color: #333;
        }
        h1 {
          font-size: 22px; 
          color: #222;
        }
        h2 {
          font-size: 14px;
          color: #222;
        }
        h3 {
          font-size: 12px;
          color: #222;
        }
        p, li {
          font-size: 14px;
        }
        a {
          font-size: 14px;
          color: #0066cc;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <h1>Privacy Policy</h1>
      <p>Last updated: February 08, 2025</p>
      <p>This Privacy Policy describes our policies and procedures on the collection, use and disclosure of your information when you use the service and tells you about your privacy rights and how the law protects you.</p>
      <p>We use your personal data to provide and improve the service. By using the service, you agree to the collection and use of information in accordance with this Privacy Policy.</p>

      <h2>Interpretation and Definitions</h2>
      <h3>Interpretation</h3>
      <p>The words of which the initial letter is capitalized have meanings defined under the following conditions...</p>

      <h3>Definitions</h3>
      <p><strong>Account:</strong> A unique account created for you to access our service or parts of our service.</p>
      <p><strong>Application:</strong> Receipt Splitter, the software program provided by the company.</p>
      <p><strong>Company:</strong> Receipt Splitter.</p>
      <p><strong>Country:</strong> Wisconsin, United States.</p>
      <p><strong>Device:</strong> Any device that can access the service such as a computer, a cellphone, or a digital tablet.</p>
      <p><strong>Personal Data:</strong> Any information that relates to an identified or identifiable individual.</p>

      <h2>Collecting and Using Your Personal Data</h2>
      <h3>Types of Data Collected</h3>
      <h4>Personal Data</h4>
      <p>While using our service, we may ask you to provide us with certain personally identifiable information...</p>

      <h4>Usage Data</h4>
      <p>Usage Data is collected automatically when using the service...</p>

      <h2>Use of Your Personal Data</h2>
      <p>The company may use personal data for the following purposes:</p>
      <ul>
        <li>To provide and maintain our service.</li>
        <li>To manage your account.</li>
        <li>To contact you.</li>
        <li>For business transfers.</li>
        <li>For other purposes such as data analysis, identifying usage trends, and improving our service.</li>
      </ul>

      <h2>Retention of Your Personal Data</h2>
      <p>The company will retain your personal data only for as long as is necessary...</p>

      <h2>Delete Your Personal Data</h2>
      <p>You have the right to delete or request that we assist in deleting the personal data that we have collected about you...</p>

      <h2>Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, you can contact us:</p>
      <ul>
        <li>By email: officialreceiptsplitter@gmail.com</li>
        <li>By phone: 608-234-0029</li>
      </ul>
    </body>
  </html>
`;

const Home = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // track auth
  const [user, setUser] = useState<User | null>(null);
  const [isSignInModalVisible, setSignInModalVisible] = useState(false);

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

  // privacy modal
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);

  const handleStartSnake = () => {
    navigation.navigate("Snake");
  };

  const handleStartSplitting = () => {
    navigation.navigate("Split");
  };

  // this helper renders sign-in or sign-out content inside the modal
  const renderAuthContent = () => {
    if (user) {
      return (
        <View style={styles.authContainer}>
          {/* this "Signed In" text is in the modal, but we also added one outside the modal below */}
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
    // if user isn't signed in yet
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
          onPressIn={() => setReceiptIconColor(colors.green)}
          onPressOut={() => setReceiptIconColor(colors.yellow)}
          onPress={() => {
            // placeholder
          }}
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

      <Modal
        visible={isPrivacyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPrivacyModalVisible(false)}>
          <View style={styles.privacyModalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.privacyModalContainer}>
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: htmlContent }}
                  style={styles.webview}
                  scrollEnabled={true} // Enable scrolling
                  nestedScrollEnabled={true} // Needed for Android scrolling inside modals
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
  signedInText: {
    position: "absolute",
    top: 80,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 20,
    color: "white",
    zIndex: 99,
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
  webview: {
    flex: 1,
    width: "100%",
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
    backgroundColor: "#FF0000", // bright red
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#8B0000", // dark red border
  },
  signOutButtonPressed: {
    backgroundColor: "#8B0000", // darker red when pressed
    opacity: 0.8,
  },
  signOutText: {
    color: "white",
    fontWeight: "600",
  },
  googleButtonPressed: {
    backgroundColor: colors.green,
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
  privacyModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  privacyModalContainer: {
    width: "90%", // make it a wide box
    height: "80%", // make it tall enough to fit the content
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "white",
  },
});

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import AppText from "../../components/AppText";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/RootStackParams";
import colors from "../../constants/colors";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import GoogleSignInButton from "../components/GoogleSignInButton";

WebBrowser.maybeCompleteAuthSession();

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
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          font-size: 24px; /* increased base font size */
          line-height: 1.8; /* better spacing */
          color: #333;
        }
        h1 {
          font-size: 32px; /* larger header */
          color: #222;
        }
        h2 {
          font-size: 28px; /* larger sub-header */
          color: #222;
        }
        h3 {
          font-size: 26px;
          color: #222;
        }
        p, li {
          font-size: 24px; /* increased paragraph & list font size */
        }
        a {
          font-size: 24px;
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
        <li>By email: <a href="mailto:officialreceiptsplitter@gmail.com">officialreceiptsplitter@gmail.com</a></li>
        <li>By phone: 608-234-0029</li>
      </ul>
    </body>
  </html>
`;

const Home = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // icon states
  const [gameIconColor, setGameIconColor] = useState(colors.yellow);
  const [userIconColor, setUserIconColor] = useState(colors.yellow);
  const [receiptIconColor, setReceiptIconColor] = useState(colors.yellow);
  const [privacyIconColor, setPrivacyIconColor] = useState(colors.yellow);

  // main button background
  const [buttonBgColor, setButtonBgColor] = useState(colors.yellow);

  // state to control privacy modal visibility
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);

  const handleStartSnake = () => {
    navigation.navigate("Snake");
  };

  const handleStartSplitting = () => {
    navigation.navigate("Split");
  };

  const [isSignInModalVisible, setSignInModalVisible] = useState(false);

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
        </Pressable>

        <Pressable
          onPressIn={() => setReceiptIconColor(colors.green)}
          onPressOut={() => setReceiptIconColor(colors.yellow)}
          onPress={() => {
            // Navigate or do something else with receipts
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

      {/* bottom button */}
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
      <Modal
        visible={isPrivacyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPrivacyModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: /* your htmlContent */ "" }}
                  style={styles.webview}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={isSignInModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSignInModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSignInModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContainer}>
                <GoogleSignInButton
                  onSuccess={() => setSignInModalVisible(false)}
                />
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
    bottom: Dimensions.get("window").width / 4,
    width: "100%",
    alignItems: "center",
    zIndex: 5,
  },
  startButton: {
    width: Dimensions.get("window").width * 0.5,
    height: (Dimensions.get("window").width * 0.5) / 2,
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
    backgroundColor: "white",
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  webview: {
    flex: 1,
  },
});

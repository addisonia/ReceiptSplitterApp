import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import AppText from "../../components/AppText";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/RootStackParams";
import colors from "../../constants/colors";
import { WebView } from "react-native-webview";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;
const buttonWidth = screenWidth * 0.5;
const buttonHeight = buttonWidth / 2;

const htmlContent = `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          font-size: 20px; /* Increased base font size */
          line-height: 1.8; /* Added better spacing */
          color: #333;
        }
        h1 {
          font-size: 28px; /* Larger header */
          color: #222;
        }
        h2 {
          font-size: 24px; /* Larger sub-header */
          color: #222;
        }
        h3 {
          font-size: 22px;
          color: #222;
        }
        p, li {
          font-size: 20px; /* Increased paragraph & list font size */
        }
        a {
          font-size: 20px;
          color: #0066cc;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <h1>Privacy Policy</h1>
      <p>Last updated: February 08, 2025</p>
      <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
      <p>We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.</p>

      <h2>Interpretation and Definitions</h2>
      <h3>Interpretation</h3>
      <p>The words of which the initial letter is capitalized have meanings defined under the following conditions...</p>

      <h3>Definitions</h3>
      <p><strong>Account:</strong> A unique account created for You to access our Service or parts of our Service.</p>
      <p><strong>Application:</strong> Receipt Splitter, the software program provided by the Company.</p>
      <p><strong>Company:</strong> Receipt Splitter.</p>
      <p><strong>Country:</strong> Wisconsin, United States.</p>
      <p><strong>Device:</strong> Any device that can access the Service such as a computer, a cellphone, or a digital tablet.</p>
      <p><strong>Personal Data:</strong> Any information that relates to an identified or identifiable individual.</p>

      <h2>Collecting and Using Your Personal Data</h2>
      <h3>Types of Data Collected</h3>
      <h4>Personal Data</h4>
      <p>While using Our Service, We may ask You to provide Us with certain personally identifiable information...</p>

      <h4>Usage Data</h4>
      <p>Usage Data is collected automatically when using the Service...</p>

      <h2>Use of Your Personal Data</h2>
      <p>The Company may use Personal Data for the following purposes:</p>
      <ul>
        <li>To provide and maintain our Service.</li>
        <li>To manage Your Account.</li>
        <li>To contact You.</li>
        <li>For business transfers.</li>
        <li>For other purposes such as data analysis, identifying usage trends, and improving our Service.</li>
      </ul>

      <h2>Retention of Your Personal Data</h2>
      <p>The Company will retain Your Personal Data only for as long as is necessary...</p>

      <h2>Delete Your Personal Data</h2>
      <p>You have the right to delete or request that We assist in deleting the Personal Data that We have collected about You...</p>

      <h2>Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, You can contact us:</p>
      <ul>
        <li>By email: <a href="mailto:officialreceiptsplitter@gmail.com">officialreceiptsplitter@gmail.com</a></li>
        <li>By phone: 608-234-0029</li>
      </ul>
    </body>
  </html>
`;

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

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

  // navigate to snake game when game icon is pressed
  const handleStartSnake = () => {
    navigation.navigate("Snake");
  };

  // navigate to split screen when button is pressed
  const handleStartSplitting = () => {
    navigation.navigate("Split");
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
          onPress={() => {
            // add your user page navigation if needed
          }}
          style={styles.iconButton}
        >
          <FontAwesome5 name="user" size={24} color={userIconColor} />
        </Pressable>

        <Pressable
          onPressIn={() => setReceiptIconColor(colors.green)}
          onPressOut={() => setReceiptIconColor(colors.yellow)}
          onPress={() => {
            // add your receipt page navigation if needed
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

      {/* Privacy Policy Modal */}
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
                  source={{ html: htmlContent }}
                  style={styles.webview}
                  scrollEnabled={true} /* Enable scrolling inside WebView */
                  nestedScrollEnabled={true} /* Fix for Android */
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
    height: "75%",
    backgroundColor: "white",
    borderRadius: 8,
    overflow: "hidden",
  },
  scrollView: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

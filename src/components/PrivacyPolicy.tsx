import React from "react";
import {
  Modal,
  StyleSheet,
  View,
  TouchableWithoutFeedback,
} from "react-native";
import { WebView } from "react-native-webview";

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
      <p>This Privacy Policy describes Our policies and procedures on the collection, use, and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
      <p>We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.</p>

      <h2>Interpretation and Definitions</h2>
      <h3>Interpretation</h3>
      <p>The words of which the initial letter is capitalized have meanings defined under the following conditions...</p>

      <h3>Definitions</h3>
      <p><strong>Account:</strong> A unique account created for You to access our Service or parts of our Service.</p>
      <p><strong>Affiliate:</strong> An entity that controls, is controlled by, or is under common control with a party.</p>
      <p><strong>Application:</strong> Receipt Splitter, the software program provided by the Company.</p>
      <p><strong>Company:</strong> Receipt Splitter.</p>
      <p><strong>Country:</strong> Wisconsin, United States.</p>
      <p><strong>Device:</strong> Any device that can access the Service such as a computer, a cellphone, or a digital tablet.</p>
      <p><strong>Personal Data:</strong> Any information that relates to an identified or identifiable individual.</p>
      <p><strong>Service:</strong> The Application.</p>
      <p><strong>Service Provider:</strong> Any entity that processes data on behalf of the Company.</p>
      <p><strong>Usage Data:</strong> Data collected automatically when using the Service.</p>
      <p><strong>You:</strong> The individual accessing or using the Service.</p>

      <h2>Collecting and Using Your Personal Data</h2>
      <h3>Types of Data Collected</h3>
      <h4>Personal Data</h4>
      <p>We may ask You to provide Us with certain personally identifiable information, including but not limited to:</p>
      <ul>
        <li>Email address</li>
        <li>First name and last name</li>
        <li>Usage Data</li>
      </ul>

      <h4>Usage Data</h4>
      <p>Usage Data is collected automatically when using the Service...</p>

      <h2>Use of Your Personal Data</h2>
      <ul>
        <li>To provide and maintain our Service.</li>
        <li>To manage Your Account.</li>
        <li>To contact You.</li>
        <li>For business transfers.</li>
        <li>For other purposes such as data analysis, identifying usage trends, and improving our Service.</li>
      </ul>

      <h2>Retention of Your Personal Data</h2>
      <p>The Company will retain Your Personal Data only for as long as is necessary...</p>

      <h2>Transfer of Your Personal Data</h2>
      <p>Your information may be transferred to and maintained on computers located outside of Your jurisdiction...</p>

      <h2>Delete Your Personal Data</h2>
      <p>You have the right to delete or request that We assist in deleting the Personal Data that We have collected about You...</p>

      <h2>Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, you can contact us:</p>
      <ul>
        <li>By email: officialreceiptsplitter@gmail.com</li>
        <li>By phone: 608-234-0029</li>
      </ul>
    </body>
  </html>
`;

interface PrivacyPolicyProps {
  isVisible: boolean;
  onClose: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
  isVisible,
  onClose,
}) => {
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContainer}>
              <WebView
                originWhitelist={["*"]}
                source={{ html: htmlContent }}
                style={styles.webview}
                scrollEnabled
                nestedScrollEnabled
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default PrivacyPolicy;

// write comments in lowercase
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    height: "80%",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "white",
  },
  webview: {
    flex: 1,
    width: "100%",
  },
});

// src/screens/ChatSkeleton.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ViewStyle,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { colors } from "../components/ColorThemes";
import GoogleSignInButton from "../components/GoogleSignInButton";

const SPLIT_STORAGE_KEY = "@split_state";
const screenHeight = Dimensions.get("window").height;

interface SkeletonMessageProps {
  width: `${number}%`;
  alignSelf: "flex-start" | "flex-end";
}

const SkeletonMessage: React.FC<SkeletonMessageProps> = ({
  width,
  alignSelf,
}) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeletonMessage,
        {
          width,
          alignSelf,
          opacity,
        } as Animated.WithAnimatedObject<ViewStyle>,
      ]}
    />
  );
};

const ChatSkeleton: React.FC = () => {
  const { theme, mode } = useTheme();

  // Text color: white in dark mode, otherwise theme.black
  const textColor =
    mode === "yuck" || mode === "dark" ? "#ffffff" : theme.black;

  const messages: SkeletonMessageProps[] = [
    { width: "60%", alignSelf: "flex-start" },
    { width: "40%", alignSelf: "flex-start" },
    { width: "75%", alignSelf: "flex-end" },
    { width: "85%", alignSelf: "flex-end" },
    { width: "55%", alignSelf: "flex-start" },
    { width: "70%", alignSelf: "flex-end" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.offWhite2 }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.headerText, { color: textColor }]}>
          You're Missing Out...
        </Text>
      </View>
      <View style={styles.messagesContainer}>
        {messages.map((msg, index) => (
          <SkeletonMessage
            key={index}
            width={msg.width}
            alignSelf={msg.alignSelf}
          />
        ))}
      </View>
      <View style={styles.signInContainer}>
        <Text style={[styles.signInText, { color: textColor }]}>
          Sign In To Access Chat Rooms
        </Text>

        {/* new google sign‑in button */}
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          style={{ marginTop: 20 }}
        />
      </View>
    </View>
  );
};

const handleGoogleSuccess = () => {
  // nothing to do here – Chat.tsx will react to the auth change
};

export default ChatSkeleton;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flex: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: 22,
    paddingTop: 30,
  },
  messagesContainer: {
    flex: 0.7,
    padding: 15,
    justifyContent: "center",
    marginTop: screenHeight * 0.05,
    marginBottom: screenHeight * -0.05,
    paddingHorizontal: 30,
  },
  skeletonMessage: {
    height: 60,
    backgroundColor: "#0C3A50", // You could make this dynamic with theme if desired
    borderRadius: 10,
    marginVertical: 8,
  },
  signInContainer: {
    flex: 0.3,
    justifyContent: "center",
    alignItems: "center",
  },
  signInText: {
    fontSize: 18,
  },
});

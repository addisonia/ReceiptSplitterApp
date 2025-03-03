import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ViewStyle,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native"; // <-- Important
import {
  colors,
  offWhiteTheme,
  yuckTheme,
  darkTheme,
  getRandomHexColor,
} from "../components/ColorThemes";

const SPLIT_STORAGE_KEY = "@split_state";
const screenHeight = Dimensions.get("window").height;

interface SkeletonMessageProps {
  width: `${number}%`;
  alignSelf: "flex-start" | "flex-end";
}

const SkeletonMessage: React.FC<SkeletonMessageProps> = ({ width, alignSelf }) => {
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
  // same booleans as other screens
  const [darkMode, setDarkMode] = useState(false);
  const [offWhiteMode, setOffWhiteMode] = useState(false);
  const [yuckMode, setYuckMode] = useState(false);
  const [randomMode, setRandomMode] = useState(false);
  const [randomTheme, setRandomTheme] = useState(colors);

  // re-check theme from AsyncStorage each time this component is focused
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
        } catch (err) {
          console.error("Error loading skeleton theme:", err);
        }
      };
      loadTheme();
    }, [])
  );

  // if random mode, update randomTheme every second
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

  // pick the right theme
  const currentTheme = randomMode
    ? randomTheme
    : yuckMode
    ? yuckTheme
    : offWhiteMode
    ? offWhiteTheme
    : darkMode
    ? darkTheme
    : colors;

  // for those two lines of text, specifically make them white in dark mode
  const textColor = darkMode ? colors.lightGray2 : currentTheme.black;

  const messages: SkeletonMessageProps[] = [
    { width: "60%", alignSelf: "flex-start" },
    { width: "40%", alignSelf: "flex-start" },
    { width: "75%", alignSelf: "flex-end" },
    { width: "85%", alignSelf: "flex-end" },
    { width: "55%", alignSelf: "flex-start" },
    { width: "70%", alignSelf: "flex-end" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.offWhite2 }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.headerText, { color: textColor }]}>
          You're Missing Out...
        </Text>
      </View>
      <View style={styles.messagesContainer}>
        {messages.map((msg, index) => (
          <SkeletonMessage key={index} width={msg.width} alignSelf={msg.alignSelf} />
        ))}
      </View>
      <View style={styles.signInContainer}>
        <Text style={[styles.signInText, { color: textColor }]}>
          Sign In To Access Chat Rooms
        </Text>
      </View>
    </View>
  );
};

export default ChatSkeleton;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // old backgroundColor: colors.yuck
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
    backgroundColor: "#0C3A50",
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

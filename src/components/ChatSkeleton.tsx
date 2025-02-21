// components/ChatSkeleton.tsx
import React from "react";
import { View, Text, StyleSheet, Animated, ViewStyle } from "react-native";
import colors from "../../constants/colors";
import { Dimensions } from "react-native";

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
  const messages: SkeletonMessageProps[] = [
    { width: "60%", alignSelf: "flex-start" },
    { width: "40%", alignSelf: "flex-start" },
    { width: "75%", alignSelf: "flex-end" },
    { width: "85%", alignSelf: "flex-end" },
    { width: "55%", alignSelf: "flex-start" },
    { width: "70%", alignSelf: "flex-end" },
  ];

  return (
    <View style={styles.container}>
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
        <Text style={styles.signInText}>Sign In To Access Chat Rooms</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yuck,
  },
  messagesContainer: {
    flex: 0.7,
    padding: 15,
    justifyContent: "center",
    marginTop: screenHeight * 0.05,
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
    color: "white",
  },
});

export default ChatSkeleton;

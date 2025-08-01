// app.tsx
import React, { useEffect, useState } from "react";
import { registerRootComponent } from "expo";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import * as Font from "expo-font";
import {
  View,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import Home from "./src/screens/Home";
import Split from "./src/screens/Split";
import Snake from "./src/screens/Snake";
import Receipts from "./src/screens/Receipts";
import ImportReceipts from "./src/screens/ImportReceipts";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./src/firebase";
import Chat from "./src/screens/Chat";
import Profile from "./src/screens/Profile";
import GroupChat from "./src/screens/GroupChat";
import DM from "./src/screens/DM";
import UploadReceipt from "./src/screens/UploadReceipt";
import { ThemeProvider } from "./src/context/ThemeContext";
import { registerForPushNotificationsAsync } from "./src/utils/pushNotifications";


const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        swipeEnabled: true,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tab.Screen name="Chat" component={Chat} />
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Split" component={Split} />
    </Tab.Navigator>
  );
};

export type RootStackParamList = {
  Home: undefined;
  Snake: undefined;
  Receipts: undefined;
  ImportReceipts: undefined;
  MainTabs: { screen: "Home" | "Split" | "Chat" } | undefined;
  Chat: undefined;
};

const colors = {
  yuck: "#5c540b",
};

function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        (async () => {
          await registerForPushNotificationsAsync(currentUser.uid);
        })();
      }
    });
    return unsubscribe;
  }, []);
  

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        Tenorite: require("./assets/fonts/Tenorite.ttf"),
        "Tenorite-Bold": require("./assets/fonts/Tenorite_B.ttf"),
        "Tenorite-Italic": require("./assets/fonts/Tenorite_I.ttf"),
        "Tenorite-BoldItalic": require("./assets/fonts/Tenorite_BI.ttf"),
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaView
        style={{
          flex: 1,
          // backgroundColor: colors.yuck,
          paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
        }}
      >
        {/* <StatusBar barStyle="light-content" backgroundColor={colors.yuck} /> */}
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              // statusBarStyle: "light",
            }}
          >
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="Snake"
              component={Snake}
              options={{ gestureEnabled: true }}
            />
            <Stack.Screen
              name="Receipts"
              component={Receipts}
              options={{ gestureEnabled: true }}
            />
            <Stack.Screen
              name="ImportReceipts"
              component={ImportReceipts}
              options={{ gestureEnabled: true }}
            />
            <Stack.Screen
              name="Profile"
              component={Profile}
              options={{ gestureEnabled: true }}
            />
            <Stack.Screen
              name="GroupChat"
              component={GroupChat}
              options={{ gestureEnabled: true }}
            />
            <Stack.Screen
              name="DM"
              component={DM}
              options={{ gestureEnabled: true }}
            />
            <Stack.Screen
              name="UploadReceipt"
              component={UploadReceipt}
              options={{ gestureEnabled: true }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </ThemeProvider>
  );
}

registerRootComponent(App);

export default App;

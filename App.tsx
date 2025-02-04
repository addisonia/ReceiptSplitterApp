import React, { useEffect, useState } from 'react';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import * as Font from 'expo-font';
import { View, ActivityIndicator, StatusBar, SafeAreaView } from 'react-native';
import Home from './src/screens/Home';
import Split from './src/screens/Split';
import Snake from './src/screens/Snake';

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

// main tabs for home and split screens
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        swipeEnabled: true,
        tabBarStyle: { display: 'none' }, // hide the tab bar
      }}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Split" component={Split} />
    </Tab.Navigator>
  );
};

export type RootStackParamList = {
  Home: undefined;
  Snake: undefined;
};

const colors = {
  yuck: '#5c540b',
};

function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'Tenorite': require('./assets/fonts/Tenorite.ttf'),
        'Tenorite-Bold': require('./assets/fonts/Tenorite_B.ttf'),
        'Tenorite-Italic': require('./assets/fonts/Tenorite_I.ttf'),
        'Tenorite-BoldItalic': require('./assets/fonts/Tenorite_BI.ttf'),
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.yuck }}>
      <StatusBar backgroundColor={colors.yuck} barStyle="light-content" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* main tabs is the default screen */}
          <Stack.Screen name="MainTabs" component={MainTabs} />
          {/* snake game is pushed onto the stack */}
          <Stack.Screen name="Snake" component={Snake} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

registerRootComponent(App);

export default App;

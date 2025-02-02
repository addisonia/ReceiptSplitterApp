import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import * as Font from 'expo-font';
import { View, ActivityIndicator } from 'react-native';
import Home from './screens/Home';
import Split from './screens/Split';

const Tab = createMaterialTopTabNavigator();

export default function AppNavigator() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'Tenorite': require('../assets/fonts/Tenorite.ttf'),
        'Tenorite-Bold': require('../assets/fonts/Tenorite_B.ttf'),
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
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          swipeEnabled: true,
          tabBarLabelStyle: { fontSize: 16 },
          tabBarIndicatorStyle: { backgroundColor: '#000' },
          tabBarStyle: { backgroundColor: '#fff' },
        }}
      >
        <Tab.Screen name="Home" component={Home} />
        <Tab.Screen name="Split" component={Split} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

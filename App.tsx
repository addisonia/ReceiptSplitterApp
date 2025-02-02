// App.tsx
import React, { useEffect, useState } from 'react';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import * as Font from 'expo-font';
import { View, ActivityIndicator, StatusBar, SafeAreaView } from 'react-native';
import Home from './src/screens/Home';
import Split from './src/screens/Split';

const Tab = createMaterialTopTabNavigator();

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
        <Tab.Navigator
          screenOptions={{
            swipeEnabled: true,
            tabBarStyle: { display: 'none' }, // hide the tab bar
          }}
        >
          <Tab.Screen name="Home" component={Home} />
          <Tab.Screen name="Split" component={Split} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

registerRootComponent(App);

export default App;

// app/screens/Home.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons'; // using expo vector icons
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/RootStackParams';
import colors from '../../constants/colors';
type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;


const Home = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // function to navigate to the split page
  const handleStartSplitting = () => {
    navigation.navigate('Split');
  };

  return (
    <View style={styles.container}>
      {/* top row with icons */}
      <View style={styles.iconRow}>
        <TouchableOpacity style={styles.iconButton}>
          {/* gamepad icon */}
          <FontAwesome5 name="gamepad" size={24} color={colors.yellow} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          {/* book icon */}
          <FontAwesome5 name="book" size={24} color={colors.yellow} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          {/* shield icon */}
          <FontAwesome5 name="shield-alt" size={24} color={colors.yellow} />
        </TouchableOpacity>
      </View>

      {/* middle with title text */}
      <View style={styles.content}>
        <Text style={styles.title}>Receipt Splitter</Text>
      </View>

      {/* bottom with start button */}
      <View style={styles.bottom}>
        <TouchableOpacity style={styles.startButton} onPress={handleStartSplitting}>
          <Text style={styles.buttonText}>Start Splitting</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yuck,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  iconButton: {
    marginHorizontal: 30,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    color: 'white',
    textAlign: 'center',
  },
  bottom: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: colors.yellow,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 5,
  },
  buttonText: {
    fontSize: 24,
    color: 'black',
    fontWeight: 'bold',
  },
});

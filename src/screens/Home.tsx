import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import AppText from '../../components/AppText';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/RootStackParams';
import colors from '../../constants/colors';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
const buttonWidth = screenWidth * 0.5;
const buttonHeight = buttonWidth / 2;

const Home = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const handleStartSplitting = () => {
    navigation.navigate('Split');
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        <TouchableOpacity style={styles.iconButton}>
          <FontAwesome5 name="gamepad" size={24} color={colors.yellow} />
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        <AppText style={[styles.title, styles.boldText]}>Receipt</AppText>
        <AppText style={[styles.title, styles.titleSpacing, styles.boldText]}>
          Splitter
        </AppText>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.startButton} onPress={handleStartSplitting}>
          <AppText style={styles.buttonText}>Start Splitting</AppText>
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
    justifyContent: 'center',
  },
  iconRow: {
    position: 'absolute',
    top: 40,
    width: '100%',
    alignItems: 'center',
  },
  iconButton: {
    top: 10,
  },
  titleContainer: {
    position: 'absolute',
    top: screenHeight * 0.25,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: 50,
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  titleSpacing: {
    marginTop: 20,
  },
  boldText: {
    fontWeight: 'bold', // This will trigger the bold font in AppText.tsx
  },
  bottom: {
    position: 'absolute',
    bottom: screenWidth / 4,
    width: '100%',
    alignItems: 'center',
    zIndex: 5,
  },
  startButton: {
    backgroundColor: colors.yellow,
    width: buttonWidth,
    height: buttonHeight,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 24,
    color: 'black',
    fontWeight: 'bold',
  },
});

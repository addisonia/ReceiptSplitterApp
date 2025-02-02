import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../../components/AppText'; // Import AppText

const colors = {
  yuck: '#5c540b',
  yuckLight: '#9e9b7b',
  yellow: '#e3d400',
  green: '#08f800',
};

const Split = () => {
  return (
    <View style={styles.container}>
      <AppText style={styles.text}>Split Page (coming soon)</AppText>
    </View>
  );
};

export default Split;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yuckLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    color: colors.yuck,
  },
});

import React from 'react';
import { Text, TextProps } from 'react-native';
import { GlobalStyles } from '../styles/GlobalStyles';

const AppText: React.FC<TextProps> = ({ style, children, ...props }) => {
  return <Text style={[GlobalStyles.text, style]} {...props}>{children}</Text>;
};

export default AppText;

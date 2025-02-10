import React, { useState } from 'react';
import { Pressable, View, Text, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { auth } from '../firebase';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import colors from '../../constants/colors';
import { FontAwesome5 } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

const GoogleSignInButton = ({ onSuccess }: { onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '405450216696-5vuae9eo51ol4grkorih91589g40n8o8.apps.googleusercontent.com', // Web client ID
    redirectUri: 'https://receipt-splitter-7b372.firebaseapp.com/__/auth/handler', // Match Firebase's URI
    scopes: ['profile', 'email'],
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(() => {
          onSuccess();
          setLoading(false);
        })
        .catch((error) => {
          setError(error.message);
          setLoading(false);
        });
    }
  }, [response]);

  const handlePress = () => {
    setError(null);
    promptAsync();
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        onPress={handlePress}
        disabled={loading}
        style={{
          backgroundColor: colors.yellow,
          padding: 15,
          borderRadius: 5,
          opacity: loading ? 0.7 : 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator color="black" />
        ) : (
          <>
            <FontAwesome5 name="google" size={20} color="black" style={{ marginRight: 10 }} />
            <Text style={{ color: 'black', fontSize: 16 }}>Sign in with Google</Text>
          </>
        )}
      </Pressable>
      {error && <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text>}
    </View>
  );
};

export default GoogleSignInButton;
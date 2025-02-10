import React, { useEffect } from 'react';
import {
  Pressable,
  View,
  Text,
  ActivityIndicator,
  Linking,
  StyleProp,
  ViewStyle
} from 'react-native';
import { auth } from '../firebase';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import colors from '../../constants/colors';
import { FontAwesome5 } from '@expo/vector-icons';

interface GoogleSignInButtonProps {
  onSuccess: () => void;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onSuccess, style }) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      try {
        const url = new URL(event.url);
        const token = url.searchParams.get('token');
        
        if (token) {
          setLoading(true);
          const credential = GoogleAuthProvider.credential(token);
          signInWithCredential(auth, credential)
            .then(() => {
              onSuccess();
              setError(null);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
        }
      } catch {
        setError('Invalid authentication response');
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [onSuccess]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        onPress={() =>
          Linking.openURL('https://receiptsplitter.addisonathome.workers.dev/auth')
        }
        disabled={loading}
        style={({ pressed }) => [
          {
            // default style
            backgroundColor: colors.yellow,
            padding: 15,
            borderRadius: 5,
            opacity: loading ? 0.7 : 1,
            flexDirection: 'row',
            alignItems: 'center',
          },
          // merge user-provided style (so it can override default if pressed)
          typeof style === 'function' ? style({ pressed }) : style,
        ]}
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

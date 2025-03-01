//OLD CODE used for testing with expo go

// import React, { useEffect } from 'react';
// import {
//   Pressable,
//   View,
//   Text,
//   ActivityIndicator,
//   Linking,
//   StyleProp,
//   ViewStyle
// } from 'react-native';
// import { auth } from '../firebase';
// import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
// import colors from '../../constants/colors';
// import { FontAwesome5 } from '@expo/vector-icons';

// interface GoogleSignInButtonProps {
//   onSuccess: () => void;
//   style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
// }

// const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onSuccess, style }) => {
//   const [loading, setLoading] = React.useState(false);
//   const [error, setError] = React.useState<string | null>(null);

//   useEffect(() => {
//     const handleDeepLink = (event: { url: string }) => {
//       try {
//         const url = new URL(event.url);
//         const token = url.searchParams.get('token');
        
//         if (token) {
//           setLoading(true);
//           const credential = GoogleAuthProvider.credential(token);
//           signInWithCredential(auth, credential)
//             .then(() => {
//               onSuccess();
//               setError(null);
//             })
//             .catch((err) => setError(err.message))
//             .finally(() => setLoading(false));
//         }
//       } catch {
//         setError('Invalid authentication response');
//       }
//     };

//     const subscription = Linking.addEventListener('url', handleDeepLink);
//     return () => subscription.remove();
//   }, [onSuccess]);

//   return (
//     <View style={{ alignItems: 'center' }}>
//       <Pressable
//         onPress={() =>
//           Linking.openURL('https://receiptsplitter.addisonathome.workers.dev/auth')
//         }
//         disabled={loading}
//         style={({ pressed }) => [
//           {
//             // default style
//             backgroundColor: colors.yellow,
//             padding: 15,
//             borderRadius: 5,
//             opacity: loading ? 0.7 : 1,
//             flexDirection: 'row',
//             alignItems: 'center',
//           },
//           // merge user-provided style (so it can override default if pressed)
//           typeof style === 'function' ? style({ pressed }) : style,
//         ]}
//       >
//         {loading ? (
//           <ActivityIndicator color="black" />
//         ) : (
//           <>
//             <FontAwesome5 name="google" size={20} color="black" style={{ marginRight: 10 }} />
//             <Text style={{ color: 'black', fontSize: 16 }}>Sign in with Google</Text>
//           </>
//         )}
//       </Pressable>
//       {error && <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text>}
//     </View>
//   );
// };

// export default GoogleSignInButton;





import React from 'react';
import {
  Pressable,
  View,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
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

  // Configure Google Signin
  React.useEffect(() => {
    GoogleSignin.configure({
      webClientId: '405450216696-5vuae9eo51ol4grkorih91589g40n8o8.apps.googleusercontent.com',
      offlineAccess: true,
      scopes: ['profile', 'email'],
    });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if Play Services are available
      await GoogleSignin.hasPlayServices();

      // Sign out to force account picker (optional: only if signed in)
      await GoogleSignin.signOut();

      // Sign in with Google
      const response = await GoogleSignin.signIn();

      // Extract ID token from the response
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('No ID token returned');

      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign-in the user with Firebase
      await signInWithCredential(auth, googleCredential);

      onSuccess();
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        setError('Sign in cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setError('Sign in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Play Services not available');
      } else {
        setError('Sign in failed: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        onPress={handleGoogleSignIn}
        disabled={loading}
        style={({ pressed }) => [
          {
            backgroundColor: colors.yellow,
            padding: 15,
            borderRadius: 5,
            opacity: loading ? 0.7 : 1,
            flexDirection: 'row',
            alignItems: 'center',
          },
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
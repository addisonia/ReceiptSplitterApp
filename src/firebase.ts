// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { initializeAuth, GoogleAuthProvider, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, GOOGLE_CLIENT_ID, WEB_CLIENT_ID } from '@env';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: API_KEY,
  authDomain: AUTH_DOMAIN,
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
  messagingSenderId: MESSAGING_SENDER_ID,
  appId: APP_ID,
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with persistence only once
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export const database = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
// googleProvider.setCustomParameters({
//   client_id: GOOGLE_CLIENT_ID,
// });
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYHHB3HEYximUaJPt93azVww54I--zeO8",
  authDomain: "intellect-cosmic.firebaseapp.com",
  projectId: "intellect-cosmic",
  storageBucket: "intellect-cosmic.firebasestorage.app",
  messagingSenderId: "655839747415",
  appId: "1:655839747415:web:d3dfc9de61751f245cf212",
  measurementId: "G-S7EX842DB6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with the appropriate persistence
let auth;

if (Platform.OS === 'web') {
  // For web
  const { getAuth, setPersistence, browserLocalPersistence } = require('firebase/auth');
  auth = getAuth(app);
  // Set persistence (can be called in an async function)
  setPersistence(auth, browserLocalPersistence)
    .then(() => console.log('Web persistence enabled'))
    .catch(error => console.error('Error enabling web persistence:', error));
} else {
  // For React Native
  const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
  const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
  
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
  console.log('Mobile persistence enabled with AsyncStorage');
}

// Initialize Firestore
const db = getFirestore(app);

// Exports
export { auth, db };
export default app;
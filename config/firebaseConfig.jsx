// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDYHHB3HEYximUaJPt93azVww54I--zeO8",
    authDomain: "intellect-cosmic.firebaseapp.com",
    projectId: "intellect-cosmic",
    storageBucket: "intellect-cosmic.firebasestorage.app",
    messagingSenderId: "655839747415",
    appId: "1:655839747415:web:d3dfc9de61751f245cf212",
    measurementId: "G-S7EX842DB6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
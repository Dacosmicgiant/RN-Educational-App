// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import {initializeAuth, getReactNativePersistence} from 'firebase/auth'
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'
import {getFirestore} from 'firebase/firestore'
import {getAnalytics} from 'firebase/analytics'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
export const auth = initializeAuth(app, {
    persistence:getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app)
const analytics = getAnalytics(app);
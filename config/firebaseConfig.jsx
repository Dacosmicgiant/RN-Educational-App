import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

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

// Initialize Auth
export const auth = getAuth(app);

// Set persistence to local (you can call this where you initialize your app)
// Note: This needs to be called in a function, not at the module level
export const enablePersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log('Persistence enabled');
  } catch (error) {
    console.error('Error enabling persistence:', error);
  }
};

// Initialize Firestore
export const db = getFirestore(app);

// Export the app instance
export default app;
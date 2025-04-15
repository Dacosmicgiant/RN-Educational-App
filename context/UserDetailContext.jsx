import { createContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export const UserDetailContext = createContext({
  userDetail: null,
  loading: true,
  refreshUser: async () => {}
});

export function UserDetailProvider({ children }) {
  const [userDetail, setUserDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    console.log("Refreshing user data...");
    if (auth.currentUser) {
      try {
        const userEmail = auth.currentUser.email;
        // Try to find by direct path first
        const docRef = doc(db, 'users', userEmail);
        let userSnap = await getDoc(docRef);
        
        // If not found, query by email field
        if (!userSnap.exists()) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', userEmail));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            userSnap = querySnapshot.docs[0];
            console.log('Refresh found user by query:', userSnap.id);
            setUserDetail(userSnap.data());
          }
        } else {
          console.log("Refresh found user directly:", userSnap.data());
          setUserDetail(userSnap.data());
        }
      } catch (error) {
        console.error('Error refreshing user details:', error);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log("Auth state changed:", user?.email);
      
      if (user) {
        try {
          // First check if a document with the exact email exists
          const userEmail = user.email;
          const docRef = doc(db, 'users', userEmail);
          let userSnap = await getDoc(docRef);
          
          // If not found, try to find it by querying
          if (!userSnap.exists()) {
            console.log('Document not found at expected path, searching...');
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', userEmail));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              // User found by query
              userSnap = querySnapshot.docs[0];
              console.log('Found user document by query:', userSnap.id);
              setUserDetail(userSnap.data());
            } else {
              console.log('No user document found anywhere.');
              setUserDetail(null);
            }
          } else {
            console.log("User document found directly:", userSnap.data());
            setUserDetail(userSnap.data());
          }
        } catch (error) {
          console.error('Error handling user details:', error);
          setUserDetail(null);
        }
      } else {
        console.log('User signed out');
        setUserDetail(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Create a value object that includes the refreshUser function
  const contextValue = {
    userDetail,
    loading,
    refreshUser
  };

  return (
    <UserDetailContext.Provider value={contextValue}>
      {children}
    </UserDetailContext.Provider>
  );
}
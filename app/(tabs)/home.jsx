import { View, Text, Platform, Alert, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import Header from '../../components/Home/Header';
import Colors from './../../constants/Colors';
import NoCourse from '../../components/Home/NoCourse';
import CourseList from '../../components/Home/CourseList';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../config/firebaseConfig';
import { useRouter } from 'expo-router';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function Home() {
  const router = useRouter();
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/auth/SignIn');
    } catch (error) {
      Alert.alert("Logout Failed", error.message);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        console.log("Fetching data for user:", user.email);
        
        // First try with email as document ID
        const docRef = doc(db, 'users', user.email);
        let snap = await getDoc(docRef);
        
        // If not found, query by email field
        if (!snap.exists()) {
          console.log("Document not found by ID, searching by email field...");
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', user.email));
          const querySnap = await getDocs(q);
          
          if (!querySnap.empty) {
            snap = querySnap.docs[0];
            console.log("Found user document by query:", snap.id);
          } else {
            console.log("No user document found");
          }
        }

        if (snap.exists()) {
          const userData = snap.data();
          console.log("User enrollments:", userData.enrolledCertifications);
          setCurrentUserData(userData);
          
          // Check if the user is an admin using isAdmin field
          setIsAdmin(userData.isAdmin === true);
          console.log("User is admin:", userData.isAdmin);
        } else {
          console.log("No user data found");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;
  
  const hasCourses = currentUserData?.enrolledCertifications?.length > 0;
  console.log("Has courses:", hasCourses, currentUserData?.enrolledCertifications);
  
  return (
    <View style={{
      padding: 25,
      paddingTop: Platform.OS === 'ios' ? 45 : 25,
      flex: 1,
      backgroundColor: Colors.WHITE
    }}>
      <Header onSettingsPress={handleLogout} />
      {hasCourses ? (
        <CourseList currentUser={currentUserData} isAdmin={isAdmin} />
      ) : (
        <NoCourse isAdmin={isAdmin} />
      )}
    </View>
  );
}
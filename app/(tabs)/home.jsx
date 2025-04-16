import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Colors from '../../constants/Colors';
import NoCourse from '../../components/Home/NoCourse';
import CourseList from '../../components/Home/CourseList';

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

        const docRef = doc(db, 'users', user.email);
        let snap = await getDoc(docRef);

        if (!snap.exists()) {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', user.email));
          const querySnap = await getDocs(q);

          if (!querySnap.empty) {
            snap = querySnap.docs[0];
          }
        }

        if (snap.exists()) {
          const userData = snap.data();
          setCurrentUserData(userData);
          setIsAdmin(userData.isAdmin === true);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  const hasCourses = currentUserData?.enrolledCertifications?.length > 0;

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Hello, {currentUserData?.name || 'User'}
        </Text>
      </View>

      {/* Courses Section */}
      <View style={styles.coursesSection}>
        <Text style={styles.sectionTitle}>Your Courses</Text>
        {hasCourses ? (
          <CourseList currentUser={currentUserData} isAdmin={isAdmin} />
        ) : (
          <NoCourse isAdmin={isAdmin} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: 'winky-bold',
    fontSize: 28,
    color: Colors.BLACK,
  },
  coursesSection: {
    flex: 1,
    marginTop: 10,
  },
  sectionTitle: {
    fontFamily: 'winky-bold',
    fontSize: 20,
    color: Colors.BLACK,
    marginBottom: 15,
  },
});
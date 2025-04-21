import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  SafeAreaView // Use SafeAreaView to handle notches/status bars
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Colors from '../../constants/Colors';
// Assuming these components handle their own styling internally
import NoCourse from '../../components/Home/NoCourse';
import CourseList from '../../components/Home/CourseList';
import { Ionicons } from '@expo/vector-icons'; // Example icon library

export default function Home() {
  const router = useRouter();
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Functionality remains unchanged
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/auth/SignIn');
    } catch (error) {
      Alert.alert("Logout Failed", error.message);
    }
  };

  // Functionality remains unchanged
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        // --- User Data Fetching Logic (Unchanged) ---
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
        // --- End User Data Fetching Logic ---

      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Loading state UI remains standard but centered
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  const hasCourses = currentUserData?.enrolledCertifications?.length > 0;

  return (
    // Wrap in SafeAreaView for proper layout on different devices
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.LIGHT_GRAY }}>
      {/* Remove ScrollView wrapper to avoid nesting lists - 
          CourseList likely already has a FlatList/VirtualizedList inside */}
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>Hello,</Text>
            <Text style={styles.headerTitle}>
              {currentUserData?.name || 'User'}!
            </Text>
          </View>
          {/* Icon without profile photo */}
          <View style={styles.profileIcon}>
             <Ionicons name="person-circle-outline" size={48} color={Colors.DARK_GRAY} />
          </View>
        </View>

        {/* Courses Section */}
        <View style={styles.coursesSection}>
          {/* Section Title */}
          {hasCourses && <Text style={styles.sectionTitle}>Your Courses</Text>}

          {hasCourses ? (
            // CourseList likely already has its own scrolling mechanism
            <CourseList currentUser={currentUserData} isAdmin={isAdmin} />
          ) : (
            <NoCourse isAdmin={isAdmin} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Full screen container setup
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.WHITE, // Ensure consistent background
  },
  container: {
    flex: 1,
    backgroundColor: Colors.LIGHT_GRAY, // Use a slightly different background for depth
    paddingHorizontal: 20, // Consistent horizontal padding
    paddingTop: Platform.OS === 'ios' ? 10 : 30, // Adjust padding for status bar/notch
    paddingBottom: 20, // Padding at the bottom
  },
  header: {
    flexDirection: 'row', // Arrange items horizontally
    justifyContent: 'space-between', // Space between greeting and icon
    alignItems: 'center', // Vertically center items
    marginBottom: 30, // More space below header
    backgroundColor: Colors.WHITE, // White background for header section
    padding: 20, // Padding inside the header
    borderRadius: 15, // Rounded corners for the header block
    // Optional: Add subtle shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerGreeting: {
    fontFamily: 'winky', // A slightly lighter font variant for greeting
    fontSize: 20,
    color: Colors.DARK_GRAY, // Subtle color for greeting
  },
  headerTitle: {
    fontFamily: 'winky-bold', // Bold font for the name
    fontSize: 28,
    color: Colors.PRIMARY, // Primary color for the name
    marginTop: 2, // Small margin below greeting
  },
  profileIcon: {
    // Styling for the profile icon container
    width: 50,
    height: 50,
    borderRadius: 25, // Make it circular
    backgroundColor: Colors.LIGHT_GRAY, // Background for the icon area
    justifyContent: 'center',
    alignItems: 'center',
  },
  coursesSection: {
    flex: 1, // Allows this section to take up remaining space
  },
  sectionTitle: {
    fontFamily: 'winky-bold',
    fontSize: 22, // Slightly larger title
    color: Colors.BLACK,
    marginBottom: 20, // More space below the title
  },
});


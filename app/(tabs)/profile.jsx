import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Colors from '../../constants/Colors';
import FullWidthCertificationCard from './../../components/Shared/FullWidthCard';
import Button from './../../components/Shared/Button';
import { Ionicons } from '@expo/vector-icons';

export default function Profile() {
  const router = useRouter();
  const [currentUserData, setCurrentUserData] = useState(null);
  const [certifications, setCertifications] = useState([]);
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

        // Fetch user data
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

          // Fetch enrolled certifications
          const enrolledIds = userData?.enrolledCertifications || [];
          const certPromises = enrolledIds.map(id => getDoc(doc(db, 'certifications', id)));
          const certSnapshots = await Promise.all(certPromises);

          const certs = certSnapshots
            .filter(doc => doc.exists())
            .map(doc => ({ id: doc.id, ...doc.data() }));
          setCertifications(certs);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={Colors.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* User Info Section */}
      <View style={styles.userInfo}>
        <Image
          source={{ uri: currentUserData?.photoURL || 'https://via.placeholder.com/150' }}
          style={styles.avatar}
        />
        <Text style={styles.userName}>
          {currentUserData?.name || 'User Name'}
        </Text>
        <Text style={styles.userEmail}>
          {currentUserData?.email || 'user@example.com'}
        </Text>
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminText}>Admin</Text>
          </View>
        )}
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{certifications.length}</Text>
          <Text style={styles.statLabel}>Courses Enrolled</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {currentUserData?.completedCourses || 0}
          </Text>
          <Text style={styles.statLabel}>Courses Completed</Text>
        </View>
      </View>

      {/* Admin Actions */}
      {isAdmin && (
        <View style={styles.adminActions}>
          <Button
            text="+ Create New Course"
            onPress={() => router.push('/addCertification')}
            style={styles.actionButton}
          />
          <Button
            text="+ Add Questions to Module"
            onPress={() => router.push('/addQuestion')}
            style={styles.actionButton}
          />
        </View>
      )}

      {/* Enrolled Courses */}
      <View style={styles.coursesSection}>
        <Text style={styles.sectionTitle}>Enrolled Courses</Text>
        {certifications.length > 0 ? (
          certifications.map((cert) => (
            <FullWidthCertificationCard key={cert.id} cert={cert} />
          ))
        ) : (
          <Text style={styles.noCoursesText}>No courses enrolled yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  contentContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: 'winky-bold',
    fontSize: 28,
    color: Colors.BLACK,
  },
  logoutButton: {
    padding: 10,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
  },
  userName: {
    fontFamily: 'winky-bold',
    fontSize: 22,
    color: Colors.BLACK,
  },
  userEmail: {
    fontFamily: 'winky-regular',
    fontSize: 16,
    color: Colors.GRAY,
    marginTop: 5,
  },
  adminBadge: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  adminText: {
    color: Colors.WHITE,
    fontFamily: 'winky-bold',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: 'winky-bold',
    fontSize: 20,
    color: Colors.PRIMARY,
  },
  statLabel: {
    fontFamily: 'winky-regular',
    fontSize: 14,
    color: Colors.GRAY,
  },
  adminActions: {
    marginBottom: 20,
  },
  actionButton: {
    marginVertical: 5,
  },
  coursesSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontFamily: 'winky-bold',
    fontSize: 20,
    color: Colors.BLACK,
    marginBottom: 15,
  },
  noCoursesText: {
    fontFamily: 'winky-regular',
    fontSize: 16,
    color: Colors.GRAY,
    textAlign: 'center',
    marginTop: 20,
  },
});
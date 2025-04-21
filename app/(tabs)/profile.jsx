import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Colors from '../../constants/Colors';
import Button from './../../components/Shared/Button';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native';

export default function Profile() {
  const router = useRouter();
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/auth/SignIn');
            } catch (error) {
              Alert.alert("Logout Failed", error.message);
            }
          }
        }
      ]
    );
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
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={Colors.PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* User Info Section */}
        <View style={styles.userInfoCard}>
          <View style={styles.userTextInfo}>
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
        </View>

        {/* Admin Actions */}
        {isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>Admin Actions</Text>
            <View style={styles.adminActions}>
              <Button
                text="Create New Course"
                onPress={() => router.push('/addCertification')}
                style={styles.adminButton}
                icon={<Ionicons name="add-circle" size={20} color="#FFF" />}
              />
              <Button
                text="Add Questions to Module"
                onPress={() => router.push('/addQuestion')}
                style={styles.adminButton}
                icon={<Ionicons name="help-circle" size={20} color="#FFF" />}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    fontFamily: 'winky',
    fontSize: 16,
    color: '#333',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'winky-bold',
    fontSize: 20,
    color: '#333',
  },
  logoutButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  userTextInfo: {
    alignItems: 'center',
  },
  userName: {
    fontFamily: 'winky-bold',
    fontSize: 24,
    color: '#1F2A44',
    marginBottom: 8,
  },
  userEmail: {
    fontFamily: 'winky',
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 12,
  },
  adminBadge: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  adminText: {
    color: '#FFF',
    fontFamily: 'winky-bold',
    fontSize: 14,
  },
  adminSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontFamily: 'winky-bold',
    fontSize: 18,
    color: '#1F2A44',
    marginBottom: 16,
    textAlign: 'center',
  },
  adminActions: {
    gap: 12,
  },
  adminButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
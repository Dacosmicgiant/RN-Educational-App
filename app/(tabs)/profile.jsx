import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Colors from '../../constants/Colors';
import Button from './../../components/Shared/Button';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Profile() {
  const router = useRouter();
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogout = () => {
    console.log('[handleLogout] Logout button pressed. Showing confirmation alert.');
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel", onPress: () => console.log('[handleLogout] Logout cancelled.') },
        {
          text: "Logout",
          onPress: async () => {
            console.log("[handleLogout] Confirmation received. Attempting Firebase sign out...");
            try {
              console.log("[handleLogout] Calling signOut(auth)...");
              await signOut(auth);
              console.log("[handleLogout] Firebase signOut successful.");
              console.log("[handleLogout] Attempting navigation replace to '/auth/SignIn'...");
              router.replace('/auth/SignIn');
              console.log("[handleLogout] router.replace('/auth/SignIn') called.");
            } catch (error) {
              console.error("[handleLogout] Firebase signOut failed:", error);
              Alert.alert("Logout Failed", `An error occurred: ${error.message}`);
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  useEffect(() => {
    const fetchUserData = async () => {
      setCurrentUserData(null);
      setIsAdmin(false);
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          console.log("[useEffect] No current user found.");
          setLoading(false);
          return;
        }
        console.log("[useEffect] Current user found:", user.email);
        const docRef = doc(db, 'users', user.email);
        let snap = await getDoc(docRef);
        console.log(`[useEffect] Attempted getDoc for users/${user.email}. Exists: ${snap.exists()}`);
        if (!snap.exists()) {
          console.log(`[useEffect] Document users/${user.email} not found. Querying by email field...`);
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', user.email));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            snap = querySnap.docs[0];
            console.log(`[useEffect] Found user via query. Doc ID: ${snap.id}. Exists: ${snap.exists()}`);
          } else {
            console.log("[useEffect] User not found via query either.");
          }
        }
        if (snap.exists()) {
          const userData = snap.data();
          console.log("[useEffect] User data fetched:", userData);
          setCurrentUserData(userData);
          setIsAdmin(userData?.isAdmin === true);
          console.log("[useEffect] IsAdmin state set to:", userData?.isAdmin === true);
        } else {
          console.log("[useEffect] No user document found in Firestore for:", user.email);
        }
      } catch (error) {
        console.error("[useEffect] Error fetching profile data:", error);
        Alert.alert("Error", "Could not fetch profile data.");
      } finally {
        setLoading(false);
        console.log("[useEffect] Fetch process finished. Loading set to false.");
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

  if (!auth.currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Not logged in.</Text>
          <Button text="Go to Sign In" onPress={() => router.replace('/auth/SignIn')} style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="log-out-outline" size={26} color={Colors.PRIMARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.userInfoCard}>
          <View style={styles.userTextInfo}>
            <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
              {currentUserData?.name || 'User Name Not Found'}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1} ellipsizeMode="tail">
              {currentUserData?.email || auth.currentUser?.email || 'Email Not Found'}
            </Text>
            {isAdmin === true && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminText}>Admin</Text>
              </View>
            )}
            {currentUserData === null && !loading && (
              <Text style={styles.warningText}>Could not load profile details from database.</Text>
            )}
          </View>
        </View>

        {isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>Admin Actions</Text>
            <View style={styles.adminActions}>
              <Button
                text="Create New Course"
                onPress={() => router.push('/addCertification')}
                style={styles.adminButton}
                icon={<Ionicons name="add-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />}
              />
              <Button
                text="Add Questions to Module"
                onPress={() => router.push('/addQuestion')}
                style={styles.adminButton}
                icon={<Ionicons name="help-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles remain unchanged
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontFamily: 'winky',
    fontSize: 16,
    color: '#555',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'winky-bold',
    fontSize: 20,
    color: '#333',
  },
  logoutButton: {
    padding: 8,
  },
  userInfoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  userTextInfo: {
    alignItems: 'center',
  },
  userName: {
    fontFamily: 'winky-bold',
    fontSize: 22,
    color: '#1F2A44',
    marginBottom: 6,
    textAlign: 'center',
  },
  userEmail: {
    fontFamily: 'winky',
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  warningText: {
    fontFamily: 'winky',
    fontSize: 14,
    color: '#DC2626',
    marginTop: 8,
    textAlign: 'center',
  },
  adminBadge: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  adminText: {
    color: '#FFF',
    fontFamily: 'winky-bold',
    fontSize: 13,
    fontWeight: '600',
  },
  adminSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontFamily: 'winky-bold',
    fontSize: 18,
    color: '#1F2A44',
    marginBottom: 16,
    textAlign: 'left',
  },
  adminActions: {
    gap: 12,
  },
  adminButton: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});
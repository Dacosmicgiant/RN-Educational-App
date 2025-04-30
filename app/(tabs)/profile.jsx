import "./../../global.css"

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Colors from '../../constants/Colors';
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
      <View className="flex-1 justify-center items-center bg-[#F8F9FA]">
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text className="font-[winky] text-base text-[#555] mt-3">Loading profile...</Text>
      </View>
    );
  }

  if (!auth.currentUser) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F9FA]">
        <View className="flex-1 justify-center items-center">
          <Text className="font-[winky] text-base text-[#555]">Not logged in.</Text>
          <TouchableOpacity 
            className="bg-[#4F46E5] py-3 px-6 rounded-lg mt-5"
            onPress={() => router.replace('/auth/SignIn')}
          >
            <Text className="text-white font-[winky-bold] text-base">Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-[#EEE]">
          <TouchableOpacity
            className="p-2"
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text className="font-[winky-bold] text-xl text-[#333]">Profile</Text>
          <TouchableOpacity
            onPress={handleLogout}
            className="p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="log-out-outline" size={26} color={Colors.PRIMARY} />
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-xl p-6 mx-4 mt-5 mb-4 shadow-sm">
          <View className="items-center">
            <Text className="font-[winky-bold] text-2xl text-[#1F2A44] mb-1.5 text-center" numberOfLines={1} ellipsizeMode="tail">
              {currentUserData?.name || 'User Name Not Found'}
            </Text>
            <Text className="font-[winky] text-sm text-[#6B7280] mb-4 text-center" numberOfLines={1} ellipsizeMode="tail">
              {currentUserData?.email || auth.currentUser?.email || 'Email Not Found'}
            </Text>
            {isAdmin === true && (
              <View className="bg-[#4F46E5] rounded-xl py-1.5 px-3 self-center">
                <Text className="text-white font-[winky-bold] text-xs">Admin</Text>
              </View>
            )}
            {currentUserData === null && !loading && (
              <Text className="font-[winky] text-sm text-[#DC2626] mt-2 text-center">Could not load profile details from database.</Text>
            )}
          </View>
        </View>

        {isAdmin && (
          <View className="px-4 mt-4">
            <Text className="font-[winky-bold] text-lg text-[#1F2A44] mb-4 text-left">Admin Actions</Text>
            <View className="space-y-3">
              <TouchableOpacity
                className="bg-[#4F46E5] rounded-lg py-3 flex-row items-center justify-center shadow"
                onPress={() => router.push('/addCertification')}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFF" className="mr-2" />
                <Text className="text-white font-[winky-bold]">Create New Course</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="bg-[#4F46E5] rounded-lg py-3 flex-row items-center justify-center shadow"
                onPress={() => router.push('/addQuestion')}
              >
                <Ionicons name="help-circle-outline" size={20} color="#FFF" className="mr-2" />
                <Text className="text-white font-[winky-bold]">Add Questions to Module</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
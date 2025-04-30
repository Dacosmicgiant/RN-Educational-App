import "./../../global.css";


import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../../config/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import NoCourse from "../../components/Home/NoCourse";
import CourseList from "../../components/Home/CourseList";
import { Ionicons } from "@expo/vector-icons";

export default function Home() {
  const router = useRouter();
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/auth/SignIn");
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

        const docRef = doc(db, "users", user.email);
        let snap = await getDoc(docRef);

        if (!snap.exists()) {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", user.email));
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
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const hasCourses = currentUserData?.enrolledCertifications?.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View
        className={`flex-1 bg-gray-100 px-5 ${
          Platform.OS === "ios" ? "pt-2" : "pt-8"
        } pb-5`}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8 bg-white p-5 rounded-xl shadow-md">
          <View>
            <Text className="font-winky text-lg text-gray-600">Hello,</Text>
            <Text className="font-winky-bold text-2xl text-blue-500 mt-1">
              {currentUserData?.name || "User"}!
            </Text>
          </View>
          <View className="w-12 h-12 rounded-full bg-gray-100 justify-center items-center">
            <Ionicons name="person-circle-outline" size={48} color="#4B5563" />
          </View>
        </View>

        {/* Courses Section */}
        <View className="flex-1">
          {hasCourses && (
            <Text className="font-winky-bold text-xl text-black mb-5">
              Your Courses
            </Text>
          )}

          {hasCourses ? (
            <CourseList currentUser={currentUserData} isAdmin={isAdmin} />
          ) : (
            <NoCourse isAdmin={isAdmin} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

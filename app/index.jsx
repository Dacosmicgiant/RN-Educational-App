import "./../global.css";
import { Image, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useContext, useEffect, useState } from "react";
import { UserDetailContext } from "@/context/UserDetailContext";

export default function Index() {
  const router = useRouter();
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User found:", user.email);
        try {
          const docRef = doc(db, 'users', user.email);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            console.log("User data found:", docSnap.data());
            setUserDetail(docSnap.data());
          } else {
            console.log("No such user document!");
          }

          router.replace('/(tabs)/home');
        } catch (error) {
          console.error("Error fetching user document:", error);
          setLoading(false);
        }
      } else {
        console.log("No user signed in.");
        setUserDetail(null);
        setLoading(false);
      }
    });

    return () => {
      console.log("Unsubscribing auth listener");
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Image
        source={require("./../assets/images/landing.png")}
        className="mt-[70px] w-full h-[300px]"
        resizeMode="contain"
      />

      <View className="flex-1 mt-8 p-6 bg-[#007AFF] rounded-t-[35px]">
        <Text className="text-white text-center text-[30px] font-bold font-['winky-bold']">
          Welcome to Intellect
        </Text>
        <Text className="text-white text-center text-[20px] mt-5 font-['winky']">
          Your go to destination for mock tests and exam preparation
        </Text>

        <TouchableOpacity
          className="bg-white mt-5 p-4 rounded-lg shadow"
          onPress={() => router.push('/auth/SignUp')}
        >
          <Text className="text-[#007AFF] text-center text-lg font-['winky']">Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-5 p-4 rounded-lg border border-white"
          onPress={() => router.push('/auth/SignIn')}
        >
          <Text className="text-white text-center text-lg font-['winky']">
            Already Have an account?
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

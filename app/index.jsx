import { Image, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native"; // Added ActivityIndicator
import Colors from '../constants/Colors';
// Removed redundant StyleSheet import
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth"; // Corrected import casing if needed, though usually lowercase is fine for functions
import { auth, db } from "./../config/firebaseConfig"; // Combined db import
import { doc, getDoc } from "firebase/firestore";
import { useContext, useEffect, useState } from "react"; // Added useEffect, useState
import { UserDetailContext } from "@/context/UserDetailContext";
// Removed db import again as it's combined above

export default function Index() {
  const router = useRouter();
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const [loading, setLoading] = useState(true); // State to manage loading indicator

  useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User found:", user.email); // Log specific info if needed
        try {
          const docRef = doc(db, 'users', user.email); // Ensure user.email is valid as ID
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            console.log("User data found:", docSnap.data());
            setUserDetail(docSnap.data());
          } else {
            // Handle case where user is authenticated but no user document exists
            console.log("No such user document!");
            // Maybe navigate to a profile setup screen or handle appropriately
            // setUserDetail(null); // Or set some default/error state
          }
          // Navigate only after fetching and setting data (or handling absence)
          router.replace('/(tabs)/home');

        } catch (error) {
          console.error("Error fetching user document:", error);
          // Handle error appropriately - maybe show an error message or stay on login
          setLoading(false); // Stop loading even if there's an error fetching data
        }
        // Note: Navigation might happen before loading is set to false below,
        // depending on async timing. If user is logged in, they likely won't see the landing page.
      } else {
        // No user is signed in.
        console.log("No user signed in.");
        setUserDetail(null); // Clear user detail if logged out
        setLoading(false); // Stop loading, show the landing page
      }
    });

    // Cleanup function: Unsubscribe when the component unmounts
    return () => {
      console.log("Unsubscribing auth listener");
      unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Show loading indicator while checking auth state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  // Render landing page only if not loading and user isn't logged in (handled by the effect)
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.WHITE
      }}
    >
      <Image source={require("./../assets/images/landing.png")}
        style={{
          marginTop: 70,
          width: '100%',
          height: 300,
          resizeMode: 'contain' // Added resizeMode for better image handling
        }}
      />

      <View style={{
        marginTop: 30,
        padding: 25,
        backgroundColor: Colors.PRIMARY,
        // height: '100%', // Avoid fixed height like this, let content dictate or use flex
        flex: 1, // Use flex: 1 to fill remaining space
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
      }}>
        <Text style={{
          fontSize: 30,
          textAlign: "center",
          color: Colors.WHITE,
          fontFamily: 'winky-bold',
        }}> Welcome to Intellect</Text>

        <Text style={{
          fontSize: 20,
          color: Colors.WHITE,
          marginTop: 20,
          textAlign: 'center',
          fontFamily: 'winky'
        }}> Your go to destination for mock tests and exam preparation </Text> {/* Fixed typo */}

        <TouchableOpacity style={styles.button}
          onPress={() => router.push('/auth/SignUp')}
        >
          <Text style={[styles.buttonText, { color: Colors.PRIMARY }]}>
            Get Started
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button,
        {
          backgroundColor: Colors.PRIMARY,
          borderColor: Colors.WHITE,
          borderWidth: 1,
        }]}
          onPress={() => router.push('/auth/SignIn')}
        >
          <Text style={[styles.buttonText, { color: Colors.WHITE }]}>
            Already Have an account?
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 15, // Reduced padding slightly
    backgroundColor: Colors.WHITE,
    marginTop: 20,
    borderRadius: 10,
    elevation: 2, // Added subtle elevation for Android
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'winky'
  }
});
import {Image, Text, View, TouchableOpacity } from "react-native";
import Colors from '../constants/Colors';
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import {onAuthStateChanged} from "firebase/auth"
import {auth} from "./../config/firebaseConfig"
import { doc, getDoc } from "firebase/firestore";
import { useContext } from "react";
import { UserDetailContext } from "@/context/UserDetailContext";
import { db } from "./../config/firebaseConfig";

export default function Index() {

  const router = useRouter();
  const {userDetail, setUserDetail} = useContext(UserDetailContext);

  onAuthStateChanged(auth, async(user)=>{
    if(user)
    {
      console.log(user);
      const result = await getDoc(doc(db, 'users', user?.email));
      setUserDetail(result.data())
      router.replace('/(tabs)/home')
    }
  })
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

      }}
      />

      <View style = {{
        marginTop: 30,
        padding: 25,
        backgroundColor: Colors.PRIMARY,
        height: '100%',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
      }}>
        <Text style = {{
          fontSize: 30,
          textAlign: "center",
          color: Colors.WHITE,
          fontFamily: 'winky-bold',
          

        }}> Welcome to Intellect</Text>

        <Text style = {{
          fontSize: 20,
          color: Colors.WHITE,
          marginTop: 20,
          textAlign: 'center',
          fontFamily: 'winky'
        }}> Your go to destination for mock tests and exam preparation </ Text>

        <TouchableOpacity style = {styles.button}
          onPress={() => router.push('/auth/SignUp')}
        >
          <Text style ={[styles.buttonText,{color:Colors.PRIMARY}]}>
            Get Started
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style = {[styles.button, 
        {
          backgroundColor: Colors.PRIMARY,
          borderColor: Colors.WHITE,
          borderWidth: 1,
        }]}
        onPress={() => router.push('/auth/SignIn')}
        >
          <Text style ={[styles.buttonText, {color: Colors.WHITE}]}>
            Already Have an account?
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 20,
    backgroundColor: Colors.WHITE,
    marginTop: 20,
    borderRadius: 10,
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'winky'
  }
})
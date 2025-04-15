import { View, Text, Image, TextInput, TouchableOpacity, Pressable } from 'react-native';
import React, { useContext, useState } from 'react';
import Colors from '../../constants/Colors';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { UserDetailContext } from './../../context/UserDetailContext';

export default function SignUp() {
  const router = useRouter();
  const [fullname, setFullName] = useState();
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const { userDetail, setUserDetail } = useContext(UserDetailContext);

  const CreateNewAccount = () => {
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (resp) => {
        const user = resp.user;
        console.log(user);
        await SaveUser(user);
      })
      .catch((e) => {
        console.log(e.message);
      });
  };

  const SaveUser = async (user) => {
    const data = {
      name: fullname,
      email: email.toLowerCase().trim(),
      isAdmin: false,
      subscriptionStatus: 'free',
      testsRemaining: 3,
      subscriptionExpiry: null,
      enrolledCertifications: [],
    };

    // Save user data using the uid as document ID
    await setDoc(doc(db, 'users', user.uid), data);  // Using uid as doc ID
    setUserDetail(data);
  };

  return (
    <View style={{
      display: 'flex',
      alignItems: 'center',
      paddingTop: 100,
      flex: 1,
      backgroundColor: Colors.WHITE,
      padding: 25,
    }}>
      <Image source={require('./../../assets/images/logo.png')}
        style={{
          width: 180,
          height: 180,
          borderRadius: 30,
        }}
      />

      <Text style={{
        marginTop: 20,
        fontSize: 30,
        fontFamily: 'winky-bold'
      }}>Create New Account</Text>

      <TextInput placeholder='Full Name' 
        onChangeText={(value) => setFullName(value)} 
        style={styles.TextInput} />
      <TextInput placeholder='Email'
        onChangeText={(value) => setEmail(value)}
        style={styles.TextInput} />
      <TextInput placeholder='Password'
        onChangeText={(value) => setPassword(value)}
        secureTextEntry={true} style={styles.TextInput} />

      <TouchableOpacity
        onPress={CreateNewAccount}
        style={{
          padding: 15,
          backgroundColor: Colors.PRIMARY,
          width: '100%',
          marginTop: 25,
          borderRadius: 10,
        }}
      >
        <Text style={{
          fontFamily: 'winky',
          fontSize: 20,
          color: Colors.WHITE,
          textAlign: 'center'
        }}
        >Create Account</Text>
      </TouchableOpacity>

      <View style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 5,
        marginTop: 20
      }}>
        <Text style={{
          fontFamily: 'winky'
        }}>Already have an account?</Text>
        <Pressable
          onPress={() => router.push('/auth/SignIn')}
        >
          <Text style={{
            color: Colors.PRIMARY,
            fontFamily: 'winky-bold'
          }}>Sign In</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  TextInput: {
    borderWidth: 1,
    width: '100%',
    padding: 15,
    fontSize: 18,
    marginTop: 20,
    borderRadius: 8,
    fontFamily: 'winky',
  }
});

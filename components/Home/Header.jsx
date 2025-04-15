import { View, Text, TouchableOpacity, Alert } from 'react-native';
import React, { useContext } from 'react';
import { UserDetailContext } from './../../context/UserDetailContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';
import { useRouter } from 'expo-router';

export default function Header() {
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              setUserDetail(null);
              router.replace('/auth/SignIn');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <View>
        <Text style={{
          fontFamily: 'winky-bold',
          fontSize: 25
        }}>Hello, {userDetail?.name}</Text>
        <Text style={{
          fontFamily: 'winky',
          fontSize: 17
        }}>Let's Get Started!</Text>
      </View>

      <TouchableOpacity onPress={handleLogout}>
        <Ionicons name="settings-outline" size={32} color="black" />
      </TouchableOpacity>
    </View>
  );
}

import { View, Text, TouchableOpacity } from 'react-native'
import React, { useContext } from 'react'
import {UserDetailContext} from './../../context/UserDetailContext';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function Header() {
    const {userDetail, setUserDetail} = useContext(UserDetailContext)
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
      <TouchableOpacity>
        <Ionicons name="settings-outline" size={32} color="black" />
      </TouchableOpacity>
      
    </View>
  )
}
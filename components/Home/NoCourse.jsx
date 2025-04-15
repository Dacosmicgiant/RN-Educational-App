import { View, Text, Image } from 'react-native'
import React from 'react'
import Button from '../Shared/Button';
import {useRouter} from 'expo-router'

export default function NoCourse() {
    const router = useRouter();
  return (
    <View style={{
        marginTop: 40,
        display: 'flex',
        alignItems: 'center'
    }}>
      <Image source = {require('./../../assets/images/no-courses.png')}
      style={{
        height: 200,
        width: 200,
        
      }}
      />
      <Text style={{
        fontFamily: 'winky-bold',
        fontSize: 20,
        textAlign: 'center'
      }}>You Don't Have Any Registered Courses</Text>

      <Button text={' + Create New Course '} onPress={()=>router.push('/addCertification')}/>
      <Button text={' Explore Existing Courses '}  type='outline' onPress={()=>router.push('/(tabs)/explore')}/>
    </View>

    
  )
}
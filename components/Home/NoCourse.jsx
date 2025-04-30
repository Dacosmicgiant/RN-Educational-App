import "./../../global.css"
import { View, Text, Image } from 'react-native'
import React from 'react'
import Button from '../Shared/Button'
import { useRouter } from 'expo-router'

export default function NoCourse({ isAdmin }) {
  const router = useRouter()
  return (
    <View className="mt-10 items-center">
      <Image
        source={require('./../../assets/images/no-courses.png')}
        className="w-52 h-52"
      />
      <Text className="text-center text-xl font-bold font-[winky-bold]">
        You Don't Have Any Registered Courses
      </Text>

      {isAdmin && (
        <>
          <Button
            text={' + Create New Course '}
            onPress={() => router.push('/addCertification')}
          />
          <Button
            text={' + Add questions to module '}
            onPress={() => router.push('/addQuestion')}
          />
        </>
      )}
      <Button
        text={' Explore Existing Courses '}
        type="outline"
        onPress={() => router.push('/(tabs)/explore')}
      />
    </View>
  )
}

import { View, Text, Platform } from 'react-native'
import React from 'react'
import Header from '../../components/Home/Header'
import Colors from './../../constants/Colors'
import NoCourse from '../../components/Home/NoCourse'
import CourseList from '../../components/Home/CourseList'
import ProgressSection from '../../components/Home/CourseProgress'
import PracticeSection from '../../components/Home/PractiseSection'

export default function Home() {
  return (
    <View style={{
      padding: 25,
      paddingTop: Platform.OS=='ios' && 45,
      flex: 1,
      backgroundColor: Colors.WHITE
    }}>
      <Header />
      {/* <NoCourse /> */}
      <CourseList />
      <ProgressSection />
    </View>
  )
}

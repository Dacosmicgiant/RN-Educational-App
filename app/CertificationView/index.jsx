import { View, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import React from 'react';
import Intro from './../../components/CertificationView/Intro';
import Chapters from './../../components/CertificationView/Chapters';

export default function CertificationView() {
  // Dummy data for the course
  const courseData = {
    id: '1',
    title: 'React Native Fundamentals',
    chapters: 3,
    description: 'This course introduces the core concepts of React Native development.',
    image: require('../../assets/images/react-logo.png'),
  };

  // Dummy data for chapters
  const chaptersList = [
    {
      id: '1',
      title: 'Introduction to React Native',
    },
    {
      id: '2',
      title: 'Core Components',
    },
    {
      id: '3',
      title: 'Handling User Input',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Intro courseData={courseData} />
        <Chapters chapters={chaptersList} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
});
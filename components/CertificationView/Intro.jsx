import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';

export default function Intro({ courseData }) {
  return (
    <View style={styles.container}>
      <Image 
        source={courseData.image} 
        style={styles.courseImage} 
        resizeMode="cover"
      />
      
      <View style={styles.infoContainer}>
        <Text style={styles.courseTitle}>{courseData.title}</Text>
        
        <View style={styles.chaptersInfo}>
          <Text style={styles.chaptersText}>{courseData.chapters} Chapters</Text>
        </View>
        
        <Text style={styles.sectionTitle}>Description:</Text>
        <Text style={styles.description}>{courseData.description}</Text>
        
        <TouchableOpacity style={styles.startButton}>
          <Text style={styles.startButtonText}>Start Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  courseImage: {
    width: '100%',
    height: 200,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  courseTitle: {
    fontFamily: 'winky-bold',
    fontSize: 22,
    marginBottom: 5,
  },
  chaptersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  chaptersText: {
    fontFamily: 'winky',
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontFamily: 'winky-bold',
    fontSize: 16,
    marginBottom: 5,
  },
  description: {
    fontFamily: 'winky',
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#0066FF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginVertical: 10,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontFamily: 'winky-bold',
    fontSize: 16,
  }
});
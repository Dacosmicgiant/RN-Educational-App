import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import React from 'react';

export default function ProgressSection() {
  const progressItems = [
    {
      id: '1',
      title: 'Python 101: Getting Started',
      chapter: 3,
      image: require('../../assets/images/react-logo.png'),
    },
    {
      id: '2',
      title: 'JavaScript Basics',
      chapter: 5,
      image: require('../../assets/images/react-logo.png'),
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Progress</Text>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {progressItems.map((item) => (
          <View key={item.id} style={styles.progressCard}>
            <Image source={item.image} style={styles.progressImage} />
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>{item.title}</Text>
              <Text style={styles.progressChapter}>{item.chapter} Chapter</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 15,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontFamily: 'winky-bold',
    fontSize: 25,
    marginBottom: 12,
  },
  scrollView: {
    flexDirection: 'row',
  },
  progressCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 12,
    marginRight: 15,
    width: 280,
    alignItems: 'center',
  },
  progressImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  progressInfo: {
    marginLeft: 12,
    flex: 1,
  },
  progressTitle: {
    fontFamily: 'winky-bold',
    fontSize: 15,
    marginBottom: 4,
  },
  progressChapter: {
    fontFamily: 'winky-regular',
    fontSize: 13,
    color: '#888',
  },
});

import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';

export default function CourseList() {

    const route=useRouter();
  const courseList = [
    {
      id: '1',
      courseTitle: 'Python 101: Getting Started',
      chapters: 3,
      image: require('../../assets/images/react-logo.png'),
    },
    {
      id: '2',
      courseTitle: 'Python Data Control Flow',
      chapters: 5,
      image: require('../../assets/images/react-logo.png'),
    }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Courses</Text>

      <FlatList 
        data={courseList}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <TouchableOpacity onPress={()=>route.push('/CertificationView')}
          style={styles.courseCard}>
            <Image source={item.image} style={styles.courseImage} />
            <Text style={styles.courseTitle}>{item.courseTitle}</Text>
            <View style={styles.chaptersRow}>
              <Text style={styles.chaptersText}>{item.chapters} Chapters</Text>
            </View>
          </TouchableOpacity>
        )}
      />
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
  courseCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 10,
    marginRight: 15,
    width: 220,
    height: 160,
    marginBottom: 8,
  },
  courseImage: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    marginBottom: 8,
  },
  courseTitle: {
    fontFamily: 'winky-bold',
    fontSize: 15,
  },
  chaptersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  chaptersText: {
    fontFamily: 'winky',
    fontSize: 13,
    color: '#888',
  },
});
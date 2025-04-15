import { View, Text, StyleSheet, Pressable } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';

export default function Chapters({ chapters }) {
  const router = useRouter();

  const handleChapterPress = (chapterId) => {
    // Navigate to the specific chapter
    router.push(`/moduleView`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Chapters</Text>
      
      {chapters.map((chapter, index) => (
        <Pressable 
          key={chapter.id} 
          style={styles.chapterItem}
          onPress={() => handleChapterPress(chapter.id)}
        >
          <View style={styles.chapterContent}>
            <Text style={styles.chapterNumber}>{index + 1}. </Text>
            <Text style={styles.chapterTitle}>{chapter.title}</Text>
          </View>
          <Text style={styles.arrowIcon}>▶</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontFamily: 'winky-bold',
    fontSize: 20,
    marginBottom: 15,
  },
  chapterItem: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chapterContent: {
    flexDirection: 'row',
    flex: 1,
  },
  chapterNumber: {
    fontFamily: 'winky-bold',
    fontSize: 16,
    color: '#333',
  },
  chapterTitle: {
    fontFamily: 'winky',
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  arrowIcon: {
    color: '#0066FF',
    fontSize: 16,
  }
});
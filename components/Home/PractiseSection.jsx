import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import React from 'react';

export default function PracticeSection() {
  const practiceItems = [
    {
      id: '1',
      title: 'Quizz',
      color: '#FF4D79',
    },
    {
      id: '2',
      title: 'Flashcards',
      color: '#FF7D45',
    },
    {
      id: '3',
      title: 'Question & Ans',
      color: '#6A7BF7',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Practice</Text>
      
      <View style={styles.practiceRow}>
        {practiceItems.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={[styles.practiceCard, { backgroundColor: item.color }]}
          >
            <Text style={styles.practiceTitle}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
  practiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  practiceCard: {
    borderRadius: 12,
    padding: 16,
    width: '31%',
    height: 90,
    justifyContent: 'flex-end',
  },
  practiceTitle: {
    color: 'white',
    fontFamily: 'winky-bold',
    fontSize: 14,
  },
});
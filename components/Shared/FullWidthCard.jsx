import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';

export default function FullWidthCertificationCard({ cert, style, backgroundColor }) {
  const router = useRouter();

  // Safety check for cert object
  if (!cert || !cert.id || !cert.title) {
    return null; // Return null or a placeholder for invalid data
  }

  return (
    <Pressable
      onPress={() => router.push(`/certificationView/${cert.id}`)}
      style={[styles.card, style, { backgroundColor: backgroundColor || Colors.LIGHT_GRAY }]}
    >
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {cert.title}
        </Text>
        {cert.description ? (
          <Text style={styles.description} numberOfLines={3} ellipsizeMode="tail">
            {cert.description}
          </Text>
        ) : null}
        {/* Uncomment and adjust if needed */}
        {/* {cert.lessonsCount > 0 ? (
          <Text style={styles.lessonCount}>
            {cert.lessonsCount} Lessons
          </Text>
        ) : null} */}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    minHeight: 100,
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.DARK_BLUE,
    fontFamily: 'winky-bold',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: Colors.DARK_GRAY,
    marginTop: 5,
    fontFamily: 'winky',
    lineHeight: 20,
  },
  lessonCount: {
    fontSize: 12,
    color: Colors.MEDIUM_GRAY,
    marginTop: 10,
    fontFamily: 'winky',
  }
});
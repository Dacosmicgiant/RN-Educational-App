import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const cardWidth = (width - 70) / 2;

export default function CertificationCard({ cert }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/certificationView/${cert.id}`)}
      style={styles.card}
    >
      <Image source={{ uri: cert.image }} style={styles.image} />
      <Text style={styles.title}>{cert.title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    margin: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  image: {
    height: 100,
    width: '100%',
  },
  title: {
    padding: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

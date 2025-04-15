import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function FullWidthCertificationCard({ cert, style }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/certificationView/${cert.id}`)}
      style={[styles.card, style]}
    >
      <View style={styles.cardContent}>
        <Image source={{ uri: cert.image }} style={styles.image} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{cert.title}</Text>
          {cert.description && (
            <Text style={styles.description} numberOfLines={2}>
              {cert.description}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    height: 80,
    width: 80,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  textContainer: {
    flex: 1,
    padding: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'winky-bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    fontFamily: 'winky',
  },
});
import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const cardWidth = (width - 50) / 2;

// Function to generate light complementary colors
const getComplementaryColors = (index) => {
  const colorSets = [
    ['#E1F5FE', '#B3E5FC'], // Light Blue shades
    ['#E8F5E9', '#C8E6C9'], // Light Green shades
    ['#FFFDE7', '#FFF9C4'], // Light Yellow shades
    ['#FCE4EC', '#F8BBD0'], // Light Pink shades
    ['#F3E5F5', '#E1BEE7'], // Light Purple shades
    ['#EEEEEE', '#E0E0E0'], // Light Grey shades
  ];

  return colorSets[index % colorSets.length];
};

export default function CertificationCard({ cert, index = 0 }) {
  const router = useRouter();
  const [color1, color2] = getComplementaryColors(index);

  // Basic validation check
  if (!cert || !cert.id || !cert.title) {
    return null;
  }

  return (
    <Pressable
      onPress={() => router.push(`/certificationView/${cert.id}`)}
      style={styles.cardWrapper}
      android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
    >
      <LinearGradient
        colors={[color1, color2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.textContainer}>
          <Text
            style={styles.title}
            numberOfLines={4}
            ellipsizeMode="tail"
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            {cert.title}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: cardWidth,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: 160,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12, // Slightly increased padding for better text spacing
    borderRadius: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8, // Added horizontal padding to prevent text cutoff
  },
  title: {
    fontSize: 15, // Slightly reduced font size to ensure text fits
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1F2A44',
    fontFamily: 'winky-bold',
    letterSpacing: -0.3,
    lineHeight: 19, // Adjusted line height for better text fit
  },
});
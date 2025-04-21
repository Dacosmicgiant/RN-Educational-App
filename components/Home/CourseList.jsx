import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../config/firebaseConfig';
import { collection, doc, getDoc } from 'firebase/firestore';
import Colors from '../../constants/Colors';
import FullWidthCertificationCard from '../Shared/FullWidthCard'; // Ensure this path is correct

const ITEMS_PER_PAGE = 5; // How many items to add when scrolling to the end

// Define a list of random background colors that complement Colors.PRIMARY
// (Assuming Colors.PRIMARY is a dominant color like blue/purple. Adjust these as needed)
const CARD_BACKGROUND_COLORS = [
  '#E1F5FE', // Light Blue
  '#E8F5E9', // Light Green
  '#FFFDE7', // Light Yellow
  '#FCE4EC', // Light Pink
  '#F3E5F5', // Light Purple
  '#EEEEEE', // Light Grey
];

const getRandomBackground = () => {
  const randomIndex = Math.floor(Math.random() * CARD_BACKGROUND_COLORS.length);
  return CARD_BACKGROUND_COLORS[randomIndex];
};

export default function CourseList({ currentUser, isAdmin }) {
  const router = useRouter();
  const [certifications, setCertifications] = useState([]); // Holds ALL fetched certifications
  const [loading, setLoading] = useState(true); // Initial load state
  const [visibleItemsCount, setVisibleItemsCount] = useState(ITEMS_PER_PAGE); // How many items to show

  const fetchCertifications = useCallback(async () => {
    setLoading(true); // Set loading true for the initial fetch
    try {
      const enrolledIds = currentUser?.enrolledCertifications || [];

      if (enrolledIds.length === 0) {
        setCertifications([]);
        setLoading(false);
        return;
      }

      // Fetch all documents for the enrolled IDs
      const certPromises = enrolledIds.map(id => getDoc(doc(db, 'certifications', id)));
      const certSnapshots = await Promise.all(certPromises);

      const certs = certSnapshots
        .filter(doc => doc.exists())
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          randomBackgroundColor: getRandomBackground() // Assign a random color here
        }));

      setCertifications(certs);
      // Reset visible items count on new data fetch if needed,
      // but for initial load, start with ITEMS_PER_PAGE
      setVisibleItemsCount(ITEMS_PER_PAGE);

    } catch (err) {
      console.error("Error fetching certifications:", err);
      // Handle error state appropriately in UI
    } finally {
      setLoading(false); // Set loading false after fetching
    }
  }, [currentUser]); // Depend on currentUser

  useEffect(() => {
    fetchCertifications();
  }, [fetchCertifications]); // Depend on fetchCertifications

  // Slice the data to show only the currently visible items
  const dataToShow = certifications.slice(0, visibleItemsCount);

  const handleLoadMore = () => {
    // If we are already showing all items, do nothing
    if (visibleItemsCount >= certifications.length) {
      return;
    }
    // Increase the number of visible items
    setVisibleItemsCount(prevCount => prevCount + ITEMS_PER_PAGE);
  };

  const renderItem = ({ item }) => (
    // Pass the assigned random background color to the card
    <FullWidthCertificationCard cert={item} backgroundColor={item.randomBackgroundColor} />
  );

  const renderFooter = () => {
    // Show activity indicator only if there are more items to load
    if (visibleItemsCount < certifications.length) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color={Colors.PRIMARY} />
        </View>
      );
    }
    return null; // Don't show anything if all items are loaded
  };

  if (loading) {
    return <ActivityIndicator size="large" color={Colors.PRIMARY} style={styles.loading} />;
  }

  // Handle case where there are no certifications after loading
  if (!loading && certifications.length === 0) {
    return (
      <View style={styles.noCertificatesContainer}>
        <Text style={styles.noCertificatesText}>No certifications found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={dataToShow} // Use the sliced data
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        onEndReached={handleLoadMore} // Trigger loading more items
        onEndReachedThreshold={0.5} // When the user is 50% from the end of the list
        ListFooterComponent={renderFooter} // Add footer for loading indicator
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    backgroundColor: Colors.BACKGROUND, // Use a background color from your palette
  },
  loading: {
    marginTop: 40,
  },
  listContainer: {
    paddingVertical: 10, // More padding for better spacing
  },
  footerLoading: {
    paddingVertical: 20,
  },
   noCertificatesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCertificatesText: {
    fontSize: 16,
    color: Colors.DARK_GRAY,
    fontFamily: 'winky', // Assuming this font exists
  },
  // Remove pagination styles as buttons are removed
  // pagination: {},
  // pageBtn: {},
  // pageText: {},
});
import "./../../global.css"

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../config/firebaseConfig';
import { collection, doc, getDoc } from 'firebase/firestore';
import Colors from '../../constants/Colors';
import FullWidthCertificationCard from '../Shared/FullWidthCard';

const ITEMS_PER_PAGE = 5;

const CARD_BACKGROUND_COLORS = [
  '#E1F5FE', '#E8F5E9', '#FFFDE7', '#FCE4EC', '#F3E5F5', '#EEEEEE'
];

const getRandomBackground = () => {
  const randomIndex = Math.floor(Math.random() * CARD_BACKGROUND_COLORS.length);
  return CARD_BACKGROUND_COLORS[randomIndex];
};

export default function CourseList({ currentUser, isAdmin }) {
  const router = useRouter();
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleItemsCount, setVisibleItemsCount] = useState(ITEMS_PER_PAGE);

  const fetchCertifications = useCallback(async () => {
    setLoading(true);
    try {
      const enrolledIds = currentUser?.enrolledCertifications || [];

      if (enrolledIds.length === 0) {
        setCertifications([]);
        setLoading(false);
        return;
      }

      const certPromises = enrolledIds.map(id => getDoc(doc(db, 'certifications', id)));
      const certSnapshots = await Promise.all(certPromises);

      const certs = certSnapshots
        .filter(doc => doc.exists())
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          randomBackgroundColor: getRandomBackground()
        }));

      setCertifications(certs);
      setVisibleItemsCount(ITEMS_PER_PAGE);
    } catch (err) {
      console.error("Error fetching certifications:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchCertifications();
  }, [fetchCertifications]);

  const dataToShow = certifications.slice(0, visibleItemsCount);

  const handleLoadMore = () => {
    if (visibleItemsCount >= certifications.length) return;
    setVisibleItemsCount(prev => prev + ITEMS_PER_PAGE);
  };

  const renderItem = ({ item }) => (
    <FullWidthCertificationCard cert={item} backgroundColor={item.randomBackgroundColor} />
  );

  const renderFooter = () => {
    if (visibleItemsCount < certifications.length) {
      return (
        <View className="py-5">
          <ActivityIndicator size="small" color={Colors.PRIMARY} />
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View className="mt-10">
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  if (!loading && certifications.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-base text-gray-500 font-[winky]">No certifications found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 px-4 dark:bg-neutral-900">
      <FlatList
        data={dataToShow}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 10 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}

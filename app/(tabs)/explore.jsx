import "./../../global.css"

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { collection, getDocs, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import CertificationCard from './../../components/Shared/CertificationCard';
import Colors from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function Explore() {
  const [certifications, setCertifications] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  const PAGE_LIMIT = 6;

  const fetchCertifications = async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const q = query(
        collection(db, 'certifications'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_LIMIT)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setHasMoreData(false);
      } else {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setCertifications(data);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMoreData(snapshot.docs.length === PAGE_LIMIT);
      }
    } catch (error) {
      console.error("Error fetching certifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMore = async () => {
    if (!lastDoc || fetchingMore || !hasMoreData) return;

    setFetchingMore(true);
    try {
      const q = query(
        collection(db, 'certifications'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_LIMIT)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setHasMoreData(false);
      } else {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setCertifications(prev => [...prev, ...data]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMoreData(snapshot.docs.length === PAGE_LIMIT);
      }
    } catch (error) {
      console.error("Error fetching more certifications:", error);
    } finally {
      setFetchingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    fetchCertifications(true);
  }, []);

  useEffect(() => {
    fetchCertifications();
  }, []);

  const renderItem = ({ item, index }) => <CertificationCard cert={item} index={index} />;

  const ListFooterComponent = () => {
    if (fetchingMore) {
      return (
        <View className="py-5 items-center">
          <ActivityIndicator size="small" color={Colors.PRIMARY} />
        </View>
      );
    }

    if (!hasMoreData && certifications.length > 0) {
      return (
        <View className="py-4 items-center">
          <Text className="text-sm text-gray-500 font-winky">You've seen all certifications</Text>
        </View>
      );
    }

    return null;
  };

  const ListEmptyComponent = () => {
    if (loading) return null;

    return (
      <View className="flex-1 items-center justify-center py-16">
        <Ionicons name="document-text-outline" size={64} color={Colors.GRAY} />
        <Text className="mt-4 text-base text-gray-500 font-winky">No certifications found</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor={Colors.WHITE} />
      <View className="flex-1 p-4 bg-white">
        <View className="mb-4 px-1">
          <Text className="text-2xl font-bold text-[#333] font-winky-bold">Explore</Text>
          <Text className="text-base text-gray-500 mt-1 font-winky">Discover certifications</Text>
        </View>

        {loading && !refreshing ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={Colors.PRIMARY} />
          </View>
        ) : (
          <FlatList
            data={certifications}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={{ paddingBottom: 20, alignItems: 'center' }}
            showsVerticalScrollIndicator={false}
            onEndReached={fetchMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={ListFooterComponent}
            ListEmptyComponent={ListEmptyComponent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.PRIMARY]}
                tintColor={Colors.PRIMARY}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

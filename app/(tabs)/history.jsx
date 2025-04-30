import "./../../global.css"

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { db, auth } from './../../config/firebaseConfig';
import Colors from './../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { deleteDoc, doc } from 'firebase/firestore';

export default function HistoryScreen() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const PAGE_SIZE = 10;

  useEffect(() => {
    loadInitialResults();
  }, []);

  const loadInitialResults = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, 'testResults'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('completedAt', 'desc'),
        limit(PAGE_SIZE)
      );

      const querySnapshot = await getDocs(q);
      const results = [];

      querySnapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data(),
          completedAt: doc.data().completedAt?.toDate() || new Date()
        });
      });

      setTestResults(results);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMoreResults(results.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error loading test history:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
  
      const q = query(collection(db, 'testResults'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
  
      const deletePromises = querySnapshot.docs.map((document) => 
        deleteDoc(doc(db, 'testResults', document.id))
      );
  
      await Promise.all(deletePromises);
      alert('All history cleared.');
      // Optionally refresh your list of results
    } catch (error) {
      console.error("Error clearing history:", error);
      alert('Failed to clear history.');
    }
  };
  
  const loadMoreResults = async () => {
    if (!hasMoreResults || loadingMore || !lastVisible || !auth.currentUser) return;

    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'testResults'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('completedAt', 'desc'),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );

      const querySnapshot = await getDocs(q);
      const moreResults = [];

      querySnapshot.forEach((doc) => {
        moreResults.push({
          id: doc.id,
          ...doc.data(),
          completedAt: doc.data().completedAt?.toDate() || new Date()
        });
      });

      setTestResults([...testResults, ...moreResults]);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMoreResults(moreResults.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error loading more test history:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreTextColor = (score) => {
    if (score >= 80) return "text-[#34C759]";
    if (score >= 60) return "text-[#FF9500]";
    return "text-[#FF3B30]";
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      className="bg-white rounded-xl p-4 mb-3 shadow"
      onPress={() => router.push(`/history/${item.id}`)}
    >
      <View className="flex-row justify-between mb-3">
        <Text className="text-base font-semibold text-[#333] flex-1" numberOfLines={1}>{item.moduleTitle}</Text>
        <Text className="text-xs text-[#666]">{formatDate(item.completedAt)}</Text>
      </View>
      
      <View className="flex-row items-center">
        <View className="w-[60px] h-[60px] rounded-full bg-[#F0F0F0] justify-center items-center mr-4">
          <Text className={`text-lg font-bold ${getScoreTextColor(item.score)}`}>{item.score}%</Text>
        </View>
        
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Ionicons name="checkmark-circle" size={14} color="#34C759" />
            <Text className="text-sm text-[#666] ml-1.5">{item.correctAnswers} correct</Text>
          </View>
          <View className="flex-row items-center mb-1">
            <Ionicons name="close-circle" size={14} color="#FF3B30" />
            <Text className="text-sm text-[#666] ml-1.5">{item.incorrectAnswers} incorrect</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text className="text-sm text-[#666] ml-1.5">{formatDuration(item.timeTaken)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View className="py-5 items-center">
        <ActivityIndicator size="small" color={Colors.PRIMARY} />
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text className="text-base mt-4 text-[#333]">Loading history...</Text>
      </View>
    );
  }

  if (!auth.currentUser) {
    return (
      <View className="flex-1 justify-center items-center p-8 bg-[#F5F7FA]">
        <Ionicons name="person-circle-outline" size={64} color="#CCC" />
        <Text className="text-lg font-semibold text-[#333] mt-4 mb-2">Sign In Required</Text>
        <Text className="text-sm text-[#666] text-center leading-5">
          Please sign in to view your test history.
        </Text>
      </View>
    );
  }

  if (testResults.length === 0) {
    return (
      <View className="flex-1 justify-center items-center p-8 bg-[#F5F7FA]">
        <Ionicons name="document-text-outline" size={64} color="#CCC" />
        <Text className="text-lg font-semibold text-[#333] mt-4 mb-2">No History Found</Text>
        <Text className="text-sm text-[#666] text-center leading-5">
          You haven't completed any tests yet. Take a test to see your history here.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F7FA] p-4">
      <Text className="text-2xl font-bold mb-4 mt-2 text-[#333]">Test History</Text>
      
      <TouchableOpacity 
        className="bg-[#FF3B30] py-3 px-5 rounded-lg self-center mb-4" 
        onPress={clearAllHistory}
      >
        <Text className="text-white font-semibold text-base">Clear All History</Text>
      </TouchableOpacity>

      <FlatList
        data={testResults}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreResults}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}
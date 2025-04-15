import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { db, auth } from './../../config/firebaseConfig';
import Colors from './../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

import { deleteDoc, doc} from 'firebase/firestore';

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

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.resultCard}
      onPress={() => router.push(`/history/${item.id}`)}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.moduleTitle} numberOfLines={1}>{item.moduleTitle}</Text>
        <Text style={styles.dateText}>{formatDate(item.completedAt)}</Text>
      </View>
      
      <View style={styles.resultDetails}>
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreText, getScoreStyle(item.score)]}>{item.score}%</Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={14} color="#34C759" />
            <Text style={styles.statText}>{item.correctAnswers} correct</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="close-circle" size={14} color="#FF3B30" />
            <Text style={styles.statText}>{item.incorrectAnswers} incorrect</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.statText}>{formatDuration(item.timeTaken)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getScoreStyle = (score) => {
    if (score >= 80) return styles.highScore;
    if (score >= 60) return styles.mediumScore;
    return styles.lowScore;
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.PRIMARY} />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  if (!auth.currentUser) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="person-circle-outline" size={64} color="#CCC" />
        <Text style={styles.emptyTitle}>Sign In Required</Text>
        <Text style={styles.emptyText}>
          Please sign in to view your test history.
        </Text>
      </View>
    );
  }

  if (testResults.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color="#CCC" />
        <Text style={styles.emptyTitle}>No History Found</Text>
        <Text style={styles.emptyText}>
          You haven't completed any tests yet. Take a test to see your history here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Test History</Text>
      <TouchableOpacity style={styles.clearButton} onPress={clearAllHistory}>
      <Text style={styles.clearButtonText}>Clear All History</Text>
      </TouchableOpacity>

      <FlatList
        data={testResults}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreResults}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 8,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    color: '#333',
  },
  listContainer: {
    paddingBottom: 24,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  resultDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
  },
  highScore: {
    color: '#34C759',
  },
  mediumScore: {
    color: '#FF9500',
  },
  lowScore: {
    color: '#FF3B30',
  },
  statsContainer: {
    flex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F5F7FA',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 16,
  },
  clearButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  
});
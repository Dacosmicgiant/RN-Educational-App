import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  StyleSheet, 
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar
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
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
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
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        
        setCertifications(data);
        setLastDoc(lastVisible);
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
        const newLastDoc = snapshot.docs[snapshot.docs.length - 1];
        
        setCertifications(prev => [...prev, ...data]);
        setLastDoc(newLastDoc);
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

  const renderItem = ({ item, index }) => (
    <CertificationCard cert={item} index={index} />
  );

  const ListFooterComponent = () => {
    if (fetchingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={Colors.PRIMARY} />
        </View>
      );
    }

    if (!hasMoreData && certifications.length > 0) {
      return (
        <View style={styles.endOfListContainer}>
          <Text style={styles.endOfListText}>You've seen all certifications</Text>
        </View>
      );
    }

    return null;
  };

  const ListEmptyComponent = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color={Colors.GRAY} />
        <Text style={styles.emptyText}>No certifications found</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.WHITE} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.heading}>Explore</Text>
          <Text style={styles.subheading}>Discover certifications</Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.PRIMARY} />
          </View>
        ) : (
          <FlatList
            data={certifications}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={styles.list}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.WHITE,
  },
  header: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'winky-bold',
  },
  subheading: {
    fontSize: 16,
    color: Colors.GRAY,
    marginTop: 4,
    fontFamily: 'winky',
  },
  list: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endOfListContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  endOfListText: {
    color: Colors.GRAY,
    fontSize: 14,
    fontFamily: 'winky',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.GRAY,
    fontFamily: 'winky',
  }
});
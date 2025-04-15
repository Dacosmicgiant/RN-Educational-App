import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Button } from 'react-native';
import { collection, getDocs, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import CertificationCard from './../../components/Shared/CertificationCard';

export default function Explore() {
  const [certifications, setCertifications] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);

  const PAGE_LIMIT = 4;

  const fetchCertifications = async () => {
    setLoading(true);
    const q = query(
      collection(db, 'certifications'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_LIMIT)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    setCertifications(data);
    setLastDoc(lastVisible);
    setLoading(false);
  };

  const fetchMore = async () => {
    if (!lastDoc) return;
    setFetchingMore(true);
    const q = query(
      collection(db, 'certifications'),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(PAGE_LIMIT)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    const newLastDoc = snapshot.docs[snapshot.docs.length - 1];
    setCertifications(prev => [...prev, ...data]);
    setLastDoc(newLastDoc);
    setFetchingMore(false);
  };

  useEffect(() => {
    fetchCertifications();
  }, []);

  const renderItem = ({ item }) => <CertificationCard cert={item} />;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Explore Certifications</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <FlatList
          data={certifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
        />
      )}
      {lastDoc && !loading && (
        <Button title="Load More" onPress={fetchMore} disabled={fetchingMore} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 100,
    backgroundColor: '#fff',
    flex: 1,
  },
  heading: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  list: {
    paddingBottom: 20,
  },
});

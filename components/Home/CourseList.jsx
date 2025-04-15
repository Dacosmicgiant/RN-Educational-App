import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../../config/firebaseConfig';
import { collection, doc, getDoc } from 'firebase/firestore';
import CertificationCard from '../Shared/CertificationCard';

const ITEMS_PER_PAGE = 5;

export default function CourseList({ currentUser }) {
  const router = useRouter();
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchCertifications = async () => {
    try {
      const enrolledIds = currentUser?.enrolledCertifications || [];

      const certPromises = enrolledIds.map(id => getDoc(doc(db, 'certifications', id)));
      const certSnapshots = await Promise.all(certPromises);

      const certs = certSnapshots
        .filter(doc => doc.exists())
        .map(doc => ({ id: doc.id, ...doc.data() }));

      setCertifications(certs);
    } catch (err) {
      console.error("Error fetching certifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertifications();
  }, []);

  const paginatedData = certifications.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const hasNextPage = page * ITEMS_PER_PAGE < certifications.length;
  const hasPrevPage = page > 1;

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => router.push(`/CertificationView/${item.id}`)}
      style={styles.courseCard}
    >
      <CertificationCard cert={item} />
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Your Courses</Text>
      
      <FlatList
        data={paginatedData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.pagination}>
        {hasPrevPage && (
          <TouchableOpacity onPress={() => setPage(p => p - 1)} style={styles.pageBtn}>
            <Text style={styles.pageText}>Previous</Text>
          </TouchableOpacity>
        )}
        {hasNextPage && (
          <TouchableOpacity onPress={() => setPage(p => p + 1)} style={styles.pageBtn}>
            <Text style={styles.pageText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 15,
    paddingHorizontal: 15,
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'winky-bold',
    fontSize: 25,
    marginBottom: 12,
  },
  courseCard: {
    marginBottom: 15,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  pageBtn: {
    padding: 10,
    backgroundColor: '#0066FF',
    borderRadius: 8,
  },
  pageText: {
    color: '#fff',
    fontFamily: 'winky-bold',
  },
});

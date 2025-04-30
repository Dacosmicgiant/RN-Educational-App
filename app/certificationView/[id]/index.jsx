import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../../config/firebaseConfig';
import { UserDetailContext } from '../../../context/UserDetailContext';
import Colors from '../../../constants/Colors';
import Button from '../../../components/Shared/Button';

export default function CertificationDetail() {
  const { id } = useLocalSearchParams();
  const [cert, setCert] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userDetail, refreshUser } = useContext(UserDetailContext);
  const [enrolling, setEnrolling] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const certRef = doc(db, 'certifications', id);
        const certSnap = await getDoc(certRef);

        if (certSnap.exists()) {
          setCert(certSnap.data());

          const modulesQuery = query(
            collection(db, 'modules'),
            where('certificationId', '==', id)
          );
          const modulesSnap = await getDocs(modulesQuery);
          let modulesData = modulesSnap.docs.map((docSnap, index) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              moduleNumber: data.moduleNumber !== undefined ? data.moduleNumber : index + 1,
            };
          });

          modulesData = modulesData.sort((a, b) => a.moduleNumber - b.moduleNumber);
          setModules(modulesData);
        }
      } catch (error) {
        console.error("Error fetching certification data:", error);
        Alert.alert("Error", "Failed to load certification details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const checkAdminStatus = async () => {
      if (auth.currentUser) {
        const userEmail = auth.currentUser.email;
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setIsAdmin(userData.isAdmin === true);
        }
      }
    };

    checkAdminStatus();
  }, [id]);

  const handleEnroll = async () => {
    if (enrolling) return;
    setEnrolling(true);

    if (!auth.currentUser) {
      Alert.alert("Authentication Required", "Please sign in first.");
      setEnrolling(false);
      return;
    }

    try {
      const userEmail = auth.currentUser.email;
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', userEmail));
      const querySnapshot = await getDocs(q);

      let userDocId;

      if (!querySnapshot.empty) {
        userDocId = querySnapshot.docs[0].id;
        const userData = querySnapshot.docs[0].data();
        if (userData.enrolledCertifications?.includes(id)) {
          Alert.alert("Already Enrolled", "You are already enrolled in this certification.");
          setEnrolling(false);
          return;
        }
      } else {
        Alert.alert("Account Error", "Your user profile could not be found. Please contact support.");
        setEnrolling(false);
        return;
      }

      const userRef = doc(db, 'users', userDocId);
      await updateDoc(userRef, {
        enrolledCertifications: arrayUnion(id),
      });

      if (typeof refreshUser === 'function') {
        await refreshUser();
      }

      Alert.alert("Success", "You are now enrolled in this certification!");
    } catch (error) {
      console.error("Enrollment error:", error);
      Alert.alert("Error", error.message || "Failed to enroll. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  const navigateToModule = (moduleId, moduleTitle) => {
    router.push({
      pathname: `/moduleView/${moduleId}`,
      params: { title: moduleTitle }
    });
  };

  const navigateToEditCertification = () => {
    router.push({
      pathname: `/editCertification/${id}`,
      params: { certificationId: id }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY || '#0066FF'} />
        <Text style={styles.loadingText}>Loading certification details...</Text>
      </View>
    );
  }

  if (!cert) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Certification not found</Text>
      </View>
    );
  }

  const isEnrolled = userDetail?.enrolledCertifications?.includes(id);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.courseTitle}>{cert.title}</Text>

        {isAdmin && (
          <View style={styles.adminActions}>
            <Button
              text="Edit Course"
              onPress={navigateToEditCertification}
              style={styles.actionButton}
            />
          </View>
        )}

        <View style={styles.chaptersInfo}>
          <Text style={styles.chaptersText}>
            {modules.length} Chapters
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Description:</Text>
        <Text style={styles.description}>{cert.description}</Text>

        {isEnrolled ? (
          <Text style={styles.alreadyEnrolledText}>You are already enrolled in this certification!</Text>
        ) : (
          <TouchableOpacity
            style={[styles.startButton, enrolling && styles.disabledButton]}
            onPress={handleEnroll}
            disabled={enrolling}
          >
            <Text style={styles.startButtonText}>
              {enrolling ? "Enrolling..." : "Enroll Now"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.chapterList}>
        <Text style={styles.sectionTitle}>Chapters</Text>
        {modules.length > 0 ? (
          modules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={styles.chapterItem}
              onPress={() => navigateToModule(module.id, module.title)}
            >
              <View style={styles.chapterContent}>
                <Text style={styles.chapterNumber}>
                  {module.moduleNumber}.
                </Text>
                <View style={styles.titleContainer}>
                  <Text style={styles.chapterTitle}>{module.title}</Text>
                </View>
              </View>
              <Text style={styles.arrowIcon}>▶</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noModulesText}>No chapters available for this certification yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F8F9FB', flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FB', padding: 20 },
  loadingText: { fontFamily: 'winky', fontSize: 16, color: '#4B5563', marginTop: 12 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FB', padding: 20 },
  errorText: { fontFamily: 'winky', fontSize: 16, color: '#DC2626' },
  infoContainer: { paddingHorizontal: 20, paddingVertical: 24, backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  courseTitle: { fontFamily: 'winky-bold', fontSize: 28, color: '#1F2A44', marginBottom: 8, lineHeight: 34 },
  adminActions: { flexDirection: 'row', gap: 12, marginVertical: 16 },
  actionButton: { flex: 1, backgroundColor: '#4B5563', borderRadius: 12, paddingVertical: 12 },
  chaptersInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: '#F0F5FF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  chaptersText: { fontFamily: 'winky', fontSize: 14, color: '#3B82F6', fontWeight: '500' },
  sectionTitle: { fontFamily: 'winky-bold', fontSize: 20, color: '#1F2A44', marginBottom: 12 },
  description: { fontFamily: 'winky', fontSize: 16, color: '#4B5563', lineHeight: 24, marginBottom: 24 },
  startButton: { backgroundColor: '#0066FF', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  disabledButton: { backgroundColor: '#93C5FD', shadowOpacity: 0, elevation: 0 },
  startButtonText: { color: '#FFFFFF', fontFamily: 'winky-bold', fontSize: 16, fontWeight: '600' },
  alreadyEnrolledText: { color: '#15803D', fontFamily: 'winky', fontSize: 16, marginTop: 16 },
  chapterList: { paddingHorizontal: 20, marginTop: 20 },
  chapterItem: { backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  chapterContent: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  chapterNumber: { fontFamily: 'winky-bold', fontSize: 16, color: '#1F2A44', marginRight: 12 },
  titleContainer: { flex: 1 },
  chapterTitle: { fontFamily: 'winky', fontSize: 16, color: '#1F2A44', flexWrap: 'wrap' },
  arrowIcon: { fontSize: 16, color: '#1F2A44', alignSelf: 'center' },
  noModulesText: { fontFamily: 'winky', fontSize: 16, color: '#6B7280', marginTop: 12 },
});
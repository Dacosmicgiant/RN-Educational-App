import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { auth } from '../../../config/firebaseConfig';
import { UserDetailContext } from '../../../context/UserDetailContext';

export default function CertificationDetail() {
  const { id } = useLocalSearchParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const { userDetail, refreshUser } = useContext(UserDetailContext);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, 'certifications', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setCert(snap.data());
        }
      } catch (error) {
        console.error("Error fetching certification:", error);
        Alert.alert("Error", "Failed to load certification details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleEnroll = async () => {
    if (enrolling) return;
    setEnrolling(true);
    
    console.log("Current auth user:", auth.currentUser?.email);
    console.log("Current user detail:", userDetail);
    console.log("refreshUser function:", typeof refreshUser);
    
    if (!auth.currentUser) {
      Alert.alert("Authentication Required", "Please sign in first.");
      setEnrolling(false);
      return;
    }
    
    try {
      const userEmail = auth.currentUser.email;
      
      // Find user document by email field
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', userEmail));
      const querySnapshot = await getDocs(q);
      
      let userDocId;
      
      if (!querySnapshot.empty) {
        // Use the first matching document
        userDocId = querySnapshot.docs[0].id;
        console.log("Found user document:", userDocId);
        
        // Check if already enrolled
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
      
      // Update the document
      const userRef = doc(db, 'users', userDocId);
      await updateDoc(userRef, {
        enrolledCertifications: arrayUnion(id),
      });
      
      // Refresh user context
      try {
        if (typeof refreshUser === 'function') {
          await refreshUser();
        } else {
          console.warn("refreshUser is not a function", refreshUser);
          // Fallback: manually update userDetail
          const updatedUserDoc = await getDoc(userRef);
          if (updatedUserDoc.exists()) {
            // This won't update the context, but at least we have fresh data
            console.log("Updated user data:", updatedUserDoc.data());
          }
        }
      } catch (refreshError) {
        console.error("Error refreshing user data:", refreshError);
      }
      
      Alert.alert("Success", "You are now enrolled in this certification!");
    } catch (error) {
      console.error("Enrollment error:", error);
      Alert.alert("Error", error.message || "Failed to enroll. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <View style={styles.loadingContainer}><Text style={styles.loadingText}>Loading...</Text></View>;

  if (!cert) return <View style={styles.errorContainer}><Text style={styles.errorText}>Certification not found</Text></View>;

  const isEnrolled = userDetail?.enrolledCertifications?.includes(id);

  return (
    <ScrollView style={styles.container}>
      <Image 
        source={{ uri: cert.image }} 
        style={styles.courseImage} 
        resizeMode="cover" 
      />

      <View style={styles.infoContainer}>
        <Text style={styles.courseTitle}>{cert.title}</Text>

        <View style={styles.chaptersInfo}>
          <Text style={styles.chaptersText}>
            {cert.modules?.length || 0} Chapters
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
        {cert.modules?.map((mod, index) => (
          <View key={index} style={styles.chapterItem}>
            <View style={styles.chapterContent}>
              <Text style={styles.chapterNumber}>{index + 1}. </Text>
              <Text style={styles.chapterTitle}>{mod}</Text>
            </View>
            <Text style={styles.arrowIcon}>▶</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontFamily: 'winky',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'winky',
    fontSize: 16,
    color: 'red',
  },
  courseImage: {
    width: '100%',
    height: 200,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  courseTitle: {
    fontFamily: 'winky-bold',
    fontSize: 24,
    marginBottom: 5,
  },
  chaptersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  chaptersText: {
    fontFamily: 'winky',
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontFamily: 'winky-bold',
    fontSize: 18,
    marginBottom: 8,
  },
  description: {
    fontFamily: 'winky',
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#0066FF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginVertical: 10,
  },
  disabledButton: {
    backgroundColor: '#99BBFF',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontFamily: 'winky-bold',
    fontSize: 16,
  },
  alreadyEnrolledText: {
    color: 'green',
    fontFamily: 'winky',
    fontSize: 16,
    marginVertical: 15,
    textAlign: 'center',
  },
  chapterList: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  chapterItem: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chapterContent: {
    flexDirection: 'row',
    flex: 1,
  },
  chapterNumber: {
    fontFamily: 'winky-bold',
    fontSize: 16,
    color: '#333',
  },
  chapterTitle: {
    fontFamily: 'winky',
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  arrowIcon: {
    color: '#0066FF',
    fontSize: 16,
  },
});
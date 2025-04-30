import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
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

          const modulesQuery = query(collection(db, 'modules'), where('certificationId', '==', id));
          const modulesSnap = await getDocs(modulesQuery);
          let modulesData = modulesSnap.docs.map((docSnap, index) => ({
            id: docSnap.id,
            ...docSnap.data(),
            moduleNumber: docSnap.data().moduleNumber ?? index + 1,
          }));

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
          setIsAdmin(querySnapshot.docs[0].data().isAdmin === true);
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

      if (!querySnapshot.empty) {
        const userDocId = querySnapshot.docs[0].id;
        const userData = querySnapshot.docs[0].data();
        if (userData.enrolledCertifications?.includes(id)) {
          Alert.alert("Already Enrolled", "You are already enrolled in this certification.");
          setEnrolling(false);
          return;
        }

        const userRef = doc(db, 'users', userDocId);
        await updateDoc(userRef, { enrolledCertifications: arrayUnion(id) });

        if (typeof refreshUser === 'function') await refreshUser();

        Alert.alert("Success", "You are now enrolled in this certification!");
      } else {
        Alert.alert("Account Error", "Your user profile could not be found. Please contact support.");
      }
    } catch (error) {
      console.error("Enrollment error:", error);
      Alert.alert("Error", error.message || "Failed to enroll. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  const navigateToModule = (moduleId, moduleTitle) =>
    router.push({ pathname: `/moduleView/${moduleId}`, params: { title: moduleTitle } });

  const navigateToEditCertification = () =>
    router.push({ pathname: `/editCertification/${id}`, params: { certificationId: id } });

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 p-5">
        <ActivityIndicator size="large" color={Colors.PRIMARY || '#0066FF'} />
        <Text className="font-[winky] text-base text-gray-600 mt-3">Loading certification details...</Text>
      </View>
    );
  }

  if (!cert) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 p-5">
        <Text className="font-[winky] text-base text-red-600">Certification not found</Text>
      </View>
    );
  }

  const isEnrolled = userDetail?.enrolledCertifications?.includes(id);

  return (
    <ScrollView className="bg-gray-100 flex-1">
      <View className="p-5 bg-white rounded-2xl mx-4 mt-4 shadow-sm">
        <Text className="font-[winky-bold] text-3xl text-gray-900 mb-2">{cert.title}</Text>

        {isAdmin && (
          <View className="flex-row gap-3 my-4">
            <Button
              text="Edit Course"
              onPress={navigateToEditCertification}
              className="flex-1 bg-gray-600 rounded-xl py-3"
            />
          </View>
        )}

        <View className="flex-row items-center mb-4 bg-blue-50 px-3 py-2 rounded-lg self-start">
          <Text className="font-[winky] text-sm text-blue-600 font-medium">{modules.length} Chapters</Text>
        </View>

        <Text className="font-[winky-bold] text-xl text-gray-900 mb-3">Description:</Text>
        <Text className="font-[winky] text-base text-gray-600 leading-6 mb-6">{cert.description}</Text>

        {isEnrolled ? (
          <Text className="font-[winky] text-base text-green-700 mt-4">You are already enrolled in this certification!</Text>
        ) : (
          <TouchableOpacity
            className={`bg-blue-600 rounded-xl py-4 items-center my-3 shadow-sm ${enrolling ? 'bg-blue-300 shadow-none' : ''}`}
            onPress={handleEnroll}
            disabled={enrolling}
          >
            <Text className="text-white font-[winky-bold] text-base font-semibold">
              {enrolling ? 'Enrolling...' : 'Enroll Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="px-5 mt-5">
        <Text className="font-[winky-bold] text-xl text-gray-900 mb-3">Chapters</Text>
        {modules.length > 0 ? (
          modules.map((module) => (
            <TouchableOpacity
              key={module.id}
              className="bg-white flex-row items-center justify-between py-4 px-5 rounded-xl mb-3 shadow-sm"
              onPress={() => navigateToModule(module.id, module.title)}
            >
              <View className="flex-row items-start flex-1">
                <Text className="font-[winky-bold] text-base text-gray-900 mr-3">{module.moduleNumber}.</Text>
                <Text className="font-[winky] text-base text-gray-900 flex-1">{module.title}</Text>
              </View>
              <Text className="text-base text-gray-900">▶</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text className="font-[winky] text-base text-gray-500 mt-3">No chapters available for this certification yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}
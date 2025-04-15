import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import Colors from '../../../constants/Colors';

export default function ModuleDetail() {
  const { id, title } = useLocalSearchParams();
  const [module, setModule] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        // Fetch module details
        const moduleRef = doc(db, 'modules', id);
        const moduleSnap = await getDoc(moduleRef);
        
        if (moduleSnap.exists()) {
          setModule(moduleSnap.data());
          
          // Count available questions for this module
          const questionsQuery = query(
            collection(db, 'questions'),
            where('moduleId', '==', id)
          );
          
          const questionsSnap = await getDocs(questionsQuery);
          setQuestionCount(questionsSnap.size);
        } else {
          Alert.alert("Error", "Module not found");
        }
      } catch (error) {
        console.error("Error fetching module data:", error);
        Alert.alert("Error", "Failed to load module details");
      } finally {
        setLoading(false);
      }
    };
    
    fetchModuleData();
  }, [id]);

  const startTest = async (questionLimit) => {
    try {
      if (questionCount === 0) {
        Alert.alert("No Questions", "There are no questions available for this module yet.");
        return;
      }

      // Calculate how many questions to use
      const actualQuestionCount = Math.min(questionCount, questionLimit);
      
      // Navigate to the test screen
      router.push({
        pathname: `/mockTest/${id}`,
        params: {
          moduleId: id,
          moduleTitle: module.title || title,
          questionLimit: actualQuestionCount
        }
      });
    } catch (error) {
      console.error("Error starting test:", error);
      Alert.alert("Error", "Failed to start test. Please try again.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY || '#0066FF'} />
        <Text style={styles.loadingText}>Loading module details...</Text>
      </View>
    );
  }
  
  if (!module) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Module not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.moduleTitle}>{module.title || title}</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.sectionTitle}>Description:</Text>
        <Text style={styles.description}>{module.description}</Text>
        
        <View style={styles.questionsInfo}>
          <Text style={styles.questionsAvailable}>
            {questionCount} questions available for this module
          </Text>
        </View>
        
        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>Take a Test</Text>
          <Text style={styles.testDescription}>
            Challenge yourself with a timed test. Questions will be randomly selected
            with 50% easy, 30% medium, and 20% hard difficulty.
          </Text>
          
          <View style={styles.testOptionsContainer}>
            <TouchableOpacity 
              style={styles.testOption}
              onPress={() => startTest(10)}
            >
              <Text style={styles.testOptionTitle}>Quick Test</Text>
              <Text style={styles.testOptionDetail}>10 questions ({questionCount < 10 ? `${questionCount} available` : 'Available'})</Text>
              <Text style={styles.testOptionTime}>10 minutes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.testOption}
              onPress={() => startTest(25)}
            >
              <Text style={styles.testOptionTitle}>Standard Test</Text>
              <Text style={styles.testOptionDetail}>25 questions ({questionCount < 25 ? `${questionCount} available` : 'Available'})</Text>
              <Text style={styles.testOptionTime}>25 minutes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.testOption}
              onPress={() => startTest(40)}
            >
              <Text style={styles.testOptionTitle}>Comprehensive Test</Text>
              <Text style={styles.testOptionDetail}>40 questions ({questionCount < 40 ? `${questionCount} available` : 'Available'})</Text>
              <Text style={styles.testOptionTime}>40 minutes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
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
    marginTop: 10,
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
  header: {
    backgroundColor: '#0066FF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  moduleTitle: {
    fontFamily: 'winky-bold',
    fontSize: 24,
    color: '#FFFFFF',
  },
  infoContainer: {
    padding: 20,
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
  questionsInfo: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  questionsAvailable: {
    fontFamily: 'winky',
    fontSize: 14,
    color: '#0066FF',
  },
  testSection: {
    marginTop: 10,
  },
  testDescription: {
    fontFamily: 'winky',
    fontSize: 14,
    color: '#555',
    marginBottom: 15,
  },
  testOptionsContainer: {
    gap: 15,
  },
  testOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#0066FF',
  },
  testOptionTitle: {
    fontFamily: 'winky-bold',
    fontSize: 16,
    marginBottom: 5,
  },
  testOptionDetail: {
    fontFamily: 'winky',
    fontSize: 14,
    color: '#555',
  },
  testOptionTime: {
    fontFamily: 'winky',
    fontSize: 14,
    color: '#0066FF',
    marginTop: 5,
  },
});
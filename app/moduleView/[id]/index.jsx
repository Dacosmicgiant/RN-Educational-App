import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
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
        const moduleRef = doc(db, 'modules', id);
        const moduleSnap = await getDoc(moduleRef);

        if (moduleSnap.exists()) {
          setModule(moduleSnap.data());

          const questionsQuery = query(
            collection(db, 'questions'),
            where('moduleId', '==', id)
          );

          const questionsSnap = await getDocs(questionsQuery);
          setQuestionCount(questionsSnap.size);
        } else {
          Alert.alert("Error", "Module not found");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching module data:", error);
        Alert.alert("Error", "Failed to load module details");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchModuleData();
  }, [id]);

  const startTest = (questionLimit) => {
    try {
      if (questionCount === 0) {
        Alert.alert("No Questions", "There are no questions available for this module yet.");
        return;
      }

      const actualQuestionCount = Math.min(questionCount, questionLimit);

      if (questionCount < questionLimit) {
           Alert.alert(
              "Not Enough Questions",
              `This module only has ${questionCount} question(s) available. Starting test with ${actualQuestionCount} question(s).`
           );
      }

      router.push({
        pathname: `/mockTest/${id}`,
        params: {
          moduleId: id,
          moduleTitle: module?.title || title,
          questionLimit: actualQuestionCount
        }
      });
    } catch (error) {
      console.error("Error starting test:", error);
      Alert.alert("Error", "Failed to start test. Please try again.");
    }
  };

   const testOptions = [
      { limit: 10, title: 'Quick Test', timeEstimate: '~10-15 mins' },
      { limit: 25, title: 'Standard Test', timeEstimate: '~25-35 mins' },
      { limit: 40, title: 'Comprehensive Test', timeEstimate: '~40-60 mins' },
      { limit: 100, title: 'Full Mock Test', timeEstimate: '~120 mins', requires: 100 }, // Requires 100 questions to be shown
   ];


  // --- Loading State UI ---
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY || '#0066FF'} />
        <Text style={styles.loadingText}>Loading module details...</Text>
      </SafeAreaView>
    );
  }

  // --- Error State UI (Module not found) ---
  if (!module) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Module not found.</Text>
        <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
           <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Module Details UI ---
  return (
    <SafeAreaView style={styles.container}>
      {/* Header outside ScrollView */}
      <View style={styles.header}>
        <Text style={styles.moduleTitle}>{module.title || title}</Text>
      </View>

      <ScrollView style={styles.scrollViewContent}>
        <View style={styles.infoCard}>
           <Text style={styles.sectionTitle}>Description</Text>
           <Text style={styles.description}>{module.description}</Text>

           <View style={styles.questionsInfo}>
             {/* Refactored Text structure to potentially help with the warning */}
             <Text style={styles.questionsAvailable}>
                <Text style={{ fontWeight: '700' }}>{questionCount}</Text>
                {` question${questionCount === 1 ? '' : 's'} available for this module`}
             </Text>
           </View>
        </View>


        <View style={styles.testSectionCard}>
           <Text style={styles.sectionTitle}>Take a Test</Text>
           <Text style={styles.testDescription}>
             Choose a test length below. Questions are selected randomly from the available pool.
           </Text>

           <View style={styles.testOptionsContainer}>
             {testOptions.map((option) => {
               // Only show full mock test if enough questions exist
               if (option.requires && questionCount < option.requires) {
                 return null;
               }

               const isPartiallyAvailable = questionCount > 0 && questionCount < option.limit;
               const isDisabled = questionCount === 0;

               return (
                 <TouchableOpacity
                   key={option.limit}
                   // Apply disabled style if totally disabled or partially available
                   style={[
                     styles.testOptionButton,
                     (isDisabled || isPartiallyAvailable) && styles.testOptionDisabled
                   ]}
                   onPress={() => startTest(option.limit)}
                   disabled={isDisabled} // Button is truly disabled only if no questions
                 >
                   {/* Wrap text content in a View to address the warning */}
                   <View>
                     <Text style={styles.testOptionTitle}>{option.title}</Text>
                     <Text style={styles.testOptionDetail}>
                       {isPartiallyAvailable
                         ? `(${questionCount} available)`
                         : `(${option.limit} questions)`
                       }
                     </Text>
                     <Text style={styles.testOptionTime}>{option.timeEstimate}</Text>
                   </View>
                 </TouchableOpacity>
               );
             })}
           </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    color: '#555',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
   goBackButton: {
      backgroundColor: Colors.PRIMARY || '#0066FF',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
   },
   goBackButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
   },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  moduleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 30,
  },
  infoCard: {
     backgroundColor: '#FFFFFF',
     borderRadius: 12,
     padding: 20,
     marginBottom: 20,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 2,
        },
        android: {
          elevation: 2,
        },
     }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 20,
  },
  questionsInfo: {
    backgroundColor: '#E8F0FE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.PRIMARY || '#0066FF',
  },
  questionsAvailable: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  testSectionCard: {
     backgroundColor: '#FFFFFF',
     borderRadius: 12,
     padding: 20,
     marginBottom: 20,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 2,
        },
        android: {
          elevation: 2,
        },
     }),
  },
  testDescription: {
    fontSize: 15,
    color: '#555',
    marginBottom: 15,
    lineHeight: 22,
  },
  testOptionsContainer: {
    gap: 12,
  },
  testOptionButton: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
     ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
   testOptionDisabled: {
      opacity: 0.6,
      backgroundColor: '#F0F0F0',
   },
  testOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  testOptionDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  testOptionTime: {
    fontSize: 13,
    color: Colors.PRIMARY || '#0066FF',
    fontWeight: '500',
  },
});
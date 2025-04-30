import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
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

          const questionsQuery = query(collection(db, 'questions'), where('moduleId', '==', id));
          const questionsSnap = await getDocs(questionsQuery);
          setQuestionCount(questionsSnap.size);
        } else {
          Alert.alert('Error', 'Module not found');
          router.back();
        }
      } catch (error) {
        console.error('Error fetching module data:', error);
        Alert.alert('Error', 'Failed to load module details');
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
        Alert.alert('No Questions', 'There are no questions available for this module yet.');
        return;
      }

      const actualQuestionCount = Math.min(questionCount, questionLimit);

      if (questionCount < questionLimit) {
        Alert.alert(
          'Not Enough Questions',
          `This module only has ${questionCount} question(s) available. Starting test with ${actualQuestionCount} question(s).`
        );
      }

      router.push({
        pathname: `/mockTest/${id}`,
        params: {
          moduleId: id,
          moduleTitle: module?.title || title,
          questionLimit: actualQuestionCount,
        },
      });
    } catch (error) {
      console.error('Error starting test:', error);
      Alert.alert('Error', 'Failed to start test. Please try again.');
    }
  };

  const testOptions = [
    { limit: 10, title: 'Quick Test', timeEstimate: '~10-15 mins' },
    { limit: 25, title: 'Standard Test', timeEstimate: '~25-35 mins' },
    { limit: 40, title: 'Comprehensive Test', timeEstimate: '~40-60 mins' },
    { limit: 100, title: 'Full Mock Test', timeEstimate: '~120 mins', requires: 100 },
  ];

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-background px-5">
        <ActivityIndicator size="large" color={Colors.PRIMARY || '#0066FF'} />
        <Text className="text-base text-textGray mt-4 font-medium">Loading module details...</Text>
      </SafeAreaView>
    );
  }

  if (!module) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-background px-5">
        <Text className="text-lg text-danger font-semibold mb-5 text-center">Module not found.</Text>
        <TouchableOpacity
          className="bg-primary py-3 px-6 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white text-base font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="bg-white py-4 px-4 border-b border-borderLight shadow-sm">
        <Text className="text-xl font-bold text-textDark">{module.title || title}</Text>
      </View>

      <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 30 }}>
        <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
          <Text className="text-lg font-semibold text-textDark mb-3">Description</Text>
          <Text className="text-sm text-textGray mb-5 leading-6">{module.description}</Text>
          <View className="bg-blue-50 rounded-lg p-3 border-l-4 border-primary">
            <Text className="text-sm text-textDark font-medium">
              <Text className="font-bold">{questionCount}</Text>
              {` question${questionCount === 1 ? '' : 's'} available for this module`}
            </Text>
          </View>
        </View>

        <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
          <Text className="text-lg font-semibold text-textDark mb-3">Take a Test</Text>
          <Text className="text-sm text-textGray mb-4 leading-6">
            Choose a test length below. Questions are selected randomly from the available pool.
          </Text>
          <View className="gap-3">
            {testOptions.map((option) => {
              if (option.requires && questionCount < option.requires) return null;

              const isPartiallyAvailable = questionCount > 0 && questionCount < option.limit;
              const isDisabled = questionCount === 0;

              return (
                <TouchableOpacity
                  key={option.limit}
                  className={`bg-gray-100 rounded-lg p-4 border border-borderLight shadow-sm ${
                    isDisabled || isPartiallyAvailable ? 'opacity-60 bg-gray-200' : ''
                  }`}
                  onPress={() => startTest(option.limit)}
                  disabled={isDisabled}
                >
                  <View>
                    <Text className="text-base font-semibold text-textDark mb-1">
                      {option.title}
                    </Text>
                    <Text className="text-sm text-textLight mb-1">
                      {isPartiallyAvailable
                        ? `(${questionCount} available)`
                        : `(${option.limit} questions)`}
                    </Text>
                    <Text className="text-xs text-primary font-medium">
                      {option.timeEstimate}
                    </Text>
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
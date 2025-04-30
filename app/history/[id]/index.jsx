import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../../config/firebaseConfig';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const [testResult, setTestResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFirstView, setIsFirstView] = useState(true);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  useEffect(() => {
    fetchTestResult();
    return () => {
      if (testResult && isFirstView && !deleteInProgress) deleteTestResult();
    };
  }, [id]);

  const fetchTestResult = async () => {
    if (!id || !auth.currentUser) {
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, 'testResults', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const resultData = {
          id: docSnap.id,
          ...docSnap.data(),
          completedAt: docSnap.data().completedAt?.toDate() || new Date(),
        };
        if (resultData.hasBeenViewed) {
          setIsFirstView(false);
        } else {
          await updateDoc(docRef, { hasBeenViewed: true, lastViewedAt: new Date() });
        }
        setTestResult(resultData);
        if (resultData.questionReports?.length > 0) {
          setQuestions(resultData.questionReports);
        } else if (resultData.questions?.length > 0) {
          setQuestions(resultData.questions);
        } else if (resultData.questionIds?.length > 0) {
          const questionDocs = await Promise.all(
            resultData.questionIds.map((qId) => getDoc(doc(db, 'questions', qId)))
          );
          setQuestions(questionDocs.map((q) => ({ id: q.id, ...q.data() })));
        }
      }
    } catch (error) {
      console.error("Error fetching test result details:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTestResult = async () => {
    if (!id || !auth.currentUser || !isFirstView) return;
    try {
      setDeleteInProgress(true);
      await deleteDoc(doc(db, 'testResults', id));
    } catch (error) {
      console.error("Error deleting test result:", error);
    }
  };

  const handleCloseReport = () =>
    Alert.alert(
      "One-Time Viewing",
      "This test report will be deleted after you close it. Are you sure you want to leave?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Close Report",
          style: "destructive",
          onPress: () => {
            deleteTestResult();
            router.back();
          },
        },
      ]
    );

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} minutes ${secs} seconds`;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color={Colors.PRIMARY || '#007AFF'} />
        <Text className="text-base text-textDark mt-4">Loading test results...</Text>
      </View>
    );
  }

  if (!testResult) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#CCC" />
        <Text className="text-xl font-semibold text-textDark mt-4 mb-2">Result Not Found</Text>
        <Text className="text-base text-textGray text-center mb-6 leading-6">
          The test result you're looking for doesn't exist or you don't have permission to view it.
        </Text>
        <TouchableOpacity className="bg-primary py-3 px-6 rounded-lg" onPress={() => router.back()}>
          <Text className="text-white text-base font-medium">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isFirstView) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-6">
        <Ionicons name="eye-off-outline" size={64} color="#CCC" />
        <Text className="text-xl font-semibold text-textDark mt-4 mb-2">Report Already Viewed</Text>
        <Text className="text-base text-textGray text-center mb-6 leading-6">
          This test report has already been viewed and is no longer available. Test reports can only be viewed once for security reasons.
        </Text>
        <TouchableOpacity className="bg-primary py-3 px-6 rounded-lg" onPress={() => router.back()}>
          <Text className="text-white text-base font-medium">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-4 bg-white border-b border-gray-200">
        <TouchableOpacity className="mr-4" onPress={handleCloseReport}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-textDark flex-1">Test Results</Text>
        <View className="flex-row items-center bg-danger px-2 py-1 rounded-full">
          <Ionicons name="eye-outline" size={14} color="#FFF" />
          <Text className="text-white text-xs font-semibold ml-1">One-time view</Text>
        </View>
      </View>

      <ScrollView>
        <View className="flex-row items-center justify-center bg-warning py-2.5">
          <View className="mr-2">
            <Ionicons name="warning-outline" size={20} color="#FFF" />
          </View>
          <Text className="text-white text-sm font-semibold">This report will be deleted once you exit this screen</Text>
        </View>

        <View className="px-5 py-5 bg-white border-b border-gray-200 items-center">
          <Text className="text-xl font-semibold text-textDark mb-2 text-center">{testResult.moduleTitle}</Text>
          <Text className="text-sm text-textGray">{formatDate(testResult.completedAt)}</Text>
        </View>

        <View className="bg-white m-4 rounded-xl p-5 shadow-sm">
          <View className="items-center mb-6">
            <Text className="text-base text-textGray mb-2">Score</Text>
            <Text
              className={testResult.score >= 80 ? 'text-5xl font-bold text-success' : testResult.score >= 60 ? 'text-5xl font-bold text-warning' : 'text-5xl font-bold text-danger'}
            >
              {testResult.score}%
            </Text>
          </View>

          <View className="flex-row justify-around mb-6">
            <View className="items-center">
              <Text className="text-xl font-semibold text-textDark mb-1">{testResult.correctAnswers}</Text>
              <Text className="text-sm text-textGray">Correct</Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-semibold text-textDark mb-1">{testResult.incorrectAnswers}</Text>
              <Text className="text-sm text-textGray">Incorrect</Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-semibold text-textDark mb-1">{testResult.skippedAnswers}</Text>
              <Text className="text-sm text-textGray">Skipped</Text>
            </View>
          </View>

          <View className="border-t border-gray-200 pt-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text className="ml-2 text-sm text-textGray">Time Taken: {formatDuration(testResult.timeTaken)}</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="help-circle-outline" size={18} color="#666" />
              <Text className="ml-2 text-sm text-textGray">Questions: {testResult.questionsCount}</Text>
            </View>
          </View>
        </View>

        {questions.length > 0 && (
          <View className="bg-white m-4 mt-0 rounded-xl p-5 shadow-sm">
            <Text className="text-lg font-semibold text-textDark mb-4">Question Review</Text>
            {questions.map((question, index) => {
              let questionText, options, explanation, selectedOptionIndex, isCorrect, wasSkipped;
              if (question.questionText) {
                questionText = question.questionText;
                options = question.options;
                explanation = question.explanation;
                selectedOptionIndex = question.selectedOptionIndex;
                isCorrect = question.wasCorrect;
                wasSkipped = question.wasSkipped;
              } else {
                questionText = question.text;
                options = question.options;
                explanation = question.explanation;
                const userAnswer = testResult.userAnswers?.[question.id];
                selectedOptionIndex = userAnswer?.selectedOptionIndex;
                const correctOptionIndex = options.findIndex((option) => option.isCorrect);
                isCorrect = selectedOptionIndex !== undefined && selectedOptionIndex === correctOptionIndex;
                wasSkipped = selectedOptionIndex === undefined;
              }
              const correctOptionIndex = options.findIndex((option) => option.isCorrect);
              return (
                <View key={question.id || index} className="mb-6 pb-6 border-b border-gray-200">
                  <Text className="text-sm font-semibold text-textGray mb-2">Question {index + 1}</Text>
                  <Text className="text-base text-textDark mb-4 leading-6">{questionText}</Text>
                  <View className="mb-4">
                    {options.map((option, optIndex) => (
                      <View
                        key={`${question.id || index}-${optIndex}`}
                        className={`p-3 rounded-lg mb-2 bg-background ${
                          selectedOptionIndex === optIndex ? 'border border-gray-300 bg-gray-200' : ''
                        } ${option.isCorrect ? 'border border-success bg-green-50' : ''}`}
                      >
                        <Text
                          className={`text-sm ${
                            option.isCorrect || selectedOptionIndex === optIndex ? 'text-textDark font-medium' : 'text-textGray'
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}. {option.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {wasSkipped ? (
                    <View className="mb-4">
                      <Text className="text-base font-semibold text-warning">Skipped</Text>
                      <Text className="text-sm text-textGray mt-1">
                        Correct answer: {String.fromCharCode(65 + correctOptionIndex)}
                      </Text>
                    </View>
                  ) : (
                    <View className="mb-4">
                      <Text className={`text-base font-semibold ${isCorrect ? 'text-success' : 'text-danger'}`}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </Text>
                      {!isCorrect && (
                        <Text className="text-sm text-textGray mt-1">
                          Correct answer: {String.fromCharCode(65 + correctOptionIndex)}
                        </Text>
                      )}
                    </View>
                  )}
                  {explanation && (
                    <View className="bg-background p-4 rounded-lg">
                      <Text className="text-sm font-semibold text-textGray mb-2">Explanation:</Text>
                      <Text className="text-sm text-textDark leading-6">{explanation}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View className="m-4 mb-10">
          <TouchableOpacity
            className="bg-gray-500 flex-row items-center justify-center py-3.5 rounded-lg mb-3"
            onPress={() =>
              Alert.alert(
                "Cannot Save Report",
                "This report is viewable only once and cannot be saved due to security policy.",
                [{ text: "OK" }]
              )
            }
          >
            <Ionicons name="document-text-outline" size={20} color="#FFF" />
            <Text className="text-white text-base font-semibold ml-2">Save Report (Disabled)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-danger flex-row items-center justify-center py-3.5 rounded-lg"
            onPress={handleCloseReport}
          >
            <Ionicons name="close-circle-outline" size={20} color="#FFF" />
            <Text className="text-white text-base font-semibold ml-2">Close & Delete Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
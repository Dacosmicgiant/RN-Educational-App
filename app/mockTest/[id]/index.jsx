import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../config/firebaseConfig';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function TestScreen() {
  const { moduleId, moduleTitle, questionLimit } = useLocalSearchParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [testFinished, setTestFinished] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [savedReportId, setSavedReportId] = useState(null);
  const [resultViewed, setResultViewed] = useState(false);
  const timerInterval = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const q = query(collection(db, 'questions'), where('moduleId', '==', moduleId));
        const querySnapshot = await getDocs(q);
        const allQuestions = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (allQuestions.length === 0) {
          Alert.alert('No Questions', 'There are no questions available for this module.');
          router.back();
          return;
        }

        const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);
        const shuffledQuestions = shuffleArray([...allQuestions]);
        const limit = parseInt(questionLimit);
        const finalQuestions = shuffledQuestions
          .slice(0, Math.min(limit, shuffledQuestions.length))
          .map((q) => ({
            ...q,
            options: shuffleArray([...q.options]),
          }));

        setQuestions(finalQuestions);

        let timeLimit = 0;
        if (limit === 10) timeLimit = 15 * 60;
        else if (limit === 25) timeLimit = 35 * 60;
        else if (limit === 100) timeLimit = 120 * 60;
        else timeLimit = finalQuestions.length * 60;

        setTimeRemaining(timeLimit);
      } catch (error) {
        console.error('Error fetching questions:', error);
        Alert.alert('Error', 'Failed to load test questions');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [moduleId, questionLimit]);

  useEffect(() => {
    if (loading || testFinished) return;

    timerInterval.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          completeTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [loading, testFinished]);

  useEffect(() => {
    if (testFinished && savedReportId && !resultViewed) {
      const markReportAsViewed = async () => {
        try {
          const reportRef = doc(db, 'testResults', savedReportId);
          await updateDoc(reportRef, { hasBeenViewed: true });
          setResultViewed(true);
        } catch (error) {
          console.error('Error marking report as viewed:', error);
        }
      };

      markReportAsViewed();
    }
  }, [testFinished, savedReportId, resultViewed]);

  const selectAnswer = (questionId, optionIndex) => {
    setSelectedAnswers({ ...selectedAnswers, [questionId]: optionIndex });
  };

  const toggleMarkForReview = (questionId) => {
    setMarkedForReview((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const goToPrevQuestion = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const completeTest = async () => {
    if (timerInterval.current) clearInterval(timerInterval.current);

    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let skippedAnswers = 0;

    const questionReports = questions.map((question) => {
      const selectedOptionIndex = selectedAnswers[question.id];
      const correctOptionIndex = question.options.findIndex((opt) => opt.isCorrect);
      const isCorrect = selectedOptionIndex !== undefined && selectedOptionIndex === correctOptionIndex;

      if (selectedOptionIndex === undefined) skippedAnswers++;
      else if (isCorrect) correctAnswers++;
      else incorrectAnswers++;

      return {
        questionId: question.id,
        questionText: question.text,
        selectedOptionIndex,
        correctOptionIndex,
        wasCorrect: isCorrect,
        wasSkipped: selectedOptionIndex === undefined,
        wasMarkedForReview: markedForReview[question.id] || false,
        options: question.options.map((opt) => ({ text: opt.text, isCorrect: opt.isCorrect })),
        explanation: question.explanation,
        difficulty: question.difficulty,
      };
    });

    const score = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;
    const initialTimeLimit = (() => {
      const limit = parseInt(questionLimit);
      if (limit === 10) return 15 * 60;
      if (limit === 25) return 35 * 60;
      if (limit === 100) return 120 * 60;
      return questions.length * 60;
    })();
    const timeTaken = initialTimeLimit - timeRemaining;

    if (auth.currentUser) {
      try {
        const reportData = {
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          moduleId,
          moduleTitle,
          questionsCount: questions.length,
          correctAnswers,
          incorrectAnswers,
          skippedAnswers,
          score,
          timeTaken,
          completedAt: serverTimestamp(),
          hasBeenViewed: false,
          userAnswers: Object.entries(selectedAnswers).reduce((acc, [qId, optIndex]) => {
            const question = questions.find((q) => q.id === qId);
            acc[qId] = {
              selectedOptionIndex: optIndex,
              selectedOptionText: question?.options[optIndex]?.text || 'Unknown',
            };
            return acc;
          }, {}),
          markedForReview: { ...markedForReview },
          questionReports,
          deviceInfo: Platform.OS,
          appVersion: '1.0.0',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        const reportRef = await addDoc(collection(db, 'testResults'), reportData);
        setSavedReportId(reportRef.id);
      } catch (error) {
        console.error('Error saving test report:', error);
        Alert.alert(
          'Error',
          'Failed to save your test results. Your score has been calculated but the history may not be available.'
        );
      }
    }

    setTestResult({ correctAnswers, incorrectAnswers, skippedAnswers, score, totalQuestions: questions.length, timeTaken });
    setTestFinished(true);
    setShowCompleteModal(false);
  };

  const returnToModule = () => {
    if (savedReportId) {
      Alert.alert(
        'One-Time Viewing',
        'This test report can only be viewed once. Once you leave this screen, you won’t be able to access these detailed results again.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave Anyway', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color={Colors.PRIMARY || '#0066FF'} />
        <Text className="text-base text-textGray mt-4 font-medium">Preparing your test...</Text>
      </SafeAreaView>
    );
  }

  if (testFinished && testResult) {
    return (
      <SafeAreaView className="flex-1 bg-resultsBackground">
        <View className="flex-row items-center bg-warning py-2 px-4">
          <View className="mr-2">
            <Ionicons name="eye" size={18} color="#FFF" />
          </View>
          <Text className="text-white text-xs font-medium flex-1">
            One-time viewing only. This report will not be accessible after you leave this screen.
          </Text>
        </View>

        <ScrollView className="px-4 py-4">
          <View className="bg-white rounded-xl p-5 mb-5 items-center shadow-sm">
            <Text className="text-2xl font-bold text-textDark mb-1">Test Complete</Text>
            <Text className="text-base text-textLight mb-5">{moduleTitle}</Text>
            <View className="w-32 h-32 rounded-full border-8 border-primary justify-center items-center bg-blue-50 mb-6">
              <Text className="text-4xl font-bold text-primary">{testResult.score}</Text>
              <Text className="text-lg font-semibold text-primary absolute bottom-6 right-6">%</Text>
            </View>
            <View className="flex-row justify-around w-full mb-5">
              <View className="items-center">
                <Text className="text-2xl font-bold text-success mb-0.5">{testResult.correctAnswers}</Text>
                <Text className="text-sm text-textGray">Correct</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-danger mb-0.5">{testResult.incorrectAnswers}</Text>
                <Text className="text-sm text-textGray">Incorrect</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-secondary mb-0.5">{testResult.skippedAnswers}</Text>
                <Text className="text-sm text-textGray">Skipped</Text>
              </View>
            </View>
            <View className="flex-row items-baseline mt-2.5 pt-3.5 border-t border-gray-200 w-full justify-center">
              <Text className="text-base text-textGray mr-2">Time Taken:</Text>
              <Text className="text-lg font-semibold text-textDark">{formatTime(testResult.timeTaken)}</Text>
            </View>
          </View>

          <View className="mt-2.5">
            <Text className="text-xl font-bold text-textDark mb-4 pl-1.5">Question Review</Text>
            {questions.map((question, index) => {
              const selectedAnswerIndex = selectedAnswers[question.id];
              const correctOptionIndex = question.options.findIndex((option) => option.isCorrect);
              const wasMarkedForReview = markedForReview[question.id] || false;
              const isCorrect = selectedAnswerIndex !== undefined && selectedAnswerIndex === correctOptionIndex;
              const isSkipped = selectedAnswerIndex === undefined;

              return (
                <View key={question.id} className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                  <View className="flex-row justify-between items-center mb-2.5">
                    <Text className="text-base font-bold text-primary">Question {index + 1}</Text>
                    <View className="flex-row">
                      {wasMarkedForReview && (
                        <View className="bg-orange-100 rounded-lg px-2 py-0.5 ml-1.5">
                          <Text className="text-xs font-semibold text-secondary">Marked</Text>
                        </View>
                      )}
                      {!isSkipped && (
                        <View
                          className={`rounded-lg px-2 py-0.5 ml-1.5 ${
                            isCorrect ? 'bg-green-100' : 'bg-red-100'
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${isCorrect ? 'text-success' : 'text-danger'}`}
                          >
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </Text>
                        </View>
                      )}
                      {isSkipped && (
                        <View className="bg-yellow-100 rounded-lg px-2 py-0.5 ml-1.5">
                          <Text className="text-xs font-semibold text-secondary">Skipped</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text className="text-base text-textDark mb-4 leading-6">{question.text}</Text>
                  <View className="mb-2.5">
                    {question.options.map((option, optIndex) => (
                      <View
                        key={optIndex}
                        className={`p-2.5 rounded-md mb-2 border border-gray-200 bg-gray-50 ${
                          selectedAnswerIndex === optIndex
                            ? isCorrect
                              ? 'border-success bg-green-50'
                              : 'border-danger bg-red-50'
                            : ''
                        } ${correctOptionIndex === optIndex ? 'border-success bg-green-50' : ''} ${
                          isSkipped && correctOptionIndex === optIndex ? 'border-success bg-green-50' : ''
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            selectedAnswerIndex === optIndex
                              ? isCorrect
                                ? 'text-success font-medium'
                                : 'text-danger font-medium'
                              : correctOptionIndex === optIndex
                              ? 'text-success font-medium'
                              : 'text-textDark'
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}. {option.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {(!isCorrect || isSkipped) && (
                    <View className="mt-2.5 p-2.5 bg-cyanLight rounded-md border border-cyan-300">
                      <Text className="text-sm font-bold text-cyanDark mb-1">Correct Answer:</Text>
                      <Text className="text-sm text-cyan-800">
                        {String.fromCharCode(65 + correctOptionIndex)}.{' '}
                        {question.options[correctOptionIndex]?.text}
                      </Text>
                    </View>
                  )}
                  <View className="mt-3 pt-3 border-t border-gray-200">
                    <Text className="text-sm font-bold text-textGray mb-1">Explanation:</Text>
                    <Text className="text-sm text-textDark leading-6">{question.explanation}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
        <View className="p-4 bg-white border-t border-borderLight items-center">
          <Text className="text-xs text-gray-600 mb-3 text-center">
            Take a screenshot if you want to save these results
          </Text>
          <TouchableOpacity
            className="bg-secondary py-3.5 px-10 rounded-full min-w-[60%] shadow-sm"
            onPress={returnToModule}
          >
            <Text className="text-white text-base font-bold">Return to Modules</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isMarkedForReview = currentQuestion ? markedForReview[currentQuestion.id] || false : false;

  if (!currentQuestion) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-background">
        <Text className="text-base text-textGray font-medium">No question available at this index.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-4 bg-white border-b border-borderLight shadow-sm">
        <Text className="text-lg font-bold text-textDark mb-2">{moduleTitle}</Text>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center bg-gray-200 py-1.5 px-2.5 rounded-full">
            <View className="mr-1">
              <Ionicons name="time-outline" size={20} color="#333" />
            </View>
            <Text
              className={`text-base font-semibold text-textDark ${timeRemaining < 60 ? 'text-danger' : ''}`}
            >
              {formatTime(timeRemaining)}
            </Text>
          </View>
          <View className="flex-1 ml-4">
            <Text className="text-xs text-textLight mb-1 text-right">
              Question {currentIndex + 1} of {questions.length}
            </Text>
            <View className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="bg-white rounded-xl p-5 mb-4 shadow-sm">
          <Text className="text-sm font-semibold text-primary mb-2">Question {currentIndex + 1}</Text>
          <Text className="text-lg font-medium text-textDark mb-5 leading-6">{currentQuestion.text}</Text>
          <TouchableOpacity
            className={`flex-row items-center self-start py-2 px-4 rounded-full border ${
              isMarkedForReview ? 'bg-orange-100 border-secondary' : 'bg-gray-200 border-borderLight'
            }`}
            onPress={() => toggleMarkForReview(currentQuestion.id)}
          >
            <Text
              className={`text-sm font-medium ${isMarkedForReview ? 'text-secondary' : 'text-textLight'}`}
            >
              {isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
            </Text>
            <View className="ml-1">
              <Ionicons
                name={isMarkedForReview ? 'bookmark' : 'bookmark-outline'}
                size={16}
                color={isMarkedForReview ? '#FF9500' : '#666'}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-xl p-5 shadow-sm">
          <Text className="text-base font-semibold text-textGray mb-3">Choose your answer:</Text>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              className={`flex-row items-center py-3.5 px-4 rounded-lg mb-2.5 border ${
                selectedAnswers[currentQuestion.id] === index
                  ? 'border-primary bg-blue-50'
                  : 'border-borderLight bg-white'
              } shadow-sm`}
              onPress={() => selectAnswer(currentQuestion.id, index)}
            >
              <View
                className={`w-7 h-7 rounded-full justify-center items-center mr-3 border ${
                  selectedAnswers[currentQuestion.id] === index
                    ? 'bg-primary border-primary'
                    : 'bg-gray-200 border-grayLight'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    selectedAnswers[currentQuestion.id] === index ? 'text-white' : 'text-textLight'
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text className="text-base text-textDark flex-1 leading-5">{option.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View className="flex-row justify-between p-4 bg-white border-t border-borderLight">
        <TouchableOpacity
          className={`flex-1 flex-row items-center justify-center py-3.5 rounded-lg mx-1 border ${
            currentIndex === 0 ? 'bg-gray-200 border-borderLight' : 'bg-gray-50 border-grayLight'
          }`}
          onPress={goToPrevQuestion}
          disabled={currentIndex === 0}
        >
          <View className="mr-1">
            <Ionicons
              name="arrow-back-outline"
              size={24}
              color={currentIndex === 0 ? '#BBB' : '#333'}
            />
          </View>
          <Text
            className={`text-base font-semibold ${currentIndex === 0 ? 'text-gray-400' : 'text-textDark'}`}
          >
            Previous
          </Text>
        </TouchableOpacity>
        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center py-3.5 rounded-lg mx-1 bg-primary border-primary"
            onPress={() => setShowCompleteModal(true)}
          >
            <View className="mr-1">
              <Ionicons name="checkmark-circle-outline" size={24} color="#FFF" />
            </View>
            <Text className="text-base font-semibold text-white">Complete Test</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center py-3.5 rounded-lg mx-1 bg-gray-50 border-grayLight"
            onPress={goToNextQuestion}
          >
            <Text className="text-base font-semibold text-textDark">Next Question</Text>
            <View className="ml-1">
              <Ionicons name="arrow-forward-outline" size={24} color="#333" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showCompleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-5">
          <View className="bg-white rounded-2xl p-6 w-[90%] max-w-md shadow-lg">
            <Text className="text-xl font-bold text-textDark mb-3.5 text-center">Complete Test?</Text>
            <Text className="text-base text-textGray mb-2.5 text-center leading-6">
              Are you sure you want to submit your answers and complete the test now?
            </Text>
            <Text className="text-sm text-red-400 font-medium mb-6 text-center leading-5 px-2.5">
              Note: Your detailed results will only be available for viewing once, immediately after test completion.
            </Text>
            <View className="flex-row justify-between">
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg mx-1.5 bg-gray-200 border border-grayLight"
                onPress={() => setShowCompleteModal(false)}
              >
                <Text className="text-base font-semibold text-textGray text-center">Keep Testing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-lg mx-1.5 bg-primary"
                onPress={() => {
                  setShowCompleteModal(false);
                  completeTest();
                }}
              >
                <Text className="text-base font-bold text-white text-center">Submit Test</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
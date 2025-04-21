import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Platform,
  Dimensions
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

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Load questions from database
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const q = query(
          collection(db, 'questions'),
          where('moduleId', '==', moduleId)
        );

        const querySnapshot = await getDocs(q);
        const allQuestions = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        if (allQuestions.length === 0) {
          Alert.alert("No Questions", "There are no questions available for this module.");
          router.back();
          return;
        }

        const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);
        const shuffledQuestions = shuffleArray([...allQuestions]);

        const limit = parseInt(questionLimit);

        const finalQuestions = shuffledQuestions
          .slice(0, Math.min(limit, shuffledQuestions.length))
          .map(q => ({
            ...q,
            options: shuffleArray([...q.options])
          }));

        setQuestions(finalQuestions);

        // Set time limit based on question count and limit selection
        let timeLimit = 0;
        if (limit === 10) {
            timeLimit = 15 * 60; // 15 minutes
        } else if (limit === 25) {
            timeLimit = 35 * 60; // 35 minutes
        } else if (limit === 100) {
            timeLimit = 120 * 60; // 120 minutes
        } else {
            timeLimit = finalQuestions.length * 60; // 1 minute per question
        }

        setTimeRemaining(timeLimit);
      } catch (error) {
        console.error("Error fetching questions:", error);
        Alert.alert("Error", "Failed to load test questions");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [moduleId, questionLimit]);

  // Setup timer
  useEffect(() => {
    if (loading || testFinished) return;

    timerInterval.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          completeTest(); // Automatically complete when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [loading, testFinished]);

  // Mark report as viewed when results are displayed
  useEffect(() => {
    if (testFinished && savedReportId && !resultViewed) {
      const markReportAsViewed = async () => {
        try {
          const reportRef = doc(db, 'testResults', savedReportId);
          await updateDoc(reportRef, {
            hasBeenViewed: true
          });
          setResultViewed(true);
          console.log("Report marked as viewed:", savedReportId);
        } catch (error) {
          console.error("Error marking report as viewed:", error);
        }
      };

      markReportAsViewed();
    }
  }, [testFinished, savedReportId, resultViewed]);

  const selectAnswer = (questionId, optionIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: optionIndex
    });
  };

  const toggleMarkForReview = (questionId) => {
    setMarkedForReview(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const completeTest = async () => {
    // Stop the timer
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    // Calculate results
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let skippedAnswers = 0;

    // Create detailed question report data
    const questionReports = questions.map(question => {
      const selectedOptionIndex = selectedAnswers[question.id];
      const correctOptionIndex = question.options.findIndex(opt => opt.isCorrect);
      const isCorrect = selectedOptionIndex !== undefined && selectedOptionIndex === correctOptionIndex;

      // Track statistics
      if (selectedOptionIndex === undefined) {
        skippedAnswers++;
      } else if (isCorrect) {
        correctAnswers++;
      } else {
        incorrectAnswers++;
      }

      // Return structured data for each question
      return {
        questionId: question.id,
        questionText: question.text,
        selectedOptionIndex: selectedOptionIndex,
        correctOptionIndex: correctOptionIndex,
        wasCorrect: isCorrect,
        wasSkipped: selectedOptionIndex === undefined,
        wasMarkedForReview: markedForReview[question.id] || false,
        options: question.options.map(opt => ({
          text: opt.text,
          isCorrect: opt.isCorrect
        })),
        explanation: question.explanation,
        difficulty: question.difficulty
      };
    });

    const score = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;

    // Calculate time taken
    const initialTimeLimit = (() => {
        const limit = parseInt(questionLimit);
        if (limit === 10) return 15 * 60;
        if (limit === 25) return 35 * 60;
        if (limit === 100) return 120 * 60;
        return questions.length * 60; // Default
    })();
    const timeTaken = initialTimeLimit - timeRemaining;

    // Save test result to database if user is logged in
    if (auth.currentUser) {
      try {
        // Prepare full report data
        const reportData = {
          // User information
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,

          // Module information
          moduleId,
          moduleTitle,

          // Test summary
          questionsCount: questions.length,
          correctAnswers,
          incorrectAnswers,
          skippedAnswers,
          score,
          timeTaken,
          completedAt: serverTimestamp(),

          // One-time viewing flag
          hasBeenViewed: false,

          // User answers mapping (questionId -> selectedOptionIndex)
          userAnswers: Object.entries(selectedAnswers).reduce((acc, [qId, optIndex]) => {
              const question = questions.find(q => q.id === qId);
              if (question && question.options[optIndex]) {
                  acc[qId] = {
                      selectedOptionIndex: optIndex,
                      selectedOptionText: question.options[optIndex].text
                  };
              } else {
                  acc[qId] = {
                      selectedOptionIndex: optIndex,
                      selectedOptionText: 'Unknown'
                  };
              }
              return acc;
          }, {}),

          // Questions marked for review
          markedForReview: { ...markedForReview },

          // Detailed question reports
          questionReports: questionReports,

          // Additional metadata
          deviceInfo: Platform.OS, // 'ios' or 'android'
          appVersion: '1.0.0', // You can use a constant or get from your app config

          // Expiry time (24 hours from completion)
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        // Add the document to Firestore
        const reportRef = await addDoc(collection(db, 'testResults'), reportData);
        console.log("Report saved with ID:", reportRef.id);
        setSavedReportId(reportRef.id);

      } catch (error) {
        console.error("Error saving test report:", error);
        Alert.alert(
          "Error",
          "Failed to save your test results. Your score has been calculated but the history may not be available."
        );
      }
    }

    setTestResult({
      correctAnswers,
      incorrectAnswers,
      skippedAnswers,
      score,
      totalQuestions: questions.length,
      timeTaken
    });

    setTestFinished(true);
    setShowCompleteModal(false); // Close the modal if it's open
  };

  const returnToModule = () => {
    // Show one-time viewing alert before navigating back
    if (savedReportId) {
      Alert.alert(
        "One-Time Viewing",
        "This test report can only be viewed once. Once you leave this screen, you won't be able to access these detailed results again.",
        [
          {
            text: "Stay",
            style: "cancel"
          },
          {
            text: "Leave Anyway",
            onPress: () => router.back()
          }
        ]
      );
    } else {
      router.back();
    }
  };

  // --- Loading State UI ---
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY || '#0066FF'} />
        <Text style={styles.loadingText}>Preparing your test...</Text>
      </SafeAreaView>
    );
  }

  // --- Test Finished (Results) UI ---
  if (testFinished && testResult) { // Ensure testResult is available
    return (
      <SafeAreaView style={styles.resultsContainer}>
        <View style={styles.oneTimeViewBanner}>
          <Ionicons name="eye" size={18} color="#FFFFFF" style={styles.bannerIcon} />
          <Text style={styles.oneTimeViewText}>
            One-time viewing only. This report will not be accessible after you leave this screen.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.resultsScrollViewContent}>
            <View style={styles.resultSummaryCard}>
              <Text style={styles.resultTitle}>Test Complete</Text>
              <Text style={styles.moduleTitleResult}>{moduleTitle}</Text>

              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{testResult.score}</Text>
                <Text style={styles.scorePercent}>%</Text>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#34C759' }]}>{testResult.correctAnswers}</Text>
                  <Text style={styles.statLabel}>Correct</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#FF3B30' }]}>{testResult.incorrectAnswers}</Text>
                  <Text style={styles.statLabel}>Incorrect</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#FF9500' }]}>{testResult.skippedAnswers}</Text>
                  <Text style={styles.statLabel}>Skipped</Text>
                </View>
              </View>

              <View style={styles.timeTakenContainer}>
                <Text style={styles.timeLabel}>Time Taken:</Text>
                <Text style={styles.timeValueResult}>{formatTime(testResult.timeTaken)}</Text>
              </View>

            </View>

            <View style={styles.reviewContainer}>
              <Text style={styles.reviewSectionTitle}>Question Review</Text>

              {questions.map((question, index) => {
                const selectedAnswerIndex = selectedAnswers[question.id];
                const correctOptionIndex = question.options.findIndex(option => option.isCorrect);
                const wasMarkedForReview = markedForReview[question.id] || false;
                const isCorrect = selectedAnswerIndex !== undefined && selectedAnswerIndex === correctOptionIndex;
                const isSkipped = selectedAnswerIndex === undefined;

                return (
                  <View key={question.id} style={styles.reviewQuestion}>
                    <View style={styles.reviewQuestionHeader}>
                      <Text style={styles.reviewQuestionNumber}>Question {index + 1}</Text>
                      <View style={styles.reviewStatusBadges}>
                        {wasMarkedForReview && (
                          <View style={styles.reviewMarkedBadge}>
                            <Text style={styles.reviewMarkedText}>Marked</Text>
                          </View>
                        )}
                        {!isSkipped && (
                          <View style={[styles.reviewResultBadge, isCorrect ? styles.correctBadge : styles.incorrectBadge]}>
                            <Text style={styles.reviewResultText}>{isCorrect ? 'Correct' : 'Incorrect'}</Text>
                          </View>
                        )}
                        {isSkipped && (
                           <View style={styles.skippedBadge}>
                               <Text style={styles.reviewResultText}>Skipped</Text>
                           </View>
                        )}
                      </View>
                    </View>

                    <Text style={styles.reviewQuestionText}>{question.text}</Text>

                    <View style={styles.reviewOptionsContainer}>
                      {question.options.map((option, optIndex) => (
                        <View
                          key={optIndex}
                          style={[
                            styles.reviewOption,
                            // Highlight selected answer (if any)
                            selectedAnswerIndex === optIndex && (isCorrect ? styles.correctOptionReview : styles.incorrectOptionReview),
                            // Always highlight the correct answer
                            correctOptionIndex === optIndex && styles.correctOptionReview,
                            // If selected is incorrect, also show the incorrect style on the selected one
                            selectedAnswerIndex === optIndex && !isCorrect && styles.incorrectOptionReview,
                            // Special case: If skipped, just highlight the correct answer
                            isSkipped && correctOptionIndex === optIndex && styles.correctOptionReview,

                          ]}
                        >
                          <Text style={[
                             styles.reviewOptionText,
                             // Apply text color based on state
                             selectedAnswerIndex === optIndex ? (isCorrect ? styles.correctOptionTextReview : styles.incorrectOptionTextReview) :
                             (correctOptionIndex === optIndex ? styles.correctOptionTextReview : {}),
                             // If skipped, only correct answer text is highlighted
                              isSkipped && correctOptionIndex === optIndex && styles.correctOptionTextReview,
                           ]}>
                            {String.fromCharCode(65 + optIndex)}. {option.text}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Show correct answer explicitly if incorrect or skipped */}
                    {(!isCorrect || isSkipped) && (
                        <View style={styles.correctAnswerDisplay}>
                            <Text style={styles.correctAnswerLabel}>Correct Answer:</Text>
                            <Text style={styles.correctAnswerValue}>
                                {String.fromCharCode(65 + correctOptionIndex)}. {question.options[correctOptionIndex]?.text}
                            </Text>
                        </View>
                    )}


                    <View style={styles.explanationContainerReview}>
                      <Text style={styles.explanationLabelReview}>Explanation:</Text>
                      <Text style={styles.explanationTextReview}>{question.explanation}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
        </ScrollView>
         <View style={styles.resultsFooter}>
             <Text style={styles.saveNoticeText}>
               Take a screenshot if you want to save these results
             </Text>
             <TouchableOpacity style={styles.returnButton} onPress={returnToModule}>
                 <Text style={styles.returnButtonText}>Return to Modules</Text>
             </TouchableOpacity>
         </View>
      </SafeAreaView>
    );
  }

  // --- Active Test UI ---
  const currentQuestion = questions[currentIndex];
  const isMarkedForReview = currentQuestion ? markedForReview[currentQuestion.id] || false : false; // Handle potential undefined currentQuestion

  // Handle case where questions are empty even after loading (edge case)
  if (!currentQuestion) {
      return (
          <SafeAreaView style={styles.loadingContainer}>
              <Text style={styles.loadingText}>No question available at this index.</Text>
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.testHeader}>
          <Text style={styles.testHeaderTitle}>{moduleTitle}</Text>
          <View style={styles.headerBottomRow}>
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={20} color="#333" style={{ marginRight: 4 }} />
              <Text style={[
                styles.timerText,
                timeRemaining < 60 && styles.timerWarning
              ]}>
                {formatTime(timeRemaining)}
              </Text>
            </View>

            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Question {currentIndex + 1} of {questions.length}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((currentIndex + 1) / questions.length) * 100}%` }
                  ]}
                />
              </View>
            </View>
          </View>
      </View>

      <ScrollView style={styles.questionArea} contentContainerStyle={styles.questionScrollContent}>
        <View style={styles.questionCard}>
            <Text style={styles.questionNumberText}>Question {currentIndex + 1}</Text>
            <Text style={styles.currentQuestionText}>{currentQuestion.text}</Text>
             <TouchableOpacity
               style={[styles.markButton, isMarkedForReview && styles.markedButton]}
               onPress={() => toggleMarkForReview(currentQuestion.id)}
             >
               <Text style={[styles.markButtonText, isMarkedForReview && styles.markedButtonText]}>
                 {isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}
               </Text>
               {isMarkedForReview ?
                 <Ionicons name="bookmark" size={16} color="#FF9500" style={{ marginLeft: 4 }} /> :
                 <Ionicons name="bookmark-outline" size={16} color="#666" style={{ marginLeft: 4 }} />}
             </TouchableOpacity>
        </View>


        <View style={styles.optionsCard}>
            <Text style={styles.optionsLabel}>Choose your answer:</Text>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedAnswers[currentQuestion.id] === index && styles.selectedOptionButton
                ]}
                onPress={() => selectAnswer(currentQuestion.id, index)}
              >
                <View style={[styles.optionCircle, selectedAnswers[currentQuestion.id] === index && styles.selectedOptionCircle]}>
                  <Text style={[styles.optionLetter, selectedAnswers[currentQuestion.id] === index && styles.selectedOptionLetter]}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <Text style={styles.optionText}>{option.text}</Text>
              </TouchableOpacity>
            ))}
        </View>
      </ScrollView>

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.disabledButton]}
          onPress={goToPrevQuestion}
          disabled={currentIndex === 0}
        >
          <Ionicons name="arrow-back-outline" size={24} color={currentIndex === 0 ? '#BBB' : '#333'} style={{ marginRight: 4 }}/>
          <Text style={[styles.navButtonText, currentIndex === 0 && styles.disabledButtonText]}>Previous</Text>
        </TouchableOpacity>

        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity
            style={[styles.navButton, styles.completeButton]}
            onPress={() => setShowCompleteModal(true)}
          >
            <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={[styles.navButtonText, styles.completeButtonText]}>Complete Test</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.navButton}
            onPress={goToNextQuestion}
          >
            <Text style={styles.navButtonText}>Next Question</Text>
            <Ionicons name="arrow-forward-outline" size={24} color="#333" style={{ marginLeft: 4 }}/>
          </TouchableOpacity>
        )}
      </View>

      {/* Complete Test Modal */}
      <Modal
        visible={showCompleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)} // Allow closing with back button on Android
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Test?</Text>
            <Text style={styles.modalText}>
              Are you sure you want to submit your answers and complete the test now?
            </Text>
            <Text style={styles.modalOneTimeWarning}>
              Note: Your detailed results will only be available for viewing once, immediately after test completion.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Keep Testing</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={() => {
                  setShowCompleteModal(false);
                  completeTest();
                }}
              >
                <Text style={styles.modalConfirmText}>Submit Test</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // --- General & Loading ---
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Light grey background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    color: '#555', // Slightly darker grey
    fontWeight: '500',
  },

  // --- Active Test: Header ---
  testHeader: {
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    // Add subtle shadow
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
  testHeaderTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#333',
      marginBottom: 8,
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timerWarning: {
    color: '#FF3B30', // Red color for low time
    fontWeight: '700',
  },
  progressContainer: {
    flex: 1, // Take remaining space
    marginLeft: 16, // Space from timer
  },
  progressText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    textAlign: 'right', // Align progress text to the right
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden', // Clip the fill view
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.PRIMARY || '#0066FF',
    borderRadius: 3,
  },

  // --- Active Test: Question Area ---
  questionArea: {
    flex: 1,
    padding: 16,
  },
  questionScrollContent: {
    paddingBottom: 20, // Add padding at the bottom of the scroll view
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    // Add subtle shadow
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
  questionNumberText: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.PRIMARY || '#0066FF',
      marginBottom: 8,
  },
  currentQuestionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 20,
    lineHeight: 26,
  },
  markButton: {
    flexDirection: 'row', // For icon and text
    alignItems: 'center',
    alignSelf: 'flex-start', // Button only takes necessary width
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  markedButton: {
    backgroundColor: '#FFF3E0', // Light orange background
    borderColor: '#FF9500', // Orange border
  },
  markButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  markedButtonText: {
    color: '#FF9500', // Orange text color
    fontWeight: '600',
  },
  optionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    // Add subtle shadow
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
  optionsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    // Add subtle shadow for interactive feel
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
  selectedOptionButton: {
    borderColor: Colors.PRIMARY || '#0066FF', // Highlight border
    backgroundColor: '#E8F0FE', // Light primary background
  },
  optionCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#CCC',
  },
  selectedOptionCircle: {
    backgroundColor: Colors.PRIMARY || '#0066FF',
    borderColor: Colors.PRIMARY || '#0066FF',
  },
  optionLetter: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  selectedOptionLetter: {
    color: '#FFFFFF', // White text for selected letter
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1, // Allows text to wrap
    lineHeight: 22,
  },

  // --- Active Test: Navigation ---
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Distribute buttons
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  navButton: {
    flex: 1, // Each button takes up half the space initially
    flexDirection: 'row', // For potential icon + text
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4, // Add small gap between buttons
    borderWidth: 1,
    borderColor: '#CCC', // Default border
    backgroundColor: '#F8F8F8', // Light background
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  disabledButton: {
    backgroundColor: '#F0F0F0', // Lighter background for disabled state
    borderColor: '#E0E0E0',
  },
  disabledButtonText: {
    color: '#BBB', // Greyed out text
  },
  completeButton: {
    backgroundColor: Colors.PRIMARY || '#0066FF',
    borderColor: Colors.PRIMARY || '#0066FF',
  },
  completeButtonText: {
    color: '#FFFFFF',
  },

  // --- Results Screen ---
  resultsContainer: {
    flex: 1,
    backgroundColor: '#F0F2F5', // Slightly different background for results
  },
  oneTimeViewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA500', // Orange warning banner
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  bannerIcon: {
    marginRight: 8,
  },
  oneTimeViewText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    flex: 1, // Allow text to wrap
  },
  resultsScrollViewContent: {
    padding: 16,
  },
  resultSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center', // Center content within the card
    // Shadow
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
        android: { elevation: 4 },
    }),
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  moduleTitleResult: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: Colors.PRIMARY || '#0066FF', // Match progress fill
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#E8F0FE', // Light primary fill
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.PRIMARY || '#0066FF',
  },
  scorePercent: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.PRIMARY || '#0066FF',
    position: 'absolute',
    bottom: 25,
    right: 25,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: '#555',
  },
  timeTakenContainer: {
    flexDirection: 'row',
    alignItems: 'baseline', // Align text nicely
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    width: '100%',
    justifyContent: 'center',
  },
  timeLabel: {
    fontSize: 16,
    color: '#555',
    marginRight: 8,
  },
  timeValueResult: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  // --- Results Screen: Question Review ---
  reviewContainer: {
    marginTop: 10, // Space between summary and review
  },
  reviewSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    paddingLeft: 5, // Slight indent
  },
  reviewQuestion: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    // Shadow
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
        android: { elevation: 2 },
    }),
  },
  reviewQuestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewQuestionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.PRIMARY || '#0066FF',
  },
  reviewStatusBadges: {
    flexDirection: 'row',
  },
  reviewMarkedBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6,
  },
  reviewMarkedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
  },
  reviewResultBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6,
  },
  correctBadge: {
    backgroundColor: '#E6F7ED', // Light green
  },
  incorrectBadge: {
    backgroundColor: '#FFEBEB', // Light red
  },
  skippedBadge: {
     backgroundColor: '#FFF8E1', // Light Yellow/Orange
     borderRadius: 10,
     paddingHorizontal: 8,
     paddingVertical: 3,
     marginLeft: 6,
  },
  reviewResultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF', // Default white, override below
  },

  reviewQuestionText: {
    fontSize: 17,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  reviewOptionsContainer: {
    marginBottom: 10,
  },
  reviewOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA', // Very light border for all options
    backgroundColor: '#FAFAFA', // Slight off-white background
  },
  correctOptionReview: {
    backgroundColor: '#E6F7ED', // Light green background
    borderColor: '#34C759', // Green border
  },
  incorrectOptionReview: {
    backgroundColor: '#FFEBEB', // Light red background
    borderColor: '#FF3B30', // Red border
  },
  reviewOptionText: {
    fontSize: 15,
    color: '#444', // Default option text color
    lineHeight: 21,
  },
  correctOptionTextReview: {
     color: '#2E7D32', // Darker green text
     fontWeight: '500',
  },
  incorrectOptionTextReview: {
     color: '#C62828', // Darker red text
     fontWeight: '500',
  },
  correctAnswerDisplay: {
     marginTop: 10,
     padding: 10,
     backgroundColor: '#E0F2F7', // Light cyan background
     borderRadius: 6,
     borderWidth: 1,
     borderColor: '#4DD0E1', // Cyan border
  },
  correctAnswerLabel: {
     fontSize: 14,
     fontWeight: 'bold',
     color: '#00796B', // Dark cyan text
     marginBottom: 4,
  },
  correctAnswerValue: {
     fontSize: 15,
     color: '#004D40', // Very dark cyan text
  },
  explanationContainerReview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  explanationLabelReview: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 4,
  },
  explanationTextReview: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },

  // --- Results Screen: Footer ---
  resultsFooter: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center', // Center items in the footer
  },
  saveNoticeText: {
      fontSize: 13,
      color: '#888',
      marginBottom: 12,
      textAlign: 'center',
  },
  returnButton: {
    backgroundColor: Colors.SECONDARY || '#FF9500', // Use a secondary color or fallback
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '60%', // Ensure decent width
    // Shadow
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3 },
        android: { elevation: 3 },
    }),
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 25,
    width: '90%', // Responsive width
    maxWidth: 400, // Max width on larger screens
    alignItems: 'center',
    // Shadow
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
        android: { elevation: 10 },
    }),
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 23,
  },
  modalOneTimeWarning: {
    fontSize: 14,
    color: '#FF6B6B', // Warning color
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 25,
    lineHeight: 20,
    paddingHorizontal: 10, // Ensure padding for readability
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Space out buttons
    width: '100%', // Buttons take full width of modal content
  },
  modalButton: {
    flex: 1, // Each button takes equal space
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5, // Add space between buttons
  },
  modalCancelButton: {
    backgroundColor: '#F0F0F0', // Light grey cancel button
    borderWidth: 1,
    borderColor: '#CCC',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  modalConfirmButton: {
    backgroundColor: Colors.PRIMARY || '#0066FF', // Primary color for confirm
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text for confirm
  },
});
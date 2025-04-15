import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../config/firebaseConfig';
import Colors from '../../../constants/Colors';
import { Platform } from 'react-native';

export default function TestScreen() {
  const { moduleId, moduleTitle, questionLimit } = useLocalSearchParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(parseInt(questionLimit) * 60); // seconds
  const [testFinished, setTestFinished] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
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
        // Get all questions for this module
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

        // Categorize questions by difficulty
        const easyQuestions = allQuestions.filter(q => q.difficulty === 'easy');
        const mediumQuestions = allQuestions.filter(q => q.difficulty === 'medium');
        const hardQuestions = allQuestions.filter(q => q.difficulty === 'hard');
        
        // Calculate how many of each difficulty to include
        const limit = parseInt(questionLimit);
        const easyCount = Math.floor(limit * 0.5);
        const mediumCount = Math.floor(limit * 0.3);
        const hardCount = limit - easyCount - mediumCount;
        
        // Shuffle and select questions
        const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);
        
        let selectedQuestions = [
          ...shuffleArray(easyQuestions).slice(0, Math.min(easyCount, easyQuestions.length)),
          ...shuffleArray(mediumQuestions).slice(0, Math.min(mediumCount, mediumQuestions.length)),
          ...shuffleArray(hardQuestions).slice(0, Math.min(hardCount, hardQuestions.length))
        ];
        
        // If we don't have enough questions of the right difficulties, add more of other difficulties
        if (selectedQuestions.length < limit) {
          const remainingNeeded = limit - selectedQuestions.length;
          const allRemainingQuestions = shuffleArray([
            ...easyQuestions.filter(q => !selectedQuestions.includes(q)),
            ...mediumQuestions.filter(q => !selectedQuestions.includes(q)),
            ...hardQuestions.filter(q => !selectedQuestions.includes(q))
          ]);
          
          selectedQuestions = [
            ...selectedQuestions,
            ...allRemainingQuestions.slice(0, Math.min(remainingNeeded, allRemainingQuestions.length))
          ];
        }
        
        // Final shuffle and prepare question data
        const finalQuestions = shuffleArray(selectedQuestions).map(q => ({
          ...q,
          // Randomize order of options for each question
          options: shuffleArray([...q.options])
        }));
        
        setQuestions(finalQuestions);
        setTimeRemaining(finalQuestions.length * 60); // 1 minute per question
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
    if (loading) return;
    
    timerInterval.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          completeTest();
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
  }, [loading]);

  const selectAnswer = (questionId, optionIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: optionIndex
    });
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
      const isCorrect = selectedOptionIndex !== undefined && 
        question.options[selectedOptionIndex]?.isCorrect;
      const correctOptionIndex = question.options.findIndex(opt => opt.isCorrect);
      
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
        options: question.options.map(opt => ({
          text: opt.text,
          isCorrect: opt.isCorrect
        })),
        explanation: question.explanation,
        difficulty: question.difficulty
      };
    });
    
    const score = Math.round((correctAnswers / questions.length) * 100);
    
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
          timeTaken: parseInt(questionLimit) * 60 - timeRemaining,
          completedAt: serverTimestamp(),
          
          // User answers mapping (questionId -> selectedOptionIndex)
          userAnswers: { ...selectedAnswers },
          
          // Detailed question reports
          questionReports: questionReports,
          
          // Additional metadata
          deviceInfo: Platform.OS, // 'ios' or 'android'
          appVersion: '1.0.0', // You can use a constant or get from your app config
        };
        
        // Add the document to Firestore
        const reportRef = await addDoc(collection(db, 'testResults'), reportData);
        console.log("Report saved with ID:", reportRef.id);
        
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
      totalQuestions: questions.length
    });
    
    setTestFinished(true);
    setShowCompleteModal(false); // Close the modal if it's open
  };

  const returnToModule = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY || '#0066FF'} />
        <Text style={styles.loadingText}>Preparing your test...</Text>
      </View>
    );
  }

  if (testFinished) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>Test Results</Text>
          <Text style={styles.moduleTitle}>{moduleTitle}</Text>
        </View>
        
        <View style={styles.resultContainer}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>{testResult.score}%</Text>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{testResult.correctAnswers}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{testResult.incorrectAnswers}</Text>
              <Text style={styles.statLabel}>Incorrect</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{testResult.skippedAnswers}</Text>
              <Text style={styles.statLabel}>Skipped</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.returnButton} onPress={returnToModule}>
            <Text style={styles.returnButtonText}>Return to Module</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.reviewContainer}>
          <Text style={styles.reviewTitle}>Question Review</Text>
          
          {questions.map((question, index) => {
            const selectedAnswer = selectedAnswers[question.id];
            const isCorrect = selectedAnswer !== undefined && question.options[selectedAnswer]?.isCorrect;
            const correctOptionIndex = question.options.findIndex(option => option.isCorrect);
            
            return (
              <View key={question.id} style={styles.reviewQuestion}>
                <Text style={styles.reviewQuestionNumber}>Question {index + 1}</Text>
                <Text style={styles.reviewQuestionText}>{question.text}</Text>
                
                <View style={styles.reviewOptionsContainer}>
                  {question.options.map((option, optIndex) => (
                    <View 
                      key={optIndex} 
                      style={[
                        styles.reviewOption,
                        selectedAnswer === optIndex && styles.selectedOption,
                        option.isCorrect && styles.correctOption
                      ]}
                    >
                      <Text style={[
                        styles.reviewOptionText,
                        (option.isCorrect || selectedAnswer === optIndex) && styles.reviewOptionHighlightedText
                      ]}>
                        {String.fromCharCode(65 + optIndex)}. {option.text}
                      </Text>
                    </View>
                  ))}
                </View>
                
                {selectedAnswer === undefined ? (
                  <View style={styles.reviewResult}>
                    <Text style={styles.skippedText}>Skipped</Text>
                    <Text style={styles.correctAnswerText}>
                      Correct answer: {String.fromCharCode(65 + correctOptionIndex)}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.reviewResult}>
                    <Text style={isCorrect ? styles.correctText : styles.incorrectText}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </Text>
                    {!isCorrect && (
                      <Text style={styles.correctAnswerText}>
                        Correct answer: {String.fromCharCode(65 + correctOptionIndex)}
                      </Text>
                    )}
                  </View>
                )}
                
                <View style={styles.explanationContainer}>
                  <Text style={styles.explanationLabel}>Explanation:</Text>
                  <Text style={styles.explanationText}>{question.explanation}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  // Active test UI
  const currentQuestion = questions[currentIndex];
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.testHeader}>
        <View style={styles.timerContainer}>
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
      
      <ScrollView style={styles.questionContainer}>
        <Text style={styles.questionText}>{currentQuestion.text}</Text>
        
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswers[currentQuestion.id] === index && styles.selectedOptionButton
              ]}
              onPress={() => selectAnswer(currentQuestion.id, index)}
            >
              <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
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
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>
        
        {currentIndex === questions.length - 1 ? (
          <TouchableOpacity
            style={[styles.navButton, styles.completeButton]}
            onPress={completeTest}
          >
            <Text style={styles.navButtonText}>Complete</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.navButton}
            onPress={goToNextQuestion}
          >
            <Text style={styles.navButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Complete Test Modal */}
      <Modal
        visible={showCompleteModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Test?</Text>
            <Text style={styles.modalText}>
              Are you sure you want to submit your answers and complete the test?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Continue Test</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={() => {
                  setShowCompleteModal(false);
                  completeTest();
                }}
              >
                <Text style={styles.modalConfirmText}>Submit Answers</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    color: '#333',
  },
  testHeader: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  timerWarning: {
    color: '#FF3B30',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.PRIMARY || '#0066FF',
    borderRadius: 3,
  },
  questionContainer: {
    flex: 1,
    padding: 16,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 24,
    lineHeight: 26,
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedOptionButton: {
    borderColor: Colors.PRIMARY || '#0066FF',
    backgroundColor: '#F0F7FF',
  },
  optionLetter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginRight: 12,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  navigationButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  navButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  completeButton: {
    backgroundColor: Colors.PRIMARY || '#0066FF',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  // Results screen styles
  resultHeader: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  moduleTitle: {
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.PRIMARY || '#0066FF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  returnButton: {
    backgroundColor: Colors.PRIMARY || '#0066FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  reviewQuestion: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  reviewQuestionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  reviewQuestionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    lineHeight: 24,
  },
  reviewOptionsContainer: {
    marginBottom: 16,
  },
  reviewOption: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#CCC',
  },
  correctOption: {
    backgroundColor: '#E6F7EC',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  reviewOptionText: {
    fontSize: 14,
    color: '#666',
  },
  reviewOptionHighlightedText: {
    color: '#333',
    fontWeight: '500',
  },
  reviewResult: {
    marginBottom: 16,
  },
  correctText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  incorrectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  skippedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
  },
  correctAnswerText: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  explanationContainer: {
    backgroundColor: '#F5F7FA',
    padding: 16,
    borderRadius: 8,
  },
  explanationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    margin: 8,
  },
  modalCancelButton: {
    backgroundColor: '#F0F0F0',
  },
  modalConfirmButton: {
    backgroundColor: Colors.PRIMARY || '#0066FF',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
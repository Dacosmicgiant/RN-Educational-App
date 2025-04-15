import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../config/firebaseConfig';
import Colors from '../../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';






export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const [testResult, setTestResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestResult();
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
          completedAt: docSnap.data().completedAt?.toDate() || new Date()
        };
  
        setTestResult(resultData);
  
        // Check for question data in three possible formats:
        
        // 1. If we have detailed questionReports 
        if (resultData.questionReports && resultData.questionReports.length > 0) {
          // Use the enhanced question report data
          setQuestions(resultData.questionReports);
        } 
        // 2. If full questions were stored in the result
        else if (resultData.questions && resultData.questions.length > 0) {
          setQuestions(resultData.questions);
        } 
        // 3. If only question IDs were stored, fetch them from the database
        else if (resultData.questionIds && resultData.questionIds.length > 0) {
          // Fetch questions if only IDs are stored
          const questionPromises = resultData.questionIds.map(qId => 
            getDoc(doc(db, 'questions', qId))
          );
          
          const questionDocs = await Promise.all(questionPromises);
          const questionData = questionDocs.map(q => ({
            id: q.id,
            ...q.data()
          }));
          
          setQuestions(questionData);
        }
      }
    } catch (error) {
      console.error("Error fetching test result details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} minutes ${secs} seconds`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text style={styles.loadingText}>Loading test results...</Text>
      </View>
    );
  }

  if (!testResult) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#CCC" />
        <Text style={styles.errorTitle}>Result Not Found</Text>
        <Text style={styles.errorText}>
          The test result you're looking for doesn't exist or you don't have permission to view it.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    
    <ScrollView style={styles.container}>
        
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Results</Text>
      </View>
      
      <View style={styles.resultHeader}>
        <Text style={styles.moduleTitle}>{testResult.moduleTitle}</Text>
        <Text style={styles.dateText}>{formatDate(testResult.completedAt)}</Text>
      </View>
      
      <View style={styles.resultContainer}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={[
            styles.scoreValue,
            testResult.score >= 80 ? styles.highScore : 
            testResult.score >= 60 ? styles.mediumScore : styles.lowScore
          ]}>
            {testResult.score}%
          </Text>
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
        
        <View style={styles.additionalInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={18} color="#666" />
            <Text style={styles.infoText}>Time Taken: {formatDuration(testResult.timeTaken)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="help-circle-outline" size={18} color="#666" />
            <Text style={styles.infoText}>Questions: {testResult.questionsCount}</Text>
          </View>
        </View>
      </View>
      
      {questions.length > 0 && (
        <View style={styles.reviewContainer}>
          <Text style={styles.reviewTitle}>Question Review</Text>
          
          {questions.map((question, index) => {
            const userAnswer = testResult.userAnswers?.[question.id];
            const correctOptionIndex = question.options.findIndex(option => option.isCorrect);
            const isCorrect = userAnswer !== undefined && 
              question.options[userAnswer]?.isCorrect;
            
            return (
              <View key={question.id} style={styles.reviewQuestion}>
                <Text style={styles.reviewQuestionNumber}>Question {index + 1}</Text>
                <Text style={styles.reviewQuestionText}>{question.text}</Text>
                
                <View style={styles.reviewOptionsContainer}>
                {question.options.map((option, optIndex) => (
                <View 
                    key={`${question.id}-${optIndex}`} 
                    style={[
                    styles.reviewOption,
                    userAnswer === optIndex && styles.selectedOption,
                    option.isCorrect && styles.correctOption
                    ]}
                >
                    <Text style={[
                    styles.reviewOptionText,
                    (option.isCorrect || userAnswer === optIndex) && styles.reviewOptionHighlightedText
                    ]}>
                    {String.fromCharCode(65 + optIndex)}. {option.text}
                    </Text>
                </View>
                ))}

                </View>
                
                {userAnswer === undefined ? (
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
                
                {question.explanation && (
                  <View style={styles.explanationContainer}>
                    <Text style={styles.explanationLabel}>Explanation:</Text>
                    <Text style={styles.explanationText}>{question.explanation}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
    
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F5F7FA',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backBtn: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  resultHeader: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  moduleTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  resultContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
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
  },
  highScore: {
    color: '#34C759',
  },
  mediumScore: {
    color: '#FF9500',
  },
  lowScore: {
    color: '#FF3B30',
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
  additionalInfo: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  reviewContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
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
});
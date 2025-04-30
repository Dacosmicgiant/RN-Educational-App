import { View, Text, TextInput, Alert, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import Colors from '../../constants/Colors';
import { StyleSheet, Platform } from 'react-native'; // Import Platform
import Button from '../../components/Shared/Button'; // Assuming this is a custom Button component
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { Picker } from '@react-native-picker/picker';

export default function AddQuestion({ route, navigation }) {
  const [certifications, setCertifications] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedCertId, setSelectedCertId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false }
  ]);
  // Removed difficulty state
  // const [difficulty, setDifficulty] = useState('medium');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCerts, setLoadingCerts] = useState(true);

  useEffect(() => {
    fetchCertifications();
  }, []);

  useEffect(() => {
    if (selectedCertId) {
      fetchModules(selectedCertId);
    } else {
      setModules([]);
      setSelectedModuleId('');
    }
  }, [selectedCertId]);

  const fetchCertifications = async () => {
    try {
      const certSnapshot = await getDocs(collection(db, 'certifications'));
      const certList = certSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCertifications(certList);
      setLoadingCerts(false);
    } catch (error) {
      console.error('Error fetching certifications:', error);
      Alert.alert('Error', 'Failed to load certifications');
      setLoadingCerts(false);
    }
  };

  const fetchModules = async (certId) => {
    try {
      const moduleSnapshot = await getDocs(collection(db, 'modules'));
      const moduleList = moduleSnapshot.docs
        .filter(doc => doc.data().certificationId === certId)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      setModules(moduleList);
    } catch (error) {
      console.error('Error fetching modules:', error);
      Alert.alert('Error', 'Failed to load modules');
    }
  };

  const handleOptionChange = (index, text) => {
    const newOptions = [...options];
    newOptions[index].text = text;
    setOptions(newOptions);
  };

  const toggleCorrectOption = (index) => {
    const newOptions = options.map((option, i) => ({
      ...option,
      isCorrect: i === index
    }));
    setOptions(newOptions);
  };

  const handleAddQuestion = async () => {
    // Validate question
    if (!selectedModuleId || !questionText || !explanation) {
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }
  
    // Check if at least one option is marked correct
    if (!options.some(option => option.isCorrect)) {
      Alert.alert('Validation Error', 'Please mark at least one option as correct');
      return;
    }
  
    // Check if at least two options have text
    const filledOptions = options.filter(option => option.text.trim() !== '');
    if (filledOptions.length < 2) {
      Alert.alert('Validation Error', 'Please provide text for at least two options.');
      return;
    }
  
    setLoading(true);
  
    try {
      const moduleRef = doc(db, 'modules', selectedModuleId);
      const moduleDoc = await getDoc(moduleRef);
  
      if (!moduleDoc.exists()) {
        Alert.alert('Error', 'Selected module not found');
        setLoading(false);
        return;
      }
  
      // Add question to the questions collection
      const questionRef = await addDoc(collection(db, 'questions'), {
        text: questionText,
        options: options.filter(option => option.text.trim() !== ''),
        explanation,
        moduleId: selectedModuleId,
        certificationId: selectedCertId,
        createdAt: new Date()
      });
  
      // Add question ID to the module's questions subcollection
      try {
        await addDoc(collection(db, 'modules', selectedModuleId, 'questions'), {
          questionId: questionRef.id
        });
      } catch (subcollectionError) {
        console.warn("Failed to add question ID to module subcollection:", subcollectionError);
      }
  
      // Update the question count on the module
      await updateDoc(moduleRef, {
        questionCount: increment(1)
      });
  
      Alert.alert('Success', 'Question added successfully!');
  
      // Reset only question-related fields
      setQuestionText('');
      setOptions([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]);
      setExplanation('');
      // Do NOT reset selectedCertId, selectedModuleId, or modules
  
    } catch (error) {
      console.error('Error adding question:', error);
      Alert.alert('Error', 'Failed to add question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <Text style={styles.heading}>Add New Question</Text>

      {loadingCerts ? (
         <View style={styles.loadingContainer}>
           <ActivityIndicator size="small" color={Colors.PRIMARY || '#0066FF'} />
           <Text style={styles.loadingText}>Loading certifications...</Text>
         </View>
      ) : (
        <>
          <Text style={styles.label}>Select Certification</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCertId}
              onValueChange={(itemValue) => setSelectedCertId(itemValue)}
              style={styles.picker}
              // Use itemStyle for text color on iOS
              itemStyle={Platform.OS === 'ios' ? { color: '#333', fontSize: 16 } : {}}
              mode="dropdown" // Explicitly set mode
            >
              <Picker.Item label="-- Select Certification --" value="" style={{ color: '#999' }} />
              {certifications.map(cert => (
                <Picker.Item key={cert.id} label={cert.title} value={cert.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Select Module</Text>
          <View style={[styles.pickerContainer, modules.length === 0 && styles.pickerDisabled]}>
            <Picker
              selectedValue={selectedModuleId}
              onValueChange={(itemValue) => setSelectedModuleId(itemValue)}
              style={styles.picker}
              enabled={modules.length > 0} // Disable picker if no modules
              itemStyle={Platform.OS === 'ios' ? { color: '#333', fontSize: 16 } : {}}
              mode="dropdown"
            >
              <Picker.Item
                 label={modules.length > 0 ? "-- Select Module --" : "No modules available"}
                 value=""
                 style={{ color: '#999' }}
              />
              {modules.map(module => (
                <Picker.Item key={module.id} label={module.title} value={module.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Question Text</Text>
          <TextInput
            placeholder='Enter question text'
            style={styles.TextInput}
            value={questionText}
            onChangeText={setQuestionText}
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Options (tap circle to mark correct)</Text>
          {options.map((option, index) => (
            <View key={index} style={styles.optionContainer}>
              <TextInput
                placeholder={`Option ${index + 1}`}
                style={[
                  styles.TextInput,
                  styles.optionInput,
                   // Removed correctOption style on TextInput border
                ]}
                value={option.text}
                onChangeText={(text) => handleOptionChange(index, text)}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={[styles.correctButton, option.isCorrect && styles.correctButtonSelected]}
                onPress={() => toggleCorrectOption(index)}
              >
                <Text style={[styles.correctButtonText, option.isCorrect && styles.correctButtonTextSelected]}>
                  {/* Use consistent checkmark or letter, not ? */}
                   {option.isCorrect ? '✓' : String.fromCharCode(65 + index)}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Removed Difficulty Picker Section */}
          {/*
          <Text style={styles.label}>Difficulty</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={difficulty}
              onValueChange={(itemValue) => setDifficulty(itemValue)}
              style={styles.picker}
              itemStyle={Platform.OS === 'ios' ? { color: '#333', fontSize: 16 } : {}}
              mode="dropdown"
            >
              <Picker.Item label="Easy" value="easy" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="Hard" value="hard" />
            </Picker>
          </View>
          */}

          <Text style={styles.label}>Explanation (shown after answering)</Text>
          <TextInput
            placeholder='Explanation for the correct answer'
            style={[styles.TextInput, styles.explanationInput]}
            value={explanation}
            onChangeText={setExplanation}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />

          <Button
            text={'Add Question'}
            onPress={handleAddQuestion}
            loading={loading}
            type='primary' // Assuming your Button component handles 'primary' type
            style={styles.saveButton}
          />
           {/* Added bottom padding */}
           <View style={{ height: 30 }} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    padding: 20, // Consistent padding
    backgroundColor: '#F5F7FA', // Consistent background
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
    color: '#555',
    fontWeight: '500',
  },
  heading: {
    fontSize: 24, // Adjusted size
    fontWeight: '700', // Use standard weight
    color: '#333', // Dark text
    marginBottom: 20,
    textAlign: 'center', // Center heading
  },
  label: {
    fontSize: 16,
    fontWeight: '600', // Use standard weight
    color: '#333',
    marginBottom: 8, // More space below label
    marginTop: 15, // More space above label
  },
  TextInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0', // Lighter border
    backgroundColor: '#FFFFFF', // White background
    padding: 12, // Slightly less padding
    borderRadius: 8, // More rounded corners
    fontSize: 16,
    marginBottom: 15, // Space below input
    color: '#333', // Text color
  },
   explanationInput: {
      minHeight: 100, // Ensure explanation text area is large enough
      textAlignVertical: 'top', // Align text to top on Android
   },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
    justifyContent: 'center', // Center picker content vertically
     height: 50, // Fixed height for consistency
  },
   pickerDisabled: {
     backgroundColor: '#F0F0F0', // Lighter background for disabled
   },
  picker: {
    height: 50, // Controlled by container height
    width: '100%',
    // On Android, picker text color might need adjustment depending on RN version and theme
    // On iOS, itemStyle is used
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10, // Use gap for spacing between input and button
  },
  optionInput: {
    flex: 1, // Allow input to take available space
    marginBottom: 0, // Reset bottom margin if using gap
  },
  // Removed correctOption style on TextInput border

  correctButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0', // Default grey button
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1, // Added border
    borderColor: '#CCC', // Added border color
    // Removed marginLeft if using gap
  },
  correctButtonSelected: {
    backgroundColor: Colors.PRIMARY || '#0066FF', // Primary color when selected
    borderColor: Colors.PRIMARY || '#0066FF',
  },
  correctButtonText: {
    fontSize: 16, // Adjusted size
    fontWeight: '600', // Added weight
    color: '#555', // Darker text for unselected
  },
  correctButtonTextSelected: {
    color: '#FFFFFF', // White text when selected
  },
  saveButton: {
    marginTop: 20,
    // marginBottom handled by ScrollView content padding
  }
});
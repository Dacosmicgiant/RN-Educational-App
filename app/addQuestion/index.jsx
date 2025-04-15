import { View, Text, TextInput, Alert, ScrollView, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import Colors from '../../constants/Colors';
import { StyleSheet } from 'react-native';
import Button from '../../components/Shared/Button';
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
  const [difficulty, setDifficulty] = useState('medium');
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
    if (!selectedModuleId || !questionText || !explanation || difficulty === '') {
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }

    // Check if at least one option is marked correct
    if (!options.some(option => option.isCorrect)) {
      Alert.alert('Validation Error', 'Please mark at least one option as correct');
      return;
    }

    // Check if all options have text
    if (options.some(option => option.text.trim() === '')) {
      Alert.alert('Validation Error', 'All options must have text');
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
        options,
        difficulty,
        explanation,
        moduleId: selectedModuleId,
        certificationId: selectedCertId,
        createdAt: new Date()
      });

      // Add question ID to the module's questions subcollection
      await addDoc(collection(db, 'modules', selectedModuleId, 'questions'), {
        questionId: questionRef.id
      });

      // Update the question count on the module
      await updateDoc(moduleRef, {
        questionCount: increment(1)
      });

      Alert.alert('Success', 'Question added successfully!');
      
      // Reset form
      setQuestionText('');
      setOptions([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]);
      setExplanation('');
    } catch (error) {
      console.error('Error adding question:', error);
      Alert.alert('Error', 'Failed to add question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{
      padding: 25,
      backgroundColor: Colors.WHITE,
      flexGrow: 1,
    }}>
      <Text style={styles.heading}>Add New Question</Text>

      {loadingCerts ? (
        <Text>Loading certifications...</Text>
      ) : (
        <>
          <Text style={styles.label}>Select Certification</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCertId}
              onValueChange={(itemValue) => setSelectedCertId(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="-- Select Certification --" value="" />
              {certifications.map(cert => (
                <Picker.Item key={cert.id} label={cert.title} value={cert.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Select Module</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedModuleId}
              onValueChange={(itemValue) => setSelectedModuleId(itemValue)}
              style={styles.picker}
              enabled={modules.length > 0}
            >
              <Picker.Item label={modules.length > 0 ? "-- Select Module --" : "No modules available"} value="" />
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
          />

          <Text style={styles.label}>Options (tap to mark correct answer)</Text>
          {options.map((option, index) => (
            <View key={index} style={styles.optionContainer}>
              <TextInput
                placeholder={`Option ${index + 1}`}
                style={[
                  styles.TextInput, 
                  styles.optionInput,
                  option.isCorrect && styles.correctOption
                ]}
                value={option.text}
                onChangeText={(text) => handleOptionChange(index, text)}
              />
              <TouchableOpacity 
                style={[styles.correctButton, option.isCorrect && styles.correctButtonSelected]} 
                onPress={() => toggleCorrectOption(index)}
              >
                <Text style={[styles.correctButtonText, option.isCorrect && styles.correctButtonTextSelected]}>
                  {option.isCorrect ? '✓' : '?'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <Text style={styles.label}>Difficulty</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={difficulty}
              onValueChange={(itemValue) => setDifficulty(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Easy" value="easy" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="Hard" value="hard" />
            </Picker>
          </View>

          <Text style={styles.label}>Explanation (shown after answering)</Text>
          <TextInput
            placeholder='Explanation for the correct answer'
            style={styles.TextInput}
            value={explanation}
            onChangeText={setExplanation}
            multiline
            numberOfLines={4}
          />

          <Button
            text={'Add Question'}
            onPress={handleAddQuestion}
            loading={loading}
            type='primary'
            style={styles.saveButton}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: 'winky-bold',
    fontSize: 28,
    marginBottom: 20,
  },
  label: {
    fontFamily: 'winky-bold',
    fontSize: 16,
    marginBottom: 5,
    marginTop: 10,
  },
  TextInput: {
    borderWidth: 1,
    borderColor: Colors.GRAY,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    fontFamily: 'winky',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.GRAY,
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionInput: {
    flex: 1,
    marginBottom: 5,
  },
  correctOption: {
    borderColor: Colors.GREEN || 'green',
    borderWidth: 2,
  },
  correctButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  correctButtonSelected: {
    backgroundColor: Colors.GREEN || 'green',
  },
  correctButtonText: {
    fontSize: 20,
    color: Colors.DARK,
  },
  correctButtonTextSelected: {
    color: Colors.WHITE,
  },
  saveButton: {
    marginTop: 20,
    marginBottom: 40,
  }
});
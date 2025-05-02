import "./../../global.css"

import { View, Text, TextInput, Alert, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { Picker } from '@react-native-picker/picker';
import Button from '../../components/Shared/Button';
import Colors from '../../constants/Colors';
import { useRouter } from 'expo-router';

export default function AddQuestion() {
  const router = useRouter();
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
    if (!selectedModuleId || !questionText || !explanation) {
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }
  
    if (!options.some(option => option.isCorrect)) {
      Alert.alert('Validation Error', 'Please mark at least one option as correct');
      return;
    }
  
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
  
      const questionRef = await addDoc(collection(db, 'questions'), {
        text: questionText,
        options: options.filter(option => option.text.trim() !== ''),
        explanation,
        moduleId: selectedModuleId,
        certificationId: selectedCertId,
        createdAt: new Date()
      });
  
      try {
        await addDoc(collection(db, 'modules', selectedModuleId, 'questions'), {
          questionId: questionRef.id
        });
      } catch (subcollectionError) {
        console.warn("Failed to add question ID to module subcollection:", subcollectionError);
      }
  
      await updateDoc(moduleRef, {
        questionCount: increment(1)
      });
  
      Alert.alert('Success', 'Question added successfully!');
  
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
  
  const navigateToBatchUpload = () => {
    router.push('/batchQuestionUpload');
  };

  return (
    <ScrollView className="p-5 bg-gray-100 flex-grow">
      <Text className="text-2xl font-bold text-gray-800 mb-5 text-center">Add New Question</Text>
      
      {/* Batch Upload Banner/Button */}
      <TouchableOpacity 
        onPress={navigateToBatchUpload}
        className="bg-indigo-100 p-4 rounded-lg mb-5 flex-row items-center justify-between border border-indigo-200"
      >
        <View className="flex-1">
          <Text className="text-indigo-800 font-bold text-base">Batch Upload Questions</Text>
          <Text className="text-indigo-600 text-sm mt-1">Upload multiple questions at once from CSV/Excel</Text>
        </View>
        <View className="bg-indigo-600 p-2 rounded-lg">
          <Text className="text-white font-bold">GO</Text>
        </View>
      </TouchableOpacity>

      {loadingCerts ? (
         <View className="flex-1 justify-center items-center p-5">
           <ActivityIndicator size="small" color={Colors.PRIMARY || '#0066FF'} />
           <Text className="text-base mt-2 text-gray-600 font-medium">Loading certifications...</Text>
         </View>
      ) : (
        <>
          <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Select Certification</Text>
          <View className={`border border-gray-200 bg-white rounded-lg mb-4 overflow-hidden justify-center h-[50px]`}>
            <Picker
              selectedValue={selectedCertId}
              onValueChange={(itemValue) => setSelectedCertId(itemValue)}
              className="h-[50px] w-full"
              itemStyle={Platform.OS === 'ios' ? { color: '#333', fontSize: 16 } : {}}
              mode="dropdown"
            >
              <Picker.Item label="-- Select Certification --" value="" style={{ color: '#999' }} />
              {certifications.map(cert => (
                <Picker.Item key={cert.id} label={cert.title} value={cert.id} />
              ))}
            </Picker>
          </View>

          <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Select Module</Text>
          <View className={`border border-gray-200 ${modules.length === 0 ? 'bg-gray-100' : 'bg-white'} rounded-lg mb-4 overflow-hidden justify-center h-[50px]`}>
            <Picker
              selectedValue={selectedModuleId}
              onValueChange={(itemValue) => setSelectedModuleId(itemValue)}
              className="h-[50px] w-full"
              enabled={modules.length > 0}
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

          <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Question Text</Text>
          <TextInput
            placeholder="Enter question text"
            className="border border-gray-200 bg-white p-3 rounded-lg text-base mb-4 text-gray-800"
            value={questionText}
            onChangeText={setQuestionText}
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />

          <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Options (tap circle to mark correct)</Text>
          {options.map((option, index) => (
            <View key={index} className="flex-row items-center mb-2 gap-2">
              <TextInput
                placeholder={`Option ${index + 1}`}
                className="flex-1 border border-gray-200 bg-white p-3 rounded-lg text-base text-gray-800"
                value={option.text}
                onChangeText={(text) => handleOptionChange(index, text)}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                className={`w-10 h-10 rounded-full justify-center items-center border ${option.isCorrect ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 border-gray-300'}`}
                onPress={() => toggleCorrectOption(index)}
              >
                <Text className={`text-base font-semibold ${option.isCorrect ? 'text-white' : 'text-gray-600'}`}>
                  {option.isCorrect ? '✓' : String.fromCharCode(65 + index)}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Explanation (shown after answering)</Text>
          <TextInput
            placeholder="Explanation for the correct answer"
            className="border border-gray-200 bg-white p-3 rounded-lg text-base mb-4 text-gray-800 min-h-[100px]"
            value={explanation}
            onChangeText={setExplanation}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
            textAlignVertical="top"
          />

          <Button
            text="Add Question"
            onPress={handleAddQuestion}
            loading={loading}
            type="primary"
            style="mt-5"
          />
          
          {/* Bottom padding */}
          <View className="h-8" />
        </>
      )}
    </ScrollView>
  );
}
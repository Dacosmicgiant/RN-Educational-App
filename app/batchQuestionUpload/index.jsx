import { View, Text, Alert, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, increment, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { Picker } from '@react-native-picker/picker';
import Button from '../../components/Shared/Button';
import Colors from '../../constants/Colors';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function BatchQuestionUpload({ navigation }) {
  const [certifications, setCertifications] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedCertId, setSelectedCertId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [fileSelected, setFileSelected] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState(null);
  const [processingStatus, setProcessingStatus] = useState({
    total: 0,
    processed: 0,
    success: 0,
    errors: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
        copyToCacheDirectory: true
      });
      
      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name;
      setFileName(fileName);
      setFileSelected(true);

      let parsedData;

      // Process file based on extension
      if (fileName.endsWith('.csv')) {
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        parsedData = await parseCSV(fileContent);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        parsedData = await parseExcel(fileUri);
      } else {
        Alert.alert('Error', 'Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV file.');
        return;
      }

      setFileData(parsedData);
      
      if (parsedData && parsedData.length > 0) {
        setProcessingStatus({
          total: parsedData.length,
          processed: 0,
          success: 0,
          errors: 0
        });
      } else {
        Alert.alert('Error', 'No data found in the file or file format is incorrect');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to read the selected file');
    }
  };

  const parseCSV = (csvContent) => {
    return new Promise((resolve) => {
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing errors:', results.errors);
          }
          resolve(cleanAndValidateData(results.data));
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          Alert.alert('Error', 'Failed to parse CSV file');
          resolve([]);
        }
      });
    });
  };

  const parseExcel = async (fileUri) => {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      return cleanAndValidateData(jsonData);
    } catch (error) {
      console.error('Excel parsing error:', error);
      Alert.alert('Error', 'Failed to parse Excel file');
      return [];
    }
  };

  const cleanAndValidateData = (data) => {
    return data.map(row => {
      // Clean up whitespace from column headers in the data
      const cleanedRow = {};
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim();
        cleanedRow[cleanKey] = row[key];
      });
      return cleanedRow;
    }).filter(row => {
      // Basic validation - must have question text and at least one option
      return row.QuestionText && 
             (row.Option1 || row.OptionA) && 
             (row.CorrectOption || row.CorrectOptionIndex || row.CorrectOptionLetter);
    });
  };

  const processFile = async () => {
    if (!selectedModuleId || !fileData || fileData.length === 0) {
      Alert.alert('Validation Error', 'Please select a module and upload a valid file');
      return;
    }

    setIsProcessing(true);
    setLoading(true);

    try {
      const moduleRef = doc(db, 'modules', selectedModuleId);
      const moduleDoc = await getDoc(moduleRef);

      if (!moduleDoc.exists()) {
        Alert.alert('Error', 'Selected module not found');
        setLoading(false);
        setIsProcessing(false);
        return;
      }

      let processed = 0;
      let success = 0;
      let errors = 0;
      
      // Process in batches of 20 to avoid Firestore limits
      for (let i = 0; i < fileData.length; i += 20) {
        const batch = writeBatch(db);
        const currentBatch = fileData.slice(i, i + 20);
        const batchPromises = [];

        for (const row of currentBatch) {
          try {
            const { questionObj, optionsArray } = formatQuestionData(row);
            
            if (!validateQuestion(questionObj, optionsArray)) {
              errors++;
              continue;
            }

            const questionRef = doc(collection(db, 'questions'));
            
            const questionData = {
              text: questionObj.text,
              options: optionsArray,
              explanation: questionObj.explanation || '',
              moduleId: selectedModuleId,
              certificationId: selectedCertId,
              createdAt: new Date()
            };

            batch.set(questionRef, questionData);
            
            // Also add to module's questions subcollection
            const moduleQuestionRef = doc(collection(db, 'modules', selectedModuleId, 'questions'));
            batch.set(moduleQuestionRef, { questionId: questionRef.id });
            
            batchPromises.push(questionRef.id);
            success++;
          } catch (error) {
            console.error('Error processing question:', error);
            errors++;
          }
          
          processed++;
          
          // Update status
          setProcessingStatus({
            total: fileData.length,
            processed,
            success,
            errors
          });
        }

        // Commit the batch
        await batch.commit();
      }

      // Update module question count
      await updateDoc(moduleRef, {
        questionCount: increment(success)
      });

      Alert.alert(
        'Processing Complete', 
        `Successfully added ${success} questions.\n${errors} questions had errors and were skipped.`
      );

    } catch (error) {
      console.error('Error processing file:', error);
      Alert.alert('Error', 'Failed to process file and add questions');
    } finally {
      setLoading(false);
      setIsProcessing(false);
      // Reset file data after processing
      setFileData(null);
      setFileSelected(false);
      setFileName('');
    }
  };

  const formatQuestionData = (row) => {
    let questionObj = {
      text: row.QuestionText || '',
      explanation: row.Explanation || ''
    };

    // Determine the format of options (numbered or lettered)
    const isNumberedFormat = row.hasOwnProperty('Option1');
    const isLetteredFormat = row.hasOwnProperty('OptionA');
    
    let optionsArray = [];
    let correctOption;

    if (isNumberedFormat) {
      // Handle numbered options (Option1, Option2, etc.)
      for (let i = 1; i <= 6; i++) {
        const optionKey = `Option${i}`;
        if (row[optionKey] && row[optionKey].trim() !== '') {
          optionsArray.push({
            text: row[optionKey],
            isCorrect: (row.CorrectOptionIndex && parseInt(row.CorrectOptionIndex) === i) || 
                      (row.CorrectOption && row.CorrectOption === row[optionKey])
          });
        }
      }
    } else if (isLetteredFormat) {
      // Handle lettered options (OptionA, OptionB, etc.)
      for (let i = 0; i < 6; i++) {
        const letter = String.fromCharCode(65 + i); // A, B, C, D, E, F
        const optionKey = `Option${letter}`;
        if (row[optionKey] && row[optionKey].trim() !== '') {
          optionsArray.push({
            text: row[optionKey],
            isCorrect: (row.CorrectOptionLetter && row.CorrectOptionLetter === letter) ||
                      (row.CorrectOption && row.CorrectOption === row[optionKey])
          });
        }
      }
    }

    return { questionObj, optionsArray };
  };

  const validateQuestion = (question, options) => {
    if (!question.text || question.text.trim() === '') {
      return false;
    }

    if (options.length < 2) {
      return false;
    }

    // Check if at least one option is marked as correct
    if (!options.some(opt => opt.isCorrect)) {
      return false;
    }

    return true;
  };

  const downloadTemplate = () => {
    Alert.alert(
      'Template Format',
      'The template should be a CSV or Excel file with these columns:\n\n' +
      '• QuestionText (required)\n' +
      '• Option1, Option2, Option3, etc. OR OptionA, OptionB, OptionC, etc.\n' +
      '• CorrectOptionIndex (1-6) OR CorrectOptionLetter (A-F) OR CorrectOption (exact option text)\n' +
      '• Explanation (optional)\n\n' +
      'The app automatically detects which format you\'re using. Please see documentation for examples.',
      [
        { text: 'OK', onPress: () => console.log('OK Pressed') }
      ]
    );
  };

  return (
    <ScrollView className="p-5 bg-gray-100 flex-grow">
      <Text className="text-2xl font-bold text-gray-800 mb-5 text-center">Batch Upload Questions</Text>

      {loadingCerts ? (
         <View className="flex-1 justify-center items-center p-5">
           <ActivityIndicator size="small" color={Colors.PRIMARY || '#0066FF'} />
           <Text className="text-base mt-2 text-gray-600 font-medium">Loading certifications...</Text>
         </View>
      ) : (
        <>
          <TouchableOpacity 
            onPress={downloadTemplate}
            className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex-row items-center justify-center"
          >
            <Text className="text-indigo-700 font-medium">View File Format Requirements</Text>
          </TouchableOpacity>

          <Text className="text-base font-semibold text-gray-800 mb-2 mt-4">Select Certification</Text>
          <View className={`border border-gray-200 bg-white rounded-lg mb-4 overflow-hidden justify-center h-[50px]`}>
            <Picker
              selectedValue={selectedCertId}
              onValueChange={(itemValue) => setSelectedCertId(itemValue)}
              className="h-[50px] w-full"
              itemStyle={Platform.OS === 'ios' ? { color: '#333', fontSize: 16 } : {}}
              mode="dropdown"
              enabled={!isProcessing}
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
              enabled={modules.length > 0 && !isProcessing}
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

          <View className="mt-5 items-center">
            <TouchableOpacity 
              onPress={handleFilePick}
              disabled={!selectedModuleId || isProcessing}
              className={`border-2 border-dashed ${!selectedModuleId ? 'border-gray-300 bg-gray-50' : 'border-blue-300 bg-blue-50'} rounded-lg p-8 w-full items-center justify-center mb-4`}
            >
              {fileSelected ? (
                <View className="items-center">
                  <Text className="text-base font-medium text-blue-600 mb-1">{fileName}</Text>
                  <Text className="text-sm text-gray-500">Tap to change file</Text>
                </View>
              ) : (
                <View className="items-center">
                  <Text className="text-base font-medium text-gray-700 mb-1">Select CSV or Excel file</Text>
                  <Text className="text-sm text-gray-500 text-center">Tap here to browse files</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {isProcessing && (
            <View className="bg-blue-50 p-4 rounded-lg mb-5">
              <Text className="text-base font-medium text-blue-800 mb-2">Processing Questions...</Text>
              <View className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <View 
                  className="bg-blue-600 h-full"
                  style={{ width: `${(processingStatus.processed / processingStatus.total) * 100}%` }}
                />
              </View>
              <Text className="text-sm text-blue-800 mt-2">
                Processed {processingStatus.processed} of {processingStatus.total} questions
                ({processingStatus.success} successful, {processingStatus.errors} errors)
              </Text>
            </View>
          )}

          <Button
            text={isProcessing ? "Processing..." : "Upload and Process File"}
            onPress={processFile}
            loading={loading}
            disabled={!fileSelected || !selectedModuleId || isProcessing}
            type="primary"
            style="mt-5"
          />
          
          <Button
            text="Return to Questions"
            onPress={() => navigation.goBack()}
            type="secondary"
            style="mt-3"
          />
          
          {/* Bottom padding */}
          <View className="h-8" />
        </>
      )}
    </ScrollView>
  );
}
import "./../../global.css"
import { View, Text, TextInput, Alert, ScrollView, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import React, { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import Button from '../../components/Shared/Button';
import Colors from '../../constants/Colors';

export default function AddCertification() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [moduleFields, setModuleFields] = useState([{ title: '', description: '', moduleNumber: 1 }]);
  const [loading, setLoading] = useState(false);

  const addModuleField = () => {
    const maxModuleNumber = moduleFields.reduce((max, module) =>
      Math.max(max, typeof module.moduleNumber === 'number' ? module.moduleNumber : 0), 0);
    const suggestedModuleNumber = maxModuleNumber + 1;

    setModuleFields([
      ...moduleFields,
      { title: '', description: '', moduleNumber: suggestedModuleNumber }
    ]);
  };

  const removeModuleField = (indexToRemove) => {
    setModuleFields(moduleFields.filter((_, index) => index !== indexToRemove));
  };

  const updateModuleField = (index, field, value) => {
    const updatedModules = [...moduleFields];
    if (field === 'moduleNumber') {
      const numberValue = value === '' ? '' : parseInt(value, 10);
      updatedModules[index][field] = numberValue;
    } else {
      updatedModules[index][field] = value;
    }
    setModuleFields(updatedModules);
  };

  const handleAddCertification = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Validation Error', 'Please fill all required certification fields.');
      return;
    }

    const invalidModuleFields = moduleFields.filter(
      module => module.title.trim() === '' || module.description.trim() === ''
    );

    if (invalidModuleFields.length > 0) {
      Alert.alert('Validation Error', 'All modules must have titles and descriptions.');
      return;
    }

    const moduleNumbers = [];
    let validationError = null;

    moduleFields.forEach((module) => {
      const num = module.moduleNumber;
      const isValid = num === '' || (typeof num === 'number' && Number.isInteger(num) && num > 0);

      if (!isValid) {
        validationError = 'All module numbers must be valid positive integers.';
        return;
      }
      if (num !== '') {
        moduleNumbers.push(num);
      }
    });

    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    const uniqueModuleNumbers = new Set(moduleNumbers);
    if (uniqueModuleNumbers.size !== moduleNumbers.length) {
      Alert.alert('Validation Error', 'All module numbers must be unique.');
      return;
    }

    if (moduleFields.length === 0) {
      Alert.alert('Validation Error', 'A certification must have at least one module.');
      return;
    }

    setLoading(true);

    try {
      const certificationRef = await addDoc(collection(db, 'certifications'), {
        title: title.trim(),
        description: description.trim(),
        image: image.trim() || null,
        createdAt: new Date(),
        moduleCount: moduleFields.length
      });

      const sortedModules = [...moduleFields].sort((a, b) => {
        return (typeof a.moduleNumber === 'number' ? a.moduleNumber : Infinity) - 
               (typeof b.moduleNumber === 'number' ? b.moduleNumber : Infinity);
      });

      const modulePromises = sortedModules.map(async (module) => {
        if (typeof module.moduleNumber === 'number' && module.moduleNumber > 0 && module.title.trim() !== '') {
          const moduleRef = await addDoc(collection(db, 'modules'), {
            title: module.title.trim(),
            description: module.description.trim(),
            moduleNumber: module.moduleNumber,
            certificationId: certificationRef.id,
            questionCount: 0,
            createdAt: new Date()
          });

          await setDoc(doc(db, 'certifications', certificationRef.id, 'modules', moduleRef.id), {
            moduleId: moduleRef.id,
            title: module.title.trim(),
            moduleNumber: module.moduleNumber,
          });

          return moduleRef;
        }
        return null;
      });

      await Promise.all(modulePromises);

      Alert.alert('Success', 'Certification and modules added successfully!');

      setTitle('');
      setDescription('');
      setImage('');
      setModuleFields([{ title: '', description: '', moduleNumber: 1 }]);
    } catch (error) {
      console.error('Error adding certification:', error);
      Alert.alert('Error', 'Failed to add certification and modules.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView className="p-4 flex-grow bg-gray-100">
        <Text className="text-2xl font-bold text-gray-800 mb-5 text-center">Add New Certification</Text>

        {/* Certification Details Card */}
        <View className="bg-white rounded-xl p-5 mb-5 shadow">
          <Text className="text-xl font-semibold text-gray-800 mt-1 mb-4">Certification Details</Text>
          <TextInput
            placeholder="Certification Title (e.g., Python, CPT)"
            className="border border-gray-200 bg-white p-3 rounded-lg text-base mb-4 text-gray-800"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />
          <TextInput
            placeholder="Short Description"
            className="border border-gray-200 bg-white p-3 rounded-lg text-base mb-4 text-gray-800 min-h-[80px]"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
            textAlignVertical="top"
          />
          <TextInput
            placeholder="Image URL (optional)"
            className="border border-gray-200 bg-white p-3 rounded-lg text-base mb-4 text-gray-800"
            value={image}
            onChangeText={setImage}
            placeholderTextColor="#999"
            keyboardType="url"
          />
        </View>

        {/* Modules Section Card */}
        <View className="bg-white rounded-xl p-5 mb-5 shadow">
          <Text className="text-xl font-semibold text-gray-800 mt-1 mb-4">Modules ({moduleFields.length})</Text>
          
          {moduleFields.map((module, index) => (
            <View key={index} className="border border-gray-300 bg-gray-50 rounded-lg p-4 mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-semibold text-gray-800">
                  Module {
                    typeof module.moduleNumber === 'number' && Number.isInteger(module.moduleNumber) && module.moduleNumber > 0
                      ? module.moduleNumber
                      : module.moduleNumber === '' ? '(-)' : '(Invalid)'
                  } Details
                </Text>
                {moduleFields.length > 1 && (
                  <TouchableOpacity onPress={() => removeModuleField(index)} className="p-1">
                    <MaterialIcons name="remove-circle-outline" size={24} color={Colors.DANGER || 'red'} />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                placeholder="Module Number"
                className="border border-gray-200 bg-white p-3 rounded-lg text-base mb-4 text-gray-800"
                value={typeof module.moduleNumber === 'number' && !isNaN(module.moduleNumber) ? String(module.moduleNumber) : ''}
                onChangeText={(value) => updateModuleField(index, 'moduleNumber', value)}
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />
              <TextInput
                placeholder="Module Title"
                className="border border-gray-200 bg-white p-3 rounded-lg text-base mb-4 text-gray-800"
                value={module.title}
                onChangeText={(value) => updateModuleField(index, 'title', value)}
                placeholderTextColor="#999"
              />
              <TextInput
                placeholder="Module Description"
                className="border border-gray-200 bg-white p-3 rounded-lg text-base mb-4 text-gray-800 min-h-[80px]"
                value={module.description}
                onChangeText={(value) => updateModuleField(index, 'description', value)}
                multiline
                numberOfLines={2}
                placeholderTextColor="#999"
                textAlignVertical="top"
              />
            </View>
          ))}

          <Button
            text="Add Another Module"
            onPress={addModuleField}
            type="secondary"
            style="mt-1 mb-5"
          />
        </View>

        {/* Save Button */}
        <Button
          text="Save Certification"
          onPress={handleAddCertification}
          loading={loading}
          type="primary"
          style="mt-2"
        />

        {/* Bottom padding */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
// Path: app/editCertification/[id]/index.js
import "./../../../global.css"
import { View, Text, TextInput, Alert, ScrollView, ActivityIndicator, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '../../../constants/Colors';
import Button from '../../../components/Shared/Button';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  deleteDoc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { MaterialIcons } from '@expo/vector-icons';

export default function EditCertification() {
  const { id, certificationId } = useLocalSearchParams();
  const actualId = id || certificationId;

  const [certification, setCertification] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [moduleFields, setModuleFields] = useState([]);
  const [originalModuleIds, setOriginalModuleIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCertificationData = async () => {
      if (!actualId) {
        Alert.alert('Error', 'Certification ID is missing.');
        setLoading(false);
        router.back();
        return;
      }

      try {
        const certDocRef = doc(db, 'certifications', actualId);
        const certDocSnap = await getDoc(certDocRef);

        if (!certDocSnap.exists()) {
          Alert.alert('Error', 'Certification not found.');
          setLoading(false);
          router.back();
          return;
        }

        const certData = certDocSnap.data();
        setCertification(certData);
        setTitle(certData.title || '');
        setDescription(certData.description || '');
        setImage(certData.image || '');

        const modulesQuery = query(
          collection(db, 'modules'),
          where('certificationId', '==', actualId)
        );
        const modulesSnapshot = await getDocs(modulesQuery);

        // Log the raw data from Firebase for debugging
        console.log('Raw modules from Firebase:', modulesSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));

        const fetchedModules = modulesSnapshot.docs.map((doc, index) => {
          const data = doc.data();
          
          // Assign module number based on priority:
          let moduleNumber;
          if (typeof data.moduleNumber === 'number') {
            moduleNumber = data.moduleNumber;
          } else if (data.moduleNumber && !isNaN(parseInt(data.moduleNumber, 10))) {
            moduleNumber = parseInt(data.moduleNumber, 10);
          } else {
            moduleNumber = index + 1;
          }
          
          return {
            id: doc.id,
            ...data,
            moduleNumber: moduleNumber
          };
        });

        // Sort modules by module number
        fetchedModules.sort((a, b) => a.moduleNumber - b.moduleNumber);
        
        console.log('Processed modules after fetch:', fetchedModules);
        
        setModuleFields(fetchedModules);
        setOriginalModuleIds(fetchedModules.map(m => m.id));

      } catch (error) {
        console.error('Error fetching certification data:', error);
        Alert.alert('Error', 'Failed to fetch certification data.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchCertificationData();
  }, [actualId]);

  const addModuleField = () => {
    const tempId = `new_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const maxModuleNumber = moduleFields.reduce((max, module) =>
      Math.max(max, typeof module.moduleNumber === 'number' ? module.moduleNumber : 0), 0);
    const suggestedModuleNumber = maxModuleNumber + 1;

    setModuleFields([
      ...moduleFields,
      {
        id: tempId,
        title: '',
        description: '',
        moduleNumber: suggestedModuleNumber,
        isNew: true
      }
    ]);
  };

  const removeModuleField = (indexToRemove) => {
    setModuleFields(moduleFields.filter((_, index) => index !== indexToRemove));
  };

  const updateModuleField = (index, field, value) => {
    const updatedModules = [...moduleFields];
    if (field === 'moduleNumber') {
      // For module number, we need to ensure it's a number
      const numValue = value === '' ? '' : parseInt(value, 10);
      updatedModules[index][field] = numValue;
    } else {
      updatedModules[index][field] = value;
    }
    setModuleFields(updatedModules);
  };

  const handleUpdateCertification = async () => {
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

    // Fix any missing or invalid module numbers
    const processedModules = moduleFields.map((module, index) => {
      // If module number is missing, empty, or invalid, assign based on position
      let moduleNumber = module.moduleNumber;
      if (moduleNumber === '' || moduleNumber === undefined || isNaN(moduleNumber)) {
        moduleNumber = index + 1;
      } else if (typeof moduleNumber !== 'number') {
        moduleNumber = parseInt(moduleNumber, 10);
        if (isNaN(moduleNumber)) moduleNumber = index + 1;
      }
      
      return {
        ...module,
        moduleNumber: moduleNumber
      };
    });

    // Ensure all module numbers are unique
    const moduleNumbers = processedModules.map(m => m.moduleNumber);
    const uniqueModuleNumbers = new Set(moduleNumbers);
    
    if (uniqueModuleNumbers.size !== moduleNumbers.length) {
      // If we have duplicates, reassign all module numbers sequentially
      processedModules.forEach((module, index) => {
        module.moduleNumber = index + 1;
      });
    }

    console.log('Modules to save:', processedModules);

    if (processedModules.length === 0) {
      Alert.alert('Validation Error', 'A certification must have at least one module.');
      return;
    }

    setSaving(true);
    const batch = writeBatch(db);

    try {
      const certDocRef = doc(db, 'certifications', actualId);
      batch.update(certDocRef, {
        title: title.trim(),
        description: description.trim(),
        image: image.trim() || null,
      });

      const currentModuleFirestoreIds = new Set(processedModules.filter(m => !m.isNew).map(m => m.id));
      const modulesToDelete = originalModuleIds.filter(id => !currentModuleFirestoreIds.has(id));

      // Delete removed modules
      modulesToDelete.forEach(moduleId => {
        const moduleDocRef = doc(db, 'modules', moduleId);
        batch.delete(moduleDocRef);

        try {
          const certSubcollectionDocRef = doc(db, 'certifications', actualId, 'modules', moduleId);
          batch.delete(certSubcollectionDocRef);
        } catch (e) {
          console.warn("Could not delete module subcollection doc:", e);
        }
      });

      // Sort modules by moduleNumber for consistent ordering
      const sortedModules = [...processedModules].sort((a, b) => a.moduleNumber - b.moduleNumber);

      for (const module of sortedModules) {
        if (module.title.trim() !== '') {
          if (module.isNew) {
            // Handle new modules
            const newModuleRef = doc(collection(db, 'modules'));
            const newModuleId = newModuleRef.id;

            const newModuleData = {
              title: module.title.trim(),
              description: module.description.trim(),
              moduleNumber: module.moduleNumber,
              certificationId: actualId,
              questionCount: 0,
              createdAt: new Date(),
            };
            
            console.log(`Creating new module with id ${newModuleId}:`, newModuleData);
            batch.set(newModuleRef, newModuleData);

            const subCollectionData = {
              moduleId: newModuleId,
              title: module.title.trim(),
              moduleNumber: module.moduleNumber,
            };
            
            const certSubcollectionDocRef = doc(db, 'certifications', actualId, 'modules', newModuleId);
            batch.set(certSubcollectionDocRef, subCollectionData);
          } else {
            // Handle existing modules
            const moduleDocRef = doc(db, 'modules', module.id);
            
            const updateData = {
              title: module.title.trim(),
              description: module.description.trim(),
              moduleNumber: module.moduleNumber,
            };
            
            console.log(`Updating existing module ${module.id}:`, updateData);
            batch.update(moduleDocRef, updateData);

            try {
              const certSubcollectionDocRef = doc(db, 'certifications', actualId, 'modules', module.id);
              batch.update(certSubcollectionDocRef, {
                title: module.title.trim(),
                moduleNumber: module.moduleNumber,
              });
            } catch (e) {
              console.warn(`Could not update subcollection for module ${module.id}:`, e);
            }
          }
        }
      }

      // Update module count on certification
      batch.update(certDocRef, {
        moduleCount: sortedModules.filter(m => m.title.trim() !== '').length
      });

      // Commit all changes at once
      console.log('Committing batch update to Firebase...');
      await batch.commit();

      // We're now refreshing the data after successful save instead of navigating back
      Alert.alert('Success', 'Certification updated successfully!');
      
      // Refresh the module data after update
      setLoading(true);
      try {
        const certDocRef = doc(db, 'certifications', actualId);
        const certDocSnap = await getDoc(certDocRef);
        
        if (certDocSnap.exists()) {
          const certData = certDocSnap.data();
          setCertification(certData);
          setTitle(certData.title || '');
          setDescription(certData.description || '');
          setImage(certData.image || '');
          
          const modulesQuery = query(
            collection(db, 'modules'),
            where('certificationId', '==', actualId)
          );
          const modulesSnapshot = await getDocs(modulesQuery);
          
          const refreshedModules = modulesSnapshot.docs.map((doc) => {
            const data = doc.data();
            
            return {
              id: doc.id,
              ...data,
              moduleNumber: typeof data.moduleNumber === 'number' ? 
                data.moduleNumber : 
                (data.moduleNumber && !isNaN(parseInt(data.moduleNumber, 10)) ? 
                  parseInt(data.moduleNumber, 10) : 1)
            };
          });
          
          // Sort modules by module number
          refreshedModules.sort((a, b) => a.moduleNumber - b.moduleNumber);
          
          setModuleFields(refreshedModules);
          setOriginalModuleIds(refreshedModules.map(m => m.id));
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
        Alert.alert('Note', 'Changes saved but could not refresh data. Please reload the page.');
      } finally {
        setLoading(false);
      }

    } catch (error) {
      console.error('Error updating certification:', error);
      Alert.alert('Error', `Failed to update certification: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // --- Loading State UI ---
  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50 p-5">
        <ActivityIndicator size="large" color={Colors.PRIMARY || '#0066FF'} />
        <Text className="mt-4 text-base font-medium text-gray-600">Loading Certification Data...</Text>
      </SafeAreaView>
    );
  }

  // --- Error State UI (Certification not found or failed load) ---
  if (!certification && !loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50 p-5">
        <Text className="text-lg font-semibold text-red-500 mb-5 text-center">Could not load certification details.</Text>
        <TouchableOpacity 
          className="bg-blue-500 py-3 px-6 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white text-base font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Edit Certification UI ---
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="p-4 bg-gray-50 flex-grow">
        <Text className="text-2xl font-bold text-gray-800 mb-5 text-center">Edit Certification</Text>

        <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
          <Text className="text-xl font-semibold text-gray-800 mt-1 mb-4">Certification Details</Text>
          <TextInput
            placeholder="Certification Title"
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

        <View className="bg-white rounded-xl p-5 mb-5 shadow-sm">
          <Text className="text-xl font-semibold text-gray-800 mt-1 mb-4">Modules ({moduleFields.length})</Text>
          {moduleFields.map((module, index) => (
            <View key={module.id} className="border border-gray-300 bg-gray-50 rounded-lg p-4 mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-semibold text-gray-800">
                  Module {typeof module.moduleNumber === 'number' && !isNaN(module.moduleNumber)
                    ? module.moduleNumber
                    : index + 1} Details
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
                value={String(module.moduleNumber || '')}
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
            text={"Add New Module"}
            onPress={addModuleField}
            type="secondary"
            className="mt-1 mb-5"
          />
        </View>

        <Button
          text={"Save Changes"}
          onPress={handleUpdateCertification}
          loading={saving}
          type="primary"
          className="mt-2"
        />

        <View className="h-8" />

      </ScrollView>
    </SafeAreaView>
  );
}
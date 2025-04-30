// Path: app/editCertification/[id]/index.js

import { View, Text, TextInput, Alert, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
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
          // 1. Use existing moduleNumber if it's a number
          // 2. Try to parse moduleNumber if it's a string
          // 3. Fall back to the index position + 1 if all else fails
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
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY || '#0066FF'} />
        <Text style={styles.loadingText}>Loading Certification Data...</Text>
      </SafeAreaView>
    );
  }

  // --- Error State UI (Certification not found or failed load) ---
  if (!certification && !loading) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Could not load certification details.</Text>
        <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Edit Certification UI ---
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.heading}>Edit Certification</Text>

        <View style={styles.card}>
          <Text style={styles.subHeading}>Certification Details</Text>
          <TextInput
            placeholder='Certification Title'
            style={styles.TextInput}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />
          <TextInput
            placeholder='Short Description'
            style={[styles.TextInput, styles.descriptionInput]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
            textAlignVertical="top"
          />
          <TextInput
            placeholder='Image URL (optional)'
            style={styles.TextInput}
            value={image}
            onChangeText={setImage}
            placeholderTextColor="#999"
            keyboardType="url"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.subHeading}>Modules ({moduleFields.length})</Text>
          {moduleFields.map((module, index) => (
            <View key={module.id} style={styles.moduleContainer}>
              <View style={styles.moduleHeader}>
                <Text style={styles.moduleHeading}>
                  Module {typeof module.moduleNumber === 'number' && !isNaN(module.moduleNumber)
                    ? module.moduleNumber
                    : index + 1} Details
                </Text>
                {moduleFields.length > 1 && (
                  <TouchableOpacity onPress={() => removeModuleField(index)} style={styles.removeButton}>
                    <MaterialIcons name="remove-circle-outline" size={24} color={Colors.DANGER || 'red'} />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                placeholder='Module Number'
                style={styles.TextInput}
                value={String(module.moduleNumber || '')}
                onChangeText={(value) => updateModuleField(index, 'moduleNumber', value)}
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />
              <TextInput
                placeholder='Module Title'
                style={styles.TextInput}
                value={module.title}
                onChangeText={(value) => updateModuleField(index, 'title', value)}
                placeholderTextColor="#999"
              />
              <TextInput
                placeholder='Module Description'
                style={[styles.TextInput, styles.moduleDescriptionInput]}
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
            text={'Add New Module'}
            onPress={addModuleField}
            type='secondary'
            style={styles.addModuleButton}
          />
        </View>

        <Button
          text={'Save Changes'}
          onPress={handleUpdateCertification}
          loading={saving}
          type='primary'
          style={styles.saveButton}
        />

        <View style={{ height: 30 }} />

      </ScrollView>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.DANGER || 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
  goBackButton: {
    backgroundColor: Colors.PRIMARY || '#0066FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  goBackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollViewContent: {
    padding: 16,
    backgroundColor: '#F5F7FA',
    flexGrow: 1,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
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
  subHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 5,
    marginBottom: 15,
  },
  TextInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
  },
  descriptionInput: {
    minHeight: 80,
  },
  moduleDescriptionInput: {
    minHeight: 80,
  },
  moduleContainer: {
    borderWidth: 1,
    borderColor: '#D0D0D0',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  moduleHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  removeButton: {
    padding: 4,
  },
  addModuleButton: {
    marginTop: 5,
    marginBottom: 20,
  },
  saveButton: {
    marginTop: 10,
  }
});
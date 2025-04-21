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

        const fetchedModules = modulesSnapshot.docs.map(doc => ({
          id: doc.id,
          // Removed content field from fetch
          ...doc.data(),
          moduleNumber: parseInt(doc.data().moduleNumber, 10) || 0
        }));

        fetchedModules.sort((a, b) => a.moduleNumber - b.moduleNumber);

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
        // Removed content from new module state
        // content: '',
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
       const numberValue = value === '' ? '' : parseInt(value, 10);
       updatedModules[index][field] = numberValue;
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


    setSaving(true);
    const batch = writeBatch(db);

    try {
      const certDocRef = doc(db, 'certifications', actualId);
      batch.update(certDocRef, {
        title: title.trim(),
        description: description.trim(),
        image: image.trim() || null,
      });

      const currentModuleFirestoreIds = new Set(moduleFields.filter(m => !m.isNew).map(m => m.id));

      const modulesToDelete = originalModuleIds.filter(id => !currentModuleFirestoreIds.has(id));

      modulesToDelete.forEach(moduleId => {
        const moduleDocRef = doc(db, 'modules', moduleId);
        batch.delete(moduleDocRef);

        const certSubcollectionDocRef = doc(db, 'certifications', actualId, 'modules', moduleId);
         batch.delete(certSubcollectionDocRef).catch(e => console.warn("Could not delete module subcollection doc:", e));
      });

      const sortedModuleFields = [...moduleFields].sort((a, b) => {
           return (typeof a.moduleNumber === 'number' ? a.moduleNumber : Infinity) - (typeof b.moduleNumber === 'number' ? b.moduleNumber : Infinity);
       });

      for (const module of sortedModuleFields) {
         if (typeof module.moduleNumber === 'number' && module.moduleNumber > 0 && module.title.trim() !== '') {
            if (module.isNew) {
              const newModuleRef = doc(collection(db, 'modules'));
              const newModuleId = newModuleRef.id;

              batch.set(newModuleRef, {
                title: module.title.trim(),
                description: module.description.trim(),
                moduleNumber: module.moduleNumber,
                // Removed content field from new module save
                // content: module.content.trim() || '',
                certificationId: actualId,
                questionCount: 0,
                createdAt: new Date(),
              });

              const certSubcollectionDocRef = doc(db, 'certifications', actualId, 'modules', newModuleId);
              batch.set(certSubcollectionDocRef, {
                moduleId: newModuleId,
                title: module.title.trim(),
                moduleNumber: module.moduleNumber,
              });

            } else {
              const moduleDocRef = doc(db, 'modules', module.id);
              batch.update(moduleDocRef, {
                title: module.title.trim(),
                description: module.description.trim(),
                moduleNumber: module.moduleNumber,
                // Removed content field from existing module update
                // content: module.content.trim() || '',
              });

              const certSubcollectionDocRef = doc(db, 'certifications', actualId, 'modules', module.id);
              batch.update(certSubcollectionDocRef, {
                title: module.title.trim(),
                moduleNumber: module.moduleNumber,
              });
            }
         }
      }

      batch.update(certDocRef, {
        moduleCount: moduleFields.filter(m => typeof m.moduleNumber === 'number' && Number.isInteger(m.moduleNumber) && m.moduleNumber > 0 && m.title.trim() !== '').length
      });

      await batch.commit();

      Alert.alert('Success', 'Certification updated successfully!');
      router.back();

    } catch (error) {
      console.error('Error updating certification:', error);
      Alert.alert('Error', 'Failed to update certification.');
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
                        Module {typeof module.moduleNumber === 'number' && Number.isInteger(module.moduleNumber) && module.moduleNumber > 0
                           ? module.moduleNumber
                           : (module.moduleNumber === '' ? '(-)' : '(Invalid)')} Details
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
                    value={String(module.moduleNumber)}
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

                   {/* Removed Module Content Input */}
                   {/*
                  <TextInput
                    placeholder='Module Content (optional)'
                    style={[styles.TextInput, styles.contentInput]}
                    value={module.content}
                    onChangeText={(value) => updateModuleField(index, 'content', value)}
                    multiline
                    numberOfLines={6}
                     placeholderTextColor="#999"
                     textAlignVertical="top"
                  />
                  */}
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
   // Removed contentInput style
   // contentInput: {
   //    minHeight: 150,
   // },
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
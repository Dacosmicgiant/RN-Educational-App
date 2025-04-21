// Path: app/editCertification/[id]/index.js

import { View, Text, TextInput, Alert, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router'; // Updated to use expo-router
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
  // Use useLocalSearchParams to get the ID from the dynamic route
  const { id, certificationId } = useLocalSearchParams();
  const actualId = id || certificationId; // Use whichever is available

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
        return;
      }

      try {
        // Fetch certification details
        const certDocRef = doc(db, 'certifications', actualId);
        const certDocSnap = await getDoc(certDocRef);

        if (!certDocSnap.exists()) {
          Alert.alert('Error', 'Certification not found.');
          setLoading(false);
          return;
        }

        const certData = certDocSnap.data();
        setCertification(certData);
        setTitle(certData.title || '');
        setDescription(certData.description || '');
        setImage(certData.image || '');

        // Fetch modules associated with this certification
        const modulesQuery = query(
          collection(db, 'modules'),
          where('certificationId', '==', actualId)
        );
        const modulesSnapshot = await getDocs(modulesQuery);

        const fetchedModules = modulesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          moduleNumber: parseInt(doc.data().moduleNumber, 10) || 0
        }));

        // Sort modules by moduleNumber
        fetchedModules.sort((a, b) => a.moduleNumber - b.moduleNumber);

        setModuleFields(fetchedModules);
        setOriginalModuleIds(fetchedModules.map(m => m.id));

      } catch (error) {
        console.error('Error fetching certification data:', error);
        Alert.alert('Error', 'Failed to fetch certification data.');
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
      { id: tempId, title: '', description: '', moduleNumber: suggestedModuleNumber, isNew: true }
    ]);
  };

  const removeModuleField = (indexToRemove) => {
    setModuleFields(moduleFields.filter((_, index) => index !== indexToRemove));
  };

  const updateModuleField = (index, field, value) => {
    const updatedModules = [...moduleFields];
    if (field === 'moduleNumber') {
      const numberValue = parseInt(value, 10);
      updatedModules[index][field] = numberValue;
    } else {
      updatedModules[index][field] = value;
    }
    setModuleFields(updatedModules);
  };

  const handleUpdateCertification = async () => {
    if (!title || !description) {
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
    const invalidModuleNumbers = moduleFields.filter(module => {
      const num = module.moduleNumber;
      const isValid = typeof num === 'number' && Number.isInteger(num) && num > 0;
      if (isValid) {
        moduleNumbers.push(num);
      }
      return !isValid;
    });

    if (invalidModuleNumbers.length > 0) {
      Alert.alert('Validation Error', 'All module numbers must be valid positive integers.');
      return;
    }

    const uniqueModuleNumbers = new Set(moduleNumbers);
    if (uniqueModuleNumbers.size !== moduleNumbers.length) {
      Alert.alert('Validation Error', 'All module numbers must be unique.');
      return;
    }

    setSaving(true);
    const batch = writeBatch(db);

    try {
      // Update the main certification document
      const certDocRef = doc(db, 'certifications', actualId);
      batch.update(certDocRef, {
        title,
        description,
        image: image || null,
      });

      // Handle module updates, additions, and deletions
      const currentModuleTempAndFirestoreIds = new Set(moduleFields.map(m => m.id));

      // Identify modules to delete
      const modulesToDelete = originalModuleIds.filter(id => !currentModuleTempAndFirestoreIds.has(id));

      modulesToDelete.forEach(moduleId => {
        const moduleDocRef = doc(db, 'modules', moduleId);
        batch.delete(moduleDocRef);

        const certSubcollectionDocRef = doc(db, 'certifications', actualId, 'modules', moduleId);
        batch.delete(certSubcollectionDocRef);
      });

      // Sort modules by moduleNumber
      const sortedModuleFields = [...moduleFields].sort((a, b) => a.moduleNumber - b.moduleNumber);

      // Process modules for update or addition
      for (const module of sortedModuleFields) {
        if (module.id && module.id.startsWith('new_')) {
          // New module
          const newModuleRef = doc(collection(db, 'modules'));
          const newModuleId = newModuleRef.id;

          batch.set(newModuleRef, {
            title: module.title,
            description: module.description,
            moduleNumber: module.moduleNumber,
            certificationId: actualId,
            questionCount: 0,
            createdAt: new Date(),
          });

          // Add to certification's subcollection
          const certSubcollectionDocRef = doc(db, 'certifications', actualId, 'modules', newModuleId);
          batch.set(certSubcollectionDocRef, {
            moduleId: newModuleId,
            title: module.title,
            moduleNumber: module.moduleNumber,
          });
        } else if (module.id) {
          // Existing module - update it
          const moduleDocRef = doc(db, 'modules', module.id);
          batch.update(moduleDocRef, {
            title: module.title,
            description: module.description,
            moduleNumber: module.moduleNumber,
          });

          // Update in certification's subcollection
          const certSubcollectionDocRef = doc(db, 'certifications', actualId, 'modules', module.id);
          batch.update(certSubcollectionDocRef, {
            title: module.title,
            moduleNumber: module.moduleNumber,
          });
        }
      }

      // Update module count
      batch.update(certDocRef, {
        moduleCount: moduleFields.length
      });

      // Commit all changes
      await batch.commit();

      Alert.alert('Success', 'Certification updated successfully!');
      router.back(); // Navigate back using Expo Router

    } catch (error) {
      console.error('Error updating certification:', error);
      Alert.alert('Error', 'Failed to update certification.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text style={styles.loadingText}>Loading Certification Data...</Text>
      </View>
    );
  }

  if (!certification) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Could not load certification details.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{
      padding: 25,
      backgroundColor: Colors.WHITE,
      flexGrow: 1,
    }}>
      <Text style={styles.heading}>Edit Certification</Text>

      <Text style={styles.subHeading}>Certification Details</Text>
      <TextInput
        placeholder='Certification Title'
        style={styles.TextInput}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        placeholder='Short Description'
        style={styles.TextInput}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />
      <TextInput
        placeholder='Image URL (optional)'
        style={styles.TextInput}
        value={image}
        onChangeText={setImage}
      />

      <Text style={styles.subHeading}>Modules ({moduleFields.length})</Text>
      {moduleFields.map((module, index) => (
        <View key={module.id} style={styles.moduleContainer}>
          <View style={styles.moduleHeader}>
            <Text style={styles.moduleHeading}>Module Details</Text>
            <TouchableOpacity onPress={() => removeModuleField(index)} style={styles.removeButton}>
              <MaterialIcons name="remove-circle-outline" size={24} color={Colors.DANGER || 'red'} />
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder='Module Number'
            style={styles.TextInput}
            value={isNaN(module.moduleNumber) ? '' : String(module.moduleNumber)}
            onChangeText={(value) => updateModuleField(index, 'moduleNumber', value)}
            keyboardType="number-pad"
          />
          <TextInput
            placeholder='Module Title'
            style={styles.TextInput}
            value={module.title}
            onChangeText={(value) => updateModuleField(index, 'title', value)}
          />
          <TextInput
            placeholder='Module Description'
            style={styles.TextInput}
            value={module.description}
            onChangeText={(value) => updateModuleField(index, 'description', value)}
            multiline
            numberOfLines={2}
          />
        </View>
      ))}

      <Button
        text={'Add New Module'}
        onPress={addModuleField}
        type='secondary'
        style={styles.addModuleButton}
      />

      <Button
        text={'Save Changes'}
        onPress={handleUpdateCertification}
        loading={saving}
        type='primary'
        style={styles.saveButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    padding: 20,
  },
  loadingContainer: {
    // specific styles if needed
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'winky',
    color: Colors.GRAY,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'winky-bold',
    color: Colors.DANGER, // Assuming you have a DANGER color
  },
  heading: {
    fontFamily: 'winky-bold',
    fontSize: 28,
    marginBottom: 20,
  },
  subHeading: {
    fontFamily: 'winky-bold',
    fontSize: 20,
    marginTop: 10,
    marginBottom: 10,
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
  moduleContainer: {
    borderWidth: 1,
    borderColor: Colors.GRAY,
    borderRadius: 10,
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
    fontFamily: 'winky-bold',
    fontSize: 18,
  },
  removeButton: {
    padding: 5,
  },
  addModuleButton: {
    marginBottom: 20,
  },
  saveButton: {
    marginBottom: 40,
  }
});
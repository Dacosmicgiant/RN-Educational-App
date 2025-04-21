import { View, Text, TextInput, Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import Colors from '../../constants/Colors';
import Button from '../../components/Shared/Button';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { MaterialIcons } from '@expo/vector-icons';

export default function AddCertification() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  // Initialize with one module, with all required fields
  const [moduleFields, setModuleFields] = useState([
    { 
      title: '', 
      description: '', 
      moduleNumber: 1,
      content: '' // New field for module content
    }
  ]);
  const [loading, setLoading] = useState(false);

  const addModuleField = () => {
    // Suggest the next available module number (max current + 1)
    const maxModuleNumber = moduleFields.reduce((max, module) =>
        Math.max(max, typeof module.moduleNumber === 'number' ? module.moduleNumber : 0), 0);
    const suggestedModuleNumber = maxModuleNumber + 1;

    setModuleFields([
      ...moduleFields,
      { 
        title: '', 
        description: '', 
        moduleNumber: suggestedModuleNumber,
        content: '' // Initialize new field empty
      }
    ]);
  };

  const removeModuleField = (indexToRemove) => {
    setModuleFields(moduleFields.filter((_, index) => index !== indexToRemove));
  };

  const updateModuleField = (index, field, value) => {
    const updatedModules = [...moduleFields];
    if (field === 'moduleNumber') {
      // Parse the input value as an integer
      const numberValue = parseInt(value, 10);
      // Store the parsed number (will be NaN if invalid input)
      updatedModules[index][field] = numberValue;
    } else {
      updatedModules[index][field] = value;
    }
    setModuleFields(updatedModules);
  };

  const handleAddCertification = async () => {
    if (!title || !description) {
      Alert.alert('Validation Error', 'Please fill all required certification fields.');
      return;
    }

    // Validate that all modules have titles and descriptions
    const invalidModuleFields = moduleFields.filter(
      module => module.title.trim() === '' || module.description.trim() === ''
    );

    if (invalidModuleFields.length > 0) {
      Alert.alert('Validation Error', 'All modules must have titles and descriptions.');
      return;
    }

    // Validate that module numbers are valid positive integers and unique
    const moduleNumbers = [];
    const invalidModuleNumbers = moduleFields.filter(module => {
        const num = module.moduleNumber;
        const isValid = typeof num === 'number' && Number.isInteger(num) && num > 0;
        if(isValid) {
            moduleNumbers.push(num);
        }
        return !isValid;
    });

    if (invalidModuleNumbers.length > 0) {
      Alert.alert('Validation Error', 'All module numbers must be valid positive integers.');
      return;
    }

    // Check uniqueness among the valid numbers
    const uniqueModuleNumbers = new Set(moduleNumbers);
    if (uniqueModuleNumbers.size !== moduleNumbers.length) {
        Alert.alert('Validation Error', 'All module numbers must be unique.');
        return;
    }

    setLoading(true);

    try {
      // Create a new certification document
      const certificationRef = await addDoc(collection(db, 'certifications'), {
        title,
        description,
        image: image || null,
        createdAt: new Date(),
        moduleCount: moduleFields.length
      });

      // Sort modules by moduleNumber before saving
      const sortedModules = [...moduleFields].sort((a, b) => a.moduleNumber - b.moduleNumber);

      const modulePromises = sortedModules.map(async (module) => {
        const moduleRef = await addDoc(collection(db, 'modules'), {
          title: module.title,
          description: module.description,
          moduleNumber: module.moduleNumber,
          content: module.content, // Save the new content field
          certificationId: certificationRef.id,
          questionCount: 0,
          createdAt: new Date()
        });

        // Store module info in certification's modules subcollection
        await setDoc(doc(db, 'certifications', certificationRef.id, 'modules', moduleRef.id), {
          moduleId: moduleRef.id,
          title: module.title,
          moduleNumber: module.moduleNumber,
        });

        return moduleRef;
      });

      await Promise.all(modulePromises);

      Alert.alert('Success', 'Certification and modules added successfully!');

      // Reset form
      setTitle('');
      setDescription('');
      setImage('');
      setModuleFields([{ 
        title: '', 
        description: '', 
        moduleNumber: 1,
        content: '' 
      }]);
    } catch (error) {
      console.error('Error adding certification:', error);
      Alert.alert('Error', 'Failed to add certification and modules.');
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
      <Text style={styles.heading}>Add New Certification</Text>

      <Text style={styles.subHeading}>Certification Details</Text>
      <TextInput
        placeholder='Certification Title (e.g., Python, CPT)'
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

      <Text style={styles.subHeading}>Modules</Text>
      {moduleFields.map((module, index) => (
        <View key={index} style={styles.moduleContainer}>
          <View style={styles.moduleHeader}>
            <Text style={styles.moduleHeading}>
              Module {typeof module.moduleNumber === 'number' && Number.isInteger(module.moduleNumber) && module.moduleNumber > 0 
                ? module.moduleNumber 
                : 'Details'}
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
          
          {/* New field for module content */}
          <TextInput
            placeholder='Module Content'
            style={[styles.TextInput, styles.contentInput]}
            value={module.content}
            onChangeText={(value) => updateModuleField(index, 'content', value)}
            multiline
            numberOfLines={4}
          />
        </View>
      ))}

      <Button
        text={'Add Another Module'}
        onPress={addModuleField}
        type='secondary'
        style={styles.addModuleButton}
      />

      <Button
        text={'Save Certification'}
        onPress={handleAddCertification}
        loading={loading}
        type='primary'
        style={styles.saveButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  contentInput: {
    minHeight: 100, // Make content input larger
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
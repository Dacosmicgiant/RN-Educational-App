import { View, Text, TextInput, Alert, ScrollView } from 'react-native';
import React, { useState } from 'react';
import Colors from '../../constants/Colors';
import { StyleSheet } from 'react-native';
import Button from '../../components/Shared/Button';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

export default function AddCertification() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [moduleFields, setModuleFields] = useState([{ title: '', description: '' }]);
  const [loading, setLoading] = useState(false);

  const addModuleField = () => {
    setModuleFields([...moduleFields, { title: '', description: '' }]);
  };

  const updateModuleField = (index, field, value) => {
    const updatedModules = [...moduleFields];
    updatedModules[index][field] = value;
    setModuleFields(updatedModules);
  };

  const handleAddCertification = async () => {
    if (!title || !description) {
      Alert.alert('Validation Error', 'Please fill all required fields.');
      return;
    }

    // Validate that all modules have titles and descriptions
    const invalidModules = moduleFields.filter(
      module => module.title.trim() === '' || module.description.trim() === ''
    );
    
    if (invalidModules.length > 0) {
      Alert.alert('Validation Error', 'All modules must have titles and descriptions.');
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

      // Create modules with references to the certification
      const modulePromises = moduleFields.map(async (module) => {
        const moduleRef = await addDoc(collection(db, 'modules'), {
          title: module.title,
          description: module.description,
          certificationId: certificationRef.id, // Reference to parent certification
          questionCount: 0,
          createdAt: new Date()
        });

        // Also store the module ID in the certification's modules subcollection for easy retrieval
        await setDoc(doc(db, 'certifications', certificationRef.id, 'modules', moduleRef.id), {
          moduleId: moduleRef.id,
          title: module.title
        });

        return moduleRef;
      });

      await Promise.all(modulePromises);

      Alert.alert('Success', 'Certification and modules added successfully!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setImage('');
      setModuleFields([{ title: '', description: '' }]);
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
          <Text style={styles.moduleHeading}>Module {index + 1}</Text>
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
  moduleContainer: {
    borderWidth: 1,
    borderColor: Colors.GRAY,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  moduleHeading: {
    fontFamily: 'winky-bold',
    fontSize: 18,
    marginBottom: 10,
  },
  addModuleButton: {
    marginBottom: 20,
  },
  saveButton: {
    marginBottom: 40,
  }
});
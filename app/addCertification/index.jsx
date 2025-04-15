import { View, Text, TextInput, Alert, ScrollView } from 'react-native';
import React, { useState } from 'react';
import Colors from '../../constants/Colors';
import { StyleSheet } from 'react-native';
import Button from '../../components/Shared/Button';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

export default function AddCertification() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [modules, setModules] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddCertification = async () => {
    if (!title || !description || !image || !modules) {
      Alert.alert('Validation Error', 'Please fill all fields.');
      return;
    }

    setLoading(true);

    try {
      const modulesArray = modules.split(',').map(item => item.trim());

      const certificationData = {
        title,
        description,
        image,
        modules: modulesArray,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'certifications'), certificationData);

      Alert.alert('Success', 'Certification added successfully!');
      setTitle('');
      setDescription('');
      setImage('');
      setModules('');
    } catch (error) {
      console.error('Error adding certification:', error);
      Alert.alert('Error', 'Failed to add certification.');
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
        placeholder='Image URL'
        style={styles.TextInput}
        value={image}
        onChangeText={setImage}
      />
      <TextInput
        placeholder='Modules (comma-separated)'
        style={styles.TextInput}
        value={modules}
        onChangeText={setModules}
        multiline
      />

      <Button
        text={'Add Certification'}
        onPress={handleAddCertification}
        loading={loading}
        type='primary'
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
  TextInput: {
    borderWidth: 1,
    borderColor: Colors.GRAY,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    fontFamily: 'winky',
  },
});

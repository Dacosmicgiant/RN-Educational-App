import { View, Text, TextInput, Alert, ScrollView, StyleSheet, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import React, { useState } from 'react'; // No useEffect needed in this specific snippet for fetches
import Colors from '../../constants/Colors';
import Button from '../../components/Shared/Button'; // Assuming this is a custom Button component
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig'; // Ensure this path is correct
import { MaterialIcons } from '@expo/vector-icons'; // Assuming you use Expo vector icons

export default function AddCertification() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  // Initialize with one module field
  const [moduleFields, setModuleFields] = useState([{ title: '', description: '', moduleNumber: 1 }]);
  const [loading, setLoading] = useState(false);

  const addModuleField = () => {
    // Suggest the next available module number (max current + 1)
    const maxModuleNumber = moduleFields.reduce((max, module) =>
        Math.max(max, typeof module.moduleNumber === 'number' ? module.moduleNumber : 0), 0);
    const suggestedModuleNumber = maxModuleNumber + 1;

    setModuleFields([
      ...moduleFields,
      { title: '', description: '', moduleNumber: suggestedModuleNumber }
    ]);
  };

    const removeModuleField = (indexToRemove) => {
      // Keep only modules whose index is not the one to remove
      setModuleFields(moduleFields.filter((_, index) => index !== indexToRemove));
    };

  const updateModuleField = (index, field, value) => {
    const updatedModules = [...moduleFields];
    if (field === 'moduleNumber') {
      // Parse the input value as an integer, allow empty string temporarily
      const numberValue = value === '' ? '' : parseInt(value, 10);
      // Store the parsed number (will be NaN if invalid non-empty input)
      updatedModules[index][field] = numberValue;
    } else {
        updatedModules[index][field] = value;
    }
    setModuleFields(updatedModules);
  };

  const handleAddCertification = async () => {
      // Basic validation
    if (!title.trim() || !description.trim()) { // Added trim() for validation
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
       let validationError = null;

       moduleFields.forEach((module) => {
           const num = module.moduleNumber;
           const isValid = num === '' || (typeof num === 'number' && Number.isInteger(num) && num > 0);

           if (!isValid) {
                validationError = 'All module numbers must be valid positive integers.';
                return; // Exit forEach early on first error type
           }
           if (num !== '') { // Only push valid numbers for uniqueness check
                moduleNumbers.push(num);
           }
       });

        if (validationError) {
            Alert.alert('Validation Error', validationError);
            return;
        }

       // Check uniqueness among the valid numbers
       const uniqueModuleNumbers = new Set(moduleNumbers);
       if (uniqueModuleNumbers.size !== moduleNumbers.length) {
           Alert.alert('Validation Error', 'All module numbers must be unique.');
           return;
       }

        // Final check: ensure there is at least one module field added
        if (moduleFields.length === 0) {
             Alert.alert('Validation Error', 'A certification must have at least one module.');
             return;
        }


    setLoading(true);

    try {
      // Create a new certification document
      const certificationRef = await addDoc(collection(db, 'certifications'), {
        title: title.trim(), // Trim whitespace
        description: description.trim(), // Trim whitespace
        image: image.trim() || null, // Use trimmed image URL, or null if empty
        createdAt: new Date(),
        moduleCount: moduleFields.length // Store the initial count
      });

      // Create modules with references to the certification
      // Sort modules by moduleNumber before saving
       const sortedModules = [...moduleFields].sort((a, b) => {
            // Handle potential empty strings during sorting - should be caught by validation
            return (typeof a.moduleNumber === 'number' ? a.moduleNumber : Infinity) - (typeof b.moduleNumber === 'number' ? b.moduleNumber : Infinity);
       });


       const modulePromises = sortedModules.map(async (module) => {
           // Only save modules that have a valid number and title (already validated)
          if (typeof module.moduleNumber === 'number' && module.moduleNumber > 0 && module.title.trim() !== '') {
              const moduleRef = await addDoc(collection(db, 'modules'), {
                title: module.title.trim(),
                description: module.description.trim(),
                moduleNumber: module.moduleNumber, // Save the user-specified module number
                certificationId: certificationRef.id, // Reference to parent certification
                questionCount: 0, // Assuming 0 questions initially
                createdAt: new Date()
              });

              // Also store the module ID and number in the certification's modules subcollection
              // Using setDoc to control the document ID in the subcollection if needed, or addDoc for auto-ID
              await setDoc(doc(db, 'certifications', certificationRef.id, 'modules', moduleRef.id), {
                 moduleId: moduleRef.id,
                 title: module.title.trim(),
                 moduleNumber: module.moduleNumber, // Save the module number here too
               });

               return moduleRef;
           }
           return null; // Return null for modules that weren't valid/saved
       });

       // Wait for all valid module saves to complete
       await Promise.all(modulePromises);


      Alert.alert('Success', 'Certification and modules added successfully!');

      // Reset form
      setTitle('');
      setDescription('');
      setImage('');
      setModuleFields([{ title: '', description: '', moduleNumber: 1 }]); // Reset with one initial module
    } catch (error) {
      console.error('Error adding certification:', error);
      Alert.alert('Error', 'Failed to add certification and modules.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.heading}>Add New Certification</Text>

        {/* --- Certification Details Card --- */}
        <View style={styles.card}>
          <Text style={styles.subHeading}>Certification Details</Text>
          <TextInput
            placeholder='Certification Title (e.g., Python, CPT)'
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
            textAlignVertical="top" // Align text to top on Android
          />
          <TextInput
            placeholder='Image URL (optional)'
            style={styles.TextInput}
            value={image}
            onChangeText={setImage}
            placeholderTextColor="#999"
            keyboardType="url" // Hint keyboard type
          />
        </View>

        {/* --- Modules Section Card --- */}
        <View style={styles.card}>
          <Text style={styles.subHeading}>Modules ({moduleFields.length})</Text>
          {moduleFields.map((module, index) => (
            // --- Individual Module Container ---
            <View key={index} style={styles.moduleContainer}>
              <View style={styles.moduleHeader}>
                {/* Fix: Using Text component to wrap the string */}
                <Text style={styles.moduleHeading}>
                  Module {
                    typeof module.moduleNumber === 'number' && Number.isInteger(module.moduleNumber) && module.moduleNumber > 0
                      ? module.moduleNumber
                      : module.moduleNumber === '' ? '(-)' : '(Invalid)'
                  } Details
                </Text>
                {/* Add remove button */}
                {moduleFields.length > 1 && (
                  <TouchableOpacity onPress={() => removeModuleField(index)} style={styles.removeButton}>
                    <MaterialIcons name="remove-circle-outline" size={24} color={Colors.DANGER || 'red'} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Input for Module Number */}
              <TextInput
                placeholder='Module Number'
                style={styles.TextInput}
                // Convert number (or NaN/empty) back to string for display. Use empty string for NaN/empty input.
                value={typeof module.moduleNumber === 'number' && !isNaN(module.moduleNumber) ? String(module.moduleNumber) : ''}
                onChangeText={(value) => updateModuleField(index, 'moduleNumber', value)}
                keyboardType="number-pad" // Restrict to numbers
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
                style={[styles.TextInput, styles.moduleDescriptionInput]} // Separate style if needed
                value={module.description}
                onChangeText={(value) => updateModuleField(index, 'description', value)}
                multiline
                numberOfLines={2}
                placeholderTextColor="#999"
                textAlignVertical="top" // Align text to top on Android
              />
            </View>
          ))}

          <Button
            text={'Add Another Module'}
            onPress={addModuleField}
            type='secondary' // Assuming type 'secondary' is styled differently in your Button component
            style={styles.addModuleButton}
          />
        </View>

        {/* --- Save Button --- */}
        <Button
          text={'Save Certification'}
          onPress={handleAddCertification}
          loading={loading}
          type='primary' // Assuming type 'primary' is styled in your Button component
          style={styles.saveButton}
        />

        {/* Added bottom padding */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Consistent light grey background
  },
  scrollViewContent: {
    padding: 16, // Consistent padding
    backgroundColor: '#F5F7FA',
    flexGrow: 1,
  },
  heading: {
    fontSize: 24, // Consistent size
    fontWeight: '700', // Consistent weight
    color: '#333', // Consistent color
    marginBottom: 20,
    textAlign: 'center', // Center heading
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    // Add subtle shadow
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
    fontSize: 20, // Consistent size
    fontWeight: '600', // Consistent weight
    color: '#333',
    marginTop: 5, // Space above subheading
    marginBottom: 15, // Space below subheading
  },
  TextInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0', // Consistent lighter border
    backgroundColor: '#FFFFFF', // Consistent white background
    padding: 12, // Consistent padding
    borderRadius: 8, // Consistent rounded corners
    fontSize: 16,
    marginBottom: 15,
    color: '#333', // Consistent text color
  },
  descriptionInput: {
    minHeight: 80, // Min height for multi-line description
    textAlignVertical: 'top', // Align text to top on Android
  },
  moduleDescriptionInput: { // Added specific style for module description if needed
    minHeight: 80,
    textAlignVertical: 'top',
  },
  moduleContainer: {
    borderWidth: 1,
    borderColor: '#D0D0D0', // Consistent slightly darker border for modules within the card
    backgroundColor: '#F8F8F8', // Consistent light grey background for modules
    borderRadius: 8, // Slightly less rounded than the main card
    padding: 15,
    marginBottom: 15,
  },
  moduleHeader: { // Added style for header
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10, // Space below header
  },
  moduleHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    // Removed marginBottom as it's handled by moduleHeader
  },
  removeButton: { // Style for the remove icon/button
    padding: 4, // Give it some touch padding
  },
  addModuleButton: {
    marginTop: 5, // Space above button
    marginBottom: 20, // Space below button
  },
  saveButton: {
    marginTop: 10, // Space above button
    // marginBottom handled by ScrollView content padding
  }
});
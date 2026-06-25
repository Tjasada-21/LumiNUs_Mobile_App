import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Make sure this path matches where you saved the styles file!
import styles from '../styles/AddSkillsScreen.styles'; 

const AddSkillsScreen = ({ navigation }) => {
  const [skill, setSkill] = useState('Graphic Design');

  const handleSave = () => {
    // Add your save logic here for the LumiNUs database
    console.log("Saving skill:", skill);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.keyboardView} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="arrow-back" size={24} color="#FACC15" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add New Skill</Text>
          </View>

          <View style={styles.content}>
            {/* Form Section */}
            <View style={styles.formSection}>
              <Text style={styles.label}>Skill</Text>
              <TextInput
                style={styles.input}
                value={skill}
                onChangeText={setSkill}
                placeholder="Enter a skill"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              {/* User Reminders Card */}
              <View style={styles.reminderCard}>
                <Text style={styles.reminderTitle}>User Reminders:</Text>
                <Text style={styles.reminderText}>
                  You are required to fill-out this part. In case you are not employed, please select 'N/A' and save the form.
                </Text>
                <Text style={styles.reminderText}>
                  Your Job/Occupation information will be displayed once you've completed the initial account activation process. Failure to complete the process will limit you in accessing other LumiNUs modules.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.discardButton} 
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.discardButtonText}>Discard</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.saveButton} 
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default AddSkillsScreen;
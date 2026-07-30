import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/AddSkillsScreen.styles'; 
import supabase from '../services/supabase';
import { getCurrentUser } from '../services/supabaseAuth';
import { ThemedAlert } from '../components/ThemedAlert';

const AddSkillsScreen = ({ navigation }) => {
  const [skill, setSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSave = async () => {
    const trimmedSkill = skill.trim();
    
    if (!trimmedSkill) {
      ThemedAlert.alert("Missing Field", "Please enter a skill before saving.");
      return;
    }

    setSaving(true);
    try {
      const user = await getCurrentUser();
      if (!user?.id) throw new Error("No active session found.");

      // 1. Check for duplicates before inserting
      const { data: existingSkills, error: checkError } = await supabase
        .from('alumni_skills')
        .select('id')
        .eq('alumni_id', user.id)
        .ilike('skill_name', trimmedSkill);

      if (checkError) throw checkError;

      if (existingSkills && existingSkills.length > 0) {
        ThemedAlert.alert("Duplicate Skill", "You have already added this skill to your profile.");
        if (isMounted.current) setSaving(false);
        return;
      }

      // 2. Insert the new skill
      const { error: insertError } = await supabase
        .from('alumni_skills')
        .insert([{ 
          alumni_id: user.id, 
          skill_name: trimmedSkill 
        }]);

      if (insertError) throw insertError;

      // 3. Successfully saved, go back to profile. 
      // We skip setting saving to false here to avoid memory leak warnings since the screen is unmounting.
      navigation.goBack();
    } catch (error) {
      console.error("Error saving skill:", error);
      ThemedAlert.alert("Error", "Could not save your skill. Please try again.");
      if (isMounted.current) setSaving(false);
    }
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
                maxLength={40}
                placeholder="e.g. Graphic Design, JavaScript"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              {/* User Reminders Card */}
              <View style={styles.reminderCard}>
                <Text style={styles.reminderTitle}>User Reminders:</Text>
                <Text style={styles.reminderText}>
                  Add key technical and soft skills to showcase your expertise on your profile. Keep them brief and specific.
                </Text>
                <Text style={styles.reminderText}>
                  Keeping your skills updated helps you connect with other alumni in your field and discover relevant career opportunities within the LumiNUs network.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.discardButton} 
                  onPress={() => navigation.goBack()}
                  disabled={saving}
                >
                  <Text style={styles.discardButtonText}>Discard</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.saveButton} 
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#31429B" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
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
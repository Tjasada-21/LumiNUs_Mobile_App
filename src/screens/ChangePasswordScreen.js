import React, { useState } from 'react';
import { 
  View, Text, TouchableOpacity, 
  ActivityIndicator, ImageBackground, Image, Dimensions 
} from 'react-native';

import styles from '../styles/ChangePasswordScreen.styles';
import SmartTextInput from '../components/SmartTextInput';
import { Ionicons } from '@expo/vector-icons';
import { ThemedAlert } from '../components/ThemedAlert';
import supabase from '../services/supabase';

const ChangePasswordScreen = ({ navigation }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      ThemedAlert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (newPassword.length < 6) {
      ThemedAlert.alert('Weak Password', 'Your new password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      ThemedAlert.alert('Mismatch', 'The passwords do not match. Please try again.');
      return;
    }

    setLoading(true);

    try {
      // 1. Update the actual password in Supabase Auth
      const { data: userData, error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) throw authError;

      // 2. Extract the user's email to locate them in the alumni table
      const userEmail = userData?.user?.email;

      if (userEmail) {
        // 3. Flip the switch in the alumni table so they don't get trapped here
        const { error: dbError } = await supabase
          .from('alumnis')
          .update({ needs_password_change: false })
          .eq('email', userEmail);

        if (dbError) throw dbError;
      } else {
        throw new Error('Could not identify user email for profile update.');
      }

      ThemedAlert.alert('Account Secured!', 'Your permanent password has been set.');
      
      // Send the user to profile completion before entering the main app
      navigation.replace('CompleteProfile', {
        userId: userData?.user?.id,
      });
      
    } catch (error) {
      console.error('[ChangePasswordScreen] Update error:', error);
      ThemedAlert.alert('Update Failed', error.message || 'Could not update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/unnamed.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          
          <Image 
            source={require('../../assets/images/lumi-n-us-logo-landscape-2.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />

          <View style={styles.headerContainer}>
            <Text style={styles.welcomeTitle}>Welcome to LumiNUs!</Text>
            <Text style={styles.instructionText}>
              For your security, please set a permanent password for your account before continuing.
            </Text>
          </View>

          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordContainer}>
            <SmartTextInput
              style={styles.passwordInput}
              placeholder="Enter New Password"
              placeholderTextColor="#A0A0A0"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <SmartTextInput
              style={styles.passwordInput}
              placeholder="Re-enter New Password"
              placeholderTextColor="#A0A0A0"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
            >
              <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleUpdatePassword} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Secure Account & Login</Text>
            )}
          </TouchableOpacity>

        </View>
      </View>
    </ImageBackground>
  );
};

export default ChangePasswordScreen;
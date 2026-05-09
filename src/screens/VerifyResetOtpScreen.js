import React, { useState } from 'react';
import { 
  View, Text, TouchableOpacity, 
  useWindowDimensions, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../services/supabase'; 
import SmartTextInput from '../components/SmartTextInput';
import { ThemedAlert } from '../components/ThemedAlert';
import styles from '../styles/VerifyResetOtpScreen.styles';

const VerifyResetOtpScreen = ({ route, navigation }) => {
  // Grab the email passed from the ForgetPasswordScreen
  const { email } = route.params || {};

  // SECTION: Form state
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 48, 360);

  // HANDLER: Verify the code and set the new password
  const handleVerifyAndReset = async () => {
    if (!email) {
      ThemedAlert.alert('Session Error', 'Email is missing. Please restart the password reset process.');
      navigation.goBack();
      return;
    }

    if (!otpCode || !newPassword || !confirmPassword) {
      ThemedAlert.alert('Missing Fields', 'Please fill in all fields to continue.');
      return;
    }

    if (newPassword.length < 6) {
      ThemedAlert.alert('Weak Password', 'Your new password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      ThemedAlert.alert('Mismatch', 'Your new passwords do not match. Please try again.');
      return;
    }

    setLoading(true);

    try {
      // 1. Verify the 6-digit OTP code to securely authenticate the session
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email, 
        token: otpCode,
        type: 'recovery', 
      });

      if (otpError) throw otpError;

      // 2. Now that the user is securely verified, update their password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Success! Sign out to force re-auth and navigate to Login
      ThemedAlert.alert('Success!', 'Your password has been successfully reset. Please sign in with your new password.');
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.warn('[VerifyResetOtpScreen] SignOut Warning:', signOutErr);
      }
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      
    } catch (error) {
      console.error('[VerifyResetOtpScreen] Reset Error:', error);
      ThemedAlert.alert('Verification Failed', error.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.page}>
          <View style={[styles.content, { width: contentWidth }]}>
            <Text style={styles.title}>Secure Your Account</Text>
            <Text style={styles.subtitle}>
              Enter the 8-digit code sent to <Text style={{fontWeight: 'bold', color: '#31429B'}}>{email}</Text>
            </Text>

            {/* SECTION: OTP Code Field */}
            <Text style={styles.label}>8-Digit Verification Code</Text>
            <SmartTextInput
              style={styles.input}
              placeholder="Enter Code (e.g. 123456)"
              placeholderTextColor="#A0A0A0"
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={8}
              editable={!loading}
            />

            {/* SECTION: New Password Field */}
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

            {/* SECTION: Confirm Password Field */}
            <Text style={styles.label}>Confirm New Password</Text>
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

            {/* SECTION: Submit Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              activeOpacity={0.85}
              onPress={handleVerifyAndReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Verify & Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default VerifyResetOtpScreen;
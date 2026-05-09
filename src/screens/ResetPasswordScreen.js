import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandHeader from '../components/BrandHeader';
import api from '../services/api';
import styles from '../styles/ResetPasswordScreen.styles';
import { ThemedAlert } from '../components/ThemedAlert';

const ResetPasswordScreen = ({ navigation, route }) => {
  // SECTION: Layout values
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 48, 330);

  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  // SECTION: Restore preset student number
  useEffect(() => {
    const presetStudentNumber = route?.params?.student_id_number || '';

    if (presetStudentNumber) {
      setStudentIdNumber(presetStudentNumber);
    }
  }, [route?.params?.student_id_number]);

  // HANDLER: Submit the password reset form
  const handleResetPassword = async () => {
    const trimmedStudentNumber = studentIdNumber.trim();

    if (!trimmedStudentNumber || !password || !passwordConfirmation) {
      ThemedAlert.alert('Missing fields', 'Fill in all reset details before continuing.');
      return;
    }

    if (password !== passwordConfirmation) {
      ThemedAlert.alert('Password mismatch', 'The new passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/alumni/reset-password', {
        student_id_number: trimmedStudentNumber,
        password,
        password_confirmation: passwordConfirmation,
      });

      ThemedAlert.alert('Password Updated', response.data?.message || 'Your password has been updated successfully.');
      navigation.goBack();
    } catch (error) {
      const serverData = error.response?.data;
      let friendly = 'Failed to reset your password.';

      if (serverData?.errors) {
        const firstKey = Object.keys(serverData.errors)[0];
        friendly = serverData.errors[firstKey]?.[0] || friendly;
      } else if (serverData?.message) {
        friendly = serverData.message;
      } else if (error.message) {
        friendly = error.message;
      }

      ThemedAlert.alert('Reset Failed', friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* SECTION: Password reset form */}
      <View style={styles.page}>
        <BrandHeader />

        <View style={[styles.content, { width: contentWidth }]}>
          <View style={styles.iconWrap}>
            <View style={styles.lockTop} />
            <View style={styles.lockBody}>
              <Text style={styles.lockMark}>?</Text>
            </View>
          </View>

          <Text style={styles.title}>Reset Password</Text>

          <Text style={styles.label}>Enter Your New Password</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor="#A0A0A0"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Confirm Your New Password</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor="#A0A0A0"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Enter Your Student Number</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor="#A0A0A0"
            value={studentIdNumber}
            onChangeText={setStudentIdNumber}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            activeOpacity={0.85}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save New Password'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ResetPasswordScreen;

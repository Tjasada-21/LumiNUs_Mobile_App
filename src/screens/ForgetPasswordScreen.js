import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import supabase from "../services/supabase";
import styles from "../styles/ForgetPasswordScreen.styles";
import SmartTextInput from "../components/SmartTextInput";
import { ThemedAlert } from "../components/ThemedAlert";

const ForgetPasswordScreen = ({ navigation }) => {
  // SECTION: Form state
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 48, 360);
  const contentReveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentReveal, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [contentReveal]);

  // HANDLER: Request a reset email via Supabase OTP
  const handleSendEmail = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      ThemedAlert.alert(
        "Missing Email",
        "Enter your personal email address first.",
      );
      return;
    }

    setLoading(true);

    try {
      // Trigger the Supabase OTP email
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);

      if (error) {
        throw error;
      }

      // On success, alert the user and navigate to the OTP verification screen
      // We pass the email in the route parameters so the next screen knows who is verifying
      ThemedAlert.alert(
        "Code Sent",
        "Check your email for your 6-digit reset code.",
      );
      navigation.navigate("VerifyResetOtp", { email: trimmedEmail });
    } catch (error) {
      ThemedAlert.alert(
        "Reset Failed",
        error.message || "Unable to send the reset email.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION: Password reset form */}
          <View style={styles.page}>
            <Animated.View
              style={[
                styles.content,
                { width: contentWidth },
                {
                  opacity: contentReveal,
                  transform: [
                    {
                      translateY: contentReveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                    {
                      scale: contentReveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.988, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.iconWrap}>
                <View style={styles.lockTop} />
                <View style={styles.lockBody}>
                  <Text style={styles.questionMark}>?</Text>
                </View>
              </View>

              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                We'll email you a 6-digit code to reset your password.
              </Text>

              <Text style={styles.label}>Enter Your Personal Email</Text>
              <SmartTextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#A0A0A0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                activeOpacity={0.85}
                onPress={handleSendEmail}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Sending..." : "Send Code"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default ForgetPasswordScreen;

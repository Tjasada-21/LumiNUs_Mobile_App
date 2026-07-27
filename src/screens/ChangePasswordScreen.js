import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Image,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";

import styles from "../styles/ChangePasswordScreen.styles";
import SmartTextInput from "../components/SmartTextInput";
import { Ionicons } from "@expo/vector-icons";
import { ThemedAlert } from "../components/ThemedAlert";
import supabase from "../services/supabase";

const ChangePasswordScreen = ({ navigation }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const cardScrollViewRef = useRef(null);
  const outerScrollViewRef = useRef(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Listen for keyboard events to slide the modal up
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        const keyboardHeight = event.endCoordinates.height;
        setKeyboardHeight(keyboardHeight);
        
        // Animate modal sliding up
        Animated.timing(slideAnim, {
          toValue: -keyboardHeight * 0.3, // Slide up by 30% of keyboard height
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        
        // Animate modal back to original position
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [slideAnim]);

  // Password strength calculation
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    if (newPassword.length >= 6) strength++;
    if (newPassword.length >= 10) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) strength++;
    
    setPasswordStrength(Math.min(strength, 4));
  }, [newPassword]);

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 1: return "#FF6B6B";
      case 2: return "#FFB84D";
      case 3: return "#4CAF50";
      case 4: return "#00C853";
      default: return "#E8EAFF";
    }
  };

  const getPasswordStrengthLabel = () => {
    switch (passwordStrength) {
      case 1: return "Weak";
      case 2: return "Fair";
      case 3: return "Strong";
      case 4: return "Very Strong";
      default: return "";
    }
  };

  const shakeForm = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const passwordRequirements = [
    { label: "At least 6 characters", met: newPassword.length >= 6 },
    { label: "One uppercase letter", met: /[A-Z]/.test(newPassword) },
    { label: "One number", met: /[0-9]/.test(newPassword) },
    { label: "One special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
  ];

  const handleInputFocus = (inputType) => {
    setFocusedInput(inputType);
    
    // Scroll the inner card to the bottom where the inputs are
    setTimeout(() => {
      if (inputType === 'confirm') {
        cardScrollViewRef.current?.scrollToEnd({ animated: true });
      } else {
        // For password field, scroll to a position that shows both inputs
        cardScrollViewRef.current?.scrollTo({ y: 100, animated: true });
      }
    }, 100);
  };

  const handleUpdatePassword = async () => {
    Keyboard.dismiss();
    
    if (!newPassword || !confirmPassword) {
      ThemedAlert.alert("Missing Fields", "Please fill in all fields to continue.");
      shakeForm();
      return;
    }

    if (newPassword.length < 6) {
      ThemedAlert.alert(
        "Weak Password",
        "Your password must be at least 6 characters long for security purposes.",
      );
      shakeForm();
      return;
    }

    if (newPassword !== confirmPassword) {
      ThemedAlert.alert(
        "Password Mismatch",
        "The passwords you entered don't match. Please try again.",
      );
      shakeForm();
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: authError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (authError) throw authError;

      const userEmail = userData?.user?.email;

      if (userEmail) {
        const { error: dbError } = await supabase
          .from("alumnis")
          .update({ needs_password_change: false })
          .eq("email", userEmail);

        if (dbError) throw dbError;
      } else {
        throw new Error("Could not identify user email for profile update.");
      }

      ThemedAlert.alert(
        "Account Secured! 🎉",
        "Your permanent password has been set. Let's complete your profile next.",
      );

      navigation.replace("CompleteProfile", {
        userId: userData?.user?.id,
      });
    } catch (error) {
      console.error("[ChangePasswordScreen] Update error:", error);
      ThemedAlert.alert(
        "Update Failed",
        error.message || "Unable to update your password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/unnamed.png")}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <ScrollView
            ref={outerScrollViewRef}
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Animated.View 
              style={[
                styles.cardContainer, 
                { 
                  opacity: fadeAnim,
                  transform: [
                    { translateX: shakeAnimation },
                    { translateY: slideAnim }  // Slide animation for keyboard
                  ] 
                }
              ]}
            >
              {/* Inner ScrollView for card content with border radius */}
              <ScrollView
                ref={cardScrollViewRef}
                style={styles.cardScrollView}
                contentContainerStyle={styles.cardContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                nestedScrollEnabled={true}
              >
                {/* Logo */}
                <View style={styles.logoContainer}>
                  <Image
                    source={require("../../assets/images/LumiNUs Logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>

                {/* Header Section */}
                <View style={styles.headerSection}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="lock-closed" size={28} color="#32418C" />
                  </View>
                  
                  <Text style={styles.title}>Secure Your Account</Text>
                  <Text style={styles.subtitle}>
                    Welcome to LumiNUs! Set your permanent password to protect your alumni account.
                  </Text>
                </View>

                {/* Form Section */}
                <View style={styles.formSection}>
                  {/* New Password Input */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Text style={styles.label}>New Password</Text>
                    </View>
                    <View style={[
                      styles.inputWrapper,
                      focusedInput === 'password' && styles.inputWrapperFocused
                    ]}>
                      <SmartTextInput
                        style={styles.passwordInput}
                        placeholder="Create a strong password"
                        placeholderTextColor="#C0C4D0"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                        editable={!loading}
                        onFocus={() => handleInputFocus('password')}
                        onBlur={() => setFocusedInput(null)}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color="#A0AABF"
                        />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Password Strength Indicator */}
                    {newPassword.length > 0 && (
                      <>
                        <View style={styles.strengthIndicator}>
                          {[1, 2, 3, 4].map((level) => (
                            <View
                              key={level}
                              style={[
                                styles.strengthBar,
                                {
                                  backgroundColor: level <= passwordStrength 
                                    ? getPasswordStrengthColor() 
                                    : '#E8EAFF'
                                }
                              ]}
                            />
                          ))}
                        </View>
                        <Text style={[
                          styles.strengthText,
                          { color: getPasswordStrengthColor() }
                        ]}>
                          {getPasswordStrengthLabel()}
                        </Text>
                      </>
                    )}
                  </View>

                  {/* Confirm Password Input */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelContainer}>
                      <Text style={styles.label}>Confirm Password</Text>
                    </View>
                    <View style={[
                      styles.inputWrapper,
                      focusedInput === 'confirm' && styles.inputWrapperFocused
                    ]}>
                      <SmartTextInput
                        style={styles.passwordInput}
                        placeholder="Re-enter your password"
                        placeholderTextColor="#C0C4D0"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        editable={!loading}
                        onFocus={() => handleInputFocus('confirm')}
                        onBlur={() => setFocusedInput(null)}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={loading}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color="#A0AABF"
                        />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Match Indicator */}
                    {confirmPassword.length > 0 && (
                      <View style={styles.matchIndicator}>
                        <Ionicons 
                          name={newPassword === confirmPassword ? "checkmark-circle" : "close-circle"} 
                          size={12} 
                          color={newPassword === confirmPassword ? "#4CAF50" : "#FF6B6B"} 
                        />
                        <Text style={[
                          styles.matchText, 
                          { color: newPassword === confirmPassword ? "#4CAF50" : "#FF6B6B" }
                        ]}>
                          {newPassword === confirmPassword ? "Passwords match" : "Passwords don't match"}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Password Requirements */}
                  <View style={styles.requirementsContainer}>
                    <Text style={styles.requirementsTitle}>
                      Password Requirements
                    </Text>
                    {passwordRequirements.map((req, index) => (
                      <View key={index} style={styles.requirementRow}>
                        <Ionicons 
                          name={req.met ? "checkmark-circle" : "ellipse-outline"} 
                          size={14} 
                          color={req.met ? "#4CAF50" : "#C0C4D0"} 
                        />
                        <Text style={[
                          styles.requirementText,
                          req.met && { color: "#4CAF50" }
                        ]}>
                          {req.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[
                      styles.button, 
                      loading && styles.buttonDisabled,
                    ]}
                    onPress={handleUpdatePassword}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <View style={styles.buttonContent}>
                      {loading ? (
                        <ActivityIndicator color="#32418C" size="small" />
                      ) : (
                        <>
                          <Ionicons name="shield-checkmark" size={18} color="#32418C" />
                          <Text style={[
                            styles.buttonText,
                            loading && styles.buttonTextDisabled
                          ]}>
                            Secure Account & Continue
                          </Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>

                  <Text style={styles.footerText}>
                    🔒 Your security is our priority
                  </Text>
                </View>
              </ScrollView>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
};

export default ChangePasswordScreen;
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Image,
  Animated,
} from "react-native";
import SmartTextInput from "../components/SmartTextInput";
import { Ionicons } from "@expo/vector-icons";
import { signInUser, getCurrentUser } from "../services/supabaseAuth";
import { getAlumniByEmail } from "../services/alumniQueries";
import supabase from "../services/supabase";
import styles from "../styles/LoginScreen.styles";
import { useUnreadMessages } from "../context/UnreadMessagesContext";

import { ThemedAlert } from "../components/ThemedAlert";

const LoginScreen = ({ navigation }) => {
  // SECTION: Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { refreshUnreadMessages } = useUnreadMessages();
  const cardReveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(cardReveal, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [cardReveal]);

  // SECTION: Restore saved login
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const activeProfile = await getAlumniByEmail(
            String(user.email || "")
              .trim()
              .toLowerCase(),
          );

          if (activeProfile) {
            const accountStatus = Number(activeProfile.account_status);

            if (accountStatus === 2) {
              await supabase.auth.signOut();
              ThemedAlert.alert(
                "Account Disabled",
                "You previously disabled this account. Please contact the Alumni Office to restore your access.",
              );
              return;
            }

            if (accountStatus === 3) {
              await supabase.auth.signOut();
              ThemedAlert.alert(
                "Account Suspended",
                "This account has been banned for violating the terms of service. Access is permanently revoked.",
              );
              return;
            }
          }

          if (user.needs_password_change) {
            navigation.replace("ChangePassword");
            return;
          }

          // User has an active session, navigate to home
          navigation.replace("Home");
        }
      } catch (error) {
        console.warn("[LoginScreen] No active session");
      }
    };

    restoreSession();
  }, [navigation]);

  // HANDLER: Submit the login form
  const handleLogin = async () => {
    if (!email || !password) {
      ThemedAlert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = String(email).trim().toLowerCase();

      // Sign in with Supabase
      const { user } = await signInUser(normalizedEmail, password);

      if (!user) {
        throw new Error("Login failed: No user returned");
      }

      // Get alumni profile from Supabase
      const alumniProfile = await getAlumniByEmail(normalizedEmail);

      if (alumniProfile) {
        const accountStatus = Number(alumniProfile.account_status);

        if (accountStatus === 2) {
          await supabase.auth.signOut();
          ThemedAlert.alert(
            "Account Disabled",
            "You previously disabled this account. Please contact the Alumni Office to restore your access.",
          );
          return;
        }

        if (accountStatus === 3) {
          await supabase.auth.signOut();
          ThemedAlert.alert(
            "Account Suspended",
            "This account has been banned for violating the terms of service. Access is permanently revoked.",
          );
          return;
        }
      }

      if (normalizedEmail) {
        await supabase
          .from("alumnis")
          .update({ is_online: true })
          .eq("email", normalizedEmail);
      }

      if (alumniProfile) {
        ThemedAlert.alert(
          "Success!",
          `Welcome back, ${alumniProfile.first_name}!`,
        );
      } else {
        ThemedAlert.alert("Success!", "Logged in successfully!");
      }

      if (alumniProfile?.needs_password_change) {
        navigation.replace("ChangePassword");
        return;
      }

      await refreshUnreadMessages();
      navigation.replace("Home");
    } catch (error) {
      const errMsg = error?.message || "";
      if (!errMsg.includes("Invalid login credentials")) {
        console.error("[LoginScreen] Login error:", error);
      }

      let friendlyMessage = "Failed to log in. Please check your credentials.";

      if (errMsg.includes("Invalid login credentials")) {
        friendlyMessage = "Invalid email or password.";
      } else if (errMsg.includes("Email not confirmed")) {
        friendlyMessage = "Please verify your email before logging in.";
      } else if (errMsg) {
        friendlyMessage = errMsg;
      }

      ThemedAlert.alert("Login Failed", friendlyMessage);
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
      {/* SECTION: Login card */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: cardReveal,
            transform: [
              {
                translateY: cardReveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
              {
                scale: cardReveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.985, 1],
                }),
              },
            ],
          },
        ]}
      >
        {/* SECTION: Logo */}
        <Image
          source={require("../../assets/images/lumi-n-us-logo-landscape-2.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* SECTION: Email field */}
        <Text style={styles.label}>Email Address</Text>
        <SmartTextInput
          style={styles.input}
          placeholder="Enter Your Email Address"
          placeholderTextColor="#A0A0A0"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        {/* SECTION: Password field */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <SmartTextInput
            style={styles.passwordInput}
            placeholder="Enter Your Password"
            placeholderTextColor="#A0A0A0"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
            disabled={loading}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {/* SECTION: Login options */}
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.rememberContainer}
            onPress={() => setRememberMe(!rememberMe)}
            disabled={loading}
          >
            <View
              style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
            >
              {rememberMe && (
                <Ionicons name="checkmark" size={14} color="#31429B" />
              )}
            </View>
            <Text style={styles.optionText}>Remember Me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("ForgetPassword")}
            disabled={loading}
          >
            <Text style={styles.optionText}>Forget Password?</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION: Submit button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#31429B" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </ImageBackground>
  );
};

export default LoginScreen;

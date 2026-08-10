import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  Image,
  Animated,
  Linking,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import supabase from "../services/supabase";
import styles from "../styles/RestrictedScreen.styles";

const { width, height } = Dimensions.get("window");

const RestrictedScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { email, reason } = route?.params || {};
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContactSupport = () => {
    const emailAddress = "alumniaffairs@nu-lipa.edu.ph";
    const subject = "Account Restriction Inquiry";
    const body = `Hello NU Lipa Alumni Affairs Office,%0D%0A%0D%0AI am trying to access my LumiNUs account but it appears to be restricted.%0D%0A%0D%0AMy registered email is: ${email || 'Not provided'}%0D%0A%0D%0APlease help me resolve this issue.%0D%0A%0D%0AThank you!`;
    
    Linking.openURL(`mailto:${emailAddress}?subject=${subject}&body=${body}`).catch(() => {
      // Fallback: Open email client without subject/body
      Linking.openURL(`mailto:${emailAddress}`);
    });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (error) {
      console.error("[RestrictedScreen] Logout error:", error);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/unnamed.png")}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="#32418C" />
      
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconWrapper}>
                <Ionicons name="lock-closed" size={48} color="#32418C" />
              </View>
            </View>

            {/* <Text style={{ 
            fontFamily: "Poppins-Black",
            fontSize: 32,
            color: "#32418C",
            marginBottom: 12,
            textAlign: "center",
            letterSpacing: -1,
            }}>
            Account Restricted
            </Text> */}

            <Text style={styles.title}>
              Account Restricted
            </Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              Your LumiNUs alumni account has been temporarily restricted.
            </Text>

            {/* Message Card */}
            <View style={styles.messageCard}>
              <Ionicons name="information-circle" size={24} color="#3b82f6" />
              <Text style={styles.messageText}>
                {reason || "Your account has been restricted by the NU Lipa Alumni Affairs Office."}
              </Text>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="bulb-outline" size={20} color="#d97706" />
              <Text style={styles.infoText}>
                If you believe this is a mistake or need assistance, please contact the NU Lipa Alumni Affairs Office.
              </Text>
            </View>

            {/* Contact Button */}
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContactSupport}
              activeOpacity={0.8}
            >
              <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>Contact Alumni Affairs</Text>
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={20} color="#6B7280" />
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </TouchableOpacity>

            {/* Footer */}
            <Text style={styles.footerText}>
              NU Lipa Alumni Affairs Office
            </Text>
          </ScrollView>
        </Animated.View>
      </View>
    </ImageBackground>
  );
};

export default RestrictedScreen;
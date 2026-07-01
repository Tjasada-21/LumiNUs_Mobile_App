import React from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../services/supabase";
import styles from "../styles/SettingsScreen.styles";

const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const goTo = (screenName) => {
    navigation.navigate(screenName);
  };

  const handleContactUs = async () => {
    const email = "expo@luminus.app";
    const subject = encodeURIComponent("LumiNUs Support");
    const body = encodeURIComponent("Hi LumiNUs team,\n\nI need help with:");
    const url = `mailto:${email}?subject=${subject}&body=${body}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    } catch (error) {
      // Fall through to the alert below.
    }

    Alert.alert("Contact Us", "Please email expo@luminus.app for support.");
  };

  const handleLogout = async () => {
    try {
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        // Continue to reset the navigation state even if sign-out fails locally.
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
    } catch (error) {
      Alert.alert("Logout failed", "Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + insets.bottom }]}
        >
          <View style={styles.headerCard}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
              <Ionicons name="arrow-back" size={34} color="#31429B" />
            </Pressable>
            <Text style={styles.headerTitle}>Account Settings</Text>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Account & Security</Text>
            <View style={styles.menuCard}>
              <MenuRow label="Account" onPress={() => goTo("AccountSettings")} />
              <MenuRow label="Change Password" icon="lock-closed-outline" onPress={() => goTo("ChangePassword")} />
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Notification</Text>
            <View style={styles.menuCard}>
              <MenuRow label="Notifications" icon="notifications-outline" onPress={() => goTo("NotificationsScreen")} />
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>More</Text>
            <View style={styles.menuCard}>
              <MenuRow label="Contact Us" icon="help-circle-outline" onPress={handleContactUs} />
              <MenuRow label="Logout" icon="log-out-outline" onPress={handleLogout} />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}> 
          <Image
            source={require("../../assets/images/LumiNUs Logo white.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const MenuRow = ({ label, icon, onPress }) => {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowLeft}>
        {icon ? (
          <Ionicons name={icon} size={34} color="#000000" style={styles.rowIcon} />
        ) : (
          <View style={styles.iconSpacer} />
        )}
        <Text style={[styles.rowLabel, !icon && styles.rowLabelWithoutIcon]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={28} color="#000000" />
    </Pressable>
  );
};

export default SettingsScreen;
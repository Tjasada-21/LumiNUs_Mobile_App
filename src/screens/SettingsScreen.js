import React, { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  Modal,
  Switch,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../services/supabase";
import styles from "../styles/SettingsScreen.styles";

const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // --- MODAL STATES ---
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // --- NOTIFICATION STATES ---
  const [notifs, setNotifs] = useState({
    announcement: true,
    events: true,
    perks: true,
    feed: true,
    messages: true,
  });

  const toggleNotif = (key) => {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // --- PASSWORD STATES ---
  const [passwords, setPasswords] = useState({ new: "", confirm: "" });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      } catch (signOutError) {}

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

  const handleSavePassword = () => {
    // Implement your password save logic here
    if (passwords.new !== passwords.confirm) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }
    Alert.alert("Success", "Password updated successfully!");
    setShowPasswordModal(false);
    setPasswords({ new: "", confirm: "" });
  };

  const handleSaveNotifs = () => {
    // Implement your notification preference save logic here
    Alert.alert("Success", "Notification preferences updated!");
    setShowNotifModal(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        
        {/* CUSTOM WHITE HEADER */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#31429B" />
            </Pressable>
            <Text style={styles.headerTitle}>Account Settings</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        >
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Account & Security</Text>
            <View style={styles.menuCard}>
              <MenuRow label="Account" onPress={() => goTo("AccountSettings")} />
              <MenuRow 
                label="Change Password" 
                icon="lock-closed-outline" 
                onPress={() => setShowPasswordModal(true)} 
              />
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Notification</Text>
            <View style={styles.menuCard}>
              <MenuRow 
                label="Notifications" 
                icon="notifications-outline" 
                onPress={() => setShowNotifModal(true)} 
              />
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

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 0) }]}> 
          <Image
            source={require("../../assets/images/LumiNUs Logo white.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* --- NOTIFICATIONS MODAL --- */}
      <Modal visible={showNotifModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNotifModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowNotifModal(false)} hitSlop={12}>
              <Ionicons name="arrow-back" size={28} color="#31429B" />
            </Pressable>
            <Text style={styles.modalTitle}>Notifications</Text>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.notifCard}>
              <NotifToggle label="Announcement Notification" value={notifs.announcement} onValueChange={() => toggleNotif("announcement")} />
              <NotifToggle label="Events Notification" value={notifs.events} onValueChange={() => toggleNotif("events")} />
              <NotifToggle label="Perks & Discount Notification" value={notifs.perks} onValueChange={() => toggleNotif("perks")} />
              <NotifToggle label="Feed Notification" value={notifs.feed} onValueChange={() => toggleNotif("feed")} />
              <NotifToggle label="Messages Notification" value={notifs.messages} onValueChange={() => toggleNotif("messages")} />
            </View>
          </View>

          <View style={[styles.modalBottomWrap, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleSaveNotifs} activeOpacity={0.8}>
              <Text style={styles.modalPrimaryButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* --- CHANGE PASSWORD MODAL --- */}
      <Modal visible={showPasswordModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPasswordModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowPasswordModal(false)} hitSlop={12}>
              <Ionicons name="arrow-back" size={28} color="#31429B" />
            </Pressable>
            <Text style={styles.modalTitle}>Change Password</Text>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputBoxContainer}>
                <TextInput
                  style={styles.inputBox}
                  secureTextEntry={!showNewPassword}
                  value={passwords.new}
                  onChangeText={(val) => setPasswords((p) => ({ ...p, new: val }))}
                />
                <Pressable onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon} hitSlop={10}>
                  <Ionicons name={showNewPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#1C1C1E" />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.inputBoxContainer}>
                <TextInput
                  style={styles.inputBox}
                  secureTextEntry={!showConfirmPassword}
                  value={passwords.confirm}
                  onChangeText={(val) => setPasswords((p) => ({ ...p, confirm: val }))}
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon} hitSlop={10}>
                  <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#1C1C1E" />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={[styles.modalBottomWrap, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleSavePassword} activeOpacity={0.8}>
              <Text style={styles.modalPrimaryButtonText}>Save New Password</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

// Sub-components
const MenuRow = ({ label, icon, onPress }) => {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowLeft}>
        {icon ? (
          <Ionicons name={icon} size={22} color="#1C1C1E" style={styles.rowIcon} />
        ) : (
          <View style={styles.iconSpacer} />
        )}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#1C1C1E" />
    </Pressable>
  );
};

const NotifToggle = ({ label, value, onValueChange }) => {
  return (
    <View style={styles.notifRow}>
      <Text style={styles.notifLabel}>{label}</Text>
      <Switch 
        value={value} 
        onValueChange={onValueChange} 
        trackColor={{ false: "#E2E8F0", true: "#1C1C1E" }}
        thumbColor={"#FFFFFF"}
        ios_backgroundColor="#E2E8F0"
      />
    </View>
  );
};

export default SettingsScreen;
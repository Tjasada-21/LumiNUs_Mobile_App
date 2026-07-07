import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import styles from "../styles/WorkExperienceFormScreen.styles";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
import { ThemedAlert } from "../components/ThemedAlert";

// --- CUSTOM DROPDOWN COMPONENT ---
const CustomDropdown = ({ label, value, options, onSelect, placeholder }) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Pressable
        style={[styles.textInput, { justifyContent: "center" }]}
        onPress={() => setModalVisible(true)}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: value ? "#1C1C1E" : "#94A3B8", fontSize: 14 }}>
            {value || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#94A3B8" />
        </View>
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable 
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }} 
          onPress={() => setModalVisible(false)}
        >
          <View style={{ backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "50%" }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1C1C1E" }}>Select {label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 15, color: value === item ? "#31429B" : "#1C1C1E", fontWeight: value === item ? "bold" : "normal" }}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

// --- OPTIONS LISTS ---
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship", "Self-employed"];
const REGIONS = ["NCR", "CAR", "Ilocos Region", "Cagayan Valley", "Central Luzon", "CALABARZON", "MIMAROPA", "Bicol Region", "Western Visayas", "Central Visayas", "Eastern Visayas", "Zamboanga Peninsula", "Northern Mindanao", "Davao Region", "SOCCSKSARGEN", "Caraga", "BARMM"];
const PROVINCES = ["Batangas", "Cavite", "Laguna", "Rizal", "Quezon", "Metro Manila", "Cebu", "Davao del Sur", "Pampanga", "Bulacan", "Iloilo"]; // Simplified generic list
const CITIES = ["Lipa City", "Batangas City", "Tanauan City", "Manila", "Quezon City", "Makati", "Taguig", "Cebu City", "Davao City", "Calamba", "Santa Rosa"]; // Simplified generic list

const WorkExperienceFormScreen = ({ navigation }) => {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [countryType, setCountryType] = useState("local");
  const [abroadCountry, setAbroadCountry] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [startMonth, setStartMonth] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [endYear, setEndYear] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const getMonthNumber = (monthName) => {
    const index = MONTHS.indexOf(monthName);
    return index >= 0 ? String(index + 1).padStart(2, "0") : "01";
  };

  const handleSave = async () => {
    if (!jobTitle.trim() || !company.trim() || !startMonth || !startYear) {
      ThemedAlert.alert("Missing Fields", "Please fill in the Job Title, Company, and Start Date.");
      return;
    }

    if (!isCurrent && (!endMonth || !endYear)) {
      ThemedAlert.alert("Missing Fields", "Please provide an End Date or check 'I currently work here'.");
      return;
    }

    setSaving(true);
    try {
      const user = await getCurrentUser();
      if (!user?.id) throw new Error("User session not found.");

      // Format location
      let locationString = "";
      if (countryType === "local") {
        locationString = [city, province, region, "Philippines"].filter(Boolean).join(", ");
      } else {
        locationString = abroadCountry.trim();
      }

      // Format Dates
      const startDateStr = `${startYear}-${getMonthNumber(startMonth)}-01`;
      let endDateStr = null;
      if (!isCurrent) {
        endDateStr = `${endYear}-${getMonthNumber(endMonth)}-01`;
      }

      // Format Title to include Employment Type if selected
      const finalJobTitle = employmentType ? `${jobTitle.trim()} (${employmentType})` : jobTitle.trim();

      const { error } = await supabase.from("alumni_employments").insert([
        {
          alumni_id: user.id,
          job_title: finalJobTitle,
          company: company.trim(),
          location: locationString,
          career_description: jobDescription.trim(),
          start_date: startDateStr,
          end_date: endDateStr,
          is_current: isCurrent,
        }
      ]);

      if (error) throw error;

      ThemedAlert.alert("Success", "Work experience added successfully.");
      navigation.goBack();
      
    } catch (error) {
      console.error("Save Work Experience Error:", error);
      ThemedAlert.alert("Error", "Could not save work experience. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={28} color="#FFD404" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Work Experience</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* SECTION 1: JOB INFORMATION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Job Title</Text>
              <TextInput
                style={styles.textInput}
                value={jobTitle}
                onChangeText={setJobTitle}
                placeholder="Enter Job Title"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Organization/Company</Text>
              <TextInput
                style={styles.textInput}
                value={company}
                onChangeText={setCompany}
                placeholder="Enter Organization/Company"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* SECTION 2: COMPANY INFORMATION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Information</Text>
            <Text style={styles.subSectionTitle}>Company Location</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Country</Text>

              <Pressable
                style={styles.radioRow}
                onPress={() => setCountryType("local")}
              >
                <Ionicons
                  name={
                    countryType === "local"
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={22}
                  color={countryType === "local" ? "#64748B" : "#94A3B8"}
                />
                <Text style={styles.radioText}>Local (Philippines)</Text>
              </Pressable>

              <Pressable
                style={styles.radioRow}
                onPress={() => setCountryType("abroad")}
              >
                <Ionicons
                  name={
                    countryType === "abroad"
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={22}
                  color={countryType === "abroad" ? "#64748B" : "#94A3B8"}
                />
                <Text style={styles.radioText}>Abroad</Text>
              </Pressable>

              {countryType === "abroad" && (
                <TextInput
                  style={styles.underlineInput}
                  value={abroadCountry}
                  onChangeText={setAbroadCountry}
                  placeholder="Enter the Country (If Abroad)"
                  placeholderTextColor="#94A3B8"
                />
              )}
            </View>

            {countryType === "local" && (
              <View style={styles.localFieldsContainer}>
                <Text style={styles.helperText}>
                  If Local is chosen, the fields below will appear:
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Region</Text>
                  <CustomDropdown 
                    label="Region"
                    value={region}
                    options={REGIONS}
                    onSelect={setRegion}
                    placeholder="Select Region"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Province</Text>
                  <CustomDropdown 
                    label="Province"
                    value={province}
                    options={PROVINCES}
                    onSelect={setProvince}
                    placeholder="Select Province"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>City/Municipality</Text>
                  <CustomDropdown 
                    label="City/Municipality"
                    value={city}
                    options={CITIES}
                    onSelect={setCity}
                    placeholder="Select City/Municipality"
                  />
                </View>
              </View>
            )}
          </View>

          {/* SECTION 3: OTHER DETAILS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Other Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Employment Type</Text>
              <CustomDropdown 
                label="Employment Type"
                value={employmentType}
                options={EMPLOYMENT_TYPES}
                onSelect={setEmploymentType}
                placeholder="Select Employment Type"
              />
            </View>

            <Pressable
              style={styles.checkboxRow}
              onPress={() => setIsCurrent(!isCurrent)}
            >
              <View style={[styles.checkbox, isCurrent && styles.checkboxActive]}>
                {isCurrent && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxText}>I currently work here</Text>
            </Pressable>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Start Month</Text>
                <CustomDropdown 
                  label="Start Month"
                  value={startMonth}
                  options={MONTHS}
                  onSelect={setStartMonth}
                  placeholder="Month"
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>Start Year</Text>
                <TextInput
                  style={styles.textInput}
                  value={startYear}
                  onChangeText={setStartYear}
                  placeholder="YYYY"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
            </View>

            {!isCurrent && (
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>End Month</Text>
                  <CustomDropdown 
                    label="End Month"
                    value={endMonth}
                    options={MONTHS}
                    onSelect={setEndMonth}
                    placeholder="Month"
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.label}>End Year</Text>
                  <TextInput
                    style={styles.textInput}
                    value={endYear}
                    onChangeText={setEndYear}
                    placeholder="YYYY"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>
            )}

            <View style={[styles.inputGroup, { marginTop: 10 }]}>
              <Text style={styles.label}>Job Description</Text>
              <TextInput
                style={styles.textArea}
                value={jobDescription}
                onChangeText={setJobDescription}
                placeholder="Briefly describe your role and responsibilities..."
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* USER REMINDERS CARD */}
          <View style={styles.reminderCard}>
            <Text style={styles.reminderTitle}>User Reminders:</Text>
            <Text style={styles.reminderText}>
              You are required to fill-out this part. In case you are not employed, please
              select 'N/A' and save the form.
            </Text>
            <Text style={styles.reminderText}>
              Your Job/Occupation information will be displayed once you've completed
              the initial account activation process. Failure to complete the process will
              limit you in accessing other LumiNUs modules.
            </Text>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.discardButton} 
              activeOpacity={0.8}
              onPress={() => navigation.goBack()}
              disabled={saving}
            >
              <Text style={styles.discardButtonText}>Discard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveButton} 
              activeOpacity={0.8}
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

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default WorkExperienceFormScreen;
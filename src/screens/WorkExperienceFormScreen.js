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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import styles from "../styles/WorkExperienceFormScreen.styles";

const WorkExperienceFormScreen = ({ navigation }) => {
  // Pre-filled with values from the mockup for accurate visualization
  const [jobTitle, setJobTitle] = useState("Dela Cruz");
  const [company, setCompany] = useState("Juan Miguel");
  const [countryType, setCountryType] = useState("local"); // 'local' or 'abroad'
  const [abroadCountry, setAbroadCountry] = useState("");
  const [region, setRegion] = useState("CALABARZON");
  const [province, setProvince] = useState("Batangas");
  const [city, setCity] = useState("Lipa City");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [isCurrent, setIsCurrent] = useState(false);
  const [startMonth, setStartMonth] = useState("March");
  const [startYear, setStartYear] = useState("2023");
  const [endMonth, setEndMonth] = useState("August");
  const [endYear, setEndYear] = useState("2025");
  const [jobDescription, setJobDescription] = useState(
    "I am currently a Software Engineer at Microsoft specializing in mobile development. During my stay at NU Lipa, I served as an active student leader and truly fell in love with building intuitive tech that solves complex real-world problems! ☕✨"
  );

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
                  <TextInput
                    style={styles.textInput}
                    value={region}
                    onChangeText={setRegion}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Province</Text>
                  <TextInput
                    style={styles.textInput}
                    value={province}
                    onChangeText={setProvince}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>City/Municipality</Text>
                  <TextInput
                    style={styles.textInput}
                    value={city}
                    onChangeText={setCity}
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
              <TextInput
                style={styles.textInput}
                value={employmentType}
                onChangeText={setEmploymentType}
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
                <TextInput
                  style={styles.textInput}
                  value={startMonth}
                  onChangeText={setStartMonth}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.label}>Start Year</Text>
                <TextInput
                  style={styles.textInput}
                  value={startYear}
                  onChangeText={setStartYear}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {!isCurrent && (
              <>
                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <Text style={styles.label}>End Month</Text>
                    <TextInput
                      style={styles.textInput}
                      value={endMonth}
                      onChangeText={setEndMonth}
                    />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.label}>End Year</Text>
                    <TextInput
                      style={styles.textInput}
                      value={endYear}
                      onChangeText={setEndYear}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <Text style={styles.italicHelperText}>
                  Di dapat lalabas yung End Month and Year{"\n"}
                  if Naka-check yung "I currently work here."
                </Text>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Job Description</Text>
              <TextInput
                style={styles.textArea}
                value={jobDescription}
                onChangeText={setJobDescription}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.charCountText}>
                Maximum of 100 characters only.
              </Text>
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
            <TouchableOpacity style={styles.discardButton} activeOpacity={0.8}>
              <Text style={styles.discardButtonText}>Discard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.saveButton} activeOpacity={0.8}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default WorkExperienceFormScreen;
import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ImageBackground,
  Image,
  Animated,
  Keyboard,
  TextInput
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import * as DocumentPicker from "expo-document-picker";
import supabase from "../services/supabase";
import { ThemedAlert } from "../components/ThemedAlert";
import styles from "../styles/MentorshipScreen.styles";

// Reusable Dropdown component
const DropdownField = ({ label, value, placeholder, onPress, disabled, icon }) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TouchableOpacity
      style={[styles.dropdownButton, disabled && styles.dropdownButtonDisabled, value && styles.dropdownButtonActive]}
      onPress={onPress} disabled={disabled} activeOpacity={0.7}
    >
      {icon && <Ionicons name={icon} size={18} color={value ? "#32418C" : "#A0AABF"} style={{ marginRight: 10 }} />}
      <Text style={[styles.dropdownText, !value && styles.dropdownPlaceholder]} numberOfLines={1}>{value || placeholder}</Text>
      <Ionicons name="chevron-down" size={18} color="#32418C" />
    </TouchableOpacity>
  </View>
);

const formatDate = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const MentorshipScreen = ({ navigation }) => {
  // Step & UI State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [focusedInput, setFocusedInput] = useState(null);

  // Step 1 Form Data
  const [eventType, setEventType] = useState("");
  const [customEventType, setCustomEventType] = useState(""); 
  const [eventFormat, setEventFormat] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [expectedCapacity, setExpectedCapacity] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Step 2 Form Data
  const [coSpeakers, setCoSpeakers] = useState("");
  const [description, setDescription] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  
  // Modals visibility
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [formatPickerVisible, setFormatPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState({ visible: false, target: null });
  
  const [dateDraft, setDateDraft] = useState(new Date());
  const [calendarFocusDate, setCalendarFocusDate] = useState(new Date());

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardScrollViewRef = useRef(null);

  // Options
  const eventTypeOptions = useMemo(() => [
    { code: "seminar", name: "Seminar", icon: "easel-outline" },
    { code: "workshop", name: "Workshop", icon: "construct-outline" },
    { code: "orientation", name: "Orientation", icon: "people-outline" },
    { code: "other", name: "Other", icon: "bulb-outline" },
  ], []);

  const eventFormatOptions = useMemo(() => [
    { code: "online", name: "Online", icon: "laptop-outline" },
    { code: "onsite", name: "On-Site", icon: "business-outline" },
    { code: "hybrid", name: "Hybrid", icon: "git-merge-outline" },
  ], []);

  const timeOptions = useMemo(() => {
    const times = [];
    for (let i = 7; i <= 20; i++) {
      const hour = i > 12 ? i - 12 : i;
      const ampm = i >= 12 ? "PM" : "AM";
      times.push({ code: `${i}:00`, name: `${hour}:00 ${ampm}` });
      times.push({ code: `${i}:30`, name: `${hour}:30 ${ampm}` });
    }
    return times;
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const keyboardWillShowListener = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (event) => setKeyboardHeight(event.endCoordinates.height));
    const keyboardWillHideListener = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardHeight(0));
    return () => { keyboardWillShowListener.remove(); keyboardWillHideListener.remove(); };
  }, [fadeAnim]);

  const openDatePicker = () => {
    const nextDate = proposedDate ? new Date(proposedDate) : new Date();
    setDateDraft(!Number.isNaN(nextDate.getTime()) ? nextDate : new Date());
    setCalendarFocusDate(!Number.isNaN(nextDate.getTime()) ? nextDate : new Date());
    setDatePickerVisible(true);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        copyToCacheDirectory: true,
      });
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        setAttachedFile(result.assets[0]);
      }
    } catch (error) {
      ThemedAlert.alert("File Error", "Could not attach the file.");
    }
  };

  const handleNextStep = () => {
    if (!eventType || !eventFormat || !eventTitle || !proposedDate || !startTime || !endTime) {
      ThemedAlert.alert("Missing Info", "Please fill out all required fields marked with an asterisk (*).");
      return;
    }
    if (eventType === "Other" && !customEventType.trim()) {
      ThemedAlert.alert("Missing Info", "Please specify your custom event type.");
      return;
    }
    setStep(2);
    cardScrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft && (!description || description.length < 20)) {
      ThemedAlert.alert("Missing Info", "Please provide a detailed description (at least 20 characters) for your event.");
      return;
    }

    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userEmail = authData?.user?.email;
      let alumniId = null;
      if (userEmail) {
        const { data: alumniRow } = await supabase.from("alumnis").select("id").eq("email", userEmail).single();
        alumniId = alumniRow?.id;
      }
      if (!alumniId) throw new Error("Could not find user profile.");

      const finalEventType = eventType === "Other" ? customEventType.trim() : eventType;

      const attachedFileUrl = attachedFile ? attachedFile.uri : null; 

      const { error } = await supabase.from("mentorships").insert([{
        alumni_id: alumniId,
        event_type: finalEventType,
        event_format: eventFormat,
        event_title: eventTitle,
        target_audience: targetAudience,
        expected_capacity: expectedCapacity ? parseInt(expectedCapacity, 10) : null,
        proposed_date: proposedDate,
        start_time: startTime,
        end_time: endTime,
        co_speakers: coSpeakers,
        description: description,
        attached_file_url: attachedFileUrl,
        is_draft: isDraft,
      }]);

      if (error) throw error;

      if (isDraft) {
        ThemedAlert.alert("Draft Saved", "Your proposal has been saved to your drafts safely!");
        navigation.goBack();
      } else {
        setIsSuccess(true);
      }
    } catch (error) {
      console.error(error);
      ThemedAlert.alert("Error", error.message || "Failed to submit proposal.");
    } finally {
      setLoading(false);
    }
  };

  // --- SUCCESS SCREEN RENDER ---
  if (isSuccess) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F8F9FF", justifyContent: "center", alignItems: "center", padding: 30 }}>
        <Ionicons name="checkmark-circle" size={100} color="#32418C" style={{ marginBottom: 20 }} />
        <Text style={{ fontFamily: "Poppins-Bold", fontSize: 24, color: "#1A1A2E", textAlign: "center", marginBottom: 10 }}>Proposal Submitted!</Text>
        <Text style={{ fontFamily: "Poppins-Regular", fontSize: 15, color: "#666680", textAlign: "center", marginBottom: 40 }}>
          Thank you for offering your expertise to NU LIPA. Our Alumni Affairs admin will review your event details and contact you via email within 3-5 business days.
        </Text>
        <TouchableOpacity 
          style={[styles.button, { width: "100%", backgroundColor: "#32418C" }]} 
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: "#FFFFFF", fontFamily: "Poppins-Bold", fontSize: 16 }}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ImageBackground source={require("../../assets/images/unnamed.png")} style={styles.backgroundImage} resizeMode="cover">
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 20}>
            <ScrollView
              contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'android' && keyboardHeight > 0 ? keyboardHeight / 2 : 24 }]}
              keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}
            >
              <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
                <ScrollView ref={cardScrollViewRef} style={styles.cardScrollView} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
                  
                  <View style={styles.headerSection}>
                    <TouchableOpacity onPress={() => step === 2 ? setStep(1) : navigation.goBack()} style={styles.backButton}>
                      <Ionicons name="arrow-back" size={24} color="#32418C" />
                    </TouchableOpacity>
                    <View style={styles.iconContainer}><Ionicons name="megaphone-outline" size={28} color="#32418C" /></View>
                    <Text style={styles.title}>Propose an Event</Text>
                    <Text style={styles.subtitle}>Step {step} of 2: {step === 1 ? "Basic Details" : "Content & Objectives"}</Text>
                  </View>

                  {/* STEP 1: EVENT DETAILS */}
                  {step === 1 && (
                    <View style={styles.sectionContainer}>
                      <DropdownField label="Event Type *" value={eventType} placeholder="Select event type" icon="albums-outline" onPress={() => { Keyboard.dismiss(); setTypePickerVisible(true); }} disabled={loading} />
                      
                      {eventType === "Other" && (
                        <View style={[styles.fieldContainer, { marginTop: -4 }]}>
                          <Text style={[styles.fieldLabel, { fontSize: 13, color: "#666680" }]}>Please specify *</Text>
                          <TextInput style={[styles.input, focusedInput === 'customEventType' && styles.inputFocused]} placeholder="Enter your event type" placeholderTextColor="#A0AABF" value={customEventType} onChangeText={setCustomEventType} onFocus={() => setFocusedInput('customEventType')} onBlur={() => setFocusedInput(null)} />
                        </View>
                      )}

                      {eventType !== "" && (
                        <DropdownField label="Event Format *" value={eventFormat} placeholder="Select online, on-site, or hybrid" icon="location-outline" onPress={() => { Keyboard.dismiss(); setFormatPickerVisible(true); }} disabled={loading} />
                      )}

                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Event Title *</Text>
                        <TextInput style={[styles.input, focusedInput === 'title' && styles.inputFocused]} placeholder="e.g. Intro to UI/UX Design" placeholderTextColor="#A0AABF" value={eventTitle} onChangeText={setEventTitle} onFocus={() => setFocusedInput('title')} onBlur={() => setFocusedInput(null)} />
                      </View>

                      {/* Stacked Fields */}
                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Target Audience</Text>
                        <TextInput style={[styles.input, focusedInput === 'audience' && styles.inputFocused]} placeholder="e.g. IT Students" placeholderTextColor="#A0AABF" value={targetAudience} onChangeText={setTargetAudience} onFocus={() => setFocusedInput('audience')} onBlur={() => setFocusedInput(null)} />
                      </View>
                      
                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Expected Capacity</Text>
                        <TextInput style={[styles.input, focusedInput === 'capacity' && styles.inputFocused]} placeholder="e.g. 50" keyboardType="number-pad" placeholderTextColor="#A0AABF" value={expectedCapacity} onChangeText={setExpectedCapacity} onFocus={() => setFocusedInput('capacity')} onBlur={() => setFocusedInput(null)} />
                      </View>

                      <DropdownField label="Proposed Date *" value={proposedDate} placeholder="Select a date" icon="calendar-outline" onPress={() => { Keyboard.dismiss(); openDatePicker(); }} disabled={loading} />
                      
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                           <DropdownField label="Start Time *" value={startTime} placeholder="Start" icon="time-outline" onPress={() => { Keyboard.dismiss(); setTimePickerVisible({ visible: true, target: 'start' }); }} disabled={loading} />
                        </View>
                        <View style={{ flex: 1 }}>
                           <DropdownField label="End Time *" value={endTime} placeholder="End" icon="time-outline" onPress={() => { Keyboard.dismiss(); setTimePickerVisible({ visible: true, target: 'end' }); }} disabled={loading} />
                        </View>
                      </View>

                      <TouchableOpacity style={[styles.button, { marginTop: 15 }]} onPress={handleNextStep}>
                        <Text style={styles.buttonText}>Next Step</Text>
                        <Ionicons name="arrow-forward" size={18} color="#32418C" style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* STEP 2: CONTENT & FILES */}
                  {step === 2 && (
                    <View style={styles.sectionContainer}>
                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Co-Speakers (Optional)</Text>
                        <TextInput style={[styles.input, focusedInput === 'cospeakers' && styles.inputFocused]} placeholder="List any other alumni presenting with you" placeholderTextColor="#A0AABF" value={coSpeakers} onChangeText={setCoSpeakers} onFocus={() => setFocusedInput('cospeakers')} onBlur={() => setFocusedInput(null)} />
                      </View>

                      <View style={styles.fieldContainer}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                           <Text style={styles.fieldLabel}>Description & Objectives *</Text>
                           <Text style={[styles.fieldLabel, { color: description.length > 500 ? 'red' : '#A0AABF' }]}>{description.length}/500</Text>
                        </View>
                        <TextInput
                          style={[styles.input, styles.multilineInput, focusedInput === 'desc' && styles.inputFocused]}
                          placeholder="Briefly describe what the event is about and what attendees will learn..."
                          placeholderTextColor="#A0AABF" value={description} onChangeText={setDescription} maxLength={500} multiline numberOfLines={5}
                          onFocus={() => { setFocusedInput('desc'); setTimeout(() => cardScrollViewRef.current?.scrollToEnd({ animated: true }), 150); }}
                          onBlur={() => setFocusedInput(null)}
                        />
                      </View>

                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Attachment (Optional PDF/Slide Deck)</Text>
                        <TouchableOpacity style={[styles.dropdownButton, attachedFile && styles.dropdownButtonActive, { justifyContent: 'flex-start' }]} onPress={handlePickFile}>
                           <Ionicons name={attachedFile ? "document-text" : "cloud-upload-outline"} size={20} color={attachedFile ? "#32418C" : "#A0AABF"} style={{ marginRight: 10 }} />
                           <Text style={[styles.dropdownText, !attachedFile && styles.dropdownPlaceholder]} numberOfLines={1}>
                             {attachedFile ? attachedFile.name : "Tap to upload syllabus or slides"}
                           </Text>
                        </TouchableOpacity>
                        {attachedFile && (
                          <TouchableOpacity onPress={() => setAttachedFile(null)} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                             <Text style={{ fontSize: 12, color: 'red', fontFamily: "Poppins-Medium" }}>Remove File</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                        <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: "#F8F9FF", borderWidth: 1.5, borderColor: "#E8EAFF", shadowOpacity: 0, elevation: 0 }]} onPress={() => handleSubmit(true)} disabled={loading}>
                           <Text style={{ color: "#666680", fontSize: 14, fontFamily: "Poppins-SemiBold" }}>Save Draft</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, { flex: 2 }]} onPress={() => handleSubmit(false)} disabled={loading}>
                          {loading ? <ActivityIndicator color="#32418C" size="small" /> : <Text style={styles.buttonText}>Submit Proposal</Text>}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>

      {/* --- MODALS --- */}
      {/* Type Picker */}
      <Modal visible={typePickerVisible} transparent animationType="slide" onRequestClose={() => setTypePickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTypePickerVisible(false)}>
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Event Type</Text>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setTypePickerVisible(false)}>
                  <Ionicons name="close" size={18} color="#666680" />
                </TouchableOpacity>
              </View>
              <FlatList data={eventTypeOptions} keyExtractor={(item) => item.code} contentContainerStyle={styles.optionList} renderItem={({ item }) => (
                  <TouchableOpacity style={styles.optionRow} onPress={() => { setEventType(item.name); setTypePickerVisible(false); }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name={item.icon} size={18} color="#32418C" style={{ marginRight: 10 }} />
                      <Text style={styles.optionText}>{item.name}</Text>
                    </View>
                  </TouchableOpacity>
              )} />
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>

      {/* Format Picker */}
      <Modal visible={formatPickerVisible} transparent animationType="slide" onRequestClose={() => setFormatPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFormatPickerVisible(false)}>
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Event Format</Text>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setFormatPickerVisible(false)}>
                  <Ionicons name="close" size={18} color="#666680" />
                </TouchableOpacity>
              </View>
              <FlatList data={eventFormatOptions} keyExtractor={(item) => item.code} contentContainerStyle={styles.optionList} renderItem={({ item }) => (
                  <TouchableOpacity style={styles.optionRow} onPress={() => { setEventFormat(item.name); setFormatPickerVisible(false); }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name={item.icon} size={18} color="#32418C" style={{ marginRight: 10 }} />
                      <Text style={styles.optionText}>{item.name}</Text>
                    </View>
                  </TouchableOpacity>
              )} />
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>

      {/* Date Picker */}
      <Modal visible={datePickerVisible} transparent animationType="slide" onRequestClose={() => setDatePickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDatePickerVisible(false)}>
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <Pressable style={[styles.modalCard, { maxHeight: "85%", minHeight: "65%" }]} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Proposed Date</Text>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setDatePickerVisible(false)}><Ionicons name="close" size={18} color="#666680" /></TouchableOpacity>
              </View>
              <View style={{ width: "100%", marginBottom: 18, backgroundColor: "#F8F9FF", borderRadius: 12, padding: 8 }}>
                <Calendar key={formatDate(calendarFocusDate).slice(0, 7)} current={formatDate(calendarFocusDate)} onDayPress={(day) => { const nextDate = new Date(day.year, day.month - 1, day.day); setDateDraft(nextDate); setCalendarFocusDate(nextDate); }} markedDates={{ [formatDate(dateDraft)]: { selected: true, selectedColor: "#32418C" } }} minDate={formatDate(new Date())} theme={{ todayTextColor: "#32418C", arrowColor: "#32418C", selectedDayBackgroundColor: "#32418C", selectedDayTextColor: "#FFFFFF", textMonthFontWeight: "700", textDayFontWeight: "600", textDayHeaderFontWeight: "700" }} />
              </View>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: "#F8F9FF", borderWidth: 1.5, borderColor: "#E8EAFF", shadowOpacity: 0, elevation: 0 }]} onPress={() => setDatePickerVisible(false)}><Text style={{ color: "#666680", fontSize: 15, fontFamily: "Poppins-SemiBold" }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: "#32418C", shadowOpacity: 0, elevation: 0 }]} onPress={() => { setProposedDate(formatDate(dateDraft)); setDatePickerVisible(false); }}><Text style={{ color: "#FFFFFF", fontSize: 15, fontFamily: "Poppins-SemiBold" }}>Choose Date</Text></TouchableOpacity>
              </View>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={timePickerVisible.visible} transparent animationType="slide" onRequestClose={() => setTimePickerVisible({ visible: false, target: null })}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTimePickerVisible({ visible: false, target: null })}>
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select {timePickerVisible.target === 'start' ? "Start" : "End"} Time</Text>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setTimePickerVisible({ visible: false, target: null })}><Ionicons name="close" size={18} color="#666680" /></TouchableOpacity>
              </View>
              <FlatList data={timeOptions} keyExtractor={(item) => item.code} contentContainerStyle={styles.optionList} renderItem={({ item }) => (
                  <TouchableOpacity style={styles.optionRow} onPress={() => { 
                      if (timePickerVisible.target === 'start') setStartTime(item.name);
                      else setEndTime(item.name);
                      setTimePickerVisible({ visible: false, target: null }); 
                    }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="time-outline" size={18} color="#32418C" style={{ marginRight: 10 }} />
                      <Text style={styles.optionText}>{item.name}</Text>
                    </View>
                  </TouchableOpacity>
              )} />
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>

    </ImageBackground>
  );
};

export default MentorshipScreen;
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Pressable,
} from "react-native";
import SmartTextInput from "../components/SmartTextInput";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getAlumniByEmail,
  uploadAlumniPhoto,
  updateAlumniProfile,
  removeAlumniPhoto,
  getAlumniPhotoFromStorage,
} from "../services/alumniQueries";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
import { getAvatarUri } from "../utils/imageUtils";
import { useCurrentUserProfile } from "../context/CurrentUserProfileContext";
import styles from "../styles/AccountSettingsScreen.styles";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedAlert } from "../components/ThemedAlert";

const formatDate = (value) => {
  if (!value) return "YYYY-MM-DD";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
};

const normalizeDateOnly = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsedDate = new Date(raw);
  if (Number.isNaN(parsedDate.getTime())) return raw;
  return parsedDate.toISOString().slice(0, 10);
};

const getImageMimeType = (uri) => {
  const extension = uri.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "png": return "image/png";
    case "heic": return "image/heic";
    case "webp": return "image/webp";
    default: return "image/jpeg";
  }
};

const AccountSettingsScreen = ({ navigation }) => {
  const { setCurrentUserProfile } = useCurrentUserProfile();
  
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    date_of_birth: "",
    sex: "",
    alumni_photo: "",
    biography: "",
    country: "",
    city: "",
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pickingImage, setPickingImage] = useState(false);
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [dobDate, setDobDate] = useState(() => new Date(1990, 0, 1));
  
  const [photoCooldownUntil, setPhotoCooldownUntil] = useState(0);
  const [photoCooldownSeconds, setPhotoCooldownSeconds] = useState(0);

  const fetchAccountData = async ({ showRefreshingState = false } = {}) => {
    try {
      if (showRefreshingState) setRefreshing(true);
      else setLoading(true);
      setErrorMessage("");

      const currentUser = await getCurrentUser();
      const userEmail = currentUser?.email;

      if (!userEmail) {
        setErrorMessage("No account email is stored for this session.");
        return;
      }

      const data = await getAlumniByEmail(userEmail).catch(() => null);
      const livePhotoUrl = data?.id ? await getAlumniPhotoFromStorage(data.id).catch(() => null) : null;
      const resolvedPhoto = livePhotoUrl ?? data?.alumni_photo ?? "";

      setUserData(data);
      setFormData({
        first_name: data?.first_name || "",
        middle_name: data?.middle_name || "",
        last_name: data?.last_name || "",
        phone_number: data?.phone_number || "",
        email: data?.email || userEmail,
        date_of_birth: normalizeDateOnly(data?.date_of_birth),
        sex: data?.sex || "",
        alumni_photo: resolvedPhoto,
        biography: data?.biography || "",
        country: data?.country || "",
        city: data?.city || "",
      });

      const updatedAtMs = data?.updated_at ? new Date(data.updated_at).getTime() : 0;
      const cooldownUntil = updatedAtMs ? updatedAtMs + 60000 : 0;
      setPhotoCooldownUntil(cooldownUntil > Date.now() ? cooldownUntil : 0);
    } catch (fetchError) {
      setErrorMessage("Unable to load account details right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAccountData(); }, []);

  useEffect(() => {
    if (!photoCooldownUntil) {
      setPhotoCooldownSeconds(0);
      return undefined;
    }
    const updateCooldown = () => {
      const remainingSeconds = Math.max(0, Math.ceil((photoCooldownUntil - Date.now()) / 1000));
      setPhotoCooldownSeconds(remainingSeconds);
      if (remainingSeconds === 0) setPhotoCooldownUntil(0);
    };
    updateCooldown();
    const intervalId = setInterval(updateCooldown, 1000);
    return () => clearInterval(intervalId);
  }, [photoCooldownUntil]);

  const handleRefresh = () => fetchAccountData({ showRefreshingState: true });

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const uploadImage = async (imageSource) => {
    try {
      const alumniId = userData?.id;
      const uploadedUrl = alumniId ? await uploadAlumniPhoto(alumniId, imageSource) : null;
      if (!uploadedUrl) throw new Error("No url returned from upload");
      
      updateField("alumni_photo", uploadedUrl);
      setUserData((current) => current ? { ...current, alumni_photo: uploadedUrl } : current);
      setCurrentUserProfile((current) => current ? { ...current, alumni_photo: uploadedUrl } : current);
      setPhotoCooldownUntil(Date.now() + 60000);
      return uploadedUrl;
    } catch (err) {
      throw err;
    }
  };

  const handleSave = async () => {
    if (!userData?.id) {
      setErrorMessage("Missing the current account email.");
      return;
    }

    const fields = [
      "first_name", "middle_name", "last_name", "phone_number", 
      "email", "date_of_birth", "sex", "alumni_photo", 
      "biography", "country", "city"
    ];

    const getChangedPayload = () => {
      const changes = {};
      fields.forEach((f) => {
        const newVal = (formData[f] ?? "").trim();
        const oldValRaw = userData?.[f];
        if (f === "date_of_birth") {
          const oldDate = normalizeDateOnly(userData?.date_of_birth);
          if (newVal !== oldDate) changes[f] = newVal;
        } else {
          if (newVal !== (oldValRaw ?? "")) changes[f] = newVal;
        }
      });
      return changes;
    };

    const changes = getChangedPayload();

    if (Object.keys(changes).length === 0) {
      ThemedAlert.alert("No changes", "You have not modified any fields.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      const updated = await updateAlumniProfile(userData.id, changes);
      const data = updated || null;

      if (data) {
        setUserData(data);
        setCurrentUserProfile(data);
        setFormData({
          first_name: data.first_name || "",
          middle_name: data.middle_name || "",
          last_name: data.last_name || "",
          phone_number: data.phone_number || "",
          email: data.email || "",
          date_of_birth: normalizeDateOnly(data.date_of_birth),
          sex: data.sex || "",
          alumni_photo: data.alumni_photo || "",
          biography: data.biography || "",
          country: data.country || "",
          city: data.city || "",
        });
      }
      ThemedAlert.alert("Success", "Your profile has been updated successfully.");
    } catch (saveError) {
      const serverData = saveError.response?.data;
      let friendly = "Unable to save account details right now.";
      if (serverData?.errors) {
        const firstKey = Object.keys(serverData.errors)[0];
        friendly = serverData.errors[firstKey]?.[0] || friendly;
      } else if (serverData?.message) {
        friendly = serverData.message;
      }
      setErrorMessage(friendly);
      ThemedAlert.alert("Error", friendly);
    } finally {
      setSaving(false);
    }
  };

  const profileName = userData
    ? [formData.first_name, formData.middle_name, formData.last_name].filter(Boolean).join(" ")
    : "Alumni";
  const profileImageUri = getAvatarUri(profileName, formData.alumni_photo);
  const formDisabled = loading || saving;

  return (
    
      <View style={styles.container}>
        
        {/* CUSTOM WHITE HEADER */}
        <View style={styles.whiteHeaderCard}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#31429B" />
            </Pressable>
            <Text style={styles.headerTitle}>Edit Profile</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#31429B" />}
        >
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#31429B" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* AVATAR SECTION */}
              <View style={styles.avatarContainer}>
                <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
                <TouchableOpacity
                  style={styles.cameraBadge}
                  activeOpacity={0.8}
                  disabled={formDisabled || pickingImage || photoCooldownSeconds > 0}
                  onPress={() => {
                    if (photoCooldownSeconds > 0) return ThemedAlert.alert("Cooldown", `Please wait ${photoCooldownSeconds}s.`);
                    ThemedAlert.alert("Profile Photo", "Choose an option", [
                      {
                        text: "Upload New Photo",
                        onPress: async () => {
                          try {
                            setPickingImage(true);
                            const result = await ImagePicker.launchImageLibraryAsync({
                              mediaTypes: ["images"],
                              allowsEditing: false,
                              base64: true,
                              quality: 0.75,
                            });
                            const rawAsset = result.assets?.[0] ?? (result.uri ? { uri: result.uri, base64: result.base64 } : null);
                            if (rawAsset?.uri && rawAsset?.base64) {
                              await uploadImage({
                                uri: rawAsset.uri,
                                base64: rawAsset.base64,
                                name: `profile-${Date.now()}.${rawAsset.uri.split(".").pop() || "jpg"}`,
                                type: getImageMimeType(rawAsset.uri),
                              });
                            }
                          } catch (err) {
                            ThemedAlert.alert("Error", "Unable to process image.");
                          } finally {
                            setPickingImage(false);
                          }
                        },
                      },
                      {
                        text: "Remove Photo",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            setPickingImage(true);
                            await removeAlumniPhoto(userData.id);
                            updateField("alumni_photo", "");
                            setUserData((c) => c ? { ...c, alumni_photo: "" } : c);
                            setCurrentUserProfile((c) => c ? { ...c, alumni_photo: "" } : c);
                          } catch (err) {} finally { setPickingImage(false); }
                        }
                      },
                      { text: "Cancel", style: "cancel" }
                    ], { cancelable: true });
                  }}
                >
                  {pickingImage ? (
                    <ActivityIndicator size="small" color="#31429B" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#31429B" />
                  )}
                </TouchableOpacity>
              </View>

              {/* USER INFORMATION */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>User Information</Text>
                
                <Text style={styles.inputLabel}>Last Name</Text>
                <SmartTextInput
                  value={formData.last_name}
                  onChangeText={(val) => updateField("last_name", val)}
                  style={styles.inputBox}
                  editable={!formDisabled}
                />

                <Text style={styles.inputLabel}>First Name</Text>
                <SmartTextInput
                  value={formData.first_name}
                  onChangeText={(val) => updateField("first_name", val)}
                  style={styles.inputBox}
                  editable={!formDisabled}
                />

                <Text style={styles.inputLabel}>Middle Name</Text>
                <SmartTextInput
                  value={formData.middle_name}
                  onChangeText={(val) => updateField("middle_name", val)}
                  style={styles.inputBox}
                  editable={!formDisabled}
                />
              </View>

              {/* PERSONAL DETAILS */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Details</Text>
                
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <Pressable
                  style={styles.dateInputBox}
                  disabled={formDisabled}
                  onPress={() => {
                    const current = formData.date_of_birth ? new Date(String(formData.date_of_birth)) : new Date(1990, 0, 1);
                    if (!Number.isNaN(current.getTime())) setDobDate(current);
                    setDobPickerVisible(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={18} color="#1C1C1E" style={styles.inputIcon} />
                  <Text style={styles.dateText}>{formatDate(formData.date_of_birth)}</Text>
                </Pressable>

                {dobPickerVisible && (
                  <DateTimePicker
                    value={dobDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    maximumDate={new Date()}
                    onChange={(event, selected) => {
                      if (Platform.OS !== "ios") {
                        setDobPickerVisible(false);
                        if (event?.type === "dismissed") return;
                        if (selected) updateField("date_of_birth", selected.toISOString().slice(0, 10));
                      } else {
                        if (selected) setDobDate(selected);
                      }
                    }}
                  />
                )}
                
                {dobPickerVisible && Platform.OS === "ios" && (
                  <TouchableOpacity 
                    style={styles.iosDateDoneBtn} 
                    onPress={() => {
                      updateField("date_of_birth", dobDate.toISOString().slice(0, 10));
                      setDobPickerVisible(false);
                    }}
                  >
                    <Text style={styles.iosDateDoneText}>Done</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.inputLabel}>Mobile Number (Optional)</Text>
                <SmartTextInput
                  value={formData.phone_number}
                  onChangeText={(val) => updateField("phone_number", val)}
                  style={styles.inputBox}
                  keyboardType="phone-pad"
                  editable={!formDisabled}
                />

                <Text style={styles.inputLabel}>Personal Email Address</Text>
                <SmartTextInput
                  value={formData.email}
                  onChangeText={(val) => updateField("email", val)}
                  style={styles.inputBox}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!formDisabled}
                />
                <Text style={styles.helperTextItalic}>Your Personal Email Address will be used for One-Time Passwords</Text>

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Gender</Text>
                <Pressable
                  style={styles.inputBox}
                  disabled={formDisabled}
                  onPress={() => {
                    ThemedAlert.alert("Select Gender", "", [
                      { text: "Male", onPress: () => updateField("sex", "male") },
                      { text: "Female", onPress: () => updateField("sex", "female") },
                      { text: "Prefer not to say", onPress: () => updateField("sex", "") },
                      { text: "Cancel", style: "cancel" }
                    ], { cancelable: true });
                  }}
                >
                  <Text style={styles.dateText}>{formData.sex ? String(formData.sex).charAt(0).toUpperCase() + String(formData.sex).slice(1) : ""}</Text>
                </Pressable>
              </View>

              {/* PROFILE INFORMATION */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile Information</Text>
                
                <Text style={styles.inputLabel}>Biography</Text>
                <SmartTextInput
                  value={formData.biography}
                  onChangeText={(val) => {
                    if (val.length <= 500) updateField("biography", val);
                  }}
                  style={styles.textArea}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={!formDisabled}
                />
                <Text style={styles.helperTextItalicRight}>Maximum of 500 characters only.</Text>

                <Text style={styles.inputLabel}>Country/Region</Text>
                <SmartTextInput
                  value={formData.country}
                  onChangeText={(val) => updateField("country", val)}
                  style={styles.inputBox}
                  editable={!formDisabled}
                />

                <Text style={styles.inputLabel}>City/Province</Text>
                <SmartTextInput
                  value={formData.city}
                  onChangeText={(val) => updateField("city", val)}
                  style={styles.inputBox}
                  editable={!formDisabled}
                />
              </View>

              {/* USER REMINDERS */}
              <View style={styles.remindersCard}>
                <Text style={styles.remindersTitle}>User Reminders:</Text>
                <Text style={styles.remindersText}>
                  Other Alumni Information such as Program, Year of Graduation will be displayed in your Alumni Profile, and will be visible to other users.
                </Text>
                <Text style={[styles.remindersText, { marginTop: 10 }]}>
                  Your Job/Occupation information will also be displayed once you've completed the initial account activation process. Failure to complete the process will limit you in accessing other LumiNUs modules.
                </Text>
              </View>

              {/* ACTION BUTTONS */}
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.discardButton} 
                  onPress={() => navigation.goBack()}
                  disabled={formDisabled}
                >
                  <Text style={styles.discardButtonText}>Discard</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.saveButton} 
                  onPress={handleSave}
                  disabled={formDisabled}
                >
                  {saving ? <ActivityIndicator color="#31429B" /> : <Text style={styles.saveButtonText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
  );
};

export default AccountSettingsScreen;
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
  updateAlumniProfile,
  getAlumniPhotoFromStorage,
} from "../services/alumniQueries";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
import { getAvatarUri } from "../utils/imageUtils";
import { useCurrentUserProfile } from "../context/CurrentUserProfileContext";
import styles from "../styles/AccountSettingsScreen.styles";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedAlert } from "../components/ThemedAlert";

// ---------- UTILITY FUNCTIONS ----------
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
    case "png":
      return "image/png";
    case "heic":
      return "image/heic";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
};

const stripCacheBuster = (url) => {
  if (!url) return "";
  return String(url).split("?")[0].split("#")[0];
};

const toDisplayPhotoUrl = (url, version) => {
  if (!url) return "";
  const cleanVersion = version ? String(version) : String(Date.now());
  return `${url}${url.includes("?") ? "&" : "?"}v=${cleanVersion}`;
};

// IMPROVED: Flawlessly extracts the path whether it's a full public URL or a relative database string
const extractStoragePath = (url) => {
  if (!url) return "";
  const cleanUrl = stripCacheBuster(url);
  const marker = "/luminus_assets/";
  const markerIndex = cleanUrl.indexOf(marker);
  
  // If it's a full URL
  if (markerIndex !== -1) {
    return decodeURIComponent(cleanUrl.slice(markerIndex + marker.length));
  }
  
  // If it's already a relative path stored in the DB (doesn't contain http)
  if (!cleanUrl.startsWith("http")) {
    return decodeURIComponent(cleanUrl);
  }
  
  return "";
};

const toUint8Array = (arrayBuffer) => new Uint8Array(arrayBuffer);

const imageSourceToBytes = async (imageSource) => {
  if (imageSource?.base64) {
    const binaryString = global.atob ? global.atob(imageSource.base64) : '';
    const bytes = new Uint8Array(binaryString.length);
    for (let index = 0; index < binaryString.length; index += 1) {
      bytes[index] = binaryString.charCodeAt(index);
    }
    return bytes;
  }

  if (imageSource?.uri) {
    const response = await fetch(imageSource.uri);
    const arrayBuffer = await response.arrayBuffer();
    return toUint8Array(arrayBuffer);
  }

  throw new Error("No image data received.");
};

// ---------- MAIN COMPONENT ----------
const AccountSettingsScreen = ({ navigation }) => {
  const { setCurrentUserProfile } = useCurrentUserProfile();

  const [userData, setUserData] = useState(null);
  const [originalUserData, setOriginalUserData] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    date_of_birth: "",
    sex: "",
    alumni_photo: "",
    alumni_bio: "", 
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

  // ---------- FETCH ACCOUNT DATA ----------
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

      // Fetch basic alumni profile data
      const data = await getAlumniByEmail(userEmail).catch(() => null);
      
      // Fetch the detailed address from the addresses table
      // FIX: Removed "country" from the select to prevent DB crash
      let addressData = null;
      if (data?.id) {
        const { data: addr, error: addrError } = await supabase
          .from('addresses')
          .select('region, province, municipality')
          .eq('alumni_id', data.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (!addrError) {
          addressData = addr;
        }
      }

      const livePhotoUrl = data?.id ? await getAlumniPhotoFromStorage(data.id).catch(() => null) : null;
      const basePhotoUrl = stripCacheBuster(livePhotoUrl ?? data?.alumni_photo ?? "");
      const photoVersion = data?.updated_at ? new Date(data.updated_at).getTime() : Date.now();
      const resolvedPhoto = basePhotoUrl ? toDisplayPhotoUrl(basePhotoUrl, photoVersion) : "";

      // Map address table data to form fields, falling back to alumni table data if missing
      const fetchedRegion = data?.country || addressData?.region || "Philippines";
      const fetchedCityProv = data?.city || (addressData?.municipality && addressData?.province 
        ? `${addressData.municipality}, ${addressData.province}` 
        : addressData?.province || addressData?.municipality || "");

      // Enrich original user data so we don't trigger false saves if nothing changed
      const enrichedData = data ? { 
        ...data, 
        alumni_photo: basePhotoUrl,
        country: fetchedRegion,
        city: fetchedCityProv 
      } : null;

      setOriginalUserData(enrichedData);
      setUserData(enrichedData);
      
      setFormData({
        first_name: data?.first_name || "",
        middle_name: data?.middle_name || "",
        last_name: data?.last_name || "",
        phone_number: data?.phone_number || "",
        email: data?.email || userEmail,
        date_of_birth: normalizeDateOnly(data?.date_of_birth),
        sex: data?.sex || "",
        alumni_photo: resolvedPhoto,
        alumni_bio: data?.alumni_bio || "",
        country: fetchedRegion,
        city: fetchedCityProv,
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

  useEffect(() => {
    fetchAccountData();
  }, []);

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

  // ---------- REPLACE PROFILE PHOTO ----------
  const replaceProfilePhoto = async (imageSource, alumniId) => {
    const oldUrl = formData.alumni_photo || userData?.alumni_photo || "";
    const oldPath = extractStoragePath(oldUrl);

    const pathsToDelete = [];
    if (oldPath) pathsToDelete.push(oldPath);
    
    const legacyPath = `alumni_photos/${alumniId}/profile.jpg`;
    if (oldPath !== legacyPath) pathsToDelete.push(legacyPath);

    if (pathsToDelete.length > 0) {
      await supabase.storage.from("luminus_assets").remove(pathsToDelete);
    }

    const fileName = `profile-${Date.now()}.jpg`;
    const objectPath = `alumni_photos/${alumniId}/${fileName}`;
    const imageBytes = await imageSourceToBytes(imageSource);
    const contentType = imageSource.type || "image/jpeg";

    const { error: uploadError } = await supabase.storage
      .from("luminus_assets")
      .upload(objectPath, imageBytes, {
        contentType,
        upsert: false, 
        cacheControl: "0",
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("luminus_assets")
      .getPublicUrl(objectPath);
      
    const storageUrl = publicUrlData?.publicUrl || objectPath;

    return {
      storageUrl,
      displayUrl: toDisplayPhotoUrl(storageUrl),
    };
  };

  // ---------- UPLOAD IMAGE ----------
  const uploadImage = async (imageSource) => {
    try {
      const alumniId = userData?.id;
      if (!alumniId) throw new Error("Missing alumni ID");

      const { storageUrl, displayUrl } = await replaceProfilePhoto(imageSource, alumniId);

      await updateAlumniProfile(alumniId, { alumni_photo: storageUrl });

      updateField("alumni_photo", displayUrl);
      setUserData((current) => ({ ...(current || userData || {}), alumni_photo: storageUrl }));
      setOriginalUserData((current) => ({ ...(current || userData || {}), alumni_photo: storageUrl }));
      setCurrentUserProfile((current) => ({ ...(current || userData || {}), alumni_photo: displayUrl }));
      setPhotoCooldownUntil(Date.now() + 60000);
      return displayUrl;
    } catch (err) {
      throw err;
    }
  };

  // ---------- REMOVE PHOTO ----------
  const handleRemovePhoto = async () => {
    try {
      setPickingImage(true);
      const alumniId = userData?.id;
      if (alumniId) {
        const oldUrl = formData.alumni_photo || userData?.alumni_photo || "";
        const oldPath = extractStoragePath(oldUrl);
        const legacyPath = `alumni_photos/${alumniId}/profile.jpg`;

        const pathsToDelete = [];
        if (oldPath) pathsToDelete.push(oldPath);
        if (oldPath !== legacyPath) pathsToDelete.push(legacyPath);

        if (pathsToDelete.length > 0) {
          await supabase.storage.from("luminus_assets").remove(pathsToDelete);
        }
        await updateAlumniProfile(alumniId, { alumni_photo: "" });
      }
      
      updateField("alumni_photo", "");
      setUserData((c) => c ? { ...c, alumni_photo: "" } : c);
      setOriginalUserData((c) => c ? { ...c, alumni_photo: "" } : c);
      setCurrentUserProfile((c) => c ? { ...c, alumni_photo: "" } : c);
    } catch (err) {
      ThemedAlert.alert("Error", "Unable to remove photo.");
    } finally {
      setPickingImage(false);
    }
  };

  // ---------- SAVE OTHER FIELDS ----------
  const handleSave = async () => {
    if (!userData?.id) {
      setErrorMessage("Missing the current account email.");
      return;
    }

    const compareBase = originalUserData || userData;
    const fields = [
      "first_name", "middle_name", "last_name", "phone_number",
      "email", "date_of_birth", "sex", "alumni_photo",
      "alumni_bio", "country", "city"
    ];

    const getChangedPayload = () => {
      const changes = {};
      fields.forEach((f) => {
        const newVal = f === "alumni_photo"
          ? stripCacheBuster(formData[f] ?? "")
          : (formData[f] ?? "").trim();
        const oldValRaw = compareBase?.[f];
        if (f === "date_of_birth") {
          const oldDate = normalizeDateOnly(compareBase?.date_of_birth);
          if (newVal !== oldDate) changes[f] = newVal;
        } else if (f === "alumni_photo") {
          const oldPhoto = stripCacheBuster(oldValRaw ?? "");
          if (newVal !== oldPhoto) changes[f] = newVal;
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
        const basePhotoUrl = stripCacheBuster(data.alumni_photo ?? "");
        const photoVersion = data.updated_at ? new Date(data.updated_at).getTime() : Date.now();
        const displayPhotoUrl = basePhotoUrl ? toDisplayPhotoUrl(basePhotoUrl, photoVersion) : "";

        const refreshedEnrichedData = {
          ...data,
          alumni_photo: basePhotoUrl,
          country: formData.country,
          city: formData.city,
        };

        setUserData(refreshedEnrichedData);
        setOriginalUserData(refreshedEnrichedData);
        setCurrentUserProfile((current) => ({ ...(current || data || {}), ...data, alumni_photo: displayPhotoUrl }));
        setFormData({
          first_name: data.first_name || "",
          middle_name: data.middle_name || "",
          last_name: data.last_name || "",
          phone_number: data.phone_number || "",
          email: data.email || "",
          date_of_birth: normalizeDateOnly(data.date_of_birth),
          sex: data.sex || "",
          alumni_photo: displayPhotoUrl,
          alumni_bio: data.alumni_bio || "",
          country: formData.country || "",
          city: formData.city || "",
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

  // ---------- DERIVED VALUES ----------
  const profileName = userData
    ? [formData.first_name, formData.middle_name, formData.last_name].filter(Boolean).join(" ")
    : "Alumni";
  const profileImageUri = getAvatarUri(profileName, formData.alumni_photo);
  const formDisabled = loading || saving;

  // ---------- RENDER ----------
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
                  if (photoCooldownSeconds > 0)
                    return ThemedAlert.alert("Cooldown", `Please wait ${photoCooldownSeconds}s.`);
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
                          const rawAsset =
                            result.assets?.[0] ??
                            (result.uri ? { uri: result.uri, base64: result.base64 } : null);
                          if (rawAsset?.uri) {
                            await uploadImage({
                              uri: rawAsset.uri,
                              base64: rawAsset.base64,
                              name: `profile-${Date.now()}.${rawAsset.uri.split(".").pop() || "jpg"}`,
                              type: getImageMimeType(rawAsset.uri),
                            });
                          } else {
                            throw new Error("No image was selected.");
                          }
                        } catch (err) {
                          ThemedAlert.alert(
                            "Error",
                            err?.message ? `Unable to process image: ${err.message}` : "Unable to process image.",
                          );
                        } finally {
                          setPickingImage(false);
                        }
                      },
                    },
                    {
                      text: "Remove Photo",
                      style: "destructive",
                      onPress: handleRemovePhoto,
                    },
                    { text: "Cancel", style: "cancel" },
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
                  const current = formData.date_of_birth
                    ? new Date(String(formData.date_of_birth))
                    : new Date(1990, 0, 1);
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
              <Text style={styles.helperTextItalic}>
                Your Personal Email Address will be used for One-Time Passwords
              </Text>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Gender</Text>
              <Pressable
                style={styles.inputBox}
                disabled={formDisabled}
                onPress={() => {
                  ThemedAlert.alert("Select Gender", "", [
                    { text: "Male", onPress: () => updateField("sex", "male") },
                    { text: "Female", onPress: () => updateField("sex", "female") },
                    { text: "Prefer not to say", onPress: () => updateField("sex", "") },
                    { text: "Cancel", style: "cancel" },
                  ], { cancelable: true });
                }}
              >
                <Text style={styles.dateText}>
                  {formData.sex
                    ? String(formData.sex).charAt(0).toUpperCase() + String(formData.sex).slice(1)
                    : ""}
                </Text>
              </Pressable>
            </View>

            {/* PROFILE INFORMATION */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile Information</Text>

              <Text style={styles.inputLabel}>Biography</Text>
              <SmartTextInput
                value={formData.alumni_bio}
                onChangeText={(val) => {
                  if (val.length <= 500) updateField("alumni_bio", val);
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
                Other Alumni Information such as Program, Year of Graduation will be displayed in
                your Alumni Profile, and will be visible to other users.
              </Text>
              <Text style={[styles.remindersText, { marginTop: 10 }]}>
                Your Job/Occupation information will also be displayed once you've completed the
                initial account activation process. Failure to complete the process will limit you in
                accessing other LumiNUs modules.
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
                {saving ? (
                  <ActivityIndicator color="#31429B" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default AccountSettingsScreen;
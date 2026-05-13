import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import supabase from "../services/supabase";
import BrandHeader from "../components/BrandHeader";
import SmartTextInput from "../components/SmartTextInput";
import { ThemedAlert } from "../components/ThemedAlert";
import styles from "../styles/CompleteProfileScreen.styles";
import {
  getBarangaysByCityMunicipality,
  getCitiesMunicipalitiesByProvince,
  getProvincesByRegion,
  getRegions,
} from "../services/locationQueries";

const DropdownField = ({
  label,
  value,
  placeholder,
  onPress,
  disabled,
  loading,
}) => {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          disabled && styles.dropdownButtonDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text
          style={[styles.dropdownText, !value && styles.dropdownPlaceholder]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color="#31429B" />
        ) : (
          <Text style={styles.dropdownArrow}>⌄</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const parseDobToDate = (value) => {
  if (!value) {
    return new Date();
  }

  const [year, month, day] = value.split("-").map((part) => Number(part));
  const parsedDate = new Date(year, month - 1, day);

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
};

const formatDob = (value) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getMonthLabel = (monthIndex) =>
  new Date(2000, monthIndex, 1).toLocaleString("en-US", { month: "long" });

const buildDobDate = (year, monthIndex, day) => {
  const clampedDay = Math.min(day, new Date(year, monthIndex + 1, 0).getDate());
  return new Date(year, monthIndex, clampedDay);
};

const CompleteProfileScreen = ({ route, navigation }) => {
  // Grab the user ID passed from the Login screen
  const { userId } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState({
    regions: false,
    provinces: false,
    municipalities: false,
    barangays: false,
  });
  const [regionOptions, setRegionOptions] = useState([]);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [municipalityOptions, setMunicipalityOptions] = useState([]);
  const [barangayOptions, setBarangayOptions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const [addressPickerTitle, setAddressPickerTitle] = useState("");
  const [addressPickerOptions, setAddressPickerOptions] = useState([]);
  const [addressPickerLoading, setAddressPickerLoading] = useState(false);
  const [addressPickerQuery, setAddressPickerQuery] = useState("");
  const [addressPickerOnSelect, setAddressPickerOnSelect] = useState(null);
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [dobDraft, setDobDraft] = useState(new Date());
  const [dobCalendarFocusDate, setDobCalendarFocusDate] = useState(new Date());
  const [dobSelectorVisible, setDobSelectorVisible] = useState(false);
  const [dobSelectorTitle, setDobSelectorTitle] = useState("");
  const [dobSelectorOptions, setDobSelectorOptions] = useState([]);
  const [dobSelectorOnSelect, setDobSelectorOnSelect] = useState(null);
  const sexOptions = useMemo(
    () => [
      { code: "male", name: "Male" },
      { code: "female", name: "Female" },
    ],
    [],
  );
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        code: `${index + 1}`,
        name: getMonthLabel(index),
        monthIndex: index,
      })),
    [],
  );
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 1899 }, (_, index) => {
      const year = currentYear - index;
      return { code: `${year}`, name: `${year}`, year };
    });
  }, []);

  // Form State
  const [sex, setSex] = useState("");
  const [dob, setDob] = useState(""); // YYYY-MM-DD
  const [addressType, setAddressType] = useState("");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");

  useEffect(() => {
    const loadRegions = async () => {
      setLocationLoading((current) => ({ ...current, regions: true }));

      try {
        const nextRegions = await getRegions();
        setRegionOptions(nextRegions);
      } catch (error) {
        ThemedAlert.alert(
          "Location Error",
          "Unable to load regions. Please try again.",
        );
      } finally {
        setLocationLoading((current) => ({ ...current, regions: false }));
      }
    };

    loadRegions();
  }, []);

  const openPicker = async ({
    title,
    options,
    loadingKey,
    loadOptions,
    onSelect,
  }) => {
    if (loadOptions && options.length === 0) {
      setAddressPickerLoading(true);
      setLocationLoading((current) => ({ ...current, [loadingKey]: true }));

      try {
        const loadedOptions = await loadOptions();
        setAddressPickerTitle(title);
        setAddressPickerOptions(loadedOptions);
        setAddressPickerQuery("");
        setAddressPickerOnSelect(() => onSelect);
        setAddressPickerVisible(true);
      } catch (error) {
        ThemedAlert.alert(
          "Location Error",
          "Unable to load location options. Please try again.",
        );
      } finally {
        setAddressPickerLoading(false);
        setLocationLoading((current) => ({ ...current, [loadingKey]: false }));
      }

      return;
    }

    setAddressPickerTitle(title);
    setAddressPickerOptions(options);
    setAddressPickerQuery("");
    setAddressPickerOnSelect(() => onSelect);
    setAddressPickerVisible(true);
  };

  const closePicker = () => {
    setAddressPickerVisible(false);
    setAddressPickerTitle("");
    setAddressPickerOptions([]);
    setAddressPickerQuery("");
    setAddressPickerOnSelect(null);
  };

  const openDobPicker = () => {
    const nextDate = parseDobToDate(dob);
    setDobDraft(nextDate);
    setDobCalendarFocusDate(nextDate);
    setDobPickerVisible(true);
  };

  const closeDobPicker = () => {
    setDobPickerVisible(false);
  };

  const confirmDob = () => {
    setDob(formatDob(dobDraft));
    closeDobPicker();
  };

  const openDobSelector = ({ title, options, onSelect }) => {
    setDobSelectorTitle(title);
    setDobSelectorOptions(options);
    setDobSelectorOnSelect(() => onSelect);
    setDobSelectorVisible(true);
  };

  const closeDobSelector = () => {
    setDobSelectorVisible(false);
    setDobSelectorTitle("");
    setDobSelectorOptions([]);
    setDobSelectorOnSelect(null);
  };

  const handleSelectDobMonth = (monthItem) => {
    const nextDate = buildDobDate(
      dobDraft.getFullYear(),
      monthItem.monthIndex,
      dobDraft.getDate(),
    );
    setDobDraft(nextDate);
    setDobCalendarFocusDate(nextDate);
  };

  const handleSelectDobYear = (yearItem) => {
    const nextDate = buildDobDate(
      yearItem.year,
      dobDraft.getMonth(),
      dobDraft.getDate(),
    );
    setDobDraft(nextDate);
    setDobCalendarFocusDate(nextDate);
  };

  const selectedDob = dob ? parseDobToDate(dob) : null;
  const selectedDobString = selectedDob ? formatDob(selectedDob) : null;

  const filteredPickerOptions = useMemo(() => {
    const query = addressPickerQuery.trim().toLowerCase();

    if (!query) {
      return addressPickerOptions;
    }

    return addressPickerOptions.filter((item) => {
      const haystack = `${item.name || ""} ${item.oldName || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [addressPickerOptions, addressPickerQuery]);

  const handleSelectRegion = async (regionItem) => {
    setSelectedRegion(regionItem);
    setSelectedProvince(null);
    setSelectedMunicipality(null);
    setSelectedBarangay(null);
    setProvinceOptions([]);
    setMunicipalityOptions([]);
    setBarangayOptions([]);

    setLocationLoading((current) => ({ ...current, provinces: true }));
    try {
      const nextProvinces = await getProvincesByRegion(regionItem.code);
      setProvinceOptions(nextProvinces);
    } catch (error) {
      ThemedAlert.alert(
        "Location Error",
        "Unable to load provinces for that region.",
      );
    } finally {
      setLocationLoading((current) => ({ ...current, provinces: false }));
    }
  };

  const handleSelectProvince = async (provinceItem) => {
    setSelectedProvince(provinceItem);
    setSelectedMunicipality(null);
    setSelectedBarangay(null);
    setMunicipalityOptions([]);
    setBarangayOptions([]);

    setLocationLoading((current) => ({ ...current, municipalities: true }));
    try {
      const nextMunicipalities = await getCitiesMunicipalitiesByProvince(
        provinceItem.code,
      );
      setMunicipalityOptions(nextMunicipalities);
    } catch (error) {
      ThemedAlert.alert(
        "Location Error",
        "Unable to load cities or municipalities for that province.",
      );
    } finally {
      setLocationLoading((current) => ({ ...current, municipalities: false }));
    }
  };

  const handleSelectMunicipality = async (municipalityItem) => {
    setSelectedMunicipality(municipalityItem);
    setSelectedBarangay(null);
    setBarangayOptions([]);

    setLocationLoading((current) => ({ ...current, barangays: true }));
    try {
      const nextBarangays = await getBarangaysByCityMunicipality(
        municipalityItem.code,
      );
      setBarangayOptions(nextBarangays);
    } catch (error) {
      ThemedAlert.alert(
        "Location Error",
        "Unable to load barangays for that city or municipality.",
      );
    } finally {
      setLocationLoading((current) => ({ ...current, barangays: false }));
    }
  };

  const handleSelectBarangay = async (barangayItem) => {
    setSelectedBarangay(barangayItem);
  };

  const handleSaveProfile = async () => {
    if (!userId) {
      ThemedAlert.alert(
        "Missing User",
        "Unable to determine the current user. Please log in again.",
      );
      return;
    }

    if (
      !sex ||
      !dob ||
      !selectedRegion ||
      !selectedProvince ||
      !selectedMunicipality ||
      !selectedBarangay
    ) {
      ThemedAlert.alert("Missing Info", "Please fill out all required fields.");
      return;
    }

    setLoading(true);

    try {
      // 1. Construct the full address string for geocoding
      const fullAddress = `${street}, ${selectedBarangay.name}, ${selectedMunicipality.name}, ${selectedProvince.name}, ${selectedRegion.name}, Philippines`;

      let lat = null;
      let lng = null;

      // Resolve numeric alumni id if we were given an auth UUID
      // Resolve numeric alumni id using the authenticated user's email
      let alumniId = null;
      try {
        // 1. Get the current logged-in user from Supabase Auth
        const { data: authData } = await supabase.auth.getUser();
        const userEmail = authData?.user?.email;

        if (userEmail) {
          // 2. Find the matching alumni row using their email address!
          const { data: alumniRow, error: alumniErr } = await supabase
            .from("alumnis")
            .select("id")
            .eq("email", userEmail)
            .maybeSingle();

          if (alumniErr) throw alumniErr;
          alumniId = alumniRow?.id ?? null;
        }
      } catch (err) {
        // Failed to resolve alumni id, will continue with original userId if numeric
      }

      // 2. Geocode the address with a plain HTTP request to avoid native package issues
      // Try progressively looser queries (full address → less specific) until we find a match
      const buildQuery = (parts) => parts.filter(Boolean).join(", ");

      const queries = [];
      const parts = [
        street,
        selectedBarangay?.name,
        selectedMunicipality?.name,
        selectedProvince?.name,
        selectedRegion?.name,
        "Philippines",
      ];
      // full address (include zip if present)
      queries.push(
        buildQuery(
          zipCode
            ? [
                ...parts.slice(0, parts.length - 1),
                zipCode,
                parts[parts.length - 1],
              ]
            : parts,
        ),
      );
      // fallback sequences: without street, without barangay, municipality+province, province+region, region
      queries.push(buildQuery(parts.slice(1))); // without street
      queries.push(buildQuery(parts.slice(2))); // municipality/province/region
      queries.push(buildQuery(parts.slice(3))); // province/region
      queries.push(buildQuery([parts[4]])); // region

      let geocodeResult = null;

      for (const q of queries) {
        if (!q) continue;

        try {
          // Nominatim requires a proper User-Agent and contact email to avoid 403 responses.
          // Include an identifying User-Agent header and an email query parameter.
          const contactEmail = "expo@luminus.app";
          const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}&email=${encodeURIComponent(contactEmail)}`;
          const res = await fetch(url, {
            headers: {
              Accept: "application/json",
              "User-Agent": "LuminusMobile/1.0 (+https://luminus.app)",
            },
          });

          if (!res.ok) {
            continue;
          }

          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            geocodeResult = json[0];
            break;
          }
        } catch (err) {
          // Geocoding attempt failed, try next query
        }
      }

      if (geocodeResult) {
        lat = parseFloat(geocodeResult.lat);
        lng = parseFloat(geocodeResult.lon);
      }

      // Ensure we have a numeric alumni id to satisfy DB bigint constraints
      if (!alumniId) {
        ThemedAlert.alert(
          "Error",
          "Unable to resolve your alumni record. Please contact support.",
        );
        setLoading(false);
        return;
      }

      // 3. Save address to `addresses` table and attach to alumni
      // 3. Save address to `addresses` table and attach to alumni
      // Notice we are passing the alumniId directly into this table!
      const { error: addressError } = await supabase.from("addresses").insert([
        {
          address_type: addressType,
          alumni_id: alumniId,
          region: selectedRegion.name,
          province: selectedProvince.name,
          municipality: selectedMunicipality.name,
          barangay: selectedBarangay.name,
          street: street,
          zip_code: zipCode,
          latitude: lat,
          longitude: lng,
        },
      ]);

      if (addressError) throw addressError;

      // 4. Update the basic profile details in `alumnis`
      const { error } = await supabase
        .from("alumnis")
        .update({
          sex: sex,
          date_of_birth: dob,
        })
        .eq("id", alumniId);

      if (error) throw error;

      ThemedAlert.alert("Success", "Profile setup complete!");
      // Send them to the main app dashboard!
      navigation.replace("Home");
    } catch (error) {
      ThemedAlert.alert("Error", error.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <BrandHeader />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            We need a few more details before you can continue.
          </Text>

          {/* Basic Info */}
          <Text style={styles.sectionHeader}>Basic Information</Text>
          <DropdownField
            label="Sex"
            value={sex}
            placeholder="Select sex"
            onPress={() =>
              openPicker({
                title: "Select Sex",
                options: sexOptions,
                onSelect: (item) => setSex(item.name),
              })
            }
            disabled={loading}
            loading={false}
          />
          <DropdownField
            label="Date of Birth"
            value={dob}
            placeholder="Select date of birth"
            onPress={openDobPicker}
            disabled={loading}
            loading={false}
          />

          {/* Address Info */}
          <Text style={styles.sectionHeader}>Address Details</Text>
          <Text style={styles.fieldLabel}>Address Type</Text>
          <SmartTextInput
            style={styles.input}
            placeholder="Home, Work, etc."
            value={addressType}
            onChangeText={setAddressType}
          />
          <DropdownField
            label="Region"
            value={selectedRegion?.name || ""}
            placeholder={
              locationLoading.regions ? "Loading regions..." : "Select a region"
            }
            onPress={() =>
              openPicker({
                title: "Select Region",
                options: regionOptions,
                loadingKey: "regions",
                onSelect: handleSelectRegion,
              })
            }
            disabled={loading || locationLoading.regions}
            loading={locationLoading.regions}
          />
          <DropdownField
            label="Province"
            value={selectedProvince?.name || ""}
            placeholder={
              selectedRegion ? "Select a province" : "Choose a region first"
            }
            onPress={() =>
              openPicker({
                title: "Select Province",
                options: provinceOptions,
                loadingKey: "provinces",
                loadOptions: async () =>
                  getProvincesByRegion(selectedRegion?.code),
                onSelect: handleSelectProvince,
              })
            }
            disabled={loading || !selectedRegion || locationLoading.provinces}
            loading={locationLoading.provinces}
          />
          <DropdownField
            label="Municipality / City"
            value={selectedMunicipality?.name || ""}
            placeholder={
              selectedProvince
                ? "Select a city or municipality"
                : "Choose a province first"
            }
            onPress={() =>
              openPicker({
                title: "Select City / Municipality",
                options: municipalityOptions,
                loadingKey: "municipalities",
                loadOptions: async () =>
                  getCitiesMunicipalitiesByProvince(selectedProvince?.code),
                onSelect: handleSelectMunicipality,
              })
            }
            disabled={
              loading || !selectedProvince || locationLoading.municipalities
            }
            loading={locationLoading.municipalities}
          />
          <DropdownField
            label="Barangay"
            value={selectedBarangay?.name || ""}
            placeholder={
              selectedMunicipality
                ? "Select a barangay"
                : "Choose a city or municipality first"
            }
            onPress={() =>
              openPicker({
                title: "Select Barangay",
                options: barangayOptions,
                loadingKey: "barangays",
                loadOptions: async () =>
                  getBarangaysByCityMunicipality(selectedMunicipality?.code),
                onSelect: handleSelectBarangay,
              })
            }
            disabled={
              loading || !selectedMunicipality || locationLoading.barangays
            }
            loading={locationLoading.barangays}
          />
          <Text style={styles.fieldLabel}>Street / House No.</Text>
          <SmartTextInput
            style={styles.input}
            placeholder="Enter street or house number"
            value={street}
            onChangeText={setStreet}
          />
          <Text style={styles.fieldLabel}>Zip Code</Text>
          <SmartTextInput
            style={styles.input}
            placeholder="Enter zip code"
            value={zipCode}
            onChangeText={setZipCode}
            keyboardType="number-pad"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSaveProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Save & Continue</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={addressPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <Pressable style={styles.modalBackdrop} onPress={closePicker}>
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>{addressPickerTitle}</Text>

              {addressPickerLoading ? (
                <View style={styles.modalLoadingState}>
                  <ActivityIndicator color="#31429B" />
                  <Text style={styles.modalLoadingText}>
                    Loading locations...
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredPickerOptions}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.optionList}
                  ListEmptyComponent={
                    <Text style={styles.emptyStateText}>
                      No locations found.
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.optionRow}
                      onPress={async () => {
                        if (addressPickerOnSelect) {
                          await addressPickerOnSelect(item);
                        }
                        closePicker();
                      }}
                    >
                      <Text style={styles.optionText}>{item.name}</Text>
                      {item.oldName ? (
                        <Text style={styles.optionSubtext}>
                          Formerly {item.oldName}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  )}
                />
              )}
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>

      <Modal
        visible={dobPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDobPicker}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeDobPicker}>
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <Pressable
              style={[styles.modalCard, styles.dobModalCard]}
              onPress={() => {}}
            >
              <Text style={styles.modalTitle}>Select Date of Birth</Text>
              <View style={styles.dobSelectorsRow}>
                <View style={styles.dobSelectorColumn}>
                  <Text style={styles.fieldLabel}>Month</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() =>
                      openDobSelector({
                        title: "Select Month",
                        options: monthOptions,
                        onSelect: handleSelectDobMonth,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownText}>
                      {getMonthLabel(dobDraft.getMonth())}
                    </Text>
                    <Text style={styles.dropdownArrow}>⌄</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dobSelectorColumn}>
                  <Text style={styles.fieldLabel}>Year</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() =>
                      openDobSelector({
                        title: "Select Year",
                        options: yearOptions,
                        onSelect: handleSelectDobYear,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownText}>
                      {dobDraft.getFullYear()}
                    </Text>
                    <Text style={styles.dropdownArrow}>⌄</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.datePickerWrap}>
                <Calendar
                  key={formatDob(dobCalendarFocusDate).slice(0, 7)}
                  current={formatDob(dobCalendarFocusDate)}
                  onDayPress={(day) => {
                    const nextDate = new Date(day.year, day.month - 1, day.day);
                    setDobDraft(nextDate);
                    setDobCalendarFocusDate(nextDate);
                  }}
                  markedDates={{
                    [formatDob(dobDraft)]: {
                      selected: true,
                      selectedColor: "#31429B",
                    },
                  }}
                  maxDate={formatDob(new Date())}
                  theme={{
                    todayTextColor: "#31429B",
                    arrowColor: "#31429B",
                    selectedDayBackgroundColor: "#31429B",
                    selectedDayTextColor: "#FFFFFF",
                    textMonthFontWeight: "700",
                    textDayFontWeight: "600",
                    textDayHeaderFontWeight: "700",
                  }}
                />
              </View>
              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={[styles.datePickerAction, styles.datePickerCancel]}
                  onPress={closeDobPicker}
                >
                  <Text style={styles.datePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.datePickerAction, styles.datePickerConfirm]}
                  onPress={confirmDob}
                >
                  <Text style={styles.datePickerConfirmText}>Choose Date</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>

      <Modal
        visible={dobSelectorVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDobSelector}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeDobSelector}>
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>{dobSelectorTitle}</Text>
              <FlatList
                data={dobSelectorOptions}
                keyExtractor={(item) => item.code}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.optionList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={async () => {
                      if (dobSelectorOnSelect) {
                        await dobSelectorOnSelect(item);
                      }
                      closeDobSelector();
                    }}
                  >
                    <Text style={styles.optionText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default CompleteProfileScreen;

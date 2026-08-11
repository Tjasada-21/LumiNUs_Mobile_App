import React, { useEffect, useMemo, useState, useRef } from "react";
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
  Linking,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import supabase from "../services/supabase";
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
  icon,
}) => {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          disabled && styles.dropdownButtonDisabled,
          value && styles.dropdownButtonActive,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {icon && (
          <Ionicons 
            name={icon} 
            size={18} 
            color={value ? "#32418C" : "#A0AABF"} 
            style={{ marginRight: 10 }}
          />
        )}
        <Text
          style={[styles.dropdownText, !value && styles.dropdownPlaceholder]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color="#32418C" />
        ) : (
          <Ionicons name="chevron-down" size={18} color="#32418C" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const parseDobToDate = (value) => {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map((part) => Number(part));
  const parsedDate = new Date(year, month - 1, day);
  if (Number.isNaN(parsedDate.getTime())) return new Date();
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
  const { userId } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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
  const [addressPickerShowSearch, setAddressPickerShowSearch] = useState(true);
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [dobDraft, setDobDraft] = useState(new Date());
  const [dobCalendarFocusDate, setDobCalendarFocusDate] = useState(new Date());
  const [dobSelectorVisible, setDobSelectorVisible] = useState(false);
  const [dobSelectorTitle, setDobSelectorTitle] = useState("");
  const [dobSelectorOptions, setDobSelectorOptions] = useState([]);
  const [dobSelectorOnSelect, setDobSelectorOnSelect] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Fields that may already have data
  const [hasExistingSex, setHasExistingSex] = useState(false);
  const [hasExistingDob, setHasExistingDob] = useState(false);
  const [hasExistingAddress, setHasExistingAddress] = useState(false);
  
  const [alumniType, setAlumniType] = useState("");
  const [hasExistingAlumniType, setHasExistingAlumniType] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const cardScrollViewRef = useRef(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        const keyboardHeight = event.endCoordinates.height;
        setKeyboardVisible(true);
        
        Animated.timing(slideAnim, {
          toValue: -keyboardHeight * 0.2,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [slideAnim]);

  // Load existing alumni data
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userEmail = authData?.user?.email;
        
        if (userEmail) {
          const { data: alumniData, error: alumniError } = await supabase
            .from("alumnis")
            .select("*")
            .eq("email", userEmail)
            .single();
            
          if (!alumniError && alumniData) {
            // Check which fields already have data
            if (alumniData.sex) {
              setSex(alumniData.sex);
              setHasExistingSex(true);
            }
            if (alumniData.date_of_birth) {
              setDob(alumniData.date_of_birth);
              setHasExistingDob(true);
            }

            // Check for alumni type
            if (alumniData.alumni_type) {
              setAlumniType(alumniData.alumni_type);
              setHasExistingAlumniType(true);
            }
            
            // Check if address exists
            const { data: addressData, error: addressError } = await supabase
              .from("addresses")
              .select("*")
              .eq("alumni_id", alumniData.id)
              .maybeSingle();
              
            if (!addressError && addressData) {
              setHasExistingAddress(true);
              // Pre-fill address data
              setAddressType(addressData.address_type || "");
              setStreet(addressData.street || "");
              setZipCode(addressData.zip_code || "");
              
              // If it's a Philippine address
              if (addressData.barangay) {
                setIsInternational(false);
                // You might want to load and set the region/province/municipality/barangay objects
                // This would require additional API calls to match names to codes
              } else {
                setIsInternational(true);
                setSelectedCountry(addressData.region || "");
                setSelectedMunicipality({ name: addressData.municipality || "", code: "INTL" });
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading existing data:", error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadExistingData();
  }, []);

  const sexOptions = useMemo(
    () => [
      { code: "male", name: "Male", icon: "man-outline" },
      { code: "female", name: "Female", icon: "woman-outline" },
    ],
    [],
  );

  const addressTypeOptions = useMemo(
    () => [
      { code: "residential", name: "Residential Address", icon: "home-outline" },
      { code: "business", name: "Work / Business / Commercial Address", icon: "business-outline" },
    ],
    [],
  );

  // Alumni Type Options
  const alumniTypeOptions = useMemo(
    () => [
      { 
        code: "college", 
        name: "College Graduate", 
        icon: "school-outline",
        description: "I completed a college degree program"
      },
      { 
        code: "shs", 
        name: "SHS Graduate", 
        icon: "book-outline",
        description: "I graduated from Senior High School"
      },
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

  const [sex, setSex] = useState("");
  const [dob, setDob] = useState("");
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
        ThemedAlert.alert("Location Error", "Unable to load regions. Please try again.");
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
    showSearch = true,
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
        setAddressPickerShowSearch(showSearch);
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
    setAddressPickerShowSearch(showSearch);
    setAddressPickerVisible(true);
  };

  const closePicker = () => {
    setAddressPickerVisible(false);
    setAddressPickerTitle("");
    setAddressPickerOptions([]);
    setAddressPickerQuery("");
    setAddressPickerOnSelect(null);
    setAddressPickerShowSearch(true);
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

  const filteredPickerOptions = useMemo(() => {
    if (!addressPickerShowSearch) return addressPickerOptions;
    const query = addressPickerQuery.trim().toLowerCase();
    if (!query) return addressPickerOptions;
    return addressPickerOptions.filter((item) => {
      const haystack = `${item.name || ""} ${item.oldName || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [addressPickerOptions, addressPickerQuery, addressPickerShowSearch]);

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

  const [selectedCountry, setSelectedCountry] = useState("");
  const [isInternational, setIsInternational] = useState(false);
  const [customCountry, setCustomCountry] = useState("");
  const [countryOptions] = useState([
    { code: "PH", name: "Philippines" },
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "AU", name: "Australia" },
    { code: "UK", name: "United Kingdom" },
    { code: "JP", name: "Japan" },
    { code: "SG", name: "Singapore" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "SA", name: "Saudi Arabia" },
    { code: "QA", name: "Qatar" },
    { code: "KW", name: "Kuwait" },
    { code: "IT", name: "Italy" },
    { code: "ES", name: "Spain" },
    { code: "FR", name: "France" },
    { code: "DE", name: "Germany" },
    { code: "KR", name: "South Korea" },
    { code: "HK", name: "Hong Kong" },
    { code: "NZ", name: "New Zealand" },
    { code: "OTHER", name: "Other Country" },
  ]);

  // New state for map functionality
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [mapVisible, setMapVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);

  const handleSaveProfile = async () => {
    if (!userId) {
      ThemedAlert.alert(
        "Missing User",
        "Unable to determine the current user. Please log in again.",
      );
      return;
    }

    // Only validate fields that don't have existing data
    if (!hasExistingSex && !sex) {
      ThemedAlert.alert("Missing Info", "Please select your sex.");
      return;
    }
    
    if (!hasExistingDob && !dob) {
      ThemedAlert.alert("Missing Info", "Please select your date of birth.");
      return;
    }

    // Validate education type
    if (!hasExistingAlumniType && !alumniType) {
      ThemedAlert.alert("Missing Info", "Please select your education type (College or SHS Graduate).");
      return;
    }
    
    if (!hasExistingAddress) {
      if (!addressType) {
        ThemedAlert.alert("Missing Info", "Please select your address type.");
        return;
      }
      
      if (!selectedLocation) {
        ThemedAlert.alert("Location Required", "Please pin your location on the map.");
        return;
      }
      
      // Get the effective country value
      const effectiveCountry = selectedCountry === "Other Country" ? customCountry : selectedCountry;
      
      if (!effectiveCountry) {
        ThemedAlert.alert("Missing Info", "Please select or enter your country of residence.");
        return;
      }
      
      if (!isInternational) {
        if (!selectedRegion || !selectedProvince || !selectedMunicipality || !selectedBarangay) {
          ThemedAlert.alert("Missing Info", "Please fill out all required Philippine address fields.");
          return;
        }
      } else {
        const cityValue = typeof selectedMunicipality === 'object' ? selectedMunicipality?.name : selectedMunicipality;
        if (!cityValue) {
          ThemedAlert.alert("Missing Info", "Please enter your city/municipality.");
          return;
        }
      }
    }
    
    setLoading(true);

    try {
      let alumniId = null;
      const { data: authData } = await supabase.auth.getUser();
      const userEmail = authData?.user?.email;

      if (userEmail) {
        const { data: alumniRow, error: alumniErr } = await supabase
          .from("alumnis")
          .select("id")
          .eq("email", userEmail)
          .maybeSingle();

        if (alumniErr) throw alumniErr;
        alumniId = alumniRow?.id ?? null;
      }

      if (!alumniId) {
        ThemedAlert.alert(
          "Error",
          "Unable to resolve your alumni record. Please contact support.",
        );
        setLoading(false);
        return;
      }

      // Update alumni basic info only if fields were empty
      const updateData = {};
      if (!hasExistingSex) updateData.sex = sex;
      if (!hasExistingDob) updateData.date_of_birth = dob;

      // Save alumni type
      if (!hasExistingAlumniType) {
        updateData.alumni_type = alumniType;
      }
      
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from("alumnis")
          .update(updateData)
          .eq("id", alumniId);

        if (error) throw error;
      }

      // Save address if it doesn't exist
      if (!hasExistingAddress) {
        // Get the effective country value
        const effectiveCountry = selectedCountry === "Other Country" ? customCountry : selectedCountry;
        
        const addressData = {
          address_type: addressType,
          alumni_id: alumniId,
          region: effectiveCountry,
          province: isInternational ? "" : selectedProvince?.name,
          municipality: isInternational 
            ? (typeof selectedMunicipality === 'object' ? selectedMunicipality?.name : selectedMunicipality)
            : selectedMunicipality?.name,
          barangay: isInternational ? "" : selectedBarangay?.name,
          street: street || "",
          zip_code: zipCode || "",
          latitude: selectedLocation?.latitude || 0,
          longitude: selectedLocation?.longitude || 0,
        };

        const { error: addressError } = await supabase.from("addresses").insert([addressData]);
        if (addressError) throw addressError;
      }

      ThemedAlert.alert("Success", "Profile setup complete!");
      navigation.replace("Home");
    } catch (error) {
      ThemedAlert.alert("Error", error.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const contactEmail = "expo@luminus.app";
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1&email=${encodeURIComponent(contactEmail)}`;
      
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "LuminusMobile/1.0 (+https://luminus.app)",
        },
      });

      if (!res.ok) return null;

      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return null;
    }
  };

  const parseAddressComponents = (addressData) => {
    if (!addressData?.address) return null;

    const addr = addressData.address;
    
    return {
      country: addr.country || "",
      region: addr.region || addr.state || "",
      province: addr.province || addr.state || addr.region || "",
      municipality: addr.city || addr.town || addr.municipality || addr.county || "",
      barangay: addr.suburb || addr.village || addr.neighbourhood || addr.hamlet || addr.quarter || "",
      zipCode: addr.postcode || "",
      street: addr.road || addr.street || addr.pedestrian || "",
      houseNumber: addr.house_number || "",
      displayName: addressData.display_name || "",
    };
  };

  const matchAddressToOptions = async (parsedAddress) => {
    const isPhilippines = parsedAddress.country?.toLowerCase().includes("philippines") || 
                          parsedAddress.country?.toLowerCase().includes("pilipinas");
    
    if (!isPhilippines) {
      // For international addresses
      setIsInternational(true);
      
      // Try to match country to our list
      const countryMatch = countryOptions.find(c => 
        c.name.toLowerCase().includes(parsedAddress.country.toLowerCase()) ||
        parsedAddress.country.toLowerCase().includes(c.name.toLowerCase())
      );
      
      if (countryMatch) {
        setSelectedCountry(countryMatch.name);
        setCustomCountry("");
      } else {
        // If no match, set as "Other Country" and fill custom country
        setSelectedCountry("Other Country");
        setCustomCountry(parsedAddress.country);
      }
      
      // Set city/municipality for international
      if (parsedAddress.municipality) {
        setSelectedMunicipality({ name: parsedAddress.municipality, code: "INTL" });
      }
      
      // Set ZIP code if found
      if (parsedAddress.zipCode) {
        setZipCode(parsedAddress.zipCode);
      }
      
      // Set street if found
      if (parsedAddress.street || parsedAddress.houseNumber) {
        const streetAddress = [parsedAddress.houseNumber, parsedAddress.street]
          .filter(Boolean)
          .join(" ");
        setStreet(streetAddress);
      }
      
      return;
    }
    
    // For Philippines addresses
    setIsInternational(false);
    setSelectedCountry("Philippines");
    
    // Match Region
    if (parsedAddress.region && regionOptions.length > 0) {
      const regionMatch = regionOptions.find(r => 
        r.name.toLowerCase().includes(parsedAddress.region.toLowerCase()) ||
        parsedAddress.region.toLowerCase().includes(r.name.toLowerCase())
      );
      if (regionMatch) {
        await handleSelectRegion(regionMatch);
        
        // Match Province
        if (parsedAddress.province) {
          const provinces = await getProvincesByRegion(regionMatch.code);
          const provinceMatch = provinces.find(p => 
            p.name.toLowerCase().includes(parsedAddress.province.toLowerCase()) ||
            parsedAddress.province.toLowerCase().includes(p.name.toLowerCase())
          );
          if (provinceMatch) {
            await handleSelectProvince(provinceMatch);
            
            // Match Municipality/City
            if (parsedAddress.municipality) {
              const municipalities = await getCitiesMunicipalitiesByProvince(provinceMatch.code);
              const municipalityMatch = municipalities.find(m => 
                m.name.toLowerCase().includes(parsedAddress.municipality.toLowerCase()) ||
                parsedAddress.municipality.toLowerCase().includes(m.name.toLowerCase())
              );
              if (municipalityMatch) {
                await handleSelectMunicipality(municipalityMatch);
                
                // Match Barangay
                if (parsedAddress.barangay) {
                  const barangays = await getBarangaysByCityMunicipality(municipalityMatch.code);
                  const barangayMatch = barangays.find(b => 
                    b.name.toLowerCase().includes(parsedAddress.barangay.toLowerCase()) ||
                    parsedAddress.barangay.toLowerCase().includes(b.name.toLowerCase())
                  );
                  if (barangayMatch) {
                    handleSelectBarangay(barangayMatch);
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Set ZIP code if found
    if (parsedAddress.zipCode) {
      setZipCode(parsedAddress.zipCode);
    }
    
    // Set street if found
    if (parsedAddress.street || parsedAddress.houseNumber) {
      const streetAddress = [parsedAddress.houseNumber, parsedAddress.street]
        .filter(Boolean)
        .join(" ");
      setStreet(streetAddress);
    }
  };

  const handleMapLocationSelect = async (coordinate) => {
    setSelectedLocation(coordinate);
    setIsLocatingAddress(true);
    
    try {
      const addressData = await reverseGeocode(coordinate.latitude, coordinate.longitude);
      
      if (addressData) {
        const parsedAddress = parseAddressComponents(addressData);
        
        if (parsedAddress) {
          await matchAddressToOptions(parsedAddress);
        }
      } else {
        ThemedAlert.alert(
          "Address Not Found",
          "Could not determine address for this location. Please try again or select manually.",
        );
      }
    } catch (error) {
      console.error("Error processing location:", error);
      ThemedAlert.alert(
        "Error",
        "Failed to process location. Please try again.",
      );
    } finally {
      setIsLocatingAddress(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== "granted") {
        ThemedAlert.alert(
          "Permission Denied",
          "Please enable location permissions to use this feature.",
        );
        return;
      }

      setIsLocatingAddress(true);
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      
      setSelectedLocation({ latitude, longitude });
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      await handleMapLocationSelect({ latitude, longitude });
    } catch (error) {
      console.error("Error getting location:", error);
      ThemedAlert.alert(
        "Location Error",
        "Unable to get your current location. Please try again.",
      );
    } finally {
      setIsLocatingAddress(false);
    }
  };

  const openMapModal = () => {
    setMapSearchQuery("");
    setMapSearchResults([]);
    setShowSearchResults(false);
    mapSlideAnim.setValue(0);
    
    if (!selectedLocation) {
      setSelectedLocation({
        latitude: 14.5995,
        longitude: 120.9842,
      });
    }
    setMapVisible(true);
  };

  const closeMapModal = () => {
    mapSlideAnim.setValue(0);
    setMapVisible(false);
  };

  const confirmMapSelection = async () => {
    if (selectedLocation) {
      await handleMapLocationSelect(selectedLocation);
    }
    setMapVisible(false);
  };

  const searchLocation = async (query) => {
    if (!query.trim()) {
      setMapSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const contactEmail = "expo@luminus.app";
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}&email=${encodeURIComponent(contactEmail)}`;
      
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "LuminusMobile/1.0 (+https://luminus.app)",
        },
      });

      if (!res.ok) {
        setMapSearchResults([]);
        return;
      }

      const data = await res.json();
      setMapSearchResults(data || []);
    } catch (error) {
      console.error("Map search error:", error);
      setMapSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = async (result) => {
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);
    
    if (isNaN(latitude) || isNaN(longitude)) return;

    setSelectedLocation({ latitude, longitude });
    setShowSearchResults(false);
    setMapSearchQuery("");
    setMapSearchResults([]);
    Keyboard.dismiss();

    await handleMapLocationSelect({ latitude, longitude });
  };

  const searchTimeoutRef = useRef(null);
  const mapSlideAnim = useRef(new Animated.Value(0)).current;
  const mapScrollRef = useRef(null);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        if (mapVisible) {
          const keyboardHeight = event.endCoordinates.height;
          Animated.timing(mapSlideAnim, {
            toValue: -keyboardHeight * 0.3,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        if (mapVisible) {
          Animated.timing(mapSlideAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [mapVisible, mapSlideAnim]);

  if (initialLoading) {
    return (
      <ImageBackground
        source={require("../../assets/images/unnamed.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color="#32418C" />
              <Text style={{ marginTop: 16, color: "#32418C", fontSize: 16 }}>
                Loading your profile...
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </ImageBackground>
    );
  }

  // Calculate section numbers dynamically
  const basicInfoSectionNumber = 1;
  const educationTypeSectionNumber = (!hasExistingSex || !hasExistingDob) ? 2 : 1;
  const addressSectionNumber = (!hasExistingSex || !hasExistingDob || !hasExistingAlumniType) ? 3 : 2;

  return (
    <ImageBackground
      source={require("../../assets/images/unnamed.png")}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          >
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                keyboardVisible && { paddingVertical: 16 }
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Animated.View 
                style={[
                  styles.cardContainer, 
                  { 
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <ScrollView
                  ref={cardScrollViewRef}
                  style={styles.cardScrollView}
                  contentContainerStyle={styles.cardContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                  nestedScrollEnabled={true}
                >
                  {/* Logo */}
                  <View style={styles.logoContainer}>
                    <Image
                      source={require("../../assets/images/LumiNUs Logo.png")}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Header Section */}
                  <View style={styles.headerSection}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="person-circle-outline" size={28} color="#32418C" />
                    </View>
                    <Text style={styles.title}>Complete Your Profile</Text>
                    <Text style={styles.subtitle}>
                      {hasExistingSex && hasExistingDob && hasExistingAddress
                        ? "Your profile is complete! You can update your details below."
                        : "Help us get to know you better. Fill in your details to continue."
                      }
                    </Text>
                  </View>

                  {/* Basic Information Section - Only show if fields are empty */}
                  {(!hasExistingSex || !hasExistingDob) && (
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionNumber}>
                          <Text style={styles.sectionNumberText}>1</Text>
                        </View>
                        <Text style={styles.sectionTitle}>Basic Information</Text>
                      </View>

                      {!hasExistingSex && (
                        <DropdownField
                          label="Sex"
                          value={sex}
                          placeholder="Select your sex"
                          icon={sex === "Male" ? "man" : sex === "Female" ? "woman" : "person-outline"}
                          onPress={() =>
                            openPicker({
                              title: "Select Sex",
                              options: sexOptions,
                              onSelect: (item) => setSex(item.name),
                              showSearch: false,
                            })
                          }
                          disabled={loading}
                          loading={false}
                        />
                      )}
                      
                      {!hasExistingDob && (
                        <DropdownField
                          label="Date of Birth"
                          value={dob}
                          placeholder="Select your date of birth"
                          icon="calendar-outline"
                          onPress={openDobPicker}
                          disabled={loading}
                          loading={false}
                        />
                      )}
                    </View>
                  )}

                  {/* Education Type Section */}
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionNumber}>
                        <Text style={styles.sectionNumberText}>{educationTypeSectionNumber}</Text>
                      </View>
                      <Text style={styles.sectionTitle}>Education Type</Text>
                    </View>

                    {!hasExistingAlumniType ? (
                      <>
                        <Text style={styles.fieldLabel}>Are you a College or SHS Graduate?</Text>
                        
                        <View style={styles.alumniTypeGrid}>
                          {alumniTypeOptions.map((option) => (
                            <TouchableOpacity
                              key={option.code}
                              style={[
                                styles.alumniTypeCard,
                                alumniType === option.code && styles.alumniTypeCardSelected,
                              ]}
                              onPress={() => setAlumniType(option.code)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.alumniTypeIconContainer}>
                                <Ionicons 
                                  name={option.icon} 
                                  size={32} 
                                  color={alumniType === option.code ? "#32418C" : "#A0AABF"} 
                                />
                              </View>
                              <Text style={[
                                styles.alumniTypeName,
                                alumniType === option.code && styles.alumniTypeNameSelected
                              ]}>
                                {option.name}
                              </Text>
                              <Text style={styles.alumniTypeDescription}>
                                {option.description}
                              </Text>
                              {alumniType === option.code && (
                                <View style={styles.alumniTypeCheckmark}>
                                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                </View>
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    ) : (
                      <View style={styles.existingFieldContainer}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.existingFieldText}>
                          Education Type: <Text style={styles.existingFieldValue}>
                            {alumniType === 'college' ? 'College Graduate' : 'SHS Graduate'}
                          </Text>
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Address Details Section - Only show if no existing address */}
                  {!hasExistingAddress && (
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionNumber}>
                          <Text style={styles.sectionNumberText}>{addressSectionNumber}</Text>
                        </View>
                        <Text style={styles.sectionTitle}>Address Details</Text>
                      </View>

                      <DropdownField
                        label="Address Type"
                        value={addressType}
                        placeholder="Select address type"
                        icon="home-outline"
                        onPress={() =>
                          openPicker({
                            title: "Select Address Type",
                            options: addressTypeOptions,
                            onSelect: (item) => setAddressType(item.name),
                            showSearch: false,
                          })
                        }
                        disabled={loading}
                        loading={false}
                      />

                      {/* Map Location Picker */}
                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Pin Your Location</Text>
                        <TouchableOpacity
                          style={styles.mapButton}
                          onPress={openMapModal}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="map-outline" size={20} color="#32418C" />
                          <Text style={styles.mapButtonText}>
                            {selectedLocation ? "📍 Change Location on Map" : "📍 Select Location on Map"}
                          </Text>
                        </TouchableOpacity>
                        
                        {selectedLocation && (
                          <Text style={styles.coordinatesText}>
                            Coordinates: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                          </Text>
                        )}
                      </View>

                      {/* Country of Residence - Moved after map */}
                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Country of Residence</Text>
                        
                        {/* Country dropdown */}
                        <TouchableOpacity
                          style={[
                            styles.dropdownButton,
                            selectedCountry && styles.dropdownButtonActive,
                          ]}
                          onPress={() =>
                            openPicker({
                              title: "Select Country",
                              options: countryOptions,
                              onSelect: (item) => {
                                if (item.code === "OTHER") {
                                  setSelectedCountry("Other Country");
                                  setIsInternational(true);
                                  setCustomCountry("");
                                } else {
                                  setSelectedCountry(item.name);
                                  setIsInternational(item.code !== "PH");
                                  // Clear Philippine address fields if international
                                  if (item.code !== "PH") {
                                    setSelectedRegion(null);
                                    setSelectedProvince(null);
                                    setSelectedMunicipality(null);
                                    setSelectedBarangay(null);
                                    setProvinceOptions([]);
                                    setMunicipalityOptions([]);
                                    setBarangayOptions([]);
                                  }
                                }
                              },
                              showSearch: true,
                            })
                          }
                          disabled={loading}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name="globe-outline" 
                            size={18} 
                            color={selectedCountry ? "#32418C" : "#A0AABF"} 
                            style={{ marginRight: 10 }}
                          />
                          <Text
                            style={[styles.dropdownText, !selectedCountry && styles.dropdownPlaceholder]}
                            numberOfLines={1}
                          >
                            {selectedCountry || "Select your country"}
                          </Text>
                          <Ionicons name="chevron-down" size={18} color="#32418C" />
                        </TouchableOpacity>
                        
                        {/* Custom country input for "Other Country" */}
                        {selectedCountry === "Other Country" && (
                          <View style={{ marginTop: 10 }}>
                            <Text style={[styles.fieldLabel, { fontSize: 13, color: "#666680" }]}>
                              Please specify your country
                            </Text>
                            <SmartTextInput
                              style={[
                                styles.input,
                                focusedInput === 'customCountry' && styles.inputFocused
                              ]}
                              placeholder="Enter your country name"
                              placeholderTextColor="#A0AABF"
                              value={customCountry}
                              onChangeText={setCustomCountry}
                              onFocus={() => setFocusedInput('customCountry')}
                              onBlur={() => setFocusedInput(null)}
                            />
                          </View>
                        )}
                      </View>

                      {/* Philippines-specific fields */}
                      {!isInternational && (
                        <>
                          <DropdownField
                            label="Region"
                            value={selectedRegion?.name || ""}
                            placeholder={locationLoading.regions ? "Loading..." : selectedLocation ? "Auto-detected from map" : "Select region"}
                            icon="map-outline"
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
                            placeholder={selectedRegion ? (selectedLocation ? "Auto-detected from map" : "Select province") : "Choose a region first"}
                            icon="navigate-outline"
                            onPress={() =>
                              openPicker({
                                title: "Select Province",
                                options: provinceOptions,
                                loadingKey: "provinces",
                                loadOptions: async () => getProvincesByRegion(selectedRegion?.code),
                                onSelect: handleSelectProvince,
                              })
                            }
                            disabled={loading || !selectedRegion || locationLoading.provinces}
                            loading={locationLoading.provinces}
                          />
                          
                          <DropdownField
                            label="Municipality / City"
                            value={selectedMunicipality?.name || ""}
                            placeholder={selectedProvince ? (selectedLocation ? "Auto-detected from map" : "Select city/municipality") : "Choose a province first"}
                            icon="location-outline"
                            onPress={() =>
                              openPicker({
                                title: "Select City / Municipality",
                                options: municipalityOptions,
                                loadingKey: "municipalities",
                                loadOptions: async () => getCitiesMunicipalitiesByProvince(selectedProvince?.code),
                                onSelect: handleSelectMunicipality,
                              })
                            }
                            disabled={loading || !selectedProvince || locationLoading.municipalities}
                            loading={locationLoading.municipalities}
                          />
                          
                          <DropdownField
                            label="Barangay"
                            value={selectedBarangay?.name || ""}
                            placeholder={selectedMunicipality ? (selectedLocation ? "Auto-detected from map" : "Select barangay") : "Choose a city/municipality first"}
                            icon="pin-outline"
                            onPress={() =>
                              openPicker({
                                title: "Select Barangay",
                                options: barangayOptions,
                                loadingKey: "barangays",
                                loadOptions: async () => getBarangaysByCityMunicipality(selectedMunicipality?.code),
                                onSelect: handleSelectBarangay,
                              })
                            }
                            disabled={loading || !selectedMunicipality || locationLoading.barangays}
                            loading={locationLoading.barangays}
                          />
                        </>
                      )}

                      {/* International fields - Only City and Street */}
                      {isInternational && (
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>City / Municipality</Text>
                          <SmartTextInput
                            style={[
                              styles.input,
                              focusedInput === 'internationalCity' && styles.inputFocused
                            ]}
                            placeholder={selectedLocation ? "Auto-detected from map" : "Enter city or municipality"}
                            placeholderTextColor="#A0AABF"
                            value={typeof selectedMunicipality === 'object' ? selectedMunicipality?.name || "" : selectedMunicipality || ""}
                            onChangeText={(text) => setSelectedMunicipality({ name: text, code: "INTL" })}
                            onFocus={() => setFocusedInput('internationalCity')}
                            onBlur={() => setFocusedInput(null)}
                          />
                        </View>
                      )}

                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Street / House No. (Optional)</Text>
                        <SmartTextInput
                          style={[
                            styles.input,
                            focusedInput === 'street' && styles.inputFocused
                          ]}
                          placeholder="Enter street or house number"
                          placeholderTextColor="#A0AABF"
                          value={street}
                          onChangeText={setStreet}
                          onFocus={() => {
                            setFocusedInput('street');
                            setTimeout(() => {
                              cardScrollViewRef.current?.scrollToEnd({ animated: true });
                            }, 100);
                          }}
                          onBlur={() => setFocusedInput(null)}
                        />
                      </View>

                      <View style={styles.fieldContainer}>
                        <Text style={styles.fieldLabel}>Zip Code</Text>
                        <SmartTextInput
                          style={[
                            styles.input,
                            focusedInput === 'zip' && styles.inputFocused
                          ]}
                          placeholder={selectedLocation ? "Auto-detected from map" : "Enter zip code"}
                          placeholderTextColor="#A0AABF"
                          value={zipCode}
                          onChangeText={setZipCode}
                          keyboardType="number-pad"
                          onFocus={() => {
                            setFocusedInput('zip');
                            setTimeout(() => {
                              cardScrollViewRef.current?.scrollToEnd({ animated: true });
                            }, 100);
                          }}
                          onBlur={() => setFocusedInput(null)}
                        />
                      </View>
                    </View>
                  )}

                  {/* Submit Button */}
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.button, loading && styles.buttonDisabled]}
                      onPress={handleSaveProfile}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <View style={styles.buttonContent}>
                        {loading ? (
                          <ActivityIndicator color="#32418C" size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color="#32418C" />
                            <Text style={[
                              styles.buttonText,
                              loading && styles.buttonTextDisabled
                            ]}>
                              {hasExistingSex && hasExistingDob && hasExistingAddress 
                                ? "Update Profile" 
                                : "Save & Continue"
                              }
                            </Text>
                          </>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.footerText}>
                    Your information helps us serve you better
                  </Text>
                </ScrollView>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>

      {/* Address Picker Modal */}
      <Modal
        visible={addressPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={closePicker}
      >
        <Pressable style={styles.modalBackdrop} onPress={closePicker}>
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{addressPickerTitle}</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={closePicker}
                >
                  <Ionicons name="close" size={18} color="#666680" />
                </TouchableOpacity>
              </View>

              {/* Only show search for pickers that allow it */}
              {addressPickerShowSearch && (
                <SmartTextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor="#A0AABF"
                  value={addressPickerQuery}
                  onChangeText={setAddressPickerQuery}
                  autoFocus
                />
              )}

              {addressPickerLoading ? (
                <View style={styles.modalLoadingState}>
                  <ActivityIndicator size="large" color="#32418C" />
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
                      No options found.
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
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {item.icon && (
                          <Ionicons 
                            name={item.icon} 
                            size={18} 
                            color="#32418C" 
                            style={{ marginRight: 10 }}
                          />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optionText}>{item.name}</Text>
                          {item.oldName ? (
                            <Text style={styles.optionSubtext}>
                              Formerly {item.oldName}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>

      {/* Date of Birth Picker Modal */}
      <Modal
        visible={dobPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDobPicker}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeDobPicker}>
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <Pressable
              style={[styles.modalCard, styles.dobModalCard]}
              onPress={() => {}}
            >
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date of Birth</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={closeDobPicker}
                >
                  <Ionicons name="close" size={18} color="#666680" />
                </TouchableOpacity>
              </View>
              
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
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownText}>
                      {getMonthLabel(dobDraft.getMonth())}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#32418C" />
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
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownText}>
                      {dobDraft.getFullYear()}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#32418C" />
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
                      selectedColor: "#32418C",
                    },
                  }}
                  maxDate={formatDob(new Date())}
                  theme={{
                    todayTextColor: "#32418C",
                    arrowColor: "#32418C",
                    selectedDayBackgroundColor: "#32418C",
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

      {/* DOB Selector Modal */}
      <Modal
        visible={dobSelectorVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDobSelector}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeDobSelector}>
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{dobSelectorTitle}</Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={closeDobSelector}
                >
                  <Ionicons name="close" size={18} color="#666680" />
                </TouchableOpacity>
              </View>
              
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

      {/* Map Modal */}
      <Modal
        visible={mapVisible}
        transparent
        animationType="slide"
        onRequestClose={closeMapModal}
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          >
            <View style={{ flex: 1 }} />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.modalCard,
              {
                maxHeight: "90%",
                minHeight: "70%",
                transform: [{ translateY: mapSlideAnim }],
              },
            ]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pin Your Location</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  Keyboard.dismiss();
                  closeMapModal();
                }}
              >
                <Ionicons name="close" size={18} color="#666680" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.fieldContainer}>
              <View
                style={[
                  styles.inputWrapper,
                  { marginBottom: 0, backgroundColor: "#F8F9FF" },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={18}
                  color="#A0AABF"
                  style={{ paddingLeft: 12 }}
                />
                <SmartTextInput
                  style={[styles.passwordInput, { flex: 1 }]}
                  placeholder="Search for a location or address..."
                  placeholderTextColor="#A0AABF"
                  value={mapSearchQuery}
                  onChangeText={(text) => {
                    setMapSearchQuery(text);
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current);
                    }
                    searchTimeoutRef.current = setTimeout(() => {
                      searchLocation(text);
                    }, 500);
                  }}
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    if (mapSearchQuery.trim()) {
                      searchLocation(mapSearchQuery);
                      Keyboard.dismiss();
                    }
                  }}
                />
                {mapSearchQuery.length > 0 && (
                  <TouchableOpacity
                    style={{ padding: 10 }}
                    onPress={() => {
                      setMapSearchQuery("");
                      setMapSearchResults([]);
                      setShowSearchResults(false);
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color="#A0AABF"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Search Results */}
            {showSearchResults && (
              <View
                style={{
                  maxHeight: 150,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1.5,
                  borderColor: "#E8EAFF",
                  borderRadius: 10,
                  marginBottom: 8,
                  overflow: "hidden",
                }}
              >
                {isSearching ? (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <ActivityIndicator size="small" color="#32418C" />
                    <Text
                      style={[
                        styles.locationLoadingText,
                        { marginTop: 8 },
                      ]}
                    >
                      Searching...
                    </Text>
                  </View>
                ) : mapSearchResults.length > 0 ? (
                  <ScrollView
                    style={{ maxHeight: 150 }}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                  >
                    {mapSearchResults.map((item, index) => (
                      <TouchableOpacity
                        key={`${item.place_id}-${index}`}
                        style={styles.optionRow}
                        onPress={() => selectSearchResult(item)}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons
                            name="location-outline"
                            size={16}
                            color="#32418C"
                            style={{ marginRight: 10 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={styles.optionText}
                              numberOfLines={1}
                            >
                              {item.display_name?.split(",")[0] ||
                                item.name ||
                                "Unknown location"}
                            </Text>
                            <Text
                              style={styles.optionSubtext}
                              numberOfLines={1}
                            >
                              {item.display_name
                                ?.split(",")
                                .slice(1)
                                .join(",")
                                .trim() || ""}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : mapSearchQuery.trim().length > 0 ? (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <Ionicons
                      name="search-outline"
                      size={24}
                      color="#A0AABF"
                    />
                    <Text
                      style={[
                        styles.emptyStateText,
                        { marginTop: 8 },
                      ]}
                    >
                      No locations found
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            <Text
              style={[
                styles.subtitle,
                {
                  marginBottom: 8,
                  marginTop: 4,
                  textAlign: "left",
                  paddingHorizontal: 0,
                  fontSize: 13,
                },
              ]}
            >
              Drag the map to place the center pin, then tap "Confirm Location".
            </Text>

            {/* Map Container */}
            <View
              style={[
                styles.mapContainer,
                { height: 230, flexShrink: 1 },
              ]}
            >
              {selectedLocation ? (
                <WebView
                  source={{
                    html: `<!DOCTYPE html>
                    <html>
                    <head>
                      <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=yes">
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
                      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                      <style>
                        *{margin:0;padding:0}
                        html,body,#map{width:100%;height:100%;overflow:hidden;touch-action:manipulation}
                        .leaflet-control-zoom{display:block!important}
                        .leaflet-control-zoom a{pointer-events:auto!important;cursor:pointer}
                        .center-pin{position:fixed;top:50%;left:50%;transform:translate(-50%,-100%);z-index:1000;pointer-events:none;font-size:36px;color:#32418C;text-shadow:0 2px 4px rgba(0,0,0,0.3)}
                        .coords-display{position:fixed;bottom:10px;left:10px;right:10px;background:rgba(255,255,255,0.9);padding:8px 12px;border-radius:8px;font-family:monospace;font-size:11px;text-align:center;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.15);pointer-events:none}
                      </style>
                    </head>
                    <body>
                      <div id="map"></div>
                      <div class="center-pin">📍</div>
                      <div class="coords-display" id="coords"></div>
                      <script>
                        var map=L.map('map',{zoomControl:true,attributionControl:false,dragging:true,tap:true,touchZoom:true,scrollWheelZoom:true}).setView([${selectedLocation.latitude},${selectedLocation.longitude}],16);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
                        function updateCoords(){var c=map.getCenter();document.getElementById('coords').textContent=c.lat.toFixed(6)+', '+c.lng.toFixed(6);window.ReactNativeWebView.postMessage(JSON.stringify({latitude:c.lat.toFixed(6),longitude:c.lng.toFixed(6)}))}
                        map.on('moveend',updateCoords);updateCoords();
                      </script>
                    </body>
                    </html>`,
                  }}
                  style={styles.map}
                  scrollEnabled={false}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  originWhitelist={["*"]}
                  mixedContentMode="always"
                  androidLayerType="hardware"
                  onMessage={(event) => {
                    try {
                      const data = JSON.parse(event.nativeEvent.data);
                      if (data.latitude && data.longitude) {
                        setSelectedLocation({
                          latitude: parseFloat(data.latitude),
                          longitude: parseFloat(data.longitude),
                        });
                      }
                    } catch (e) {}
                  }}
                />
              ) : (
                <View
                  style={[
                    styles.map,
                    {
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#F8F9FF",
                    },
                  ]}
                >
                  <ActivityIndicator size="large" color="#32418C" />
                  <Text
                    style={[
                      styles.locationLoadingText,
                      { marginTop: 12 },
                    ]}
                  >
                    Loading map...
                  </Text>
                </View>
              )}

              <View style={styles.mapControls}>
                <TouchableOpacity
                  onPress={getCurrentLocation}
                  style={{ padding: 8 }}
                  disabled={isLocatingAddress}
                >
                  <Ionicons
                    name="locate"
                    size={24}
                    color={isLocatingAddress ? "#A0AABF" : "#32418C"}
                  />
                </TouchableOpacity>
              </View>

              {isLocatingAddress && (
                <View style={styles.locationLoadingOverlay}>
                  <ActivityIndicator size="large" color="#32418C" />
                  <Text style={styles.locationLoadingText}>
                    Detecting address...
                  </Text>
                </View>
              )}
            </View>

            <View style={{ paddingBottom: 20 }}>
              <Text
                style={[
                  styles.coordinatesText,
                  { marginTop: 10, marginBottom: 6 },
                ]}
              >
                {selectedLocation
                  ? `📍 ${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`
                  : "Move the map to select your location"}
              </Text>

              {selectedLocation && (
                <TouchableOpacity
                  style={[styles.mapButton, { marginBottom: 10 }]}
                  onPress={() => {
                    const url = `https://www.openstreetmap.org/?mlat=${selectedLocation.latitude}&mlon=${selectedLocation.longitude}&zoom=18`;
                    Linking.openURL(url).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="open-outline"
                    size={18}
                    color="#32418C"
                  />
                  <Text style={styles.mapButtonText}>
                    Open in Maps App
                  </Text>
                </TouchableOpacity>
              )}

              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  marginTop: 4,
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.datePickerAction,
                    styles.datePickerCancel,
                    { flex: 1 },
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    closeMapModal();
                  }}
                >
                  <Text style={styles.datePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.datePickerAction,
                    styles.datePickerConfirm,
                    { flex: 1 },
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    confirmMapSelection();
                  }}
                  disabled={isLocatingAddress || !selectedLocation}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.datePickerConfirmText}>
                      Confirm
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

export default CompleteProfileScreen;
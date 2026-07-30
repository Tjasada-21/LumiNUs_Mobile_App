import React, { useEffect, useState, useRef } from "react";
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
  Animated,
  Keyboard,
  Modal,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
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
import { ThemedAlert } from "../components/ThemedAlert";
import { Calendar } from "react-native-calendars";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";
import { Linking } from "react-native";
import {
  getBarangaysByCityMunicipality,
  getCitiesMunicipalitiesByProvince,
  getProvincesByRegion,
  getRegions,
} from "../services/locationQueries";

import styles from "../styles/AccountSettingsScreen.styles";

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

const extractStoragePath = (url) => {
  if (!url) return "";
  const cleanUrl = stripCacheBuster(url);
  const marker = "/luminus_assets/";
  const markerIndex = cleanUrl.indexOf(marker);

  if (markerIndex !== -1) {
    return decodeURIComponent(cleanUrl.slice(markerIndex + marker.length));
  }

  if (!cleanUrl.startsWith("http")) {
    return decodeURIComponent(cleanUrl);
  }

  return "";
};

const toUint8Array = (arrayBuffer) => new Uint8Array(arrayBuffer);

const imageSourceToBytes = async (imageSource) => {
  if (imageSource?.base64) {
    const binaryString = global.atob ? global.atob(imageSource.base64) : "";
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

const findOptionByName = (options, name) => {
  if (!name || !options?.length) return null;
  const lowerName = name.toLowerCase().trim();
  
  const exact = options.find(
    (opt) => opt.name.toLowerCase().trim() === lowerName
  );
  if (exact) return exact;
  
  const includes = options.find(
    (opt) => {
      const optLower = opt.name.toLowerCase();
      return optLower.includes(lowerName) || lowerName.includes(optLower);
    }
  );
  if (includes) return includes;
  
  const nameWords = lowerName.split(/\s+/).filter(w => w.length > 2);
  if (nameWords.length > 0) {
    const wordMatch = options.find((opt) => {
      const optLower = opt.name.toLowerCase();
      return nameWords.some(word => optLower.includes(word));
    });
    if (wordMatch) return wordMatch;
  }
  
  const cleanedName = lowerName
    .replace(/^(city of |municipality of |the )/i, '')
    .replace(/( city| municipality)$/i, '')
    .trim();
  if (cleanedName !== lowerName) {
    const cleanedMatch = options.find(
      (opt) => opt.name.toLowerCase().includes(cleanedName) || cleanedName.includes(opt.name.toLowerCase())
    );
    if (cleanedMatch) return cleanedMatch;
  }
  
  return null;
};

// Dropdown Field Component
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

// Date of Birth helper functions
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
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pickingImage, setPickingImage] = useState(false);
  const [photoCooldownUntil, setPhotoCooldownUntil] = useState(0);
  const [photoCooldownSeconds, setPhotoCooldownSeconds] = useState(0);

  // Enhanced feature states
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [dobDraft, setDobDraft] = useState(new Date());
  const [dobCalendarFocusDate, setDobCalendarFocusDate] = useState(new Date());
  const [dobSelectorVisible, setDobSelectorVisible] = useState(false);
  const [dobSelectorTitle, setDobSelectorTitle] = useState("");
  const [dobSelectorOptions, setDobSelectorOptions] = useState([]);
  const [dobSelectorOnSelect, setDobSelectorOnSelect] = useState(null);

  // Address related states
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

  const [addressType, setAddressType] = useState("residential");
  const [isInternational, setIsInternational] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [customCountry, setCustomCountry] = useState("");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");

  const [existingAddressId, setExistingAddressId] = useState(null);
  const [pendingAddressData, setPendingAddressData] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Map related states
  const [mapVisible, setMapVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [focusedInput, setFocusedInput] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const mapSlideAnim = useRef(new Animated.Value(0)).current;
  const searchTimeoutRef = useRef(null);
  const cardScrollViewRef = useRef(null);

  // Sex and address type options
  const sexOptions = React.useMemo(
    () => [
      { code: "male", name: "Male", icon: "man-outline" },
      { code: "female", name: "Female", icon: "woman-outline" },
    ],
    []
  );

  const addressTypeOptions = React.useMemo(
    () => [
      {
        code: "residential",
        name: "Residential Address",
        icon: "home-outline",
      },
      {
        code: "business",
        name: "Work / Business / Commercial Address",
        icon: "business-outline",
      },
    ],
    []
  );

  const monthOptions = React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        code: `${index + 1}`,
        name: getMonthLabel(index),
        monthIndex: index,
      })),
    []
  );

  const yearOptions = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 1899 }, (_, index) => {
      const year = currentYear - index;
      return { code: `${year}`, name: `${year}`, year };
    });
  }, []);

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

  // Keyboard animations
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

  // Map modal keyboard handling
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

  // Load regions on mount
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        const regions = await getRegions();
        setRegionOptions(regions);
        await fetchAccountData({ showRefreshingState: false, regions });
      } catch (error) {
        console.error("Initialization error:", error);
        setErrorMessage("Unable to load account details right now.");
        setLoading(false);
      }
    };
    initializeData();
  }, []);

  // Handle pending address data when regions load
  useEffect(() => {
    if (regionOptions.length > 0 && pendingAddressData) {
      console.log("Processing pending address data...");
      prePopulatePhilippineAddress(
        pendingAddressData.region,
        pendingAddressData.province,
        pendingAddressData.municipality,
        pendingAddressData.barangay,
        regionOptions
      );
      setPendingAddressData(null);
    }
  }, [regionOptions]);

  const fetchAccountData = async ({ showRefreshingState = false, regions = null } = {}) => {
    try {
      if (showRefreshingState) setRefreshing(true);
      else if (!regions) setLoading(true);
      setErrorMessage("");

      const currentUser = await getCurrentUser();
      const userEmail = currentUser?.email;

      if (!userEmail) {
        setErrorMessage("No account email is stored for this session.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const data = await getAlumniByEmail(userEmail).catch(() => null);

      if (data?.id) {
        const { data: addr, error: addrError } = await supabase
          .from("addresses")
          .select("*")
          .eq("alumni_id", data.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!addrError && addr) {
          console.log("Address found:", addr);
          setExistingAddressId(addr.id);
          setAddressType(addr.address_type || "residential");
          setStreet(addr.street || "");
          setZipCode(addr.zip_code || "");

          if (addr.latitude && addr.longitude) {
            setSelectedLocation({
              latitude: parseFloat(addr.latitude),
              longitude: parseFloat(addr.longitude),
            });
          }

          const isPH =
            addr.region?.toLowerCase() === "philippines" ||
            addr.region?.toLowerCase().includes("philippines");
          setIsInternational(!isPH);

          if (isPH) {
            setSelectedCountry("Philippines");
            const availableRegions = regions || regionOptions;
            if (availableRegions.length > 0) {
              await prePopulatePhilippineAddress(
                addr.region,
                addr.province,
                addr.municipality,
                addr.barangay,
                availableRegions
              );
            } else {
              // Store for later when regions load
              setPendingAddressData({
                region: addr.region,
                province: addr.province,
                municipality: addr.municipality,
                barangay: addr.barangay,
              });
            }
          } else {
            setSelectedCountry(addr.region || "");
            if (addr.municipality) {
              setSelectedMunicipality({
                name: addr.municipality,
                code: "INTL",
              });
            }
          }
        } else {
          console.log("No address found for alumni");
        }
      }

      // Profile photo handling
      const livePhotoUrl = data?.id
        ? await getAlumniPhotoFromStorage(data.id).catch(() => null)
        : null;
      
      let basePhotoUrl = "";
      if (livePhotoUrl) {
        basePhotoUrl = stripCacheBuster(livePhotoUrl);
      } else if (data?.alumni_photo) {
        const rawPhoto = data.alumni_photo;
        if (rawPhoto.startsWith("http")) {
          basePhotoUrl = stripCacheBuster(rawPhoto);
        } else if (rawPhoto.startsWith("alumni_photos/") || rawPhoto.startsWith("luminus_assets/")) {
          const cleanPath = rawPhoto.replace(/^\/+/, "");
          basePhotoUrl = `https://pmnirrvwibzqjlutbnwz.supabase.co/storage/v1/object/public/luminus_assets/${cleanPath}`;
        } else {
          basePhotoUrl = rawPhoto;
        }
      }
      
      const photoVersion = data?.updated_at
        ? new Date(data.updated_at).getTime()
        : Date.now();
      const resolvedPhoto = basePhotoUrl
        ? toDisplayPhotoUrl(basePhotoUrl, photoVersion)
        : "";

      const enrichedData = data
        ? { ...data, alumni_photo: basePhotoUrl }
        : null;

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
      });

      const updatedAtMs = data?.updated_at
        ? new Date(data.updated_at).getTime()
        : 0;
      const cooldownUntil = updatedAtMs ? updatedAtMs + 60000 : 0;
      setPhotoCooldownUntil(cooldownUntil > Date.now() ? cooldownUntil : 0);
      
      setIsInitialLoad(false);
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      setErrorMessage("Unable to load account details right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

 const prePopulatePhilippineAddress = async (
  regionName,
  provinceName,
  municipalityName,
  barangayName,
  preloadedRegions = null
) => {
  try {
    console.log("Pre-populating address:", { regionName, provinceName, municipalityName, barangayName });
    
    const regions = preloadedRegions || regionOptions;
    if (!regions.length) {
      console.log("No regions available");
      return;
    }

    let matchedRegion = findOptionByName(regions, regionName);
    
    // FALLBACK: If region is "Philippines" or not found, try to find it by province
    if (!matchedRegion && provinceName && provinceName !== "N/A") {
      console.log("Region not found directly, trying to find by province:", provinceName);
      for (const region of regions) {
        try {
          const provinces = await getProvincesByRegion(region.code);
          const provinceMatch = findOptionByName(provinces, provinceName);
          if (provinceMatch) {
            matchedRegion = region;
            console.log("Found region by province:", region.name);
            break;
          }
        } catch (e) {
          // Continue checking other regions
        }
      }
    }

    if (!matchedRegion) {
      console.log("Region not found:", regionName);
      return;
    }

    console.log("Matched region:", matchedRegion.name);
    setSelectedRegion(matchedRegion);

    const provinces = await getProvincesByRegion(matchedRegion.code);
    setProvinceOptions(provinces);

    const matchedProvince = findOptionByName(provinces, provinceName);
    if (!matchedProvince) {
      console.log("Province not found:", provinceName);
      return;
    }

    console.log("Matched province:", matchedProvince.name);
    setSelectedProvince(matchedProvince);

    const municipalities = await getCitiesMunicipalitiesByProvince(
      matchedProvince.code
    );
    setMunicipalityOptions(municipalities);

    const matchedMunicipality = findOptionByName(
      municipalities,
      municipalityName
    );
    if (!matchedMunicipality) {
      console.log("Municipality not found:", municipalityName);
      return;
    }

    console.log("Matched municipality:", matchedMunicipality.name);
    setSelectedMunicipality(matchedMunicipality);

    const barangays = await getBarangaysByCityMunicipality(
      matchedMunicipality.code
    );
    setBarangayOptions(barangays);

    const matchedBarangay = findOptionByName(barangays, barangayName);
    if (matchedBarangay) {
      console.log("Matched barangay:", matchedBarangay.name);
      setSelectedBarangay(matchedBarangay);
    } else {
      console.log("Barangay not found:", barangayName);
    }
  } catch (error) {
    console.error("Error pre-populating Philippine address:", error);
  }
};

  useEffect(() => {
    if (!photoCooldownUntil) {
      setPhotoCooldownSeconds(0);
      return undefined;
    }
    const updateCooldown = () => {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((photoCooldownUntil - Date.now()) / 1000)
      );
      setPhotoCooldownSeconds(remainingSeconds);
      if (remainingSeconds === 0) setPhotoCooldownUntil(0);
    };
    updateCooldown();
    const intervalId = setInterval(updateCooldown, 1000);
    return () => clearInterval(intervalId);
  }, [photoCooldownUntil]);

  const handleRefresh = async () => {
    try {
      const regions = await getRegions();
      setRegionOptions(regions);
      await fetchAccountData({ showRefreshingState: true, regions });
    } catch (error) {
      await fetchAccountData({ showRefreshingState: true });
    }
  };

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  // ---------- PICKER FUNCTIONS ----------
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
          "Unable to load location options. Please try again."
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

  const filteredPickerOptions = React.useMemo(() => {
    if (!addressPickerShowSearch) return addressPickerOptions;
    const query = addressPickerQuery.trim().toLowerCase();
    if (!query) return addressPickerOptions;
    return addressPickerOptions.filter((item) => {
      const haystack = `${item.name || ""} ${item.oldName || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [addressPickerOptions, addressPickerQuery, addressPickerShowSearch]);

  // Address selection handlers
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
        "Unable to load provinces for that region."
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
        provinceItem.code
      );
      setMunicipalityOptions(nextMunicipalities);
    } catch (error) {
      ThemedAlert.alert(
        "Location Error",
        "Unable to load cities or municipalities for that province."
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
        municipalityItem.code
      );
      setBarangayOptions(nextBarangays);
    } catch (error) {
      ThemedAlert.alert(
        "Location Error",
        "Unable to load barangays for that city or municipality."
      );
    } finally {
      setLocationLoading((current) => ({ ...current, barangays: false }));
    }
  };

  const handleSelectBarangay = (barangayItem) => {
    setSelectedBarangay(barangayItem);
  };

  // ---------- DOB PICKER FUNCTIONS ----------
  const openDobPicker = () => {
    const nextDate = parseDobToDate(formData.date_of_birth);
    setDobDraft(nextDate);
    setDobCalendarFocusDate(nextDate);
    setDobPickerVisible(true);
  };

  const closeDobPicker = () => {
    setDobPickerVisible(false);
  };

  const confirmDob = () => {
    updateField("date_of_birth", formatDob(dobDraft));
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
      dobDraft.getDate()
    );
    setDobDraft(nextDate);
    setDobCalendarFocusDate(nextDate);
  };

  const handleSelectDobYear = (yearItem) => {
    const nextDate = buildDobDate(
      yearItem.year,
      dobDraft.getMonth(),
      dobDraft.getDate()
    );
    setDobDraft(nextDate);
    setDobCalendarFocusDate(nextDate);
  };

  // ---------- MAP FUNCTIONS ----------
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
      municipality:
        addr.city || addr.town || addr.municipality || addr.county || "",
      barangay:
        addr.suburb ||
        addr.village ||
        addr.neighbourhood ||
        addr.hamlet ||
        addr.quarter ||
        "",
      zipCode: addr.postcode || "",
      street: addr.road || addr.street || addr.pedestrian || "",
      houseNumber: addr.house_number || "",
      displayName: addressData.display_name || "",
    };
  };

  const matchAddressToOptions = async (parsedAddress) => {
    const isPhilippines =
      parsedAddress.country?.toLowerCase().includes("philippines") ||
      parsedAddress.country?.toLowerCase().includes("pilipinas");

    if (!isPhilippines) {
      setIsInternational(true);
      const countryMatch = countryOptions.find(
        (c) =>
          c.name.toLowerCase().includes(parsedAddress.country.toLowerCase()) ||
          parsedAddress.country.toLowerCase().includes(c.name.toLowerCase())
      );

      if (countryMatch) {
        setSelectedCountry(countryMatch.name);
        setCustomCountry("");
      } else {
        setSelectedCountry("Other Country");
        setCustomCountry(parsedAddress.country);
      }

      if (parsedAddress.municipality) {
        setSelectedMunicipality({
          name: parsedAddress.municipality,
          code: "INTL",
        });
      }
      if (parsedAddress.zipCode) setZipCode(parsedAddress.zipCode);
      if (parsedAddress.street || parsedAddress.houseNumber) {
        const streetAddress = [parsedAddress.houseNumber, parsedAddress.street]
          .filter(Boolean)
          .join(" ");
        setStreet(streetAddress);
      }
      return;
    }

    setIsInternational(false);
    setSelectedCountry("Philippines");

    if (parsedAddress.region && regionOptions.length > 0) {
      const regionMatch = findOptionByName(regionOptions, parsedAddress.region);
      if (regionMatch) {
        await handleSelectRegion(regionMatch);

        if (parsedAddress.province) {
          const provinces = await getProvincesByRegion(regionMatch.code);
          const provinceMatch = findOptionByName(
            provinces,
            parsedAddress.province
          );
          if (provinceMatch) {
            await handleSelectProvince(provinceMatch);

            if (parsedAddress.municipality) {
              const municipalities =
                await getCitiesMunicipalitiesByProvince(provinceMatch.code);
              const municipalityMatch = findOptionByName(
                municipalities,
                parsedAddress.municipality
              );
              if (municipalityMatch) {
                await handleSelectMunicipality(municipalityMatch);

                if (parsedAddress.barangay) {
                  const barangays = await getBarangaysByCityMunicipality(
                    municipalityMatch.code
                  );
                  const barangayMatch = findOptionByName(
                    barangays,
                    parsedAddress.barangay
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

    if (parsedAddress.zipCode) setZipCode(parsedAddress.zipCode);
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
      const addressData = await reverseGeocode(
        coordinate.latitude,
        coordinate.longitude
      );
      if (addressData) {
        const parsedAddress = parseAddressComponents(addressData);
        if (parsedAddress) {
          await matchAddressToOptions(parsedAddress);
        }
      }
    } catch (error) {
      console.error("Error processing location:", error);
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
          "Please enable location permissions to use this feature."
        );
        return;
      }

      setIsLocatingAddress(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setSelectedLocation({ latitude, longitude });
      await handleMapLocationSelect({ latitude, longitude });
    } catch (error) {
      ThemedAlert.alert(
        "Location Error",
        "Unable to get your current location. Please try again."
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

      const { storageUrl, displayUrl } = await replaceProfilePhoto(
        imageSource,
        alumniId
      );

      await updateAlumniProfile(alumniId, { alumni_photo: storageUrl });

      updateField("alumni_photo", displayUrl);
      setUserData((current) => ({
        ...(current || userData || {}),
        alumni_photo: storageUrl,
      }));
      setOriginalUserData((current) => ({
        ...(current || userData || {}),
        alumni_photo: storageUrl,
      }));
      setCurrentUserProfile((current) => ({
        ...(current || userData || {}),
        alumni_photo: displayUrl,
      }));
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
      setUserData((c) => (c ? { ...c, alumni_photo: "" } : c));
      setOriginalUserData((c) => (c ? { ...c, alumni_photo: "" } : c));
      setCurrentUserProfile((c) => (c ? { ...c, alumni_photo: "" } : c));
    } catch (err) {
      ThemedAlert.alert("Error", "Unable to remove photo.");
    } finally {
      setPickingImage(false);
    }
  };

  // ---------- SAVE ----------
  const handleSave = async () => {
    if (!userData?.id) {
      setErrorMessage("Missing the current account email.");
      return;
    }

    const compareBase = originalUserData || userData;

    const fields = [
      "first_name",
      "middle_name",
      "last_name",
      "phone_number",
      "email",
      "date_of_birth",
      "sex",
      "alumni_photo",
      "alumni_bio",
    ];

    const getChangedPayload = () => {
      const changes = {};
      fields.forEach((f) => {
        const newVal =
          f === "alumni_photo"
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
    const addressChanged = checkAddressChanged();

    if (Object.keys(changes).length === 0 && !addressChanged) {
      ThemedAlert.alert("No changes", "You have not modified any fields.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      if (Object.keys(changes).length > 0) {
        const updated = await updateAlumniProfile(userData.id, changes);
        const data = updated || null;

        if (data) {
          const basePhotoUrl = stripCacheBuster(data.alumni_photo ?? "");
          const photoVersion = data.updated_at
            ? new Date(data.updated_at).getTime()
            : Date.now();
          const displayPhotoUrl = basePhotoUrl
            ? toDisplayPhotoUrl(basePhotoUrl, photoVersion)
            : "";

          const refreshedEnrichedData = {
            ...data,
            alumni_photo: basePhotoUrl,
          };

          setUserData(refreshedEnrichedData);
          setOriginalUserData(refreshedEnrichedData);
          setCurrentUserProfile((current) => ({
            ...(current || data || {}),
            ...data,
            alumni_photo: displayPhotoUrl,
          }));
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
          });
        }
      }

      if (addressChanged && userData?.id) {
        const effectiveCountry =
          selectedCountry === "Other Country"
            ? customCountry || "Other Country"
            : selectedCountry || "Philippines";

            // In handleSave, modify the addressPayload:
            const addressPayload = {
              address_type: addressType || "residential",
              region: isInternational 
                ? effectiveCountry 
                : selectedRegion?.name || effectiveCountry, // Use selectedRegion.name for PH addresses
              province: isInternational
                ? "N/A"
                : selectedProvince?.name || "N/A",
              municipality: isInternational
                ? typeof selectedMunicipality === "object"
                  ? selectedMunicipality?.name || "N/A"
                  : selectedMunicipality || "N/A"
                : selectedMunicipality?.name || "N/A",
              barangay: isInternational
                ? "N/A"
                : selectedBarangay?.name || "N/A",
              street: street || "",
              zip_code: zipCode || "N/A",
              latitude: selectedLocation?.latitude || 0,
              longitude: selectedLocation?.longitude || 0,
            };

        if (existingAddressId) {
          const { error: updateError } = await supabase
            .from("addresses")
            .update(addressPayload)
            .eq("id", existingAddressId);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from("addresses")
            .insert([
              {
                ...addressPayload,
                alumni_id: userData.id,
              },
            ]);

          if (insertError) throw insertError;

          const { data: newAddr } = await supabase
            .from("addresses")
            .select("id")
            .eq("alumni_id", userData.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (newAddr?.id) {
            setExistingAddressId(newAddr.id);
          }
        }
      }

      ThemedAlert.alert(
        "Success",
        "Your profile has been updated successfully.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack()
          }
        ]
      );
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

  const checkAddressChanged = () => {
    if (!existingAddressId && !selectedCountry && !selectedLocation) {
      return false;
    }
    return true;
  };

  // ---------- DERIVED VALUES ----------
  const profileName = userData
    ? [formData.first_name, formData.middle_name, formData.last_name]
        .filter(Boolean)
        .join(" ")
    : "Alumni";
  const profileImageUri = getAvatarUri(profileName, stripCacheBuster(formData.alumni_photo));
  const formDisabled = loading || saving;

  const countryDisplayValue =
    selectedCountry === "Other Country"
      ? customCountry || "Other Country"
      : selectedCountry;

  const internationalCityDisplay =
    typeof selectedMunicipality === "object"
      ? selectedMunicipality?.name || ""
      : selectedMunicipality || "";

  // ---------- RENDER ----------
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
                keyboardVisible && { paddingVertical: 16 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#32418C"
                />
              }
            >
              <Animated.View
                style={[
                  styles.cardContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
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

                  {/* Back Button */}
                  <TouchableOpacity
                    style={{
                      position: "absolute",
                      top: 20,
                      left: 20,
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "#F8F9FF",
                      justifyContent: "center",
                      alignItems: "center",
                      zIndex: 10,
                    }}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={20} color="#32418C" />
                  </TouchableOpacity>

                  {/* Header Section */}
                  <View style={styles.headerSection}>
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="settings-outline"
                        size={28}
                        color="#32418C"
                      />
                    </View>
                    <Text style={styles.title}>Edit Profile</Text>
                    <Text style={styles.subtitle}>
                      Update your personal information and account details
                    </Text>
                  </View>

                  {loading && !refreshing ? (
                    <ActivityIndicator
                      size="large"
                      color="#32418C"
                      style={{ marginVertical: 40 }}
                    />
                  ) : (
                    <>
                      {/* AVATAR SECTION */}
                      <View style={{ alignItems: "center", marginBottom: 24 }}>
                        <Image
                          source={{ uri: profileImageUri }}
                          style={{
                            width: 100,
                            height: 100,
                            borderRadius: 50,
                            borderWidth: 3,
                            borderColor: "#FBD117",
                          }}
                        />
                        <TouchableOpacity
                          style={{
                            marginTop: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "#F8F9FF",
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            borderWidth: 1.5,
                            borderColor: "#E8EAFF",
                          }}
                          activeOpacity={0.8}
                          disabled={
                            formDisabled ||
                            pickingImage ||
                            photoCooldownSeconds > 0
                          }
                          onPress={() => {
                            if (photoCooldownSeconds > 0)
                              return ThemedAlert.alert(
                                "Cooldown",
                                `Please wait ${photoCooldownSeconds}s.`
                              );
                            ThemedAlert.alert(
                              "Profile Photo",
                              "Choose an option",
                              [
                                {
                                  text: "Upload New Photo",
                                  onPress: async () => {
                                    try {
                                      setPickingImage(true);
                                      const result =
                                        await ImagePicker.launchImageLibraryAsync(
                                          {
                                            mediaTypes: ["images"],
                                            allowsEditing: false,
                                            base64: true,
                                            quality: 0.75,
                                          }
                                        );
                                      const rawAsset =
                                        result.assets?.[0] ??
                                        (result.uri
                                          ? {
                                              uri: result.uri,
                                              base64: result.base64,
                                            }
                                          : null);
                                      if (rawAsset?.uri) {
                                        await uploadImage({
                                          uri: rawAsset.uri,
                                          base64: rawAsset.base64,
                                          name: `profile-${Date.now()}.${rawAsset.uri.split(".").pop() || "jpg"}`,
                                          type: getImageMimeType(rawAsset.uri),
                                        });
                                      } else {
                                        throw new Error(
                                          "No image was selected."
                                        );
                                      }
                                    } catch (err) {
                                      ThemedAlert.alert(
                                        "Error",
                                        err?.message
                                          ? `Unable to process image: ${err.message}`
                                          : "Unable to process image."
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
                              ],
                              { cancelable: true }
                            );
                          }}
                        >
                          {pickingImage ? (
                            <ActivityIndicator size="small" color="#32418C" />
                          ) : (
                            <Ionicons
                              name="camera"
                              size={16}
                              color="#32418C"
                              style={{ marginRight: 6 }}
                            />
                          )}
                          <Text
                            style={{
                              fontFamily: "Poppins-Medium",
                              fontSize: 13,
                              color: "#32418C",
                            }}
                          >
                            {photoCooldownSeconds > 0
                              ? `Wait ${photoCooldownSeconds}s`
                              : "Change Photo"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* BASIC INFORMATION */}
                      <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                          <View style={styles.sectionNumber}>
                            <Text style={styles.sectionNumberText}>1</Text>
                          </View>
                          <Text style={styles.sectionTitle}>
                            Basic Information
                          </Text>
                        </View>

                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Last Name</Text>
                          <SmartTextInput
                            value={formData.last_name}
                            onChangeText={(val) =>
                              updateField("last_name", val)
                            }
                            style={[
                              styles.input,
                              focusedInput === "last_name" &&
                                styles.inputFocused,
                            ]}
                            editable={!formDisabled}
                            onFocus={() => setFocusedInput("last_name")}
                            onBlur={() => setFocusedInput(null)}
                          />
                        </View>

                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>First Name</Text>
                          <SmartTextInput
                            value={formData.first_name}
                            onChangeText={(val) =>
                              updateField("first_name", val)
                            }
                            style={[
                              styles.input,
                              focusedInput === "first_name" &&
                                styles.inputFocused,
                            ]}
                            editable={!formDisabled}
                            onFocus={() => setFocusedInput("first_name")}
                            onBlur={() => setFocusedInput(null)}
                          />
                        </View>

                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Middle Name</Text>
                          <SmartTextInput
                            value={formData.middle_name}
                            onChangeText={(val) =>
                              updateField("middle_name", val)
                            }
                            style={[
                              styles.input,
                              focusedInput === "middle_name" &&
                                styles.inputFocused,
                            ]}
                            editable={!formDisabled}
                            onFocus={() => setFocusedInput("middle_name")}
                            onBlur={() => setFocusedInput(null)}
                          />
                        </View>
                      </View>

                      {/* PERSONAL DETAILS */}
                      <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                          <View style={styles.sectionNumber}>
                            <Text style={styles.sectionNumberText}>2</Text>
                          </View>
                          <Text style={styles.sectionTitle}>
                            Personal Details
                          </Text>
                        </View>

                        <DropdownField
                          label="Date of Birth"
                          value={
                            formData.date_of_birth
                              ? formatDate(formData.date_of_birth)
                              : ""
                          }
                          placeholder="Select your date of birth"
                          icon="calendar-outline"
                          onPress={openDobPicker}
                          disabled={formDisabled}
                          loading={false}
                        />

                        <DropdownField
                          label="Sex"
                          value={
                            formData.sex
                              ? String(formData.sex).charAt(0).toUpperCase() +
                                String(formData.sex).slice(1)
                              : ""
                          }
                          placeholder="Select your sex"
                          icon={
                            formData.sex === "male"
                              ? "man"
                              : formData.sex === "female"
                                ? "woman"
                                : "person-outline"
                          }
                          onPress={() =>
                            openPicker({
                              title: "Select Sex",
                              options: sexOptions,
                              onSelect: (item) =>
                                updateField("sex", item.name.toLowerCase()),
                              showSearch: false,
                            })
                          }
                          disabled={formDisabled}
                          loading={false}
                        />

                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>
                            Mobile Number (Optional)
                          </Text>
                          <SmartTextInput
                            value={formData.phone_number}
                            onChangeText={(val) =>
                              updateField("phone_number", val)
                            }
                            style={[
                              styles.input,
                              focusedInput === "phone" && styles.inputFocused,
                            ]}
                            keyboardType="phone-pad"
                            editable={!formDisabled}
                            onFocus={() => setFocusedInput("phone")}
                            onBlur={() => setFocusedInput(null)}
                          />
                        </View>

                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>
                            Personal Email Address
                          </Text>
                          <SmartTextInput
                            value={formData.email}
                            onChangeText={(val) => updateField("email", val)}
                            style={[
                              styles.input,
                              focusedInput === "email" && styles.inputFocused,
                            ]}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!formDisabled}
                            onFocus={() => setFocusedInput("email")}
                            onBlur={() => setFocusedInput(null)}
                          />
                          <Text
                            style={{
                              fontFamily: "Poppins-Italic",
                              fontSize: 11,
                              color: "#A0AABF",
                              marginTop: 4,
                            }}
                          >
                            Your Personal Email Address will be used for
                            One-Time Passwords
                          </Text>
                        </View>
                      </View>

                      {/* PROFILE INFORMATION */}
                      <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                          <View style={styles.sectionNumber}>
                            <Text style={styles.sectionNumberText}>3</Text>
                          </View>
                          <Text style={styles.sectionTitle}>
                            Profile Information
                          </Text>
                        </View>

                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Biography</Text>
                          <SmartTextInput
                            value={formData.alumni_bio}
                            onChangeText={(val) => {
                              if (val.length <= 500)
                                updateField("alumni_bio", val);
                            }}
                            style={[
                              styles.input,
                              focusedInput === "bio" && styles.inputFocused,
                              {
                                minHeight: 100,
                                textAlignVertical: "top",
                              },
                            ]}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                            editable={!formDisabled}
                            onFocus={() => setFocusedInput("bio")}
                            onBlur={() => setFocusedInput(null)}
                          />
                          <Text
                            style={{
                              fontFamily: "Poppins-Regular",
                              fontSize: 11,
                              color: "#A0AABF",
                              textAlign: "right",
                              marginTop: 4,
                            }}
                          >
                            Maximum of 500 characters only.
                          </Text>
                        </View>
                      </View>

                      {/* ADDRESS DETAILS */}
                      <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                          <View style={styles.sectionNumber}>
                            <Text style={styles.sectionNumberText}>4</Text>
                          </View>
                          <Text style={styles.sectionTitle}>
                            Address Details
                          </Text>
                        </View>

                        <DropdownField
                          label="Address Type"
                          value={
                            addressType === "residential"
                              ? "Residential Address"
                              : addressType === "business"
                                ? "Work / Business / Commercial Address"
                                : ""
                          }
                          placeholder="Select address type"
                          icon="home-outline"
                          onPress={() =>
                            openPicker({
                              title: "Select Address Type",
                              options: addressTypeOptions,
                              onSelect: (item) => setAddressType(item.code),
                              showSearch: false,
                            })
                          }
                          disabled={formDisabled}
                          loading={false}
                        />

                        {/* Map Location Picker */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>
                            Pin Your Location
                          </Text>
                          <TouchableOpacity
                            style={styles.mapButton}
                            onPress={openMapModal}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="map-outline"
                              size={20}
                              color="#32418C"
                            />
                            <Text style={styles.mapButtonText}>
                              {selectedLocation
                                ? "📍 Change Location on Map"
                                : "📍 Select Location on Map"}
                            </Text>
                          </TouchableOpacity>

                          {selectedLocation && (
                            <Text style={styles.coordinatesText}>
                              Coordinates:{" "}
                              {selectedLocation.latitude.toFixed(6)},{" "}
                              {selectedLocation.longitude.toFixed(6)}
                            </Text>
                          )}
                        </View>

                        {/* Country of Residence */}
                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>
                            Country of Residence
                          </Text>
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
                            disabled={formDisabled}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="globe-outline"
                              size={18}
                              color={
                                selectedCountry ? "#32418C" : "#A0AABF"
                              }
                              style={{ marginRight: 10 }}
                            />
                            <Text
                              style={[
                                styles.dropdownText,
                                !selectedCountry &&
                                  styles.dropdownPlaceholder,
                              ]}
                              numberOfLines={1}
                            >
                              {countryDisplayValue ||
                                "Select your country"}
                            </Text>
                            <Ionicons
                              name="chevron-down"
                              size={18}
                              color="#32418C"
                            />
                          </TouchableOpacity>

                          {selectedCountry === "Other Country" && (
                            <View style={{ marginTop: 10 }}>
                              <Text
                                style={[
                                  styles.fieldLabel,
                                  { fontSize: 13, color: "#666680" },
                                ]}
                              >
                                Please specify your country
                              </Text>
                              <SmartTextInput
                                style={[
                                  styles.input,
                                  focusedInput === "customCountry" &&
                                    styles.inputFocused,
                                ]}
                                placeholder="Enter your country name"
                                placeholderTextColor="#A0AABF"
                                value={customCountry}
                                onChangeText={setCustomCountry}
                                onFocus={() =>
                                  setFocusedInput("customCountry")
                                }
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
                              placeholder={
                                locationLoading.regions
                                  ? "Loading..."
                                  : "Select region"
                              }
                              icon="map-outline"
                              onPress={() =>
                                openPicker({
                                  title: "Select Region",
                                  options: regionOptions,
                                  loadingKey: "regions",
                                  onSelect: handleSelectRegion,
                                })
                              }
                              disabled={
                                formDisabled || locationLoading.regions
                              }
                              loading={locationLoading.regions}
                            />

                            <DropdownField
                              label="Province"
                              value={selectedProvince?.name || ""}
                              placeholder={
                                selectedRegion
                                  ? "Select province"
                                  : "Choose a region first"
                              }
                              icon="navigate-outline"
                              onPress={() =>
                                openPicker({
                                  title: "Select Province",
                                  options: provinceOptions,
                                  loadingKey: "provinces",
                                  loadOptions: async () =>
                                    getProvincesByRegion(
                                      selectedRegion?.code
                                    ),
                                  onSelect: handleSelectProvince,
                                })
                              }
                              disabled={
                                formDisabled ||
                                !selectedRegion ||
                                locationLoading.provinces
                              }
                              loading={locationLoading.provinces}
                            />

                            <DropdownField
                              label="Municipality / City"
                              value={selectedMunicipality?.name || ""}
                              placeholder={
                                selectedProvince
                                  ? "Select city/municipality"
                                  : "Choose a province first"
                              }
                              icon="location-outline"
                              onPress={() =>
                                openPicker({
                                  title: "Select City / Municipality",
                                  options: municipalityOptions,
                                  loadingKey: "municipalities",
                                  loadOptions: async () =>
                                    getCitiesMunicipalitiesByProvince(
                                      selectedProvince?.code
                                    ),
                                  onSelect: handleSelectMunicipality,
                                })
                              }
                              disabled={
                                formDisabled ||
                                !selectedProvince ||
                                locationLoading.municipalities
                              }
                              loading={locationLoading.municipalities}
                            />

                            <DropdownField
                              label="Barangay"
                              value={selectedBarangay?.name || ""}
                              placeholder={
                                selectedMunicipality
                                  ? "Select barangay"
                                  : "Choose a city/municipality first"
                              }
                              icon="pin-outline"
                              onPress={() =>
                                openPicker({
                                  title: "Select Barangay",
                                  options: barangayOptions,
                                  loadingKey: "barangays",
                                  loadOptions: async () =>
                                    getBarangaysByCityMunicipality(
                                      selectedMunicipality?.code
                                    ),
                                  onSelect: handleSelectBarangay,
                                })
                              }
                              disabled={
                                formDisabled ||
                                !selectedMunicipality ||
                                locationLoading.barangays
                              }
                              loading={locationLoading.barangays}
                            />
                          </>
                        )}

                        {/* International fields */}
                        {isInternational && (
                          <View style={styles.fieldContainer}>
                            <Text style={styles.fieldLabel}>
                              City / Municipality
                            </Text>
                            <SmartTextInput
                              style={[
                                styles.input,
                                focusedInput === "internationalCity" &&
                                  styles.inputFocused,
                              ]}
                              placeholder="Enter city or municipality"
                              placeholderTextColor="#A0AABF"
                              value={internationalCityDisplay}
                              onChangeText={(text) =>
                                setSelectedMunicipality({
                                  name: text,
                                  code: "INTL",
                                })
                              }
                              onFocus={() =>
                                setFocusedInput("internationalCity")
                              }
                              onBlur={() => setFocusedInput(null)}
                            />
                          </View>
                        )}

                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>
                            Street / House No. (Optional)
                          </Text>
                          <SmartTextInput
                            style={[
                              styles.input,
                              focusedInput === "street" &&
                                styles.inputFocused,
                            ]}
                            placeholder="Enter street or house number"
                            placeholderTextColor="#A0AABF"
                            value={street}
                            onChangeText={setStreet}
                            onFocus={() => setFocusedInput("street")}
                            onBlur={() => setFocusedInput(null)}
                          />
                        </View>

                        <View style={styles.fieldContainer}>
                          <Text style={styles.fieldLabel}>Zip Code</Text>
                          <SmartTextInput
                            style={[
                              styles.input,
                              focusedInput === "zip" && styles.inputFocused,
                            ]}
                            placeholder="Enter zip code"
                            placeholderTextColor="#A0AABF"
                            value={zipCode}
                            onChangeText={setZipCode}
                            keyboardType="number-pad"
                            onFocus={() => setFocusedInput("zip")}
                            onBlur={() => setFocusedInput(null)}
                          />
                        </View>
                      </View>

                      {/* USER REMINDERS */}
                      <View
                        style={{
                          backgroundColor: "#F8F9FF",
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 20,
                          borderWidth: 1.5,
                          borderColor: "#E8EAFF",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Poppins-SemiBold",
                            fontSize: 13,
                            color: "#32418C",
                            marginBottom: 8,
                          }}
                        >
                          User Reminders:
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Poppins-Regular",
                            fontSize: 12,
                            color: "#666680",
                            lineHeight: 18,
                          }}
                        >
                          Other Alumni Information such as Program, Year of
                          Graduation will be displayed in your Alumni Profile,
                          and will be visible to other users.
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Poppins-Regular",
                            fontSize: 12,
                            color: "#666680",
                            lineHeight: 18,
                            marginTop: 8,
                          }}
                        >
                          Your Job/Occupation information will also be
                          displayed once you've completed the initial account
                          activation process. Failure to complete the process
                          will limit you in accessing other LumiNUs modules.
                        </Text>
                      </View>

                      {/* ACTION BUTTONS */}
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            minHeight: 48,
                            borderRadius: 12,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#F8F9FF",
                            borderWidth: 1.5,
                            borderColor: "#E8EAFF",
                          }}
                          onPress={() => navigation.goBack()}
                          disabled={formDisabled}
                        >
                          <Text
                            style={{
                              color: "#666680",
                              fontSize: 15,
                              fontFamily: "Poppins-SemiBold",
                            }}
                          >
                            Discard
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.button,
                            { flex: 1, marginTop: 0 },
                            formDisabled && styles.buttonDisabled,
                          ]}
                          onPress={handleSave}
                          disabled={formDisabled}
                        >
                          <View style={styles.buttonContent}>
                            {saving ? (
                              <ActivityIndicator color="#32418C" />
                            ) : (
                              <>
                                <Ionicons
                                  name="checkmark-circle"
                                  size={20}
                                  color="#32418C"
                                />
                                <Text
                                  style={[
                                    styles.buttonText,
                                    formDisabled &&
                                      styles.buttonTextDisabled,
                                  ]}
                                >
                                  Save
                                </Text>
                              </>
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.footerText}>
                        Your information helps us serve you better
                      </Text>
                    </>
                  )}
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
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
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
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color="#32418C"
                    />
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
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color="#32418C"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.datePickerWrap}>
                <Calendar
                  key={formatDob(dobCalendarFocusDate).slice(0, 7)}
                  current={formatDob(dobCalendarFocusDate)}
                  onDayPress={(day) => {
                    const nextDate = new Date(
                      day.year,
                      day.month - 1,
                      day.day
                    );
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
              Drag the map to place the center pin, then tap "Confirm
              Location".
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
                      Confirm Location
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

export default AccountSettingsScreen;
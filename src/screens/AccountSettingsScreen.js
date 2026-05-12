import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, useWindowDimensions, Platform } from 'react-native';
import SmartTextInput from '../components/SmartTextInput';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAlumniByEmail, uploadAlumniPhoto, updateAlumniProfile, removeAlumniPhoto, getAlumniPhotoFromStorage } from '../services/alumniQueries';
import supabase from '../services/supabase';
import { getCurrentUser } from '../services/supabaseAuth';
import { clearAuthCredentials } from '../services/authStorage';
import { getAvatarUri } from '../utils/imageUtils';
import { useCurrentUserProfile } from '../context/CurrentUserProfileContext';
import BrandHeader from '../components/BrandHeader';
import styles from '../styles/AccountSettingsScreen.styles';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedAlert } from '../components/ThemedAlert';

const formatDate = (value) => {
  if (!value) return '—';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate);
};

const normalizeDateOnly = (value) => {
  if (!value) return '';

  const raw = String(value).trim();
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

  const parsedDate = new Date(raw);
  if (Number.isNaN(parsedDate.getTime())) {
    return raw;
  }

  return parsedDate.toISOString().slice(0, 10);
};

// Helper function to resolve MIME types for the FormData object
const getImageMimeType = (uri) => {
  const extension = uri.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png': return 'image/png';
    case 'heic': return 'image/heic';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
};

const AccountSettingsScreen = ({ navigation }) => {
  const { setCurrentUserProfile } = useCurrentUserProfile();
  // SECTION: Screen layout values
  const { width } = useWindowDimensions();
  const isCompactWidth = width < 390;
  const isTablet = width >= 768;
  const layout = {
    headerLogoWidth: isTablet ? 176 : isCompactWidth ? 124 : 146,
    headerLogoHeight: isTablet ? 48 : isCompactWidth ? 32 : 36,
    profileSize: isTablet ? 144 : isCompactWidth ? 110 : 126,
    cardPadding: isCompactWidth ? 14 : 16,
  };

  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    date_of_birth: '',
    sex: '',
    alumni_photo: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pickingImage, setPickingImage] = useState(false);
  const [dobPickerVisible, setDobPickerVisible] = useState(false);
  const [dobDate, setDobDate] = useState(() => {
    const initial = '';
    return initial ? new Date(initial) : new Date(1990, 0, 1);
  });
  const [dobTouched, setDobTouched] = useState(false);
  const [photoCooldownUntil, setPhotoCooldownUntil] = useState(0);
  const [photoCooldownSeconds, setPhotoCooldownSeconds] = useState(0);

  const fetchAccountData = async ({ showRefreshingState = false } = {}) => {
    try {
      if (showRefreshingState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage('');

      const currentUser = await getCurrentUser();
      const userEmail = currentUser?.email;

      if (!userEmail) {
        setErrorMessage('No account email is stored for this session.');
        return;
      }

      const data = await getAlumniByEmail(userEmail).catch((err) => {
        console.error('Failed to load alumni profile by email:', err);
        return null;
      });

      const livePhotoUrl = data?.id ? await getAlumniPhotoFromStorage(data.id).catch(() => null) : null;
      const resolvedPhoto = livePhotoUrl ?? data?.alumni_photo ?? '';

      setUserData(data);
      setFormData({
        first_name: data?.first_name || '',
        middle_name: data?.middle_name || '',
        last_name: data?.last_name || '',
        phone_number: data?.phone_number || '',
        email: data?.email || userEmail,
        date_of_birth: normalizeDateOnly(data?.date_of_birth),
        sex: data?.sex || '',
        alumni_photo: resolvedPhoto,
      });

      const updatedAtMs = data?.updated_at ? new Date(data.updated_at).getTime() : 0;
      const cooldownUntil = updatedAtMs ? updatedAtMs + 60000 : 0;
      setPhotoCooldownUntil(cooldownUntil > Date.now() ? cooldownUntil : 0);
    } catch (fetchError) {
      console.error('Failed to fetch account settings:', fetchError);
      setErrorMessage('Unable to load account details right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // SECTION: Load account data
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

      if (remainingSeconds === 0) {
        setPhotoCooldownUntil(0);
      }
    };

    updateCooldown();
    const intervalId = setInterval(updateCooldown, 1000);

    return () => clearInterval(intervalId);
  }, [photoCooldownUntil]);

  const handleRefresh = () => {
    fetchAccountData({ showRefreshingState: true });
  };

  // HANDLER: Update a single form field
  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // HANDLER: Upload a selected profile image
  const uploadImage = async (imageSource) => {
    try {
      // Use Supabase storage helper to upload the photo and return a hosted URL
      const alumniId = userData?.id;
      const uploadedUrl = alumniId ? await uploadAlumniPhoto(alumniId, imageSource) : null;
      if (!uploadedUrl) throw new Error('No url returned from upload');
      setFormData((current) => ({
        ...current,
        alumni_photo: uploadedUrl,
      }));
      setUserData((current) => (current ? { ...current, alumni_photo: uploadedUrl } : current));
      setCurrentUserProfile((current) => (current ? { ...current, alumni_photo: uploadedUrl } : current));
      setPhotoCooldownUntil(Date.now() + 60000);
      return uploadedUrl;
    } catch (err) {
      throw err;
    }
  };

  // HANDLER: Save the profile changes
  const handleSave = async () => {
    if (!userData?.id) {
      setErrorMessage('Missing the current account email.');
      return;
    }

    const fields = ['first_name', 'middle_name', 'last_name', 'phone_number', 'email', 'date_of_birth', 'sex', 'alumni_photo'];

    const getChangedPayload = () => {
      const changes = {};
      fields.forEach((f) => {
        const newVal = (formData[f] ?? '').trim();
        const oldValRaw = userData?.[f];

        if (f === 'date_of_birth') {
          const oldDate = normalizeDateOnly(userData?.date_of_birth);
          if (newVal !== oldDate) changes[f] = newVal;
        } else {
          if (newVal !== (oldValRaw ?? '')) changes[f] = newVal;
        }
      });
      return changes;
    };

    const changes = getChangedPayload();

    if (Object.keys(changes).length === 0) {
      ThemedAlert.alert('No changes', 'You have not modified any fields.');
      return;
    }

    const fieldLabels = {
      first_name: 'First Name',
      middle_name: 'Middle Name',
      last_name: 'Last Name',
      phone_number: 'Mobile Number',
      email: 'Email',
      date_of_birth: 'Date of Birth',
      sex: 'Gender',
      alumni_photo: 'Profile Photo URL',
    };

    const changedNames = Object.keys(changes).map((k) => fieldLabels[k] || k).join(', ');

    ThemedAlert.alert(
      'Confirm Save',
      `Save changes to: ${changedNames}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            try {
              setSaving(true);
              setErrorMessage('');

              const updated = await updateAlumniProfile(userData.id, changes).catch((err) => {
                console.error('Failed to update profile:', err);
                return null;
              });

              const data = updated || null;

              if (data) {
                setUserData(data);
                setCurrentUserProfile(data);
                setFormData({
                  first_name: data.first_name || '',
                  middle_name: data.middle_name || '',
                  last_name: data.last_name || '',
                  phone_number: data.phone_number || '',
                  email: data.email || '',
                  date_of_birth: normalizeDateOnly(data.date_of_birth),
                  sex: data.sex || '',
                  alumni_photo: data.alumni_photo || '',
                });
              }

              ThemedAlert.alert('Saved', 'Your account details were updated successfully.');
            } catch (saveError) {
              console.error('Failed to save account settings:', saveError);
              const serverData = saveError.response?.data;
              let friendly = 'Unable to save account details right now.';

              if (serverData?.errors) {
                const firstKey = Object.keys(serverData.errors)[0];
                friendly = serverData.errors[firstKey]?.[0] || friendly;
              } else if (serverData?.message) {
                friendly = serverData.message;
              }

              setErrorMessage(friendly);
            } finally {
              setSaving(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDisableAccount = () => {
    if (!userData?.id) {
      setErrorMessage('Missing the current account email.');
      return;
    }

    ThemedAlert.alert(
      'Disable Account',
      'This will disable your account and sign you out immediately. You will need support help to use this account again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              setDisabling(true);
              setErrorMessage('');

              const updated = await updateAlumniProfile(userData.id, {
                account_status: 2,
              });

              setUserData(updated || userData);
              setCurrentUserProfile(null);

              await clearAuthCredentials();

              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (disableError) {
              console.error('Failed to disable account:', disableError);
              setErrorMessage('Could not disable account right now.');
              ThemedAlert.alert('Error', 'Could not disable account right now.');
            } finally {
              setDisabling(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleEmailAction = async () => {
    if (!formData.email) {
      ThemedAlert.alert('No email', 'No email address is set for this account.');
      return;
    }

    if (verificationStatus === 'verified') {
      ThemedAlert.alert('Already verified', 'Your email is already verified.');
      return;
    }

    try {
      // Attempt to send a magic link / OTP to the user's email to prompt verification
      const normalized = String(formData.email || '').trim().toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({ email: normalized });
      if (error) {
        console.error('[AccountSettings] Failed to send verification email:', error.message || error);
        ThemedAlert.alert('Failed', 'Could not send verification email. Please try again later.');
        return;
      }

      ThemedAlert.alert('Verification sent', 'A verification email has been sent to your address. Check your inbox and follow the instructions.');
    } catch (err) {
      console.error('[AccountSettings] Error sending verification:', err);
      ThemedAlert.alert('Error', 'Unable to send verification email right now.');
    }
  };

  const profileName = userData
    ? [formData.first_name, formData.middle_name, formData.last_name].filter(Boolean).join(' ')
    : 'Alumni';

  const profileImageUri = getAvatarUri(profileName, formData.alumni_photo);

  const verificationStatus = userData?.verification_status || 'pending';
  const phoneStatusText = verificationStatus === 'verified' ? 'Verified' : 'Unverified';
  const emailActionText = verificationStatus === 'verified' ? 'Verified' : 'Verify Email';
  const formDisabled = loading || saving || disabling;
  const photoChangeDisabled = pickingImage || formDisabled;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <BrandHeader />

        {/* SECTION: Account form */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#31429B"
              colors={['#31429B']}
            />
          }
        >
          {/* SECTION: Navigation buttons */}
          <View style={styles.navButtonRow}>
            <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#31429B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeButton} activeOpacity={0.8} onPress={() => navigation.navigate('Home')}>
              <Ionicons name="home-outline" size={24} color="#31429B" />
            </TouchableOpacity>
          </View>

          {/* SECTION: Profile photo */}
          <View style={styles.profileWrap}>
            <Image
              key={profileImageUri}
              source={{ uri: profileImageUri }}
              style={[styles.profileImage, { width: layout.profileSize, height: layout.profileSize, borderRadius: layout.profileSize / 2 }]}
            />
            <TouchableOpacity
              style={[styles.editAvatarButton, (photoChangeDisabled || photoCooldownSeconds > 0) ? { opacity: 0.55 } : null]}
              activeOpacity={0.8}
              disabled={photoChangeDisabled}
              onPress={() => {
                if (photoCooldownSeconds > 0) {
                  ThemedAlert.alert('Photo cooldown active', `You can change your profile photo again in ${photoCooldownSeconds} seconds.`);
                  return;
                }

                const options = [
                  {
                    text: 'Upload New Photo',
                    onPress: async () => {
                      try {
                        setPickingImage(true);
                        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (permissionResult.status !== 'granted') {
                          ThemedAlert.alert('Permission required', 'Permission to access photos is required to choose a profile image.');
                          return;
                        }

                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ['images'],
                          allowsEditing: false, 
                          base64: true, // 🚨 TURN THIS BACK ON!
                          quality: 0.75,
                        });

                        const rawAsset = result.assets?.[0] ?? (result.uri ? { uri: result.uri, base64: result.base64 } : null);

                        if (rawAsset?.uri && rawAsset?.base64) {
                          const formattedFile = {
                            uri: rawAsset.uri,
                            base64: rawAsset.base64, // 🚨 Pass the base64 data to the upload function
                            name: rawAsset.fileName ?? `profile-${Date.now()}.${rawAsset.uri.split('.').pop()?.toLowerCase() || 'jpg'}`,
                            type: rawAsset.mimeType ?? getImageMimeType(rawAsset.uri)
                          };

                          const hostedUrl = await uploadImage(formattedFile);
                          // ... rest of the code remains the same
                          updateField('alumni_photo', hostedUrl);
                          ThemedAlert.alert('Uploaded', 'Profile photo uploaded successfully.');
                        }
                      } catch (err) {
                        console.error('Image pick/upload failed:', err);
                        ThemedAlert.alert('Error', 'Unable to process image.');
                      } finally {
                        setPickingImage(false);
                      }
                    },
                  },
                  {
                    text: 'Remove Current Photo',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        setPickingImage(true);

                        await removeAlumniPhoto(userData.id);

                        updateField('alumni_photo', '');
                        setUserData((current) => (current ? { ...current, alumni_photo: '' } : current));
                        setCurrentUserProfile((current) => (current ? { ...current, alumni_photo: '' } : current));

                        ThemedAlert.alert('Removed', 'Profile photo has been deleted.');
                      } catch (err) {
                        console.error('Failed to remove photo:', err);
                        ThemedAlert.alert('Error', 'Could not remove the photo right now.');
                      } finally {
                        setPickingImage(false);
                      }
                    },
                  },
                  { text: 'Cancel', style: 'cancel' },
                ];

                ThemedAlert.alert('Profile Photo', 'What would you like to do?', options, { cancelable: true });
              }}
            >
              {pickingImage ? (
                <ActivityIndicator color="#31429B" />
              ) : (
                <Ionicons name="pencil" size={16} color="#31429B" />
              )}
            </TouchableOpacity>
          </View>

          {/* SECTION: User information */}
          <View style={[styles.formCard, { paddingHorizontal: layout.cardPadding, paddingVertical: layout.cardPadding }]}>
            <Text style={styles.sectionHeading}>User Information</Text>

            <View style={styles.inputBlockCompact}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <SmartTextInput
                value={formData.last_name}
                onChangeText={(value) => updateField('last_name', value)}
                placeholder="Last name"
                placeholderTextColor="#9A9A9A"
                style={styles.inputValue}
                editable={!formDisabled}
              />
            </View>

            <View style={styles.inputBlockCompact}>
              <Text style={styles.inputLabel}>First Name</Text>
              <SmartTextInput
                value={formData.first_name}
                onChangeText={(value) => updateField('first_name', value)}
                placeholder="First name"
                placeholderTextColor="#9A9A9A"
                style={styles.inputValue}
                editable={!formDisabled}
              />
            </View>

            <View style={styles.inputBlockCompact}>
              <Text style={styles.inputLabel}>Middle Name</Text>
              <SmartTextInput
                value={formData.middle_name}
                onChangeText={(value) => updateField('middle_name', value)}
                placeholder="Middle name"
                placeholderTextColor="#9A9A9A"
                style={styles.inputValue}
                editable={!formDisabled}
              />
            </View>

            {/* SECTION: Personal details */}
            <Text style={[styles.sectionHeading, styles.sectionHeadingSpacing]}>Personal Details</Text>

            <View style={styles.inputBlockCompact}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <View style={styles.inlineRow}>
                <SmartTextInput
                  value={formData.phone_number}
                  onChangeText={(value) => updateField('phone_number', value)}
                  placeholder="Mobile number"
                  placeholderTextColor="#9A9A9A"
                  style={[styles.inputValue, styles.inputGrow]}
                  keyboardType="phone-pad"
                  editable={!formDisabled}
                />
                <Text style={styles.verifiedText}>{phoneStatusText}</Text>
              </View>
            </View>

            <View style={styles.inputBlockCompact}>
              <Text style={styles.inputLabel}>Personal Email Address</Text>
              <View style={styles.inlineRow}>
                <SmartTextInput
                  value={formData.email}
                  onChangeText={(value) => updateField('email', value)}
                  placeholder="Personal email address"
                  placeholderTextColor="#9A9A9A"
                  style={[styles.inputValue, styles.inputEmailValue]}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  numberOfLines={1}
                  editable={!formDisabled}
                />
                <TouchableOpacity activeOpacity={0.8} style={styles.verifyLinkButton} onPress={handleEmailAction}>
                  <Text style={styles.verifyLink}>{emailActionText}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.helpText}>
              Your Personal Email Address will be used for One Time Passwords.
            </Text>

            <View style={[styles.twoColRow, isCompactWidth && styles.twoColRowStacked]}>
              <View style={[styles.inputBlock, styles.halfInput, isCompactWidth && styles.fullWidthInput]}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <View style={styles.dateInputRow}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                    <TouchableOpacity
                      style={[styles.inputValue, styles.dateValue, { paddingVertical: 8 }]}
                      activeOpacity={0.8}
                      disabled={formDisabled}
                      onPress={() => {
                        // Initialize picker date from current form value if present
                        const current = formData.date_of_birth ? new Date(String(formData.date_of_birth)) : new Date(1990, 0, 1);
                        if (!Number.isNaN(current.getTime())) setDobDate(current);
                        setDobTouched(true);
                        setDobPickerVisible(true);
                      }}
                    >
                      <Text style={{ color: formData.date_of_birth ? '#111827' : '#9A9A9A' }}>
                        {formData.date_of_birth ? formatDate(formData.date_of_birth) : 'YYYY-MM-DD'}
                      </Text>
                    </TouchableOpacity>

                    {dobPickerVisible ? (
                      <>
                        <DateTimePicker
                          value={dobDate}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'inline' : 'default'}
                          maximumDate={new Date()}
                          onChange={(event, selected) => {
                            // Android: event.type === 'dismissed' when cancelled
                            if (Platform.OS !== 'ios') {
                              if (event?.type === 'dismissed') {
                                setDobPickerVisible(false);
                                return;
                              }
                              const picked = selected || dobDate;
                              if (picked && !Number.isNaN(picked.getTime())) {
                                const iso = picked.toISOString().slice(0, 10);
                                updateField('date_of_birth', iso);
                                setDobDate(picked);
                              }
                              setDobPickerVisible(false);
                            } else {
                              // iOS inline: update temp date only, commit on Done
                              const picked = selected || dobDate;
                              if (picked && !Number.isNaN(picked.getTime())) {
                                setDobDate(picked);
                              }
                            }
                          }}
                        />

                        {Platform.OS === 'ios' ? (
                          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                            <TouchableOpacity
                              onPress={() => {
                                // Clear DOB
                                updateField('date_of_birth', '');
                                setDobPickerVisible(false);
                              }}
                              style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                            >
                              <Text style={{ color: '#B91C1C' }}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => {
                                // Commit selected date
                                if (dobDate && !Number.isNaN(dobDate.getTime())) {
                                  const iso = dobDate.toISOString().slice(0, 10);
                                  updateField('date_of_birth', iso);
                                }
                                setDobPickerVisible(false);
                              }}
                              style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                            >
                              <Text style={{ color: '#31429B', fontWeight: '700' }}>Done</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </>
                    ) : null}

                    {dobTouched && !formData.date_of_birth ? (
                      <Text style={styles.helpText}>You cleared your date of birth — your profile will have no DOB.</Text>
                    ) : null}
                </View>
              </View>

              <View style={[styles.inputBlock, styles.halfInput, isCompactWidth && styles.fullWidthInput]}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderInputRow}>
                  <TouchableOpacity
                    style={styles.genderSelect}
                    activeOpacity={0.8}
                    disabled={formDisabled}
                    onPress={() => {
                      const options = [
                        { text: 'Male', onPress: () => updateField('sex', 'male') },
                        { text: 'Female', onPress: () => updateField('sex', 'female') },
                        { text: 'Prefer not to say', onPress: () => updateField('sex', '') },
                        { text: 'Cancel', style: 'cancel' },
                      ];

                      ThemedAlert.alert('Select Gender', '', options, { cancelable: true });
                    }}
                  >
                    <Text style={[styles.inputValue, styles.dateValue]}>
                      {formData.sex ? String(formData.sex) : 'Gender'}
                    </Text>
                    <Ionicons name="chevron-down-circle-outline" size={18} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* SECTION: Save state and actions */}
          {loading ? (
            <Text style={styles.loadingText}>Loading your current profile data...</Text>
          ) : null}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#31429B" />
            </View>
          ) : null}

          {!!errorMessage && !loading ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity style={styles.saveButton} activeOpacity={0.9} onPress={handleSave} disabled={formDisabled}>
            {saving ? (
              <ActivityIndicator color="#31429B" />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile Information</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ResetPassword', { student_id_number: userData?.student_id_number || '' })}
            disabled={formDisabled}
          >
            <Text style={styles.resetButtonText}>Reset Account Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.disableButton, formDisabled && styles.actionButtonDisabled]}
            activeOpacity={0.9}
            onPress={handleDisableAccount}
            disabled={formDisabled}
          >
            {disabling ? (
              <ActivityIndicator color="#B91C1C" />
            ) : (
              <Text style={styles.disableButtonText}>Disable Account</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
      <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']} />
    </SafeAreaView>
  );
};

export default AccountSettingsScreen;

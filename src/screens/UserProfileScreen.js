import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
// Legacy API removed; use Supabase queries
import BrandHeader from "../components/BrandHeader";
import styles from "../styles/UserProfileScreen.styles";
import { getCurrentUser } from "../services/supabaseAuth";
import {
  getAlumniProfile,
  getAlumniEmployment,
  addEmploymentRecord,
  updateEmploymentRecord,
  deleteEmploymentRecord,
  updateAlumniProfile,
} from "../services/alumniQueries";
import { getUserPosts, updatePost, deletePost } from "../services/postQueries";
import { getFollowers, getFollowing } from "../services/connectionQueries";
import { useCurrentUserProfile } from "../context/CurrentUserProfileContext";
import { getAvatarUri } from "../utils/imageUtils";

import { ThemedAlert } from "../components/ThemedAlert";

const UserProfileScreen = ({ navigation }) => {
  const { currentUserProfile } = useCurrentUserProfile();
  // SECTION: Layout values
  const { width } = useWindowDimensions();
  const isCompactWidth = width < 375;
  const isTablet = width >= 768;
  const layout = {
    avatarSize: isTablet ? 118 : isCompactWidth ? 88 : 102,
    heroPadding: isCompactWidth ? 14 : 16,
    nameSize: isCompactWidth ? 19 : 22,
    workPageWidth: Math.max(width - (isCompactWidth ? 28 : 36), 280),
  };

  const [userData, setUserData] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resolvedConnectionsCount, setResolvedConnectionsCount] = useState(0);
  const [isBioModalVisible, setIsBioModalVisible] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [postActionPost, setPostActionPost] = useState(null);
  const [isPostActionModalVisible, setIsPostActionModalVisible] =
    useState(false);
  const [isPostActionSaving, setIsPostActionSaving] = useState(false);
  const [isWorkModalVisible, setIsWorkModalVisible] = useState(false);
  const [activeWorkExperienceIndex, setActiveWorkExperienceIndex] = useState(0);
  const [workDraft, setWorkDraft] = useState({
    id: null,
    title: "",
    subtitle: "",
    startYear: null,
    endYear: null,
    location: "",
    description: "",
  });
  const [isWorkSaving, setIsWorkSaving] = useState(false);
  const [yearDropdownType, setYearDropdownType] = useState(null); // 'start' or 'end'
  const workPagerRef = useRef(null);

  // DERIVED VALUE: Profile display name
  const profileName = useMemo(() => {
    if (!userData) {
      return "Dela Cruz, Juan Miguel";
    }

    return [userData.last_name, userData.first_name]
      .filter(Boolean)
      .join(", ")
      .replace(/, ([^,]+)$/, ", $1");
  }, [userData]);

  // DERIVED VALUE: Profile image URI
  const profileImageUri = useMemo(() => {
    const photoUri = currentUserProfile?.alumni_photo ?? userData?.alumni_photo;
    return getAvatarUri(profileName, photoUri);
  }, [currentUserProfile?.alumni_photo, profileName, userData?.alumni_photo]);

  const openConnectionsScreen = () => {
    navigation.navigate("ConnectionsScreen");
  };

  const postsCount = useMemo(
    () =>
      profilePosts.filter((post) => (post?.feed_type ?? "post") !== "repost")
        .length,
    [profilePosts],
  );

  // DERIVED VALUE: Profile summary values
  const profileSummary = useMemo(
    () => ({
      headlineText: userData?.headline || "Software Engineer at Microsoft",
      locationText: userData?.location || "Lipa City, Batangas",
      classTag: userData?.year_graduated
        ? `Class of ${String(userData.year_graduated).match(/\d{4}/)?.[0] ?? String(userData.year_graduated).slice(0, 4)}`
        : "Class of",
      sectionTag: userData?.program || "BSIT",
      connectionsCount: Number.isFinite(Number(userData?.connections_count))
        ? Number(userData.connections_count)
        : resolvedConnectionsCount,
      postsCount,
      biographyText:
        userData?.alumni_bio ||
        "No biography added yet. Tap the edit button to add a biography and let people know more about you!",
    }),
    [postsCount, resolvedConnectionsCount, userData],
  );

  // DERIVED VALUE: Work experience card data
  const workExperiences = useMemo(() => {
    if (
      Array.isArray(userData?.work_experiences) &&
      userData.work_experiences.length > 0
    ) {
      return [...userData.work_experiences]
        .map((experience, index) => ({ experience, index }))
        .sort((a, b) => {
          const getStartYear = (item) => {
            const directStartDate = item?.start_date ?? item?.startDate;

            if (directStartDate) {
              const year = Number(String(directStartDate).slice(0, 4));
              if (Number.isFinite(year)) {
                return year;
              }
            }

            if (item?.startYear) {
              const year = Number(item.startYear);
              if (Number.isFinite(year)) {
                return year;
              }
            }

            const periodYear = String(item?.period ?? "").match(/\d{4}/)?.[0];
            if (periodYear) {
              return Number(periodYear);
            }

            return Number.MAX_SAFE_INTEGER;
          };

          const aYear = getStartYear(a.experience);
          const bYear = getStartYear(b.experience);

          if (aYear === bYear) {
            return a.index - b.index;
          }

          return aYear - bYear;
        })
        .map(({ experience }) => experience);
    }

    return [];
  }, [userData]);

  useEffect(() => {
    setActiveWorkExperienceIndex(0);
    workPagerRef.current?.scrollTo?.({ x: 0, animated: false });
  }, [workExperiences.length]);

  const handleWorkPagerScrollEnd = (event) => {
    const pageWidth = event?.nativeEvent?.layoutMeasurement?.width ?? 1;
    const nextIndex = Math.round(
      (event?.nativeEvent?.contentOffset?.x ?? 0) / pageWidth,
    );
    setActiveWorkExperienceIndex(nextIndex);
  };

  const openWorkModal = (employment = null) => {
    const source = employment ?? null;

    setWorkDraft({
      id: source?.id ?? null,
      title: source?.title ?? "",
      subtitle: source?.subtitle ?? "",
      startYear: source?.startYear ?? null,
      endYear: source?.endYear ?? null,
      location: source?.location ?? "",
      description: source?.description ?? "",
    });

    setIsWorkModalVisible(true);
  };

  const closeWorkModal = () => {
    if (isWorkSaving) return;
    setIsWorkModalVisible(false);
  };

  const saveWorkExperience = async () => {
    // Validate required fields
    if (!workDraft.title.trim()) {
      ThemedAlert.alert(
        "Missing field",
        "Please enter a position/title.",
        [{ text: "OK" }],
        { variant: "error" },
      );
      return;
    }
    if (!workDraft.subtitle.trim()) {
      ThemedAlert.alert(
        "Missing field",
        "Please enter a company/organization.",
        [{ text: "OK" }],
        { variant: "error" },
      );
      return;
    }
    if (!workDraft.location.trim()) {
      ThemedAlert.alert(
        "Missing field",
        "Please enter a location.",
        [{ text: "OK" }],
        { variant: "error" },
      );
      return;
    }

    const payload = {
      title: workDraft.title.trim(),
      subtitle: workDraft.subtitle.trim(),
      location: workDraft.location.trim(),
    };

    // Only add optional fields if they have values
    if (workDraft.startYear) {
      payload.start_date = `${workDraft.startYear}-01-01`;
    }
    if (workDraft.endYear) {
      payload.end_date = `${workDraft.endYear}-12-31`;
    }
    if (workDraft.description.trim()) {
      payload.description = workDraft.description.trim();
    }

    try {
      setIsWorkSaving(true);
      const supaUser = await getCurrentUser();
      if (!supaUser) {
        ThemedAlert.alert(
          "Sign in required",
          "Please sign in again before updating work experience.",
          [{ text: "OK" }],
          { variant: "error" },
        );
        return;
      }

      if (workDraft.id) {
        await updateEmploymentRecord(workDraft.id, payload);
      } else {
        await addEmploymentRecord(supaUser.id, payload);
      }

      await loadProfile();
      setIsWorkModalVisible(false);
      ThemedAlert.alert(
        "Work experience saved",
        "Your work experience was updated.",
        [{ text: "OK" }],
        { variant: "success" },
      );
    } catch (err) {
      console.error("Failed to save work experience:", err);

      // Extract validation errors from backend
      let errorMsg = "Unable to save work experience right now.";
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const firstError = Object.values(errors)[0];
        errorMsg = Array.isArray(firstError) ? firstError[0] : firstError;
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }

      ThemedAlert.alert("Save failed", errorMsg, [{ text: "OK" }], {
        variant: "error",
      });
    } finally {
      setIsWorkSaving(false);
    }
  };

  const handleDeleteWork = (employment) => {
    if (!employment?.id) return;

    ThemedAlert.alert(
      "Delete work experience?",
      "This action cannot be undone.",
      [
        { text: "Cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              setIsWorkSaving(true);

              const supaUser = await getCurrentUser();
              if (!supaUser) {
                ThemedAlert.alert(
                  "Sign in required",
                  "Please sign in again before deleting work experience.",
                  [{ text: "OK" }],
                  { variant: "error" },
                );
                return;
              }

              await deleteEmploymentRecord(employment.id);

              await loadProfile();
              ThemedAlert.alert(
                "Deleted",
                "Work experience removed.",
                [{ text: "OK" }],
                { variant: "success" },
              );
            } catch (err) {
              console.error("Failed to delete work experience:", err);
              ThemedAlert.alert(
                "Delete failed",
                "Unable to delete work experience right now.",
                [{ text: "OK" }],
                { variant: "error" },
              );
            } finally {
              setIsWorkSaving(false);
            }
          },
        },
      ],
      { variant: "error" },
    );
  };

  const repostsCount = useMemo(
    () => profilePosts.filter((post) => post?.feed_type === "repost").length,
    [profilePosts],
  );

  const getPostAuthorName = (post) => {
    const firstName = post?.alumni?.first_name ?? "";
    const lastName = post?.alumni?.last_name ?? "";

    return [firstName, lastName].filter(Boolean).join(" ").trim() || "Alumni";
  };

  const getPostImageUri = (image) => {
    const raw = image?.image_url ?? image?.image_path ?? "";

    if (!raw) {
      return "";
    }

    // If it's already a full HTTPS URL, return as-is
    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    // It's a relative path - construct the full Supabase public URL using luminus_assets bucket
    const SUPABASE_URL = "https://pmnirrvwibzqjlutbnwz.supabase.co";
    const cleanPath = String(raw).replace(/^\/+/, "");
    return `${SUPABASE_URL}/storage/v1/object/public/luminus_assets/${cleanPath}`;
  };

  const visibilityLabels = {
    public: "Public",
    private: "Private",
    friends: "Friends",
  };

  const loadProfile = async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setErrorMessage("");
      const supaUser = await getCurrentUser();
      if (!supaUser) {
        setErrorMessage("No active session found.");
        return;
      }

      const [profile, posts, followingRows, followerRows] = await Promise.all([
        getAlumniProfile(supaUser.id),
        getUserPosts(supaUser.id, 50, 0),
        getFollowing(supaUser.id).catch(() => []),
        getFollowers(supaUser.id).catch(() => []),
      ]);

      const connectionIds = new Set();
      (followingRows || []).forEach((row) => {
        if (row?.followed?.id) connectionIds.add(row.followed.id);
      });
      (followerRows || []).forEach((row) => {
        if (row?.follower?.id) connectionIds.add(row.follower.id);
      });

      setUserData(profile ?? null);
      setProfilePosts(Array.isArray(posts) ? posts : []);
      setResolvedConnectionsCount(connectionIds.size);
    } catch (fetchError) {
      console.error("Failed to fetch profile:", fetchError);
      setErrorMessage("Unable to load profile right now.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await loadProfile({ showLoading: false });
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderProfilePostImages = (postImages = []) => {
    if (!Array.isArray(postImages) || postImages.length === 0) {
      return null;
    }

    const visibleImages = postImages.slice(0, 4);
    const remainingCount = Math.max(postImages.length - 4, 0);
    const isSingleImage = visibleImages.length === 1;

    if (isSingleImage) {
      const image = visibleImages[0];
      const imageKey = image?.id ?? getPostImageUri(image);

      return (
        <View style={styles.profilePostImagesGrid}>
          <View
            key={imageKey}
            style={[
              styles.profilePostImageTile,
              styles.profilePostImageTileSingle,
            ]}
          >
            <Image
              source={{ uri: getPostImageUri(image) }}
              style={styles.profilePostImage}
              resizeMode="cover"
            />
          </View>
        </View>
      );
    }

    const rows = [];

    for (let index = 0; index < visibleImages.length; index += 2) {
      rows.push(visibleImages.slice(index, index + 2));
    }

    return (
      <View style={styles.profilePostImagesGrid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.profilePostImagesRow}>
            {row.map((image, columnIndex) => {
              const absoluteIndex = rowIndex * 2 + columnIndex;
              const imageKey =
                image?.id ?? `${absoluteIndex}-${getPostImageUri(image)}`;
              const showOverlay = absoluteIndex === 3 && remainingCount > 0;

              return (
                <View
                  key={imageKey}
                  style={[
                    styles.profilePostImageTile,
                    columnIndex === 0
                      ? styles.profilePostImageTileWithGap
                      : null,
                  ]}
                >
                  <Image
                    source={{ uri: getPostImageUri(image) }}
                    style={styles.profilePostImage}
                    resizeMode="cover"
                  />

                  {showOverlay ? (
                    <View style={styles.profilePostImageOverlay}>
                      <Text style={styles.profilePostImageOverlayText}>
                        +{remainingCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}

            {row.length === 1 ? (
              <View style={styles.profilePostImageTileSpacer} />
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  // SECTION: Load profile data
  useEffect(() => {
    loadProfile();
  }, []);

  // HANDLER: Open biography editor
  const openBioModal = () => {
    setBioDraft(userData?.bio ?? "");
    setIsBioModalVisible(true);
  };

  // HANDLER: Close biography editor
  const closeBioModal = () => {
    setIsBioModalVisible(false);
  };

  // HANDLER: Save biography changes
  const saveBiography = async () => {
    const nextBio = bioDraft.trim();
    const previousBio = userData?.alumni_bio ?? "";

    setUserData((currentUserData) => ({
      ...(currentUserData ?? {}),
      alumni_bio: nextBio || null,
    }));
    setIsBioModalVisible(false);

    try {
      const supaUser = await getCurrentUser();
      if (!supaUser) {
        setErrorMessage("No active session found.");
        return;
      }

      const updated = await updateAlumniProfile(supaUser.id, {
        alumni_bio: nextBio || null,
      }).catch((err) => {
        console.error("Failed to update alumni profile bio:", err);
        return null;
      });

      if (updated) setUserData(updated);
    } catch (saveError) {
      console.error("Failed to save biography:", saveError);
      setErrorMessage("Unable to save biography right now.");
      setUserData((currentUserData) => ({
        ...(currentUserData ?? {}),
        alumni_bio: previousBio || null,
      }));
    } finally {
    }
  };

  const openPostActions = (post) => {
    setPostActionPost(post);
    setIsPostActionModalVisible(true);
  };

  const closePostActions = () => {
    if (isPostActionSaving) {
      return;
    }

    setIsPostActionModalVisible(false);
    setPostActionPost(null);
  };

  const savePostUpdate = async (payload, successTitle, successMessage) => {
    if (!postActionPost?.id || isPostActionSaving) {
      return;
    }

    try {
      setIsPostActionSaving(true);

      const supaUser = await getCurrentUser();
      if (!supaUser) {
        ThemedAlert.alert(
          "Sign in required",
          "Please sign in again before updating a post.",
          [{ text: "OK" }],
          { variant: "error" },
        );
        return;
      }

      await updatePost(postActionPost.id, payload);
      await loadProfile();
      setIsPostActionModalVisible(false);
      setPostActionPost(null);
      ThemedAlert.alert(successTitle, successMessage, [{ text: "OK" }], {
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to update post:", error);
      ThemedAlert.alert(
        "Update failed",
        "Unable to update the post right now.",
        [{ text: "OK" }],
        { variant: "error" },
      );
    } finally {
      setIsPostActionSaving(false);
    }
  };

  const handleToggleDraft = () => {
    if (!postActionPost) {
      return;
    }

    savePostUpdate(
      { is_draft: !postActionPost.is_draft },
      postActionPost.is_draft ? "Post published" : "Draft saved",
      postActionPost.is_draft
        ? "Your post is visible again."
        : "Your post was saved as a draft.",
    );
  };

  const handleChangeVisibility = (visibility) => {
    savePostUpdate(
      { visibility },
      "Visibility updated",
      `This post is now visible to ${visibilityLabels[visibility] ?? "selected viewers"}.`,
    );
  };

  const handleEditPost = () => {
    if (!postActionPost) {
      return;
    }

    setIsPostActionModalVisible(false);
    navigation.navigate("CreatePostScreen", { post: postActionPost });
    setPostActionPost(null);
  };

  const handleDeletePost = () => {
    if (!postActionPost) {
      return;
    }

    ThemedAlert.alert(
      "Delete post?",
      "This action cannot be undone.",
      [
        { text: "Cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              setIsPostActionSaving(true);

              const supaUser = await getCurrentUser();
              if (!supaUser) {
                ThemedAlert.alert(
                  "Sign in required",
                  "Please sign in again before deleting a post.",
                  [{ text: "OK" }],
                  { variant: "error" },
                );
                return;
              }

              await deletePost(postActionPost.id);

              await loadProfile();
              setIsPostActionModalVisible(false);
              setPostActionPost(null);
              ThemedAlert.alert(
                "Post deleted",
                "Your post has been removed.",
                [{ text: "OK" }],
                { variant: "success" },
              );
            } catch (error) {
              console.error("Failed to delete post:", error);
              ThemedAlert.alert(
                "Delete failed",
                "Unable to delete the post right now.",
                [{ text: "OK" }],
                { variant: "error" },
              );
            } finally {
              setIsPostActionSaving(false);
            }
          },
        },
      ],
      { variant: "error" },
    );
  };

  // HANDLER: Open account settings
  const openAccountSettings = () => {
    const parentNavigator = navigation.getParent?.();

    if (parentNavigator?.navigate) {
      parentNavigator.navigate("AccountSettings");
      return;
    }

    navigation.navigate("AccountSettings");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <BrandHeader />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#31429B"
              colors={["#31429B"]}
            />
          }
        >
          {loading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="large" color="#31429B" />
            </View>
          ) : errorMessage ? (
            <View style={styles.stateWrap}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                onPress={openAccountSettings}
              >
                <Text style={styles.actionButtonText}>
                  Open Account Settings
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={[styles.heroCard, { padding: layout.heroPadding }]}>
                <View style={styles.heroRow}>
                  <Image
                    source={{ uri: profileImageUri }}
                    style={[
                      styles.avatar,
                      {
                        width: layout.avatarSize,
                        height: layout.avatarSize,
                        borderRadius: layout.avatarSize / 2,
                      },
                    ]}
                  />

                  <View style={styles.heroCopy}>
                    <View style={styles.heroTitleRow}>
                      <Text
                        style={[
                          styles.name,
                          {
                            fontSize: layout.nameSize,
                            lineHeight: layout.nameSize + 2,
                          },
                        ]}
                      >
                        {profileName}
                      </Text>
                      <TouchableOpacity
                        onPress={openAccountSettings}
                        style={styles.iconButton}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="settings" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.tagPill}>
                      <Ionicons name="school" size={11} color="#31429B" />
                      <Text style={styles.tagText}>
                        {profileSummary.classTag} | {profileSummary.sectionTag}
                      </Text>
                    </View>

                    <View style={styles.statsRow}>
                      <TouchableOpacity
                        style={styles.statBlock}
                        activeOpacity={0.85}
                        onPress={openConnectionsScreen}
                      >
                        <Text style={styles.statValue}>
                          {profileSummary.connectionsCount}
                        </Text>
                        <Text style={styles.statLabel}>Connections</Text>
                      </TouchableOpacity>
                      <View style={styles.statBlock}>
                        <Text style={styles.statValue}>
                          {profileSummary.postsCount}
                        </Text>
                        <Text style={styles.statLabel}>Posts</Text>
                      </View>
                      <View style={styles.statBlock}>
                        <Text style={styles.statValue}>{repostsCount}</Text>
                        <Text style={styles.statLabel}>Reposts</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.aboutSectionWrap}>
                <View style={styles.aboutSectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeading}>About Me</Text>
                    <TouchableOpacity
                      style={styles.editPill}
                      activeOpacity={0.8}
                      onPress={openAccountSettings}
                    >
                      <Ionicons
                        name="create-outline"
                        size={12}
                        color="#404040"
                      />
                      <Text style={styles.editPillText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.aboutItem}>
                    <Ionicons name="briefcase" size={16} color="#404040" />
                    <Text style={styles.aboutText}>
                      {profileSummary.headlineText}
                    </Text>
                  </View>
                  <View style={styles.aboutItem}>
                    <Ionicons name="location-sharp" size={16} color="#404040" />
                    <Text style={styles.aboutText}>
                      {profileSummary.locationText}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <View style={styles.bioSectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeading}>Biography</Text>
                    <TouchableOpacity
                      style={styles.editPill}
                      activeOpacity={0.8}
                      onPress={openBioModal}
                    >
                      <Ionicons
                        name="create-outline"
                        size={12}
                        color="#404040"
                      />
                      <Text style={styles.editPillText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.biographyText}>
                    {profileSummary.biographyText}
                  </Text>
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <View style={styles.workSectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeading}>Work Experience</Text>
                    <TouchableOpacity
                      style={styles.editPill}
                      activeOpacity={0.8}
                      onPress={() => openWorkModal(null)}
                    >
                      <Ionicons name="add" size={12} color="#404040" />
                      <Text style={styles.editPillText}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  <View>
                    {workExperiences.length === 0 ? (
                      <Text style={styles.emptyPostsText}>
                        No Work Experience yet
                      </Text>
                    ) : null}

                    <ScrollView
                      ref={workPagerRef}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      snapToInterval={layout.workPageWidth}
                      snapToAlignment="start"
                      contentContainerStyle={styles.workPagerContent}
                      onMomentumScrollEnd={handleWorkPagerScrollEnd}
                    >
                      {workExperiences.map((emp, index) => (
                        <View
                          key={emp.id ?? `${emp.title}-${emp.period}-${index}`}
                          style={[
                            styles.workPage,
                            { width: layout.workPageWidth },
                          ]}
                        >
                          <View style={styles.workCard}>
                            <View style={styles.workRow}>
                              <View style={styles.workContent}>
                                <View style={styles.workTitleRow}>
                                  <Ionicons
                                    name="briefcase"
                                    size={15}
                                    color="#31429B"
                                  />
                                  <Text style={styles.workTitle}>
                                    {emp.title}
                                  </Text>
                                </View>
                                {emp.subtitle ? (
                                  <Text style={styles.workSubtitle}>
                                    {emp.subtitle}
                                  </Text>
                                ) : null}
                                {emp.period ? (
                                  <Text style={styles.workPeriod}>
                                    {emp.period}
                                  </Text>
                                ) : null}
                                {emp.location ? (
                                  <View style={styles.workLocationRow}>
                                    <Ionicons
                                      name="location-sharp"
                                      size={15}
                                      color="#5C6471"
                                    />
                                    <Text style={styles.workLocation}>
                                      {emp.location}
                                    </Text>
                                  </View>
                                ) : null}

                                {emp.description ? (
                                  <Text style={styles.workDescription}>
                                    {emp.description}
                                  </Text>
                                ) : null}
                              </View>

                              <View
                                style={
                                  styles.workActionsRow || {
                                    justifyContent: "flex-end",
                                  }
                                }
                              >
                                <TouchableOpacity
                                  style={styles.editPill}
                                  activeOpacity={0.8}
                                  onPress={() => openWorkModal(emp)}
                                >
                                  <Ionicons
                                    name="create-outline"
                                    size={12}
                                    color="#404040"
                                  />
                                  <Text style={styles.editPillText}>Edit</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[
                                    styles.workDeletePill,
                                    { marginLeft: 8 },
                                  ]}
                                  activeOpacity={0.8}
                                  onPress={() => handleDeleteWork(emp)}
                                >
                                  <Ionicons
                                    name="trash-outline"
                                    size={15}
                                    color="#B91C1C"
                                  />
                                  <Text style={styles.workDeletePillText}>
                                    Delete
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </ScrollView>

                    {workExperiences.length > 1 ? (
                      <View style={styles.paginationRow}>
                        {workExperiences.map((_, index) => (
                          <View
                            key={`work-dot-${index}`}
                            style={[
                              styles.paginationDot,
                              activeWorkExperienceIndex === index
                                ? styles.paginationDotActive
                                : null,
                            ]}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.postsSectionBlock}>
                <View style={styles.postsHeaderRow}>
                  <Text style={styles.sectionHeading}>Posts</Text>
                  <TouchableOpacity
                    style={styles.createPostButton}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate("CreatePostScreen")}
                  >
                    <Ionicons name="add" size={14} color="#FFFFFF" />
                    <Text style={styles.createPostButtonText}>Create</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.postsCard}>
                  {profilePosts.length === 0 ? (
                    <Text style={styles.emptyPostsText}>No posts yet.</Text>
                  ) : (
                    profilePosts.map((post) => {
                      const isRepost = post.feed_type === "repost";
                      const originalCaption = post.original_post?.caption ?? "";
                      const postImages = post.images ?? [];
                      const visibilityLabel =
                        visibilityLabels[post.visibility] ?? "Public";

                      return (
                        <View
                          key={
                            post.feed_id ??
                            `${post.feed_type}-${post.id}-${post.created_at}`
                          }
                          style={styles.profilePostItem}
                        >
                          <View style={styles.profilePostHeaderRow}>
                            <View
                              style={[
                                styles.profilePostTypePill,
                                isRepost
                                  ? styles.profileRepostPill
                                  : styles.profilePostPill,
                              ]}
                            >
                              <Ionicons
                                name={
                                  isRepost ? "repeat" : "document-text-outline"
                                }
                                size={12}
                                color={isRepost ? "#15803D" : "#31429B"}
                              />
                              <Text
                                style={[
                                  styles.profilePostTypeText,
                                  isRepost
                                    ? styles.profileRepostTypeText
                                    : null,
                                ]}
                              >
                                {isRepost ? "Repost" : "Post"}
                              </Text>
                            </View>

                            <View style={styles.profilePostHeaderRight}>
                              <View style={styles.profilePostStatusGroup}>
                                <Text style={styles.profilePostTime}>
                                  {new Date(post.created_at).toLocaleString()}
                                </Text>
                                <Text style={styles.profilePostVisibilityText}>
                                  {post.is_draft ? "Draft" : visibilityLabel}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.profilePostMenuButton}
                                activeOpacity={0.85}
                                onPress={() => openPostActions(post)}
                              >
                                <Ionicons
                                  name="ellipsis-horizontal"
                                  size={16}
                                  color="#31429B"
                                />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {post.caption ? (
                            <Text style={styles.profilePostCaption}>
                              {post.caption}
                            </Text>
                          ) : null}

                          {isRepost ? (
                            <View style={styles.profileOriginalWrap}>
                              <Text style={styles.profileOriginalLabel}>
                                Original by{" "}
                                {getPostAuthorName({
                                  alumni: post.original_post?.alumni,
                                })}
                              </Text>
                              {originalCaption ? (
                                <Text style={styles.profileOriginalCaption}>
                                  {originalCaption}
                                </Text>
                              ) : null}
                            </View>
                          ) : null}

                          {postImages.length > 0
                            ? renderProfilePostImages(postImages)
                            : null}

                          <View style={styles.profilePostMetricsRow}>
                            <Text style={styles.profilePostMetricText}>
                              {post.reaction_count ?? 0} reacts
                            </Text>
                            <Text style={styles.profilePostMetricText}>
                              {post.comment_count ?? 0} comments
                            </Text>
                            <Text style={styles.profilePostMetricText}>
                              {post.repost_count ?? 0} reposts
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Post Action Modal */}
        <Modal
          visible={isPostActionModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closePostActions}
        >
          <View style={styles.postActionOverlay}>
            <View style={styles.postActionCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Manage Post</Text>
                <TouchableOpacity
                  onPress={closePostActions}
                  style={styles.modalCloseButton}
                  activeOpacity={0.8}
                  disabled={isPostActionSaving}
                >
                  <Ionicons name="close" size={22} color="#31429B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalHelperText}>
                Edit the content, change visibility, save it as a draft, or
                delete it.
              </Text>

              <View style={styles.postActionRow}>
                <TouchableOpacity
                  style={styles.postActionButton}
                  activeOpacity={0.85}
                  onPress={handleEditPost}
                  disabled={isPostActionSaving}
                >
                  <Ionicons name="create-outline" size={15} color="#31429B" />
                  <Text style={styles.postActionButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.postActionButton}
                  activeOpacity={0.85}
                  onPress={handleToggleDraft}
                  disabled={isPostActionSaving}
                >
                  <Ionicons
                    name={
                      postActionPost?.is_draft
                        ? "cloud-upload-outline"
                        : "bookmark-outline"
                    }
                    size={15}
                    color="#31429B"
                  />
                  <Text style={styles.postActionButtonText}>
                    {postActionPost?.is_draft ? "Publish" : "Draft"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.postActionSectionLabel}>
                Who can view this post?
              </Text>
              <View style={styles.postVisibilityRow}>
                {["public", "friends", "private"].map((visibility) => {
                  const isSelected =
                    postActionPost?.visibility === visibility ||
                    (!postActionPost?.visibility && visibility === "public");

                  return (
                    <TouchableOpacity
                      key={visibility}
                      style={[
                        styles.postVisibilityPill,
                        isSelected && styles.postVisibilityPillSelected,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => handleChangeVisibility(visibility)}
                      disabled={isPostActionSaving}
                    >
                      <Text style={styles.postVisibilityPillText}>
                        {visibilityLabels[visibility]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.postDeleteButton}
                activeOpacity={0.85}
                onPress={handleDeletePost}
                disabled={isPostActionSaving}
              >
                <Ionicons name="trash-outline" size={15} color="#B91C1C" />
                <Text style={styles.postDeleteButtonText}>Delete Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Biography Modal */}
        <Modal
          visible={isBioModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeBioModal}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Biography</Text>
                <TouchableOpacity
                  onPress={closeBioModal}
                  style={styles.modalCloseButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={22} color="#31429B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalHelperText}>
                Update your biography so people can learn more about you.
              </Text>

              <TextInput
                value={bioDraft}
                onChangeText={setBioDraft}
                placeholder="Write your biography here..."
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
                style={styles.bioInput}
                maxLength={1000}
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.modalCancelButton]}
                  activeOpacity={0.85}
                  onPress={closeBioModal}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionButton, styles.modalSaveButton]}
                  activeOpacity={0.85}
                  onPress={saveBiography}
                >
                  <Text style={styles.modalSaveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Work Experience Modal */}
        <Modal
          visible={isWorkModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeWorkModal}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalCard}>
              <ScrollView
                showsVerticalScrollIndicator={true}
                scrollEnabled={true}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Work Experience</Text>
                  <TouchableOpacity
                    onPress={closeWorkModal}
                    style={styles.modalCloseButton}
                    activeOpacity={0.8}
                    disabled={isWorkSaving}
                  >
                    <Ionicons name="close" size={22} color="#31429B" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalHelperText}>
                  Add or update your work experience.
                </Text>

                <TextInput
                  value={workDraft.title}
                  onChangeText={(t) =>
                    setWorkDraft((d) => ({ ...d, title: t }))
                  }
                  placeholder="Position / Title"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  maxLength={150}
                />
                <TextInput
                  value={workDraft.subtitle}
                  onChangeText={(t) =>
                    setWorkDraft((d) => ({ ...d, subtitle: t }))
                  }
                  placeholder="Company / Organization"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  maxLength={150}
                />
                <View
                  style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#64748B",
                        marginBottom: 4,
                        fontWeight: "500",
                      }}
                    >
                      Start Year
                    </Text>
                    <TouchableOpacity
                      onPress={() => setYearDropdownType("start")}
                      style={[
                        styles.input,
                        { justifyContent: "center", paddingVertical: 12 },
                      ]}
                    >
                      <Text
                        style={{
                          color: workDraft.startYear ? "#1E293B" : "#94A3B8",
                        }}
                      >
                        {workDraft.startYear
                          ? String(workDraft.startYear)
                          : "Select year..."}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#64748B",
                        marginBottom: 4,
                        fontWeight: "500",
                      }}
                    >
                      End Year
                    </Text>
                    <TouchableOpacity
                      onPress={() => setYearDropdownType("end")}
                      style={[
                        styles.input,
                        { justifyContent: "center", paddingVertical: 12 },
                      ]}
                    >
                      <Text
                        style={{
                          color: workDraft.endYear ? "#1E293B" : "#94A3B8",
                        }}
                      >
                        {workDraft.endYear
                          ? String(workDraft.endYear)
                          : "Select year..."}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TextInput
                  value={workDraft.location}
                  onChangeText={(t) =>
                    setWorkDraft((d) => ({ ...d, location: t }))
                  }
                  placeholder="Location"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  maxLength={120}
                />
                <TextInput
                  value={workDraft.description}
                  onChangeText={(t) =>
                    setWorkDraft((d) => ({ ...d, description: t }))
                  }
                  placeholder="Brief description"
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlignVertical="top"
                  style={[styles.bioInput, { minHeight: 80 }]}
                  maxLength={1000}
                />
              </ScrollView>

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.modalCancelButton]}
                  activeOpacity={0.85}
                  onPress={closeWorkModal}
                  disabled={isWorkSaving}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionButton, styles.modalSaveButton]}
                  activeOpacity={0.85}
                  onPress={saveWorkExperience}
                  disabled={isWorkSaving}
                >
                  <Text style={styles.modalSaveButtonText}>
                    {isWorkSaving ? "Saving..." : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Year Selection Modal */}
        <Modal
          visible={yearDropdownType !== null}
          transparent
          animationType="fade"
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: "#FFF",
                borderRadius: 12,
                maxHeight: "70%",
                width: "100%",
              }}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: "#E2E8F0",
                }}
              >
                <Text
                  style={{ fontSize: 16, fontWeight: "600", color: "#1E293B" }}
                >
                  {yearDropdownType === "start"
                    ? "Select Start Year"
                    : "Select End Year"}
                </Text>
              </View>
              <ScrollView style={{ paddingVertical: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    if (yearDropdownType === "start") {
                      setWorkDraft((d) => ({ ...d, startYear: null }));
                    } else {
                      setWorkDraft((d) => ({ ...d, endYear: null }));
                    }
                    setYearDropdownType(null);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F1F5F9",
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#64748B" }}>
                    Clear selection
                  </Text>
                </TouchableOpacity>
                {Array.from({ length: 75 }, (_, i) => 2025 - i).map((year) => (
                  <TouchableOpacity
                    key={year}
                    onPress={() => {
                      if (yearDropdownType === "start") {
                        setWorkDraft((d) => ({ ...d, startYear: year }));
                      } else {
                        setWorkDraft((d) => ({ ...d, endYear: year }));
                      }
                      setYearDropdownType(null);
                    }}
                    style={[
                      {
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: "#F1F5F9",
                      },
                      (yearDropdownType === "start"
                        ? workDraft.startYear === year
                        : workDraft.endYear === year) && {
                        backgroundColor: "#EFF6FF",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: (
                          yearDropdownType === "start"
                            ? workDraft.startYear === year
                            : workDraft.endYear === year
                        )
                          ? "#31429B"
                          : "#1E293B",
                        fontWeight: (
                          yearDropdownType === "start"
                            ? workDraft.startYear === year
                            : workDraft.endYear === year
                        )
                          ? "600"
                          : "400",
                      }}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default UserProfileScreen;

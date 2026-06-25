import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  ImageBackground,
  Pressable
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import HomeHeader from "../components/HomeHeader"; 
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
import { getUserPosts, updatePost, deletePost, getPostById, addReaction, removeReaction, addComment } from "../services/postQueries";
import { getFollowers, getFollowing } from "../services/connectionQueries";
import { useCurrentUserProfile } from "../context/CurrentUserProfileContext";
import { getAvatarUri } from "../utils/imageUtils";
import { ThemedAlert } from "../components/ThemedAlert";

const getRelativeTimeLabel = (dateValue) => {
  if (!dateValue) return '';
  const normalizedValue = typeof dateValue === 'string' ? (dateValue.includes('T') ? dateValue : dateValue.replace(' ', 'T')) : dateValue;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return '';
  const elapsedMs = Date.now() - date.getTime();
  const elapsedSeconds = Math.max(1, Math.floor(elapsedMs / 1000));
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const elapsedDays = Math.floor(elapsedHours / 24);

  if (elapsedSeconds < 60) return 'Just now';
  if (elapsedDays >= 7) return `${Math.floor(elapsedDays / 7)}w`;
  if (elapsedDays >= 1) return `${elapsedDays}d`;
  if (elapsedHours >= 1) return `${elapsedHours}h`;
  if (elapsedMinutes >= 1) return `${elapsedMinutes}m`;
  return 'Just now';
};

const getFeedItemDateValue = (item) => item?.created_at ?? item?.date_posted ?? item?.posted_at ?? item?.published_at ?? null;

const UserProfileScreen = ({ navigation }) => {
  const { currentUserProfile } = useCurrentUserProfile();
  const { width } = useWindowDimensions();
  const isCompactWidth = width < 375;
  const isTablet = width >= 768;
  
  const layout = {
    avatarSize: isTablet ? 140 : 120,
    workPageWidth: Math.max(width - 80, 240),
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
  const [isPostActionModalVisible, setIsPostActionModalVisible] = useState(false);
  const [isPostActionSaving, setIsPostActionSaving] = useState(false);
  const [isWorkModalVisible, setIsWorkModalVisible] = useState(false);
  const [workDraft, setWorkDraft] = useState({ id: null, title: "", subtitle: "", startYear: null, endYear: null, location: "", description: "" });
  const [isWorkSaving, setIsWorkSaving] = useState(false);
  const [yearDropdownType, setYearDropdownType] = useState(null); 

  const skills = ["Programming", "Graphic Design", "Java", "MySQL", "Mobile Programming", "React"];

  const profileName = useMemo(() => {
    if (!userData) return "Dela Cruz, Juan Miguel";
    return [userData.last_name, userData.first_name].filter(Boolean).join(", ").replace(/, ([^,]+)$/, ", $1");
  }, [userData]);

  const profileImageUri = useMemo(() => {
    const photoUri = currentUserProfile?.alumni_photo ?? userData?.alumni_photo;
    return getAvatarUri(profileName, photoUri);
  }, [currentUserProfile?.alumni_photo, profileName, userData?.alumni_photo]);

  const postsCount = useMemo(() => profilePosts.filter((post) => (post?.feed_type ?? "post") !== "repost").length, [profilePosts]);
  const repostsCount = useMemo(() => profilePosts.filter((post) => post?.feed_type === "repost").length, [profilePosts]);

  const profileSummary = useMemo(() => ({
      headlineText: userData?.headline || "Software Engineer at Microsoft",
      locationText: userData?.location || "Lipa City, Batangas",
      classTag: userData?.year_graduated ? `Class of ${String(userData.year_graduated).match(/\d{4}/)?.[0] ?? String(userData.year_graduated).slice(0, 4)}` : "Class of 2023",
      sectionTag: userData?.program || "BSIT",
      connectionsCount: Number.isFinite(Number(userData?.connections_count)) ? Number(userData.connections_count) : resolvedConnectionsCount,
      postsCount,
      biographyText: userData?.alumni_bio || "I am currently a Software Engineer at Microsoft specializing in mobile development. During my stay at NU Lipa, I served as an active student leader and truly fell in love with building intuitive tech that solves complex real-world problems. I am deeply passionate about Human-Computer Interaction, accessible mobile-first design, and writing incredibly clean, scalable code. I constantly thrive on bringing innovative digital ideas to life. Always down for a coffee chat or a collab on a side project! ☕✨",
    }), [postsCount, resolvedConnectionsCount, userData]);

  const workExperiences = useMemo(() => {
    if (Array.isArray(userData?.work_experiences) && userData.work_experiences.length > 0) {
      return [...userData.work_experiences].sort((a, b) => {
          const getStartYear = (item) => Number(String(item?.start_date ?? item?.startYear ?? item?.period ?? "").match(/\d{4}/)?.[0] ?? Number.MAX_SAFE_INTEGER);
          return getStartYear(a) - getStartYear(b);
        });
    }
    return [
      { id: '1', title: 'Graphic Designer', subtitle: 'At National University Philippines', period: 'March 2025 - Present', location: 'Philippines', description: 'A brief description about the job' },
      { id: '2', title: 'Graphic Designer', subtitle: 'At National University Philippines', period: 'March 2025 - Present', location: 'Philippines', description: 'A brief description about the job' }
    ];
  }, [userData]);

  const openBioModal = () => {
    setBioDraft(userData?.alumni_bio ?? "");
    setIsBioModalVisible(true);
  };

  const openWorkModal = (employment = null) => {
    setWorkDraft({
      id: employment?.id ?? null, title: employment?.title ?? "", subtitle: employment?.subtitle ?? "",
      startYear: employment?.startYear ?? null, endYear: employment?.endYear ?? null,
      location: employment?.location ?? "", description: employment?.description ?? "",
    });
    setIsWorkModalVisible(true);
  };
  
  const closeWorkModal = () => { if (!isWorkSaving) setIsWorkModalVisible(false); };

  const saveWorkExperience = async () => {
    if (!workDraft.title.trim() || !workDraft.subtitle.trim() || !workDraft.location.trim()) {
      ThemedAlert.alert("Missing field", "Please fill out all required fields.", [{ text: "OK" }], { variant: "error" });
      return;
    }
    const payload = { title: workDraft.title.trim(), subtitle: workDraft.subtitle.trim(), location: workDraft.location.trim() };
    if (workDraft.startYear) payload.start_date = `${workDraft.startYear}-01-01`;
    if (workDraft.endYear) payload.end_date = `${workDraft.endYear}-12-31`;
    if (workDraft.description.trim()) payload.description = workDraft.description.trim();

    try {
      setIsWorkSaving(true);
      const supaUser = await getCurrentUser();
      if (workDraft.id) await updateEmploymentRecord(workDraft.id, payload);
      else await addEmploymentRecord(supaUser.id, payload);
      await loadProfile();
      setIsWorkModalVisible(false);
      ThemedAlert.alert("Success", "Work experience saved.", [{ text: "OK" }], { variant: "success" });
    } catch (err) {
      ThemedAlert.alert("Error", "Unable to save work experience.", [{ text: "OK" }], { variant: "error" });
    } finally { setIsWorkSaving(false); }
  };

  const getPostAuthorName = (post) => [post?.alumni?.first_name ?? "", post?.alumni?.last_name ?? ""].filter(Boolean).join(" ").trim() || "Alumni";
  const getPostImageUri = (image) => {
    const raw = image?.image_url ?? image?.image_path ?? "";
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://pmnirrvwibzqjlutbnwz.supabase.co/storage/v1/object/public/luminus_assets/${String(raw).replace(/^\/+/, "")}`;
  };

  const loadProfile = async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true);
      setErrorMessage("");
      const supaUser = await getCurrentUser();
      if (!supaUser) { setErrorMessage("No active session found."); return; }

      const [profile, posts, followingRows, followerRows] = await Promise.all([
        getAlumniProfile(supaUser.id), getUserPosts(supaUser.id, 50, 0),
        getFollowing(supaUser.id).catch(() => []), getFollowers(supaUser.id).catch(() => []),
      ]);

      const connectionIds = new Set();
      (followingRows || []).forEach((row) => { if (row?.followed?.id) connectionIds.add(row.followed.id); });
      (followerRows || []).forEach((row) => { if (row?.follower?.id) connectionIds.add(row.follower.id); });

      setUserData(profile ?? null);
      setProfilePosts(Array.isArray(posts) ? posts : []);
      setResolvedConnectionsCount(connectionIds.size);
    } catch (error) {
      setErrorMessage("Unable to load profile right now.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRefresh = async () => { setIsRefreshing(true); await loadProfile({ showLoading: false }); setIsRefreshing(false); };
  useEffect(() => { loadProfile(); }, []);

  const saveBiography = async () => {
    const nextBio = bioDraft.trim();
    const previousBio = userData?.alumni_bio ?? "";
    setUserData((curr) => ({ ...curr, alumni_bio: nextBio || null }));
    setIsBioModalVisible(false);
    try {
      const supaUser = await getCurrentUser();
      const updated = await updateAlumniProfile(supaUser.id, { alumni_bio: nextBio || null });
      if (updated) setUserData(updated);
    } catch (e) {
      setUserData((curr) => ({ ...curr, alumni_bio: previousBio || null }));
    }
  };

  const renderPostImageLayout = (postId, postImages) => {
		if (postImages.length === 1) return <View style={[styles.postSingleImageWrap, { aspectRatio: 1.2 }]}><Image source={{ uri: getPostImageUri(postImages[0]) }} style={styles.postCollageImage} resizeMode="cover" /></View>;
		if (postImages.length === 2) return <View style={styles.postTwoGrid}><View style={[styles.postTwoPrimaryTile, { aspectRatio: 1.05 }]}><Image source={{ uri: getPostImageUri(postImages[0]) }} style={styles.postCollageImage} resizeMode="cover" /></View><View style={[styles.postTwoSecondaryTile, { aspectRatio: 0.95 }]}><Image source={{ uri: getPostImageUri(postImages[1]) }} style={styles.postCollageImage} resizeMode="cover" /></View></View>;
		if (postImages.length === 3) return <View style={styles.postThreeCollage}><View style={styles.postThreeLeftTile}><Image source={{ uri: getPostImageUri(postImages[0]) }} style={styles.postCollageImage} resizeMode="cover" /></View><View style={styles.postThreeRightColumn}><View style={styles.postThreeRightTile}><Image source={{ uri: getPostImageUri(postImages[1]) }} style={styles.postCollageImage} resizeMode="cover" /></View><View style={styles.postThreeRightTile}><Image source={{ uri: getPostImageUri(postImages[2]) }} style={styles.postCollageImage} resizeMode="cover" /></View></View></View>;
		if (postImages.length === 4) return <View style={styles.postFourGrid}>{postImages.slice(0, 4).map((image, idx) => <View key={image.id ?? idx} style={styles.postFourGridTile}><Image source={{ uri: getPostImageUri(image) }} style={styles.postCollageImage} resizeMode="cover" /></View>)}</View>;
		const remainingCount = Math.max(postImages.length - 4, 0);
		return <View style={styles.postFivePlusGrid}>{postImages.slice(0, 4).map((image, idx) => <View key={image.id ?? idx} style={styles.postFivePlusTile}><Image source={{ uri: getPostImageUri(image) }} style={styles.postCollageImage} resizeMode="cover" />{idx === 3 ? <View style={styles.postImageOverlay}><Text style={styles.postImageOverlayText}>+{remainingCount}</Text></View> : null}</View>)}</View>;
	};

  const renderSinglePostContent = (postObj, isNested = false) => {
		const postAuthorName = getPostAuthorName(postObj);
		const avatarUri = getAvatarUri(postAuthorName, postObj.alumni?.alumni_photo);
		const postImages = postObj.images ?? [];
		const timeStr = getRelativeTimeLabel(getFeedItemDateValue(postObj));

		return (
			<>
        <View style={styles.postHeader}>
          <Image source={{ uri: avatarUri }} style={styles.postAvatar} />
          <View style={styles.postHeaderTextWrap}>
            <Text style={styles.postAuthorName} numberOfLines={1}>{postAuthorName}</Text>
            <Text style={styles.postMeta}>
              Class of 2023 | BSIT | {timeStr} • <Ionicons name="globe-outline" size={10} color="#6B7280" /> Public
            </Text>
          </View>
          {!isNested && (
            <Pressable style={styles.postMenuButton} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#1F2937" />
            </Pressable>
          )}
        </View>

        {postObj.caption ? <Text style={styles.postCaption}>{postObj.caption}</Text> : null}
        {postImages.length > 0 ? renderPostImageLayout(postObj.id, postImages) : null}

        {!isNested && (
          <View style={styles.postReactionRow}>
            <Pressable style={styles.postActionButton}>
              <Ionicons name={postObj.my_reaction ? 'heart' : 'heart-outline'} size={22} color={postObj.my_reaction ? '#EF4444' : '#31429B'} />
              <Text style={styles.postActionCount}>{postObj.reaction_count ?? 0}</Text>
            </Pressable>
            <Pressable style={styles.postActionButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#31429B" />
              <Text style={styles.postActionCount}>{postObj.comment_count ?? 0}</Text>
            </Pressable>
            <Pressable style={styles.postActionButton}>
              <Ionicons name="repeat" size={22} color={postObj.my_repost ? '#15803D' : '#31429B'} />
              <Text style={styles.postActionCount}>{postObj.repost_count ?? 0}</Text>
            </Pressable>
          </View>
        )}
			</>
		);
	};

  return (
      <View style={styles.container}>
        
        {/* TOP HEADER LOGOS */}
        <HomeHeader />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#31429B" />}
        >
          {loading ? (
            <View style={styles.stateWrap}><ActivityIndicator size="large" color="#31429B" /></View>
          ) : errorMessage ? (
            <View style={styles.stateWrap}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("AccountSettings")}>
                <Text style={styles.actionButtonText}>Open Account Settings</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* WHITE HERO SECTION */}
              <View style={styles.heroSection}>
                <View style={styles.heroRow}>
                  <Image source={{ uri: profileImageUri }} style={[styles.avatar, { width: layout.avatarSize, height: layout.avatarSize, borderRadius: layout.avatarSize / 2 }]} />
                  <View style={styles.heroCopy}>
                    <Text style={styles.name}>{profileName}</Text>
                    <View style={styles.tagPill}>
                      <Ionicons name="school" size={12} color="#31429B" />
                      <Text style={styles.tagText}>{profileSummary.classTag} | {profileSummary.sectionTag}</Text>
                    </View>
                    <View style={styles.statsRow}>
                      <Text style={styles.statText}><Text style={styles.statNumber}>{profileSummary.connectionsCount}</Text> Connections</Text>
                      <Text style={styles.statText}><Text style={styles.statNumber}>{profileSummary.postsCount}</Text> Posts</Text>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate("AccountSettings")}>
                        <Ionicons name="create-outline" size={16} color="#1C1C1E" />
                        <Text style={styles.editProfileText}>Edit Profile</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate("AccountSettings")}>
                        <Ionicons name="settings-sharp" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* ABOUT ME */}
                <View style={styles.aboutSection}>
                  <Text style={styles.sectionHeadingBlack}>About Me</Text>
                  <View style={styles.aboutItem}>
                    <Ionicons name="briefcase" size={18} color="#31429B" style={styles.aboutIcon} />
                    <Text style={styles.aboutText}>{profileSummary.headlineText}</Text>
                  </View>
                  <View style={styles.aboutItem}>
                    <Ionicons name="location-sharp" size={18} color="#31429B" style={styles.aboutIcon} />
                    <Text style={styles.aboutText}>{profileSummary.locationText}</Text>
                  </View>
                </View>
              </View>

              {/* DARK BLUE SECTION WITH SPACE BACKGROUND */}
              <ImageBackground source={require("../../assets/images/Demos (1) 1.png")} style={styles.darkSection} resizeMode="conver">
                
                {/* Biography */}
                <View style={styles.darkSectionHeaderRow}>
                  <Text style={styles.sectionHeadingYellow}>Biography</Text>
                  <TouchableOpacity style={styles.outlineEditPill} onPress={openBioModal}>
                    <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.outlineEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.biographyText}>{profileSummary.biographyText}</Text>

                {/* Work Experience */}
<View style={styles.darkSectionHeaderRow}>
  <Text style={styles.sectionHeadingYellow}>Work Experience</Text>
  <TouchableOpacity 
    style={styles.outlineEditPill} 
    onPress={() => navigation.navigate("WorkExperienceScreen")}
  >
    <Ionicons name="create-outline" size={14} color="#FFFFFF" />
    <Text style={styles.outlineEditText}>Edit</Text>
  </TouchableOpacity>
</View>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workScrollContent}>
                  {workExperiences.map((emp, index) => (
                    <View key={emp.id ?? index} style={styles.workCard}>
                      <Ionicons name="ellipsis-horizontal" size={20} color="#31429B" style={styles.workMenuIcon} />
                      <Ionicons name="briefcase" size={28} color="#31429B" style={styles.workBriefcase} />
                      <Text style={styles.workTitle}>{emp.title}</Text>
                      <Text style={styles.workSubtitle}>{emp.subtitle}</Text>
                      <Text style={styles.workPeriod}>{emp.period}</Text>
                      <Text style={styles.workDescription}>{emp.description}</Text>
                    </View>
                  ))}
                </ScrollView>

                {/* Skills */}
<View style={styles.darkSectionHeaderRow}>
  <Text style={styles.sectionHeadingYellow}>Skills</Text>
  {/* Add the onPress prop here to navigate to the new screen */}
  <TouchableOpacity 
    style={styles.outlineEditPill} 
    onPress={() => navigation.navigate("AddSkillsScreen")}
  >
    <Ionicons name="create-outline" size={14} color="#FFFFFF" />
    <Text style={styles.outlineEditText}>Edit</Text>
  </TouchableOpacity>
</View>

                <View style={styles.skillsGrid}>
                  {skills.map((skill, i) => (
                    <View key={i} style={styles.skillPill}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All <Ionicons name="arrow-forward" size={12} /></Text>
                </TouchableOpacity>

              </ImageBackground>

              {/* POSTS SECTION */}
              <View style={styles.postsSection}>
                <View style={styles.postsHeaderRow}>
                  <Text style={styles.sectionHeadingBlack}>Posts</Text>
                  <TouchableOpacity style={styles.createPostPill} onPress={() => navigation.navigate("CreatePostScreen")}>
                    <Ionicons name="create" size={14} color="#1C1C1E" />
                    <Text style={styles.createPostPillText}>Create New Post</Text>
                  </TouchableOpacity>
                </View>
                
                {profilePosts.length === 0 ? (
                  <Text style={styles.emptyPostsText}>No posts yet.</Text>
                ) : (
                  profilePosts.map((post) => {
                    const isRepostFeedItem = post.feed_type === 'repost';
                    const originalPost = post.original_post ?? null;
                    
                    if (isRepostFeedItem && originalPost) {
                      const reposterName = getPostAuthorName(post);
                      const reposterAvatar = getAvatarUri(reposterName, post.alumni?.alumni_photo);
                      return (
                        <View key={post.id} style={styles.repostWrapper}>
                          <View style={styles.repostBanner}>
                            <Image source={{ uri: reposterAvatar }} style={styles.repostBannerAvatar} />
                            <Text style={styles.repostBannerText} numberOfLines={1}>
                              <Text style={styles.repostBannerName}>{reposterName}</Text> reposted this.
                            </Text>
                          </View>
                          <View style={styles.repostInnerCard}>
                            {renderSinglePostContent(originalPost, true)}
                            <View style={styles.postReactionRow}>
                              <Pressable style={styles.postActionButton}>
                                <Ionicons name={post.my_reaction ? 'heart' : 'heart-outline'} size={22} color={post.my_reaction ? '#EF4444' : '#31429B'} />
                                <Text style={styles.postActionCount}>{post.reaction_count ?? 0}</Text>
                              </Pressable>
                              <Pressable style={styles.postActionButton}>
                                <Ionicons name="chatbubble-outline" size={20} color="#31429B" />
                                <Text style={styles.postActionCount}>{post.comment_count ?? 0}</Text>
                              </Pressable>
                              <Pressable style={styles.postActionButton}>
                                <Ionicons name="repeat" size={22} color={post.my_repost ? '#15803D' : '#31429B'} />
                                <Text style={styles.postActionCount}>{post.repost_count ?? 0}</Text>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <View key={post.id} style={styles.postCard}>
                        {renderSinglePostContent(post)}
                      </View>
                    );
                  })
                )}
              </View>
            </>
          )}
        </ScrollView>
        
        {/* Modals for Biography and Work Experience */}
        <Modal visible={isBioModalVisible} transparent animationType="fade" onRequestClose={() => setIsBioModalVisible(false)}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Biography</Text>
                <TouchableOpacity onPress={() => setIsBioModalVisible(false)} style={styles.modalCloseButton} activeOpacity={0.8}>
                  <Ionicons name="close" size={22} color="#31429B" />
                </TouchableOpacity>
              </View>
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
                <TouchableOpacity style={[styles.modalActionButton, styles.modalCancelButton]} onPress={() => setIsBioModalVisible(false)}>
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalActionButton, styles.modalSaveButton]} onPress={saveBiography}>
                  <Text style={styles.modalSaveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </View>
  );
};

export default UserProfileScreen;
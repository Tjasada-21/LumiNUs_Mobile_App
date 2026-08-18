import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  ImageBackground,
  RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import HomeHeader from "../components/HomeHeader";
import AvatarInitials from "../components/AvatarInitials";
import styles from "../styles/ProfileViewScreen.styles";
import { getAlumniProfile } from "../services/alumniQueries";
import { getUserPosts } from "../services/postQueries";
import {
  getFollowers,
  getFollowing,
  rejectFollowRequest,
  sendFollowRequest,
  unfollowUser,
} from "../services/connectionQueries";
import { getCurrentUser } from "../services/supabaseAuth";
import { ThemedAlert } from "../components/ThemedAlert";
import { getAvatarUri } from "../utils/imageUtils";

// Helper to strictly check if an uploaded photo exists
const hasValidProfilePhoto = (rawPhoto) => {
  return rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim() !== '' && !rawPhoto.includes('undefined') && !rawPhoto.includes('null');
};

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

const ProfileViewScreen = ({ navigation, route }) => {
  const userId = route?.params?.userId;
  const { width } = useWindowDimensions();
  const isCompactWidth = width < 375;
  const isTablet = width >= 768;
  
  const layout = {
    avatarSize: isTablet ? 140 : 120,
    workPageWidth: Math.max(width - 80, 240),
  };

  const [userData, setUserData] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resolvedConnectionsCount, setResolvedConnectionsCount] = useState(0);

  // Parse skills from database dynamically
  const userSkills = useMemo(() => {
    if (Array.isArray(userData?.skills) && userData.skills.length > 0) {
      return userData.skills.map((s) => {
        if (typeof s === 'string') return s;
        return s?.skill_name || s?.name || s?.skill || "";
      }).filter(Boolean);
    }
    return [];
  }, [userData]);

  const profileName = useMemo(() => {
    if (!userData) return "Alumni";
    return [userData.last_name, userData.first_name].filter(Boolean).join(", ").replace(/, ([^,]+)$/, ", $1");
  }, [userData]);

  const profileImageUri = useMemo(() => {
    return getAvatarUri(profileName, userData?.alumni_photo);
  }, [profileName, userData]);

  const hasValidMainAvatar = hasValidProfilePhoto(userData?.alumni_photo);

  const postsCount = useMemo(() => profilePosts.filter((post) => (post?.feed_type ?? "post") !== "repost").length, [profilePosts]);
  const repostsCount = useMemo(() => profilePosts.filter((post) => post?.feed_type === "repost").length, [profilePosts]);

  const profileSummary = useMemo(() => ({
    headlineText: userData?.headline || "",
    locationText: userData?.location || "",
    classTag: userData?.year_graduated ? `Class of ${String(userData.year_graduated).match(/\d{4}/)?.[0] ?? String(userData.year_graduated).slice(0, 4)}` : "Alumni",
    sectionTag: userData?.program || "No Program Specified",
    connectionsCount: Number.isFinite(Number(userData?.connections_count)) ? Number(userData.connections_count) : resolvedConnectionsCount,
    connectionStatus: userData?.connection_status || "none",
    postsCount,
    biographyText: userData?.alumni_bio || "",
  }), [postsCount, resolvedConnectionsCount, userData]);

  const isConnected = profileSummary.connectionStatus === "connected";
  const isPendingConnection = profileSummary.connectionStatus === "pending";
  const isConnectionActionDisabled = followLoading;

  // Parse work experience dynamically from database
  const workExperiences = useMemo(() => {
    if (Array.isArray(userData?.work_experiences) && userData.work_experiences.length > 0) {
      return [...userData.work_experiences].sort((a, b) => {
          const getStartYear = (item) => Number(String(item?.start_date ?? item?.startYear ?? item?.period ?? "").match(/\d{4}/)?.[0] ?? Number.MAX_SAFE_INTEGER);
          return getStartYear(a) - getStartYear(b);
        });
    }
    return [];
  }, [userData]);

  const openConversation = () => {
    if (!isConnected) {
      ThemedAlert.alert("Message unavailable", "You can only message alumni after you are connected with them.");
      return;
    }
    navigation.navigate("ConvoScreen", { contactId: userId, contactName: profileName, contactAvatar: profileImageUri });
  };

  const handleAddConnection = async () => {
    if (!userId || followLoading) return;
    try {
      setFollowLoading(true);
      const currentUser = await getCurrentUser().catch(() => null);
      if (!currentUser?.id) {
        ThemedAlert.alert("Connection failed", "Please sign in again to send a connection request.");
        return;
      }
      await sendFollowRequest(currentUser.id, userId);
      setUserData((current) => current ? { ...current, connection_status: "pending" } : current);
      ThemedAlert.alert("Connection updated", "Connection request sent.");
    } catch (followError) {
      ThemedAlert.alert("Connection failed", "Unable to add this connection right now.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCancelPendingRequestConfirmed = async () => {
    if (!userId || followLoading || !isPendingConnection) return;
    try {
      setFollowLoading(true);
      const currentUser = await getCurrentUser().catch(() => null);
      if (!currentUser?.id) return;
      await rejectFollowRequest(currentUser.id, userId);
      setUserData((current) => current ? { ...current, connection_status: "none" } : current);
      ThemedAlert.alert("Request cancelled", "Connection request cancelled.");
    } catch (cancelError) {
      ThemedAlert.alert("Cancel request failed", "Unable to cancel this request right now.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleRemoveConnectionConfirmed = async () => {
    if (!userId || followLoading || !isConnected) return;
    try {
      setFollowLoading(true);
      const currentUser = await getCurrentUser().catch(() => null);
      if (!currentUser?.id) return;
      await unfollowUser(currentUser.id, userId);
      setUserData((current) => {
        if (!current) return current;
        return { ...current, connection_status: "none", connections_count: Math.max(0, Number(current.connections_count ?? 0) - 1) };
      });
      ThemedAlert.alert("Connection removed", "Connection removed successfully.");
    } catch (removeError) {
      ThemedAlert.alert("Remove connection failed", "Unable to remove this connection right now.");
    } finally {
      setFollowLoading(false);
    }
  };

  const confirmRemoveConnection = () => {
    ThemedAlert.alert("Remove connection", `Are you sure you want to remove the connection with ${profileName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => handleRemoveConnectionConfirmed() },
    ]);
  };

  const confirmCancelPendingRequest = () => {
    ThemedAlert.alert("Cancel connection request", `Do you want to cancel your connection request to ${profileName}?`, [
      { text: "Keep Pending", style: "cancel" },
      { text: "Cancel Request", style: "destructive", onPress: () => handleCancelPendingRequestConfirmed() },
    ]);
  };

  const loadProfile = async ({ showLoading = true } = {}) => {
    if (!userId) {
      setErrorMessage("Missing profile information.");
      setProfileLoading(false);
      setPostsLoading(false);
      return;
    }

    try {
      if (showLoading) {
        setProfileLoading(true);
        setPostsLoading(true);
      }
      setErrorMessage("");

      const currentUser = await getCurrentUser().catch(() => null);
      const profile = await getAlumniProfile(userId, currentUser?.id ?? null);
      setUserData(profile ?? null);
      setProfileLoading(false);

      const [posts, followingRows, followerRows] = await Promise.all([
        getUserPosts(userId, 50, 0),
        getFollowing(userId).catch(() => []),
        getFollowers(userId).catch(() => []),
      ]);
      
      setProfilePosts(Array.isArray(posts) ? posts : []);

      const connectionIds = new Set();
      (followingRows || []).forEach((row) => { if (row?.followed?.id) connectionIds.add(row.followed.id); });
      (followerRows || []).forEach((row) => { if (row?.follower?.id) connectionIds.add(row.follower.id); });
      setResolvedConnectionsCount(connectionIds.size);
    } catch (fetchError) {
      setErrorMessage("Unable to load this profile right now.");
    } finally {
      setProfileLoading(false);
      setPostsLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, [userId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProfile({ showLoading: false });
    setIsRefreshing(false);
  };

  const getPostAuthorName = (post) => [post?.alumni?.first_name ?? "", post?.alumni?.last_name ?? ""].filter(Boolean).join(" ").trim() || "Alumni";
  const getPostImageUri = (image) => {
    const raw = image?.image_url ?? image?.image_path ?? "";
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://pmnirrvwibzqjlutbnwz.supabase.co/storage/v1/object/public/luminus_assets/${String(raw).replace(/^\/+/, "")}`;
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
    const hasValidPostAvatar = hasValidProfilePhoto(postObj.alumni?.alumni_photo);
		const postImages = postObj.images ?? [];
		const timeStr = getRelativeTimeLabel(getFeedItemDateValue(postObj));

		return (
			<>
        <View style={styles.postHeader}>
          {hasValidPostAvatar && avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.postAvatar} />
          ) : (
            <AvatarInitials name={postAuthorName} size={44} style={styles.postAvatar} backgroundColor="#31429B" />
          )}
          
          <View style={styles.postHeaderTextWrap}>
            <Text style={styles.postAuthorName} numberOfLines={1}>{postAuthorName}</Text>
            <Text style={styles.postMeta}>
              {postObj.alumni?.year_graduated ? `Class of ${String(postObj.alumni.year_graduated).substring(0,4)}` : "Alumni"} | {postObj.alumni?.program || "Program not specified"} | {timeStr} • <Ionicons name="globe-outline" size={10} color="#6B7280" /> Public
            </Text>
          </View>
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
        <HomeHeader />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#31429B" />}
        >
          {profileLoading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="large" color="#31429B" />
            </View>
          ) : errorMessage ? (
            <View style={styles.stateWrap}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable style={styles.backActionButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backActionButtonText}>Go Back</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* WHITE HERO SECTION */}
              <View style={styles.heroSection}>
                <View style={styles.heroBackRow}>
                  <Pressable style={styles.backIconBtn} onPress={() => navigation.goBack()} hitSlop={10}>
                    <Ionicons name="arrow-back" size={24} color="#31429B" />
                  </Pressable>
                </View>

                <View style={styles.heroRow}>
                  {hasValidMainAvatar && profileImageUri ? (
                    <Image source={{ uri: profileImageUri }} style={[styles.avatar, { width: layout.avatarSize, height: layout.avatarSize, borderRadius: layout.avatarSize / 2 }]} />
                  ) : (
                    <AvatarInitials name={profileName} size={layout.avatarSize} style={styles.avatar} backgroundColor="#31429B" />
                  )}
                  
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
                    
                    {/* CONNECTION ACTION ROW */}
                    <View style={styles.actionRow}>
                      {isConnected ? (
                        <>
                          <TouchableOpacity style={styles.messageButton} onPress={openConversation}>
                            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.messageButtonText}>Message</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.disconnectButton} onPress={confirmRemoveConnection}>
                            <Ionicons name="person-remove-outline" size={16} color="#B42318" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity 
                          style={[styles.connectButton, isPendingConnection && styles.pendingButton, isConnectionActionDisabled && styles.disabledButton]} 
                          onPress={isPendingConnection ? confirmCancelPendingRequest : handleAddConnection}
                          disabled={isConnectionActionDisabled}
                          activeOpacity={0.8}
                        >
                          <Ionicons name={isPendingConnection ? "time-outline" : "person-add-outline"} size={16} color="#FFD404" />
                          <Text style={styles.connectButtonText}>
                            {followLoading ? "Processing..." : isPendingConnection ? "Pending" : "Connect"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>

              </View>

              {/* DARK BLUE SECTION WITH SPACE BACKGROUND */}
              <ImageBackground source={require("../../assets/images/Demos (1) 1.png")} style={styles.darkSection} resizeMode="cover">
                
                {/* Biography */}
                <Text style={styles.sectionHeadingYellow}>Biography</Text>
                {profileSummary.biographyText ? (
                  <Text style={styles.biographyText}>{profileSummary.biographyText}</Text>
                ) : (
                  <Text style={[styles.biographyText, { fontStyle: 'italic', color: '#94A3B8' }]}>
                    This user hasn't added a biography yet.
                  </Text>
                )}

                {/* Work Experience */}
                <Text style={styles.sectionHeadingYellow}>Work Experience</Text>
                {workExperiences.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workScrollContent}>
                    {workExperiences.map((emp, index) => {
                      const jobTitle = emp.title || emp.job_title || "Position not specified";
                      const company = emp.subtitle || emp.company_name || emp.company || "";
                      const period = emp.period || (emp.start_date ? `${emp.start_date} - ${emp.end_date || 'Present'}` : "");
                      const description = emp.description || "";

                      return (
                        <View key={emp.id ?? index} style={styles.workCard}>
                          <Ionicons name="briefcase" size={28} color="#31429B" style={styles.workBriefcase} />
                          <Text style={styles.workTitle}>{jobTitle}</Text>
                          {company ? <Text style={styles.workSubtitle}>{company}</Text> : null}
                          {period ? <Text style={styles.workPeriod}>{period}</Text> : null}
                          {description ? <Text style={styles.workDescription}>{description}</Text> : null}
                        </View>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <Text style={[styles.biographyText, { fontStyle: 'italic', color: '#94A3B8', marginBottom: 20 }]}>
                    No work experience added yet.
                  </Text>
                )}

                {/* Skills */}
                <Text style={styles.sectionHeadingYellow}>Skills</Text>
                {userSkills.length > 0 ? (
                  <View style={styles.skillsGrid}>
                    {userSkills.map((skill, i) => (
                      <View key={i} style={styles.skillPill}>
                        <Text style={styles.skillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.biographyText, { fontStyle: 'italic', color: '#94A3B8', marginBottom: 20 }]}>
                    No skills added yet.
                  </Text>
                )}

              </ImageBackground>

              {/* POSTS SECTION */}
              <View style={styles.postsSection}>
                <Text style={styles.sectionHeadingBlack}>Posts</Text>
                
                {postsLoading ? (
                  <View style={styles.stateWrap}><ActivityIndicator size="small" color="#31429B" /></View>
                ) : profilePosts.length === 0 ? (
                  <Text style={styles.emptyPostsText}>No posts yet.</Text>
                ) : (
                  profilePosts.map((post) => {
                    const isRepostFeedItem = post.feed_type === 'repost';
                    const originalPost = post.original_post ?? null;
                    
                    if (isRepostFeedItem && originalPost) {
                      const reposterName = getPostAuthorName(post);
                      const reposterAvatar = getAvatarUri(reposterName, post.alumni?.alumni_photo);
                      const hasValidRepostAvatar = hasValidProfilePhoto(post.alumni?.alumni_photo);
                      
                      return (
                        <View key={post.id} style={styles.repostWrapper}>
                          <View style={styles.repostBanner}>
                            {hasValidRepostAvatar && reposterAvatar ? (
                              <Image source={{ uri: reposterAvatar }} style={styles.repostBannerAvatar} />
                            ) : (
                              <AvatarInitials name={reposterName} size={24} style={styles.repostBannerAvatar} backgroundColor="#31429B" />
                            )}
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
      </View>
  );
};

export default ProfileViewScreen;
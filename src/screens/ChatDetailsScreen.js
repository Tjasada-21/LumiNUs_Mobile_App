import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getAvatarUri } from "../utils/imageUtils";
import AvatarInitials from "../components/AvatarInitials";
import {
  addGroupMember,
  getGroupChat,
  removeGroupMember,
} from "../services/messageQueries";
import { getCurrentUser } from "../services/supabaseAuth";
import { getFollowers, getFollowing } from "../services/connectionQueries";
import { ThemedAlert } from "../components/ThemedAlert";
import supabase from "../services/supabase";
import * as FileSystem from 'expo-file-system/legacy';

import styles from "../styles/ChatDetailsScreen.styles";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Helper for media URIs (chat attachments - supports local and public URLs)
const getMediaUri = (raw) => {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || /^file:\/\//i.test(raw)) return raw; 
  
  const cleanPath = String(raw).replace(/^\/+/, "");
  const { data } = supabase.storage
    .from('luminus_messages_attachments')
    .getPublicUrl(cleanPath);
  
  return data?.publicUrl || "";
};

// Convert full URL back to relative storage path
const getRelativePath = (raw) => {
  if (!raw) return null;
  const str = String(raw).trim();
  
  if (/^https?:\/\//i.test(str)) {
    const assetIndex = str.indexOf('luminus_messages_attachments/');
    if (assetIndex !== -1) {
      const relativePath = str.substring(assetIndex + 'luminus_messages_attachments/'.length);
      const cleanPath = relativePath.split('?')[0];
      if (cleanPath.length > 255) return null;
      return cleanPath;
    }

    const oldAssetIndex = str.indexOf('luminus_assets/');
    if (oldAssetIndex !== -1) {
      const relativePath = str.substring(oldAssetIndex + 'luminus_assets/'.length);
      const cleanPath = relativePath.split('?')[0];
      if (cleanPath.length > 255) return null;
      return cleanPath;
    }

    return null;
  }
  
  if (str.length > 255) return null;
  return str;
};

// Helper to get signed avatar URL for better reliability
const getSignedAvatarUrl = async (path) => {
  if (!path) return null;
  try {
    const cleanPath = String(path).replace(/^\/+/, "");
    
    if (cleanPath.length > 255) return null;
    
    const { data, error } = await supabase.storage
      .from('luminus_messages_attachments')
      .createSignedUrl(cleanPath, 60 * 60);
    
    if (error) return null;
    return data?.signedUrl || null;
  } catch (err) {
    return null;
  }
};

const ChatDetailsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  
  // Extract route params
  const routeContact = route?.params?.contact;
  const routeGroup = route?.params?.group;
  const routeGroupId = routeGroup?.id ?? route?.params?.groupId ?? null;
  const dmProfileUserId = routeContact?.id ?? routeContact?.alumni_id ?? null;
  const isDM = Boolean(routeContact);

  // --- STATE DECLARATIONS ---
  const [resolvedGroup, setResolvedGroup] = useState(routeGroup ?? null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const [candidateMembers, setCandidateMembers] = useState([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  
  const [isEditGroupModalVisible, setIsEditGroupModalVisible] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState(routeGroup?.name ?? "");
  const [groupAvatarDraft, setGroupAvatarDraft] = useState(routeGroup?.avatar_url ?? routeGroup?.avatar ?? "");
  const [isSavingGroupDetails, setIsSavingGroupDetails] = useState(false);
  const [signedAvatarUrl, setSignedAvatarUrl] = useState("");
  const [chatMedia, setChatMedia] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  
  // Avatar URL states
  const [dmAvatarUrl, setDmAvatarUrl] = useState(null);
  const [groupAvatarUrl, setGroupAvatarUrl] = useState(null);
  const [dmAvatarError, setDmAvatarError] = useState(false);
  const [groupAvatarError, setGroupAvatarError] = useState(false);

  // --- DERIVED DATA ---
  const groupData = resolvedGroup || routeGroup || { name: "Group Chat", members: [], media: [] };
  const groupName = groupData?.name || "NU Lipa Alumni Community";
  
  const dmName = routeContact?.name ?? (`${routeContact?.first_name ?? ""} ${routeContact?.last_name ?? ""}`.trim() || "Alumni");
  const rawDmAvatar = routeContact?.avatar ?? routeContact?.alumni_photo;

  // Avatar URIs for components
  const dmAvatarUri = (dmAvatarUrl && dmAvatarUrl.length > 0 && !dmAvatarError) ? dmAvatarUrl : null;
  const groupAvatarUri = (groupAvatarUrl && groupAvatarUrl.length > 0 && !groupAvatarError) ? groupAvatarUrl : null;

  // --- UPLOAD HANDLERS ---
  const pickAndUploadGroupAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        ThemedAlert.alert("Permission required", "Please allow access to your photo library.");
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) return null;

      const asset = result.assets[0];
      const extension = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
      
      if (!routeGroupId) {
        ThemedAlert.alert("Error", "Cannot upload: Group ID is missing.");
        return null;
      }

      const fileName = `group_avatar/${routeGroupId}_avatar.${extension}`;

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
      const contentType = mimeMap[extension] || 'image/jpeg';

      if (groupAvatarDraft) {
        const oldPath = String(groupAvatarDraft).replace(/^\/+/, "");
        await supabase.storage
          .from('luminus_messages_attachments')
          .remove([oldPath])
          .catch(() => {}); 
      }

      const { error: uploadError } = await supabase.storage
        .from('luminus_messages_attachments')
        .upload(fileName, bytes, { contentType, upsert: true });

      if (uploadError) throw uploadError;

      return fileName;
    } catch (error) {
      ThemedAlert.alert("Upload failed", error.message || "Could not upload the group photo.");
      return null;
    }
  };

  const handleChangeGroupAvatar = async () => {
    const uploadedPath = await pickAndUploadGroupAvatar();
    if (uploadedPath) {
      setGroupAvatarDraft(uploadedPath);
    }
  };

  // --- EFFECTS ---

  // 1. Load DM avatar
  useEffect(() => {
    let active = true;
    
    const loadDmAvatar = async () => {
      if (!isDM) {
        if (active) {
          setDmAvatarUrl(null);
          setDmAvatarError(false);
        }
        return;
      }
      
      const avatarSource = rawDmAvatar || routeContact?.avatar_url || routeContact?.avatar || routeContact?.alumni_photo;
      
      if (!avatarSource || typeof avatarSource !== 'string' || avatarSource.trim().length === 0) {
        if (active) {
          setDmAvatarUrl(null);
          setDmAvatarError(false);
        }
        return;
      }
      
      const publicUrl = getAvatarUri(dmName, avatarSource);
      
      if (publicUrl && publicUrl.length > 0 && publicUrl.startsWith('http')) {
        if (active) {
          setDmAvatarUrl(publicUrl);
          setDmAvatarError(false);
        }
        return;
      }
      
      if (/^https?:\/\//i.test(avatarSource)) {
        if (active) {
          setDmAvatarUrl(avatarSource);
          setDmAvatarError(false);
        }
        return;
      }
      
      const relativePath = getRelativePath(avatarSource);
      if (relativePath) {
        const signedUrl = await getSignedAvatarUrl(relativePath);
        if (active && signedUrl) {
          setDmAvatarUrl(signedUrl);
          setDmAvatarError(false);
          return;
        }
      }
      
      try {
        const cleanPath = String(avatarSource).replace(/^\/+/, "");
        const { data } = supabase.storage
          .from('luminus_assets')
          .getPublicUrl(cleanPath);
        
        if (data?.publicUrl) {
          if (active) {
            setDmAvatarUrl(data.publicUrl);
            setDmAvatarError(false);
          }
          return;
        }
      } catch (err) {
        // Silently fail
      }
      
      if (active) {
        setDmAvatarUrl(null);
        setDmAvatarError(false);
      }
    };
    
    loadDmAvatar();
    return () => { active = false; };
  }, [isDM, rawDmAvatar, routeContact?.avatar_url, routeContact?.avatar, routeContact?.alumni_photo, dmName]);

  // 2. Load group avatar with multiple fallback methods
  useEffect(() => {
    let active = true;
    
    const loadGroupAvatar = async () => {
      const avatarPath = groupAvatarDraft || groupData?.avatar_url || groupData?.avatar;
      
      if (!avatarPath || (typeof avatarPath === 'string' && avatarPath.trim().length === 0)) {
        if (active) {
          setGroupAvatarUrl(null);
          setGroupAvatarError(false);
        }
        return;
      }
      
      // If it's already a full URL, use it directly
      if (/^https?:\/\//i.test(avatarPath)) {
        if (active) {
          setGroupAvatarUrl(avatarPath);
          setGroupAvatarError(false);
        }
        return;
      }
      
      // Try signed URL from messages bucket
      const relativePath = getRelativePath(avatarPath);
      if (relativePath) {
        const signedUrl = await getSignedAvatarUrl(relativePath);
        if (active && signedUrl) {
          setGroupAvatarUrl(signedUrl);
          setGroupAvatarError(false);
          return;
        }
      }
      
      // Try public URL from messages bucket
      try {
        const cleanPath = String(avatarPath).replace(/^\/+/, "");
        const { data } = supabase.storage
          .from('luminus_messages_attachments')
          .getPublicUrl(cleanPath);
        
        if (data?.publicUrl && active) {
          setGroupAvatarUrl(data.publicUrl);
          setGroupAvatarError(false);
          return;
        }
      } catch (err) {
        // Silently fail
      }
      
      if (active) {
        setGroupAvatarUrl(null);
        setGroupAvatarError(false);
      }
    };
    
    loadGroupAvatar();
    return () => { active = false; };
  }, [groupAvatarDraft, groupData?.avatar_url, groupData?.avatar]);

  // 3. Update signedAvatarUrl for edit modal compatibility
  useEffect(() => {
    setSignedAvatarUrl(groupAvatarUrl || "");
  }, [groupAvatarUrl]);

  // 4. Get current user ID
  useEffect(() => {
    let active = true;
    const loadCurrentUser = async () => {
      const currentUser = await getCurrentUser().catch(() => null);
      if (active) setCurrentUserId(currentUser?.id ?? null);
    };
    loadCurrentUser();
    return () => { active = false; };
  }, []);

  // 5. Fetch media files
  useEffect(() => {
    let active = true;
    const fetchChatMedia = async () => {
      if (!currentUserId) return;
      
      setIsLoadingMedia(true);
      try {
        let mediaUris = [];

        if (isDM && dmProfileUserId) {
          const { data: dmMessages } = await supabase
            .from("messages")
            .select("id")
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${dmProfileUserId}),and(sender_id.eq.${dmProfileUserId},receiver_id.eq.${currentUserId})`);

          if (dmMessages?.length > 0) {
            const messageIds = dmMessages.map(m => m.id);
            const { data: attachments } = await supabase
              .from("messages_attachments")
              .select("attachment_path")
              .in("message_id", messageIds)
              .eq("attachment_type", "image");

            mediaUris = attachments?.map(a => a.attachment_path) || [];
          }
        } else if (!isDM && routeGroupId) {
          const { data: groupMessages } = await supabase
            .from("group_messages")
            .select("id")
            .eq("group_chat_id", routeGroupId);

          if (groupMessages?.length > 0) {
            const messageIds = groupMessages.map(m => m.id);
            const { data: attachments } = await supabase
              .from("messages_attachments")
              .select("attachment_path")
              .in("message_id", messageIds)
              .eq("attachment_type", "image");

            mediaUris = attachments?.map(a => a.attachment_path) || [];
          }
        }

        if (active) setChatMedia(mediaUris);
      } catch (err) {
        // Silently fail
      } finally {
        if (active) setIsLoadingMedia(false);
      }
    };

    fetchChatMedia();
    return () => { active = false; };
  }, [currentUserId, isDM, routeGroupId, dmProfileUserId]);

  // 6. Load group details
  useEffect(() => {
    let active = true;
    const loadGroupDetails = async () => {
      if (!routeGroupId) {
        if (active) setResolvedGroup(routeGroup ?? null);
        return;
      }
      try {
        setIsLoadingMembers(true);
        const fetchedGroup = await getGroupChat(routeGroupId).catch(() => null);
        if (!active) return;
        if (fetchedGroup) {
          setResolvedGroup((previousGroup) => ({
            ...(previousGroup ?? {}),
            ...fetchedGroup,
            members: Array.isArray(fetchedGroup?.members)
              ? fetchedGroup.members
              : Array.isArray(previousGroup?.members)
                ? previousGroup.members
                : [],
          }));
        } else {
          setResolvedGroup(routeGroup ?? null);
        }
      } finally {
        if (active) setIsLoadingMembers(false);
      }
    };
    loadGroupDetails();
    return () => { active = false; };
  }, [routeGroup, routeGroupId]);

  // 7. Sync draft with loaded data
  useEffect(() => {
    setGroupNameDraft(groupData?.name ?? "");
    const rawAvatar = groupData?.avatar_url ?? groupData?.avatar ?? "";
    const safeAvatar = rawAvatar && rawAvatar.length <= 255 ? rawAvatar : "";
    setGroupAvatarDraft(safeAvatar);
  }, [groupData?.avatar, groupData?.avatar_url, groupData?.name]);

  // --- MEMOS ---
  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return candidateMembers.slice(0, 50);
    return candidateMembers.filter((member) => member.name.toLowerCase().includes(query)).slice(0, 50);
  }, [candidateMembers, searchQuery]);

  const normalizedMembers = useMemo(() => {
    const rawMembers = Array.isArray(groupData?.members) ? groupData.members : [];
    return rawMembers.map((member, index) => {
      const profile = member?.alumni ?? member ?? {};
      const fallbackName = [profile?.first_name ?? "", profile?.last_name ?? ""].filter(Boolean).join(" ").trim();
      const fullName = (profile?.name ?? member?.name ?? fallbackName) || "Member";
      const avatar = profile?.alumni_photo ?? member?.avatar ?? null;

      return {
        id: profile?.id ?? member?.alumni_id ?? index,
        alumniId: profile?.id ?? member?.alumni_id ?? index,
        name: fullName,
        avatar: getAvatarUri(fullName, avatar),
        role: member?.role ?? profile?.role ?? "alumni",
      };
    });
  }, [groupData?.members]);

  const isCurrentUserAdmin = useMemo(() => {
    if (!currentUserId) return false;
    return normalizedMembers.some(
      (member) => String(member.alumniId) === String(currentUserId) && String(member.role).toLowerCase() === "admin"
    );
  }, [currentUserId, normalizedMembers]);

  const existingMemberIds = useMemo(() => {
    const members = Array.isArray(groupData?.members) ? groupData.members : [];
    return new Set(members.map((member) => String(member?.alumni?.id ?? member?.alumni_id ?? member?.id)).filter(Boolean));
  }, [groupData?.members]);

  // --- HANDLERS ---
  const loadCandidateMembers = useCallback(async () => {
    if (!routeGroupId) return setCandidateMembers([]);
    try {
      setIsLoadingCandidates(true);
      const currentUser = await getCurrentUser().catch(() => null);
      if (!currentUser?.id) return setCandidateMembers([]);

      const [followingRows, followerRows] = await Promise.all([
        getFollowing(currentUser.id).catch(() => []),
        getFollowers(currentUser.id).catch(() => []),
      ]);

      const candidatesMap = new Map();
      (followingRows || []).forEach((row) => row?.followed?.id && candidatesMap.set(String(row.followed.id), row.followed));
      (followerRows || []).forEach((row) => {
        if (row?.follower?.id && !candidatesMap.has(String(row.follower.id))) {
          candidatesMap.set(String(row.follower.id), row.follower);
        }
      });

      const nextCandidates = Array.from(candidatesMap.values())
        .filter((alumni) => alumni?.id && !existingMemberIds.has(String(alumni.id)))
        .map((alumni) => {
          const fullName = `${alumni?.first_name ?? ""} ${alumni?.last_name ?? ""}`.trim() || "Alumni";
          return { id: alumni.id, name: fullName, avatar: getAvatarUri(fullName, alumni?.alumni_photo) };
        });

      setCandidateMembers(nextCandidates);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [existingMemberIds, routeGroupId]);

  const handleAddMember = async (member) => {
    if (!routeGroupId || !member?.id) return;
    try {
      setAddingMemberId(member.id);
      await addGroupMember(routeGroupId, member.id);
      
      const fetchedGroup = await getGroupChat(routeGroupId).catch(() => null);
      if (fetchedGroup) {
        setResolvedGroup((previousGroup) => ({
          ...(previousGroup ?? {}),
          ...fetchedGroup,
          members: Array.isArray(fetchedGroup?.members) ? fetchedGroup.members : [],
        }));
      }
      
      loadCandidateMembers();
      ThemedAlert.alert("Member Added", `${member.name} has been added to the group.`);
    } catch (error) {
      ThemedAlert.alert("Error", "Could not add member. Please try again.");
    } finally {
      setAddingMemberId(null);
    }
  };

  const openGroupEditor = () => {
    setGroupNameDraft(groupData?.name ?? "");
    const rawAvatar = groupData?.avatar_url ?? groupData?.avatar ?? "";
    const safeAvatar = rawAvatar && rawAvatar.length <= 255 ? rawAvatar : "";
    setGroupAvatarDraft(safeAvatar);
    setIsEditGroupModalVisible(true);
  };

  const handleSaveGroupDetails = async () => {
    if (!routeGroupId) {
      ThemedAlert.alert("Error", "Group ID is missing.");
      return;
    }

    if (!isCurrentUserAdmin) {
      ThemedAlert.alert("Permission Denied", "Only group admins can edit group details.");
      return;
    }
    
    const nextName = groupNameDraft.trim() || groupData?.name || "Group Chat";
    
    let nextAvatarRelative = null;
    if (groupAvatarDraft) {
      if (groupAvatarDraft.startsWith('data:')) {
        nextAvatarRelative = null;
      } else if (groupAvatarDraft.length > 255) {
        ThemedAlert.alert("Error", "Group photo path is invalid. Please try uploading a new photo.");
        return;
      } else {
        nextAvatarRelative = getRelativePath(groupAvatarDraft);
      }
    }

    try {
      setIsSavingGroupDetails(true);
      const { data, error } = await supabase
        .from("group_chats")
        .update({ 
          name: nextName, 
          avatar_url: nextAvatarRelative,
          updated_at: new Date().toISOString()
        })
        .eq("id", routeGroupId)
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setResolvedGroup((previousGroup) => ({
          ...(previousGroup ?? {}),
          ...data,
          members: groupData?.members ?? [],
        }));
      }
      
      setIsEditGroupModalVisible(false);
      ThemedAlert.alert("Group Updated", "The group name and avatar were saved successfully.");
    } catch (error) {
      ThemedAlert.alert("Update failed", `Unable to update the group: ${error.message}`);
    } finally {
      setIsSavingGroupDetails(false);
    }
  };

  const handleLeaveGroup = () => {
    if (!routeGroupId) return;
    ThemedAlert.alert(
      "Leave Group",
      "Are you sure you want to leave this group chat?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              const currentUser = await getCurrentUser().catch(() => null);
              if (!currentUser?.id) return;
              const { error } = await supabase.from("group_chat_members").delete().eq("group_chat_id", routeGroupId).eq("alumni_id", currentUser.id);
              if (error) throw error;
              ThemedAlert.alert("Left Group", "You have left the group chat.");
              
              // Redirect immediately to the Chat Screen instead of the Convo Screen
              const parentNavigator = navigation.getParent?.();
              if (parentNavigator?.navigate) {
                parentNavigator.navigate("ChatScreen");
              } else {
                navigation.navigate("ChatScreen");
              }
            } catch (e) {
              ThemedAlert.alert("Error", "Could not leave the group at this time.");
            }
          },
        },
      ]
    );
  };

  const updateDMSettings = async (updates) => {
    if (!dmProfileUserId) return false;
    try {
      const currentUser = await getCurrentUser().catch(() => null);
      if (!currentUser?.id) return false;
      const { error } = await supabase.from("dm_settings").upsert({ user_id: currentUser.id, contact_id: dmProfileUserId, ...updates }, { onConflict: "user_id, contact_id" });
      if (error) throw error;
      return true;
    } catch (e) { return false; }
  };

  const handleMute = () => {
    ThemedAlert.alert("Mute", "Mute notifications from this chat?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mute",
        onPress: async () => {
          if (isDM) await updateDMSettings({ is_muted: true });
          ThemedAlert.alert("Muted", "Notifications for this chat are now muted.");
        },
      },
    ]);
  };

  const handleBlock = () => {
    ThemedAlert.alert("Block User", "Are you sure you want to block this user?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          if (await updateDMSettings({ is_blocked: true })) {
            ThemedAlert.alert("Blocked", "This user has been blocked.");
            navigation.goBack();
          }
        },
      },
    ]);
  };

  const dummyAction = () => {
    ThemedAlert.alert("Coming Soon", "This feature will be available in a future update.");
  };

  // --- RENDER HELPERS ---
  const renderQuickAction = (icon, label, color, onPress) => (
    <View style={styles.quickActionWrap}>
      <TouchableOpacity style={[styles.quickActionCircle, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.8}>
        <Ionicons name={icon} size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </View>
  );

  const renderActionRow = (icon, label, isDestructive, onPress) => (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.actionIconCircle, { backgroundColor: isDestructive ? "#DC2626" : "#31429B" }]}>
        <Ionicons name={icon} size={16} color="#FFFFFF" />
      </View>
      <Text style={styles.actionRowText}>{label}</Text>
    </TouchableOpacity>
  );

  // --- RENDER ---
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}>
          
          <View style={styles.headerArtworkWrap}>
            <Image 
              source={require("../../assets/images/Space_HeaderBG_Blue 1.png")} 
              style={styles.doodleBg} 
              resizeMode="contain" 
            />

            <View style={styles.headerRow}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
                <Ionicons name="arrow-back" size={32} color="#31429B" />
              </Pressable>
            </View>

            <View style={styles.profileSection}>
              {isDM ? (
                dmAvatarUri ? (
                  <Image 
                    source={{ uri: dmAvatarUri }} 
                    style={styles.avatarCircular}
                    onError={() => setDmAvatarError(true)}
                  />
                ) : (
                  <AvatarInitials 
                    name={dmName} 
                    uri={null} 
                    size={88} 
                    style={styles.avatarCircular}
                    textStyle={{
                      fontFamily: "Poppins_700Bold",
                      color: "#FBD117",
                    }}
                    backgroundColor="#32418c"
                  />
                )
              ) : (
                groupAvatarUri ? (
                  <Image 
                    source={{ uri: groupAvatarUri }} 
                    style={styles.avatarCircular}
                    onError={() => setGroupAvatarError(true)}
                  />
                ) : (
                  <AvatarInitials 
                    name={groupName} 
                    uri={null} 
                    size={88} 
                    style={styles.avatarCircular}
                    textStyle={{
                      fontFamily: "Poppins_700Bold",
                      color: "#FBD117",
                    }}
                    backgroundColor="#32418c"
                  />
                )
              )}
              
              <Text style={styles.profileName} numberOfLines={2}>
                {isDM ? dmName : groupName}
              </Text>

              <View style={styles.quickActionsRow}>
                {isDM ? (
                  <>
                    {renderQuickAction("person", "Profile", "#31429B", () => navigation.navigate("Home", { screen: "ProfileView", params: { userId: dmProfileUserId } }))}
                    {renderQuickAction("call", "Call", "#31429B", dummyAction)}
                    {renderQuickAction("remove-circle", "Block", "#DC2626", handleBlock)}
                  </>
                ) : (
                  <>
                    {renderQuickAction("person-add", "Add", "#31429B", () => setIsAddMemberModalVisible(true))}
                    {renderQuickAction("pencil", "Edit", "#31429B", openGroupEditor)}
                    {renderQuickAction("exit", "Leave", "#DC2626", handleLeaveGroup)}
                  </>
                )}
              </View>
            </View>
          </View>

          <Text style={styles.sectionHeading}>Media</Text>
          {isLoadingMedia ? (
            <ActivityIndicator size="small" color="#31429B" style={{ alignSelf: "flex-start", marginLeft: 24, marginTop: 10 }} />
          ) : chatMedia.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaScroll}>
              {chatMedia.map((itemUri, index) => (
                <Image key={index} source={{ uri: getMediaUri(itemUri) }} style={styles.mediaBox} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <Text style={{ marginLeft: 24, color: "#9CA3AF", fontSize: 14, fontFamily: "Poppins_400Regular" }}>
              No media shared yet.
            </Text>
          )}

          <Text style={styles.sectionHeading}>Actions</Text>
          <View style={styles.actionsList}>
            {isDM ? (
              <>
                {renderActionRow("notifications-off", `Mute ${dmName.split(" ")[0]}`, false, handleMute)}
                {renderActionRow("people", `Create Group Chat with ${dmName.split(" ")[0]}`, false, dummyAction)}
                {renderActionRow("share-social", "Share User ID", false, dummyAction)}
                {renderActionRow("trash", "Delete Chat", true, dummyAction)}
              </>
            ) : (
              <>
                {renderActionRow("notifications-off", "Mute Channel", false, handleMute)}
                {renderActionRow("time", "STANDBY MUNA YUNG SLOT NA 'TO", false, dummyAction)}
                {renderActionRow("share-social", "Share Channel ID", false, dummyAction)}
                {renderActionRow("trash", "Delete Chat", true, dummyAction)}
              </>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 0) }]}> 
          <Image
            source={require("../../assets/images/LumiNUs Logo white.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* EDIT GROUP MODAL */}
      <Modal visible={isEditGroupModalVisible} transparent animationType="fade" onRequestClose={() => setIsEditGroupModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Group</Text>
              <TouchableOpacity onPress={() => setIsEditGroupModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.editLabel}>Group Photo</Text>
            <TouchableOpacity 
              style={styles.avatarPickerWrap} 
              onPress={handleChangeGroupAvatar}
              activeOpacity={0.8}
            >
              {signedAvatarUrl ? (
                <Image 
                  source={{ uri: signedAvatarUrl }} 
                  style={styles.avatarPreview}
                  onError={() => setGroupAvatarError(true)}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera" size={28} color="#9CA3AF" />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="pencil" size={12} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.editLabel}>Group name</Text>
            <TextInput
              style={styles.editInput}
              value={groupNameDraft}
              onChangeText={setGroupNameDraft}
              placeholder="Group name"
              placeholderTextColor="#9CA3AF"
              maxLength={60}
            />
            <TouchableOpacity style={styles.saveGroupButton} onPress={handleSaveGroupDetails} disabled={isSavingGroupDetails}>
              {isSavingGroupDetails ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveGroupButtonText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ADD MEMBER MODAL */}
      <Modal visible={isAddMemberModalVisible} transparent animationType="fade" onRequestClose={() => setIsAddMemberModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Group Member</Text>
              <TouchableOpacity onPress={() => setIsAddMemberModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchBox}>
              <Ionicons name="search-outline" size={18} color="#6B7280" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search connections..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            {isLoadingCandidates ? (
              <ActivityIndicator size="small" color="#31429B" style={{ marginVertical: 20 }}/>
            ) : (
              <FlatList
                data={filteredCandidates}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.candidateRow}>
                    <AvatarInitials name={item.name} uri={item.avatar} size={36} style={styles.candidateAvatar} />
                    <Text style={styles.candidateName} numberOfLines={1}>{item.name}</Text>
                    <TouchableOpacity style={styles.candidateAddButton} onPress={() => handleAddMember(item)}>
                      <Text style={styles.candidateAddButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                )}
                style={styles.candidateList}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ChatDetailsScreen;
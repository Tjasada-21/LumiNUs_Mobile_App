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
import {
  addGroupMember,
  getGroupChat,
  removeGroupMember,
} from "../services/messageQueries";
import { getCurrentUser } from "../services/supabaseAuth";
import { getFollowers, getFollowing } from "../services/connectionQueries";
import { ThemedAlert } from "../components/ThemedAlert";
import supabase from "../services/supabase";

import styles from "../styles/ChatDetailsScreen.styles";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const ChatDetailsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  
  // Extract route params
  const routeContact = route?.params?.contact;
  const routeGroup = route?.params?.group;
  const routeGroupId = routeGroup?.id ?? route?.params?.groupId ?? null;
  const dmProfileUserId = routeContact?.id ?? routeContact?.alumni_id ?? null;
  const isDM = Boolean(routeContact);

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

  useEffect(() => {
    let active = true;
    const loadCurrentUser = async () => {
      const currentUser = await getCurrentUser().catch(() => null);
      if (active) setCurrentUserId(currentUser?.id ?? null);
    };
    loadCurrentUser();
    return () => { active = false; };
  }, []);

  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return candidateMembers.slice(0, 50);
    return candidateMembers.filter((member) => member.name.toLowerCase().includes(query)).slice(0, 50);
  }, [candidateMembers, searchQuery]);

  const applyFetchedGroup = useCallback((fetchedGroup) => {
    setResolvedGroup((previousGroup) => ({
      ...(previousGroup ?? {}),
      ...fetchedGroup,
      members: Array.isArray(fetchedGroup?.members)
        ? fetchedGroup.members
        : Array.isArray(previousGroup?.members)
          ? previousGroup.members
          : [],
    }));
  }, []);

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
        if (fetchedGroup) applyFetchedGroup(fetchedGroup);
        else setResolvedGroup(routeGroup ?? null);
      } finally {
        if (active) setIsLoadingMembers(false);
      }
    };
    loadGroupDetails();
    return () => { active = false; };
  }, [applyFetchedGroup, routeGroup, routeGroupId]);

  const groupData = resolvedGroup || routeGroup || { name: "Group Chat", members: [], media: [] };
  const groupName = groupData?.name || "NU Lipa Alumni Community";

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

  useEffect(() => {
    setGroupNameDraft(groupData?.name ?? "");
    setGroupAvatarDraft(groupData?.avatar_url ?? groupData?.avatar ?? "");
  }, [groupData?.avatar, groupData?.avatar_url, groupData?.name]);

  const existingMemberIds = useMemo(() => {
    const members = Array.isArray(groupData?.members) ? groupData.members : [];
    return new Set(members.map((member) => String(member?.alumni?.id ?? member?.alumni_id ?? member?.id)).filter(Boolean));
  }, [groupData?.members]);

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

  const openGroupEditor = () => {
    setGroupNameDraft(groupData?.name ?? "");
    setGroupAvatarDraft(groupData?.avatar_url ?? groupData?.avatar ?? "");
    setIsEditGroupModalVisible(true);
  };

  const handleSaveGroupDetails = useCallback(async () => {
    if (!routeGroupId || !isCurrentUserAdmin) return;
    const nextName = groupNameDraft.trim() || groupData?.name || "Group Chat";
    const nextAvatar = groupAvatarDraft || null;

    try {
      setIsSavingGroupDetails(true);
      const { data, error } = await supabase.from("group_chats").update({ name: nextName, avatar_url: nextAvatar }).eq("id", routeGroupId).select().single();
      if (error) throw error;
      if (data) applyFetchedGroup({ ...data, members: groupData?.members ?? [] });
      setIsEditGroupModalVisible(false);
      ThemedAlert.alert("Group Updated", "The group name and avatar were saved.");
    } catch (error) {
      ThemedAlert.alert("Update failed", "Unable to update the group right now.");
    } finally {
      setIsSavingGroupDetails(false);
    }
  }, [applyFetchedGroup, groupAvatarDraft, groupData?.members, groupData?.name, groupNameDraft, isCurrentUserAdmin, routeGroupId]);

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
              navigation.goBack();
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

  // --- VARIABLES FOR VIEW ---
  const dmName = routeContact?.name ?? (`${routeContact?.first_name ?? ""} ${routeContact?.last_name ?? ""}`.trim() || "Alumni");
  const dmAvatar = getAvatarUri(dmName, routeContact?.avatar ?? routeContact?.alumni_photo);
  const groupAvatarUri = getAvatarUri(groupName, groupAvatarDraft || groupData?.avatar_url || groupData?.avatar);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}>
          
          {/* --- TOP ARTWORK & PROFILE WRAPPER --- */}
          <View style={styles.headerArtworkWrap}>
            {/* Background Space Doodle Image */}
            <Image 
              source={require("../../assets/images/Space_HeaderBG_White 2.png")} 
              style={styles.doodleBg} 
              resizeMode="cover" 
            />

            {/* Top Header */}
            <View style={styles.headerRow}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
                <Ionicons name="arrow-back" size={32} color="#31429B" />
              </Pressable>
            </View>

            {/* PROFILE INFO SECTION */}
            <View style={styles.profileSection}>
              {isDM ? (
                <Image source={{ uri: dmAvatar }} style={styles.avatarCircular} />
              ) : (
                <View style={styles.avatarSquareWrap}>
                  <Image source={{ uri: groupAvatarUri }} style={styles.avatarSquare} />
                </View>
              )}
              
              <Text style={styles.profileName} numberOfLines={2}>
                {isDM ? dmName : groupName}
              </Text>

              {/* QUICK ACTIONS ROW */}
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
                    {renderQuickAction("pencil", "Rename", "#31429B", openGroupEditor)}
                    {renderQuickAction("exit", "Leave", "#DC2626", handleLeaveGroup)}
                  </>
                )}
              </View>
            </View>
          </View>
          {/* --- END TOP ARTWORK --- */}

          {/* MEDIA SECTION */}
          <Text style={styles.sectionHeading}>Media</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaScroll}>
            {/* Real media mapping or placeholders if empty */}
            {groupData?.media && groupData.media.length > 0 ? (
              groupData.media.map((item, index) => (
                <Image key={index} source={{ uri: item?.uri }} style={styles.mediaBox} />
              ))
            ) : (
              <>
                <View style={styles.mediaBox} />
                <View style={styles.mediaBox} />
                <View style={styles.mediaBox} />
              </>
            )}
          </ScrollView>

          {/* ACTIONS SECTION */}
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

        {/* BOTTOM FOOTER */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 0) }]}> 
          <Image
            source={require("../../assets/images/LumiNUs Logo white.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>

      </View>

      {/* --- EDIT GROUP MODAL --- */}
      <Modal visible={isEditGroupModalVisible} transparent animationType="fade" onRequestClose={() => setIsEditGroupModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Rename Group</Text>
              <TouchableOpacity onPress={() => setIsEditGroupModalVisible(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
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

      {/* --- ADD MEMBER MODAL --- */}
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
                    <Image source={{ uri: item.avatar }} style={styles.candidateAvatar} />
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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  FlatList,
  ActivityIndicator,
  Modal,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
import {
  getConversations,
  getUserGroupChats,
  archiveConversation,
  deleteConversation,
  unarchiveConversation,
  restoreConversation,
  updateDMSettings,
} from "../services/messageQueries";
import { getFollowers, getFollowing } from "../services/connectionQueries";
import { getAvatarUri } from "../utils/imageUtils";
import { useCurrentUserProfile } from "../context/CurrentUserProfileContext";
import { useUnreadMessages } from "../context/UnreadMessagesContext";
import styles from "../styles/ChatScreen.styles";
import { ThemedAlert } from "../components/ThemedAlert";
import AvatarInitials from "../components/AvatarInitials";

const CONTACTS_CACHE_TTL_MS = 15000;
let cachedContacts = null;
let cachedContactsLoadedAt = 0;

const TABS = [
  { key: "all", label: "All Chats" },
  { key: "channels", label: "Channels" },
  { key: "favorites", label: "Favorites" },
];

const formatChatTimestamp = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.round(diffMs / 60000);
  const diffHrs = Math.round(diffMins / 60);

  if (diffMins < 60) return `${Math.max(1, diffMins)}m`;
  if (diffHrs < 24) return `${diffHrs}h`;

  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getFullYear() === date.getFullYear() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getDate() === date.getDate();

  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const getGroupAvatarUrl = async (avatarPath) => {
  if (!avatarPath || typeof avatarPath !== "string" || avatarPath.trim() === "") {
    return null;
  }
  
  if (/^https?:\/\//i.test(avatarPath)) {
    return avatarPath;
  }
  
  try {
    const cleanPath = String(avatarPath).replace(/^\/+/, "");
    const { data, error } = await supabase.storage
      .from('luminus_messages_attachments')
      .createSignedUrl(cleanPath, 60 * 60);
    
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch (err) {}
  
  const cleanPath = String(avatarPath).replace(/^\/+/, "");
  return `https://pmnirrvwibzqjlutbnwz.supabase.co/storage/v1/object/public/luminus_messages_attachments/${cleanPath}`;
};

const ChatScreen = ({ navigation }) => {
  const { currentUserProfile } = useCurrentUserProfile();
  const { refreshUnreadMessages } = useUnreadMessages();
  const { width } = useWindowDimensions();

  const [selectedTab, setSelectedTab] = useState("all");
  const [userData, setUserData] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [groupChats, setGroupChats] = useState([]);
  const [isLoadingChatData, setIsLoadingChatData] = useState(false);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [modalContact, setModalContact] = useState(null);
  const [isGroupActionModalVisible, setIsGroupActionModalVisible] = useState(false);
  const [modalGroup, setModalGroup] = useState(null);
  const [favoriteContactIds, setFavoriteContactIds] = useState(new Set());
  const [conversationViewTimestamps, setConversationViewTimestamps] = useState({});
  const [pageOffset, setPageOffset] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [groupAvatarUrls, setGroupAvatarUrls] = useState({});
  const [hiddenContactIds, setHiddenContactIds] = useState(new Set());
  
  // Track muted chats
  const [mutedContactIds, setMutedContactIds] = useState(new Set());
  const [mutedGroupIds, setMutedGroupIds] = useState(new Set());

  const CHAT_LIMIT = 50;
  const tabContentAnimation = useRef(new Animated.Value(1)).current;
  const shimmerProgress = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerProgress, {
        toValue: 1,
        duration: 1300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    shimmerLoop.start();
    return () => {
      shimmerLoop.stop();
      shimmerProgress.stopAnimation();
    };
  }, [shimmerProgress]);

  useEffect(() => {
    tabContentAnimation.setValue(0);
    Animated.timing(tabContentAnimation, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [selectedTab, tabContentAnimation]);

  const openSearchMessage = () => {
    const parentNavigator = navigation.getParent?.();
    if (parentNavigator?.navigate) {
      parentNavigator.navigate("SearchMessage");
      return;
    }
    navigation.navigate("SearchMessage");
  };

  const openNewMessage = () => {
    const parentNavigator = navigation.getParent?.();
    if (parentNavigator?.navigate) {
      parentNavigator.navigate("NewMessage");
      return;
    }
    navigation.navigate("NewMessage");
  };

  const openConversation = (contact) => {
    const contactName = `${contact?.first_name ?? ""} ${contact?.last_name ?? ""}`.trim() || "Alumni";
    const contactAvatar = getAvatarUri(contactName, contact?.alumni_photo);
    const conversationId = contact?.id;
    const receiverType = contact?.user_type || 'alumni';

    setConversationViewTimestamps((prev) => ({
      ...prev,
      [conversationId]: Date.now(),
    }));

    setContacts((prevContacts) => 
      prevContacts.map((c) => 
        c.id === conversationId ? { ...c, unread_count: 0, is_read: true } : c
      )
    );
    void refreshUnreadMessages();

    const parentNavigator = navigation.getParent?.();
    if (parentNavigator?.navigate) {
      parentNavigator.navigate("ConvoScreen", { 
        contactId: contact?.connection_id,
        contactName, 
        contactAvatar,
        receiverType,
      });
      return;
    }
    navigation.navigate("ConvoScreen", { 
      contactId: contact?.connection_id,
      contactName, 
      contactAvatar,
      receiverType,
    });
  };

  const openGroupConversation = (groupChat) => {
    const groupName = groupChat?.name ?? "Group Chat";
    const groupAvatar = groupAvatarUrls[groupChat?.id] || null;
    const groupMembers = Array.isArray(groupChat?.members) ? groupChat.members : [];
    const conversationId = groupChat?.id;

    setConversationViewTimestamps((prev) => ({
      ...prev,
      [conversationId]: Date.now(),
    }));

    setGroupChats((prevGroups) => 
      prevGroups.map((g) => 
        g.id === conversationId ? { ...g, unread_count: 0, is_read: true } : g
      )
    );
    void refreshUnreadMessages();

    const parentNavigator = navigation.getParent?.();
    const conversationParams = { groupId: groupChat?.id, groupName, groupAvatar, groupMembers };

    if (parentNavigator?.navigate) {
      parentNavigator.navigate("ConvoScreen", conversationParams);
      return;
    }
    navigation.navigate("ConvoScreen", conversationParams);
  };

  const loadChatData = useCallback(async () => {
    try {
      setIsLoadingChatData(true);
      setIsLoadingAdmins(true);
      const supaUser = await getCurrentUser();

      if (!supaUser) {
        setUserData(null);
        setContacts([]);
        setGroupChats([]);
        return;
      }

      const conversationsPromise = getConversations(supaUser.id, 'alumni', 0, CHAT_LIMIT);
      setPageOffset(0);
      setHasMoreChats(true);

      const groupChatsPromise = getUserGroupChats(supaUser.id).catch(() => []);
      const followingPromise = getFollowing(supaUser.id).catch(() => []);
      const followersPromise = getFollowers(supaUser.id).catch(() => []);
      
      const numericUserId = currentUserProfile?.id;
      let favoritesRes = { data: [] };
      let dmSettingsRes = { data: [] };
      let archivedGroupsRes = { data: [] };

      // Ensure we filter out archived and hidden chats directly from the active lists, and extract muted status
      if (numericUserId) {
        favoritesRes = await supabase.from("favorite_chats").select("contact_id").eq("user_id", numericUserId);
        
        dmSettingsRes = await supabase.from("dm_settings")
          .select("contact_id, is_archived, is_hidden, is_muted")
          .eq("user_id", numericUserId);

        archivedGroupsRes = await supabase.from("group_chat_members")
          .select("group_chat_id, archived, muted")
          .eq("alumni_id", numericUserId);
      }

      const excludedContactIds = new Set((dmSettingsRes.data || []).filter(r => r.is_archived || r.is_hidden).map(row => String(row.contact_id)));
      const excludedGroupIds = new Set((archivedGroupsRes.data || []).filter(r => r.archived).map(row => String(row.group_chat_id)));
      
      const mutedCIds = new Set((dmSettingsRes.data || []).filter(r => r.is_muted).map(row => String(row.contact_id)));
      const mutedGIds = new Set((archivedGroupsRes.data || []).filter(r => r.muted).map(row => String(row.group_chat_id)));

      setHiddenContactIds(excludedContactIds);
      setMutedContactIds(mutedCIds);
      setMutedGroupIds(mutedGIds);

      const [conversations, groupChatsData, followingRows, followerRows] = await Promise.all([
        conversationsPromise,
        groupChatsPromise,
        followingPromise,
        followersPromise,
      ]);

      setUserData(supaUser);
      const connectionsMap = new Map();

      (followingRows || []).forEach((row) => {
        const contact = row?.followed;
        if (!contact?.id || excludedContactIds.has(String(contact.id))) return;
        connectionsMap.set(`alumni_${contact.id}`, {
          id: `alumni_${contact.id}`, 
          connection_id: contact.id, 
          user_type: 'alumni',
          first_name: contact.first_name, 
          last_name: contact.last_name, 
          email: contact.email, 
          alumni_photo: contact.alumni_photo, 
          program: contact.program, 
          created_at: row?.created_at ?? null, 
          unread_count: 0,
        });
      });

      (followerRows || []).forEach((row) => {
        const contact = row?.follower;
        if (!contact?.id || excludedContactIds.has(String(contact.id))) return;
        const key = `alumni_${contact.id}`;
        if (connectionsMap.has(key)) return;
        connectionsMap.set(key, {
          id: key, 
          connection_id: contact.id, 
          user_type: 'alumni',
          first_name: contact.first_name, 
          last_name: contact.last_name, 
          email: contact.email, 
          alumni_photo: contact.alumni_photo, 
          program: contact.program, 
          created_at: row?.created_at ?? null, 
          unread_count: 0,
        });
      });

      const conversationsList = Array.isArray(conversations) ? conversations : [];
      conversationsList.forEach((conversation) => {
        if (!conversation?.id) return;
        const connId = String(conversation.connection_id || conversation.id.replace('alumni_', ''));
        if (excludedContactIds.has(connId)) return;

        const key = conversation.id; 
        const baseContact = connectionsMap.get(key) || {};
        connectionsMap.set(key, {
          ...baseContact, 
          ...conversation, 
          id: conversation.id, 
          connection_id: conversation.connection_id ?? baseContact.connection_id,
          user_type: conversation.user_type || 'alumni',
          first_name: conversation.first_name ?? baseContact.first_name, 
          last_name: conversation.last_name ?? baseContact.last_name, 
          email: conversation.email ?? baseContact.email, 
          alumni_photo: conversation.alumni_photo ?? baseContact.alumni_photo,
        });
      });

      const nextContacts = Array.from(connectionsMap.values());
      setContacts(nextContacts);

      try {
        const favoriteIds = (favoritesRes.data || []).map((row) => row.contact_id);
        setFavoriteContactIds(new Set(favoriteIds)); 
      } catch (e) {}

      const filteredGroupChats = (Array.isArray(groupChatsData) ? groupChatsData : [])
        .filter(g => !excludedGroupIds.has(String(g.id)));

      setGroupChats(filteredGroupChats);
      
      const avatarUrls = {};
      for (const group of filteredGroupChats) {
        if (group?.id && (group?.avatar_url || group?.avatar)) {
          const url = await getGroupAvatarUrl(group.avatar_url || group.avatar);
          if (url) {
            avatarUrls[group.id] = url;
          }
        }
      }
      setGroupAvatarUrls(avatarUrls);
      
      setAdmins([]);
      cachedContacts = nextContacts;
      cachedContactsLoadedAt = Date.now();
      void refreshUnreadMessages();
    } catch (error) {
      console.error("Error loading chat data:", error);
      setUserData(null);
      setContacts([]);
      setGroupChats([]);
    } finally {
      setIsLoadingChatData(false);
      setIsLoadingAdmins(false);
    }
  }, [currentUserProfile?.id]);

  // --- NEW: SUPABASE REALTIME LISTENER ---
  useEffect(() => {
    if (!userData?.id) return;

    // Create a uniquely named channel to prevent "already subscribed" collision errors during re-renders
    const channelName = `chat-screen-group-members-${userData.id}-${Date.now()}`;
    
    const groupMemberSubscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_chat_members',
          filter: `alumni_id=eq.${userData.id}`,
        },
        () => loadChatData()
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'group_chat_members',
          filter: `alumni_id=eq.${userData.id}`,
        },
        () => loadChatData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(groupMemberSubscription);
    };
  }, [userData?.id, loadChatData]);

  const handleLoadMore = async () => {
    if (isFetchingMore || !hasMoreChats || isLoadingChatData || !userData?.id) return;
    try {
      setIsFetchingMore(true);
      const nextOffset = pageOffset + CHAT_LIMIT;
      const newConversations = await getConversations(userData.id, 'alumni', nextOffset, CHAT_LIMIT);
      if (!newConversations || newConversations.length < CHAT_LIMIT) {
        setHasMoreChats(false);
      }
      if (newConversations && newConversations.length > 0) {
        setContacts((prevContacts) => {
          const connectionsMap = new Map(prevContacts.map((c) => [c.id, c]));
          newConversations.forEach((conversation) => {
            if (!conversation?.id) return;
            const connId = String(conversation.connection_id || conversation.id.replace('alumni_', ''));
            if (hiddenContactIds.has(connId)) return;

            const key = conversation.id; 
            const baseContact = connectionsMap.get(key) || {};
            connectionsMap.set(key, {
              ...baseContact, 
              ...conversation, 
              id: conversation.id,
              connection_id: conversation.connection_id ?? baseContact.connection_id,
              user_type: conversation.user_type || 'alumni',
              first_name: conversation.first_name ?? baseContact.first_name, 
              last_name: conversation.last_name ?? baseContact.last_name, 
              email: conversation.email ?? baseContact.email, 
              alumni_photo: conversation.alumni_photo ?? baseContact.alumni_photo,
            });
          });
          return Array.from(connectionsMap.values());
        });
        setPageOffset(nextOffset);
      }
    } catch (error) {
      console.error("Error loading more chats:", error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadChatData();
    }, [loadChatData]),
  );

  const displayName = useMemo(() => {
    if (!userData) return "Alumni User";
    return `${userData.first_name ?? ""}`.trim() || "Alumni User";
  }, [userData]);

  const avatarUri = useMemo(() => {
    return getAvatarUri(displayName, currentUserProfile?.alumni_photo ?? userData?.alumni_photo);
  }, [currentUserProfile?.alumni_photo, displayName, userData?.alumni_photo]);

  const sortChatsByLatestMessage = (chats) => {
    return chats.sort((firstItem, secondItem) => {
      const firstConversationId = firstItem?.group_chat_id ?? firstItem?.connection_id ?? firstItem?.id;
      const secondConversationId = secondItem?.group_chat_id ?? secondItem?.connection_id ?? secondItem?.id;
      const firstViewedAt = conversationViewTimestamps[firstConversationId] ?? 0;
      const secondViewedAt = conversationViewTimestamps[secondConversationId] ?? 0;

      const firstTimestamp = Math.max(firstViewedAt, new Date(firstItem?.updated_at ?? firstItem?.latest_message?.created_at ?? firstItem?.created_at ?? 0).getTime());
      const secondTimestamp = Math.max(secondViewedAt, new Date(secondItem?.updated_at ?? secondItem?.latest_message?.created_at ?? secondItem?.created_at ?? 0).getTime());
      return secondTimestamp - firstTimestamp;
    });
  };

  const activeChats = useMemo(() => {
    if (selectedTab === "channels") {
      const channelChats = groupChats.map((groupChat) => ({ ...groupChat, __chatType: "group" }));
      return sortChatsByLatestMessage(channelChats);
    }
    if (selectedTab === "favorites") {
      const favoriteChats = contacts
        .filter((item) => favoriteContactIds.has(item?.connection_id)) 
        .map((contact) => ({ ...contact, __chatType: "contact", is_favorite: true }));
      return sortChatsByLatestMessage(favoriteChats);
    }
    const mergedChats = [
      ...groupChats.map((groupChat) => ({ ...groupChat, __chatType: "group" })),
      ...contacts.map((contact) => ({ ...contact, __chatType: "contact", is_favorite: favoriteContactIds.has(contact?.connection_id) })),
    ];
    return sortChatsByLatestMessage(mergedChats);
  }, [contacts, groupChats, selectedTab, favoriteContactIds, conversationViewTimestamps]);

  const renderEmptyState = useCallback((title, description) => {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyText}>{description}</Text>
      </View>
    );
  }, []);

  const shimmerTranslateStyle = useMemo(() => ({
    transform: [{ translateX: shimmerProgress.interpolate({ inputRange: [-1, 1], outputRange: [-220, 220] }) }],
  }), [shimmerProgress]);

  const tabContentAnimatedStyle = useMemo(() => ({
    opacity: tabContentAnimation,
    transform: [{ translateY: tabContentAnimation.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  }), [tabContentAnimation]);

  const renderShimmerSkeleton = useCallback(
    () => (
      <View style={styles.skeletonListWrap}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={`chat-skeleton-${index}`} style={styles.skeletonCard}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonTextWrap}>
              <View style={styles.skeletonLinePrimary} />
              <View style={styles.skeletonLineSecondary} />
            </View>
            <Animated.View pointerEvents="none" style={[styles.skeletonShimmer, shimmerTranslateStyle]} />
          </View>
        ))}
      </View>
    ),
    [shimmerTranslateStyle],
  );

  const renderContactItem = ({ item }) => {
    const contactName = `${item?.first_name ?? ""} ${item?.last_name ?? ""}`.trim() || "Alumni";
    const contactAvatar = getAvatarUri(contactName, item?.alumni_photo);
    const unreadCount = Number(item?.unread_count ?? (item?.is_read === false ? 1 : 0));
    
    // Check if the latest message is an image attachment based on empty content
    const msgObj = item?.latest_message;
    let rawContent = msgObj?.content || item?.last_message || (typeof msgObj === 'string' ? msgObj : null);
    
    let displayMessage = "No messages yet";
    if (msgObj && typeof msgObj === 'object' && (!rawContent || String(rawContent).trim() === "")) {
      const senderId = msgObj.sender_id;
      let senderName = contactName;
      if (senderId && currentUserProfile?.id && String(senderId) === String(currentUserProfile.id)) {
        senderName = "You";
      }
      displayMessage = `${senderName} sent an attachment`;
    } else if (rawContent) {
      displayMessage = rawContent;
    }

    const latestMessageTime =
      item?.latest_message?.created_at ||
      item?.last_message_at ||
      item?.updated_at ||
      item?.created_at;
    
    const messageTimestampLabel = formatChatTimestamp(latestMessageTime);
    const isFavorited = favoriteContactIds.has(item?.connection_id);
    const isMuted = mutedContactIds.has(String(item?.connection_id));
    
    const hasPhoto = item?.alumni_photo && 
                     typeof item.alumni_photo === "string" && 
                     item.alumni_photo.trim() !== "" && 
                     !item.alumni_photo.includes("undefined") && 
                     !item.alumni_photo.includes("null");

    return (
      <Pressable
        style={({ pressed }) => [styles.chatItem, pressed && styles.chatItemPressed]}
        onPress={() => openConversation(item)}
        onLongPress={() => { setModalContact(item); setIsActionModalVisible(true); }}
      >
        {hasPhoto ? (
          <Image source={{ uri: contactAvatar }} style={styles.chatAvatar} />
        ) : (
          <AvatarInitials name={contactName} size={64} style={styles.chatAvatar} />
        )}        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeaderRow}>
            <Text style={styles.chatName} numberOfLines={1}>{contactName}</Text>
            {isMuted && <Ionicons name="volume-mute" size={14} color="#94A3B8" style={{ marginLeft: 4 }} />}
            {isFavorited && <Ionicons name="star" size={14} color="#FBD117" style={[styles.starIcon, { marginLeft: 4 }]} />}
          </View>
          <View style={styles.chatSubRow}>
            <Text style={[styles.chatMessage, unreadCount > 0 && styles.chatMessageUnread]} numberOfLines={1}>
              {displayMessage}
            </Text>
            {messageTimestampLabel ? <Text style={styles.chatTime}>{messageTimestampLabel}</Text> : null}
          </View>
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadPill}>
            <Text style={styles.unreadText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const showContactActions = (contact) => { setModalContact(contact); setIsActionModalVisible(true); };
  const hideContactActions = () => { setIsActionModalVisible(false); setModalContact(null); };

  const handleArchive = async () => {
    const contactId = modalContact?.connection_id;
    const userId = currentUserProfile?.id;
    hideContactActions();

    if (!userId || !contactId) {
      ThemedAlert.alert("Error", "Unable to archive. Please try again.");
      return;
    }

    try {
      await archiveConversation(userId, contactId);
      setContacts((prev) => prev.filter((c) => c.connection_id !== contactId));
      setHiddenContactIds(prev => new Set(prev).add(String(contactId)));
      ThemedAlert.alert("Archived", "Conversation has been archived.");
    } catch (e) {
      ThemedAlert.alert("Error", "Failed to archive conversation.");
    }
  };
  
  const handleMute = async () => {
    const contactId = modalContact?.connection_id;
    const userId = currentUserProfile?.id;
    hideContactActions();

    if (!userId || !contactId) return;

    const isCurrentlyMuted = mutedContactIds.has(String(contactId));
    const nextMuteState = !isCurrentlyMuted;

    setMutedContactIds(prev => {
      const next = new Set(prev);
      if (nextMuteState) next.add(String(contactId));
      else next.delete(String(contactId));
      return next;
    });

    try {
      await updateDMSettings(userId, contactId, { is_muted: nextMuteState });
      ThemedAlert.alert(nextMuteState ? "Muted" : "Unmuted", `Notifications for this chat are now ${nextMuteState ? 'muted' : 'unmuted'}.`);
    } catch (e) {
      setMutedContactIds(prev => {
        const next = new Set(prev);
        if (isCurrentlyMuted) next.add(String(contactId));
        else next.delete(String(contactId));
        return next;
      });
      ThemedAlert.alert("Error", "Failed to update mute settings.");
    }
  };

  const handleCreateGroup = async () => {
    hideContactActions();
    const connectionName = `${modalContact?.first_name ?? ""} ${modalContact?.last_name ?? ""}`.trim() || "Connection";
    const params = { 
      prefillName: connectionName, 
      prefillMembers: [modalContact?.connection_id] 
    };
    const parentNavigator = navigation.getParent?.();
    if (parentNavigator?.navigate) {
      parentNavigator.navigate("NewMessage", params);
    } else {
      navigation.navigate("NewMessage", params);
    }
  };

  const handleMarkUnread = async () => {
    hideContactActions();
    try {
      const userId = currentUserProfile?.id;
      if (!userId || !modalContact?.connection_id) return;

      const { data, error } = await supabase
        .from("messages")
        .select("id")
        .eq("sender_id", modalContact.connection_id)
        .eq("receiver_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const { error: updateError } = await supabase.from("messages").update({ is_read: false }).eq("id", data[0].id);
        if (updateError) throw updateError;
        void loadChatData();
      } else {
        ThemedAlert.alert("Notice", "No messages found to mark as unread.");
      }
    } catch (e) {}
  };
  
  const handleDelete = async () => {
    ThemedAlert.alert(
      "Delete conversation",
      "Are you sure you want to remove this conversation from your list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            hideContactActions();
            const contactId = modalContact?.connection_id;
            const userId = currentUserProfile?.id;

            if (!userId || !contactId) {
              ThemedAlert.alert("Error", "Unable to delete. Please try again.");
              return;
            }

            try {
              await deleteConversation(userId, contactId);
              setContacts((prev) => prev.filter((c) => c.connection_id !== contactId));
              setHiddenContactIds(prev => new Set(prev).add(String(contactId)));
              ThemedAlert.alert("Deleted", "Conversation has been deleted.");
            } catch (e) {}
          },
        },
      ]
    );
  };

  const renderGroupChatItem = ({ item }) => {
    const groupName = item?.name ?? "Group Chat";
    const groupAvatar = groupAvatarUrls[item?.id] || null;
    
    // Check if the latest message is an image attachment based on empty content
    const msgObj = item?.latest_message;
    let rawContent = msgObj?.content;

    let displayMessage = "No messages yet";
    if (msgObj && (!rawContent || String(rawContent).trim() === "")) {
      const senderId = msgObj.sender_id;
      let senderName = "Someone";
      if (senderId && currentUserProfile?.id && String(senderId) === String(currentUserProfile.id)) {
        senderName = "You";
      } else if (senderId) {
        const member = item?.members?.find((m) => String(m.alumni?.id ?? m.alumni_id) === String(senderId));
        if (member?.alumni) {
          senderName = `${member.alumni.first_name ?? ""} ${member.alumni.last_name ?? ""}`.trim() || "Someone";
        }
      }
      displayMessage = `${senderName} sent an attachment`;
    } else if (rawContent) {
      displayMessage = rawContent;
    }

    const unreadCount = Number(item?.unread_count ?? 0);
    const latestMessageTime = item?.latest_message?.created_at || item?.updated_at || item?.created_at;
    const messageTimestampLabel = formatChatTimestamp(latestMessageTime);
    const isMuted = mutedGroupIds.has(String(item?.id));

    return (
      <Pressable
        style={({ pressed }) => [styles.chatItem, pressed && styles.chatItemPressed]}
        onPress={() => openGroupConversation(item)}
        onLongPress={() => { setModalGroup(item); setIsGroupActionModalVisible(true); }}
      >
        {groupAvatar && typeof groupAvatar === 'string' && groupAvatar.length > 0 ? (
          <Image 
            source={{ uri: groupAvatar }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#32418C',
            }}
            resizeMode="cover"
          />
        ) : (
          <AvatarInitials name={groupName} size={56} style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#32418C',
          }} />
        )}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeaderRow}>
            <Text style={styles.chatName} numberOfLines={1}>{groupName}</Text>
            {isMuted && <Ionicons name="volume-mute" size={14} color="#94A3B8" style={{ marginLeft: 4 }} />}
          </View>
          <View style={styles.chatSubRow}>
            <Text style={[styles.chatMessage, unreadCount > 0 && styles.chatMessageUnread]} numberOfLines={1}>{displayMessage}</Text>
            {messageTimestampLabel ? <Text style={styles.chatTime}>{messageTimestampLabel}</Text> : null}
          </View>
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadPill}>
            <Text style={styles.unreadText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const handleToggleFavorite = async (contact) => {
    if (!contact?.connection_id) return;
    const contactId = contact.connection_id;
    const userId = currentUserProfile?.id;
    if (!userId) return;

    const isFavorited = favoriteContactIds.has(contactId);
    const nextState = !isFavorited;
    const prevSet = new Set(favoriteContactIds);

    setFavoriteContactIds((prev) => {
      const next = new Set(prev);
      if (nextState) next.add(contactId);
      else next.delete(contactId);
      return next;
    });

    hideContactActions();

    try {
      if (nextState) {
        const { error } = await supabase.from("favorite_chats").insert({ user_id: userId, contact_id: contactId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favorite_chats").delete().eq("user_id", userId).eq("contact_id", contactId);
        if (error) throw error;
      }
    } catch (e) {
      setFavoriteContactIds(prevSet);
    }
  };

  const navigateToArchivedChats = () => {
    setIsAvatarModalVisible(false);
    const parentNavigator = navigation.getParent?.();
    if (parentNavigator?.navigate) {
      parentNavigator.navigate("ArchivedChats");
    } else {
      navigation.navigate("ArchivedChats");
    }
  };

  const navigateToSettings = () => {
    setIsAvatarModalVisible(false);
    const parentNavigator = navigation.getParent?.();
    if (parentNavigator?.navigate) {
      parentNavigator.navigate("Settings");
    } else {
      navigation.navigate("Settings");
    }
  };

  const hideGroupActions = () => { setIsGroupActionModalVisible(false); setModalGroup(null); };

  const handleArchiveGroup = async () => { 
    hideGroupActions(); 
    try { 
      await supabase.from("group_chat_members").update({ archived: true }).eq("group_chat_id", modalGroup?.id).eq("alumni_id", currentUserProfile?.id); 
      setGroupChats((prev) => prev.filter((g) => g.id !== modalGroup?.id));
    } catch (e) {} 
  };
  const handleIgnoreGroup = async () => { hideGroupActions(); try { await supabase.from("group_chat_members").update({ ignored: true }).eq("group_chat_id", modalGroup?.id).eq("alumni_id", currentUserProfile?.id); } catch (e) {} };
  const handleAddMembers = () => { hideGroupActions(); const parentNavigator = navigation.getParent?.(); const params = { groupId: modalGroup?.id, prefillName: modalGroup?.name }; if (parentNavigator?.navigate) parentNavigator.navigate("EditGroup", params); else navigation.navigate("EditGroup", params); };

  const handleMuteGroup = async () => { 
    hideGroupActions(); 
    const groupId = modalGroup?.id;
    const userId = currentUserProfile?.id;
    if (!userId || !groupId) return;

    const isCurrentlyMuted = mutedGroupIds.has(String(groupId));
    const nextMuteState = !isCurrentlyMuted;

    setMutedGroupIds(prev => {
      const next = new Set(prev);
      if (nextMuteState) next.add(String(groupId));
      else next.delete(String(groupId));
      return next;
    });

    try { 
      await supabase.from("group_chat_members").update({ muted: nextMuteState }).eq("group_chat_id", groupId).eq("alumni_id", userId); 
      ThemedAlert.alert(nextMuteState ? "Muted" : "Unmuted", `Notifications for this group are now ${nextMuteState ? 'muted' : 'unmuted'}.`);
    } catch (e) { 
      setMutedGroupIds(prev => {
        const next = new Set(prev);
        if (isCurrentlyMuted) next.add(String(groupId));
        else next.delete(String(groupId));
        return next;
      });
      ThemedAlert.alert("Error", "Failed to update mute settings.");
    } 
  };

  const handleMarkGroupUnread = async () => { hideGroupActions(); try { await supabase.from("group_chat_members").update({ last_read_message_id: 0 }).eq("group_chat_id", modalGroup?.id).eq("alumni_id", currentUserProfile?.id); loadChatData(); } catch (e) {} };
  const handleLeaveGroup = async () => { ThemedAlert.alert("Leave group", "Are you sure you want to leave this group?", [{ text: "Cancel", style: "cancel" }, { text: "Leave", style: "destructive", onPress: async () => { hideGroupActions(); try { await supabase.from("group_chat_members").delete().eq("group_chat_id", modalGroup?.id).eq("alumni_id", currentUserProfile?.id); setGroupChats((prev) => prev.filter((g) => g.id !== modalGroup?.id)); } catch (e) {} } }]); };
  const handleDeleteGroup = async () => { ThemedAlert.alert("Delete group", "Are you sure you want to delete this group?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { hideGroupActions(); try { await supabase.from("group_chats").delete().eq("id", modalGroup?.id); setGroupChats((prev) => prev.filter((g) => g.id !== modalGroup?.id)); } catch (e) {} } }]); };

  const getListEmptyComponent = useCallback(() => {
    if (isLoadingChatData) return renderShimmerSkeleton();
    if (selectedTab === "channels") return renderEmptyState("No group chats yet.", "Create a group conversation and it will appear here.");
    if (selectedTab === "favorites") return renderEmptyState("No favorites yet.", "Mark a chat as a favorite to keep it here.");
    return renderEmptyState("No contacts yet.", "Accepted connections will appear here as chat contacts.");
  }, [isLoadingChatData, renderEmptyState, renderShimmerSkeleton, selectedTab]);

  const renderItem = ({ item }) => {
    if (item?.__chatType === "group") return renderGroupChatItem({ item });
    return renderContactItem({ item });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.blueHeaderSection}>
          <Image
            source={require("../../assets/images/Space_HeaderBG_White 2.png")}
            style={styles.headerBgImage}
            resizeMode="cover"
          />
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitleWhite}>Chats</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButtonWhite} onPress={openSearchMessage}>
                <Ionicons name="search" size={20} color="#31429B" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButtonYellow} onPress={openNewMessage}>
                <Ionicons name="create-outline" size={20} color="#31429B" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.avatarButton} 
                onPress={() => setIsAvatarModalVisible(true)}
                activeOpacity={0.7}
              >
                {currentUserProfile?.alumni_photo && 
                typeof currentUserProfile.alumni_photo === "string" && 
                currentUserProfile.alumni_photo.trim() !== "" && 
                !currentUserProfile.alumni_photo.includes("undefined") && 
                !currentUserProfile.alumni_photo.includes("null") ? (
                  <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
                ) : (
                  <AvatarInitials name={displayName} size={40} style={styles.headerAvatar} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.tabContainer}>
            {TABS.map((tab) => {
              const isActive = selectedTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  onPress={() => setSelectedTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.whiteBodyContainer}>
          <Animated.View style={[styles.listArea, tabContentAnimatedStyle]}>
            <FlatList
              data={activeChats}
              renderItem={renderItem}
              keyExtractor={(item) => item?.id || `${item?.__chatType}-${item?.connection_id}-${Math.random()}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshing={isLoadingChatData}
              onRefresh={loadChatData}
              ListEmptyComponent={getListEmptyComponent}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingMore ? (
                  <ActivityIndicator size="small" color="#31429B" style={{ marginVertical: 16 }} />
                ) : null
              }
            />
          </Animated.View>
        </View>
      </View>

      <Modal
        visible={isAvatarModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsAvatarModalVisible(false)}
      >
        <Pressable 
          style={styles.avatarModalOverlay} 
          onPress={() => setIsAvatarModalVisible(false)}
        />
        <View style={styles.avatarModalSheetWrapper} pointerEvents="box-none">
          <SafeAreaView style={styles.avatarModalSafeArea} edges={["bottom"]}>
            <View style={styles.avatarModalSheet}>
              <View style={styles.avatarModalProfileRow}>
                {currentUserProfile?.alumni_photo && 
                typeof currentUserProfile.alumni_photo === "string" && 
                currentUserProfile.alumni_photo.trim() !== "" && 
                !currentUserProfile.alumni_photo.includes("undefined") && 
                !currentUserProfile.alumni_photo.includes("null") ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarModalPhoto} />
                ) : (
                  <AvatarInitials name={displayName} size={56} style={styles.avatarModalPhoto} />
                )}
                <View style={styles.avatarModalProfileInfo}>
                  <Text style={styles.avatarModalName}>{displayName}</Text>
                  <Text style={styles.avatarModalEmail}>{userData?.email || ""}</Text>
                </View>
              </View>
              <View style={styles.avatarModalDivider} />
              <TouchableOpacity 
                style={styles.avatarModalItem} 
                onPress={navigateToArchivedChats}
                activeOpacity={0.6}
              >
                <View style={[styles.avatarModalIconWrap, { backgroundColor: "#EBF0FF" }]}>
                  <Ionicons name="archive-outline" size={20} color="#31429B" />
                </View>
                <Text style={styles.avatarModalItemText}>Archived Chats</Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.avatarModalItem} 
                onPress={navigateToArchivedChats}
                activeOpacity={0.6}
              >
                <View style={[styles.avatarModalIconWrap, { backgroundColor: "#FFF0F0" }]}>
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                </View>
                <Text style={[styles.avatarModalItemText, { color: "#DC2626" }]}>Deleted Chats</Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.avatarModalItem} 
                onPress={navigateToSettings}
                activeOpacity={0.6}
              >
                <View style={[styles.avatarModalIconWrap, { backgroundColor: "#F1F5F9" }]}>
                  <Ionicons name="settings-outline" size={20} color="#31429B" />
                </View>
                <Text style={styles.avatarModalItemText}>Settings</Text>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={isActionModalVisible} transparent animationType={"slide"} statusBarTranslucent={true} onRequestClose={hideContactActions}>
        <Pressable style={styles.modalOverlay} onPress={hideContactActions} />
        <View style={styles.actionSheetWrap} pointerEvents="box-none">
          <SafeAreaView style={styles.actionSheetSafeArea} edges={["bottom"]}>
            <View style={styles.actionSheet}>
              <Text style={styles.actionSheetTitle}>
                {`${modalContact?.first_name ?? ""} ${modalContact?.last_name ?? ""}`.trim() || "Conversation"}
              </Text>
              <Pressable style={styles.actionItem} onPress={() => handleToggleFavorite(modalContact)}>
                <Ionicons 
                  name={favoriteContactIds.has(modalContact?.connection_id) ? "star" : "star-outline"} 
                  size={20} 
                  color="#e0b700" 
                  style={styles.actionIcon} 
                />
                <Text style={[styles.actionText, { color: "#e0b700" }]}>
                  {favoriteContactIds.has(modalContact?.connection_id) ? "Unfavorite" : "Favorite"}
                </Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleArchive}>
                <Ionicons name="archive-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>Archive</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleMute}>
                <Ionicons name={mutedContactIds.has(String(modalContact?.connection_id)) ? "volume-high-outline" : "volume-mute-outline"} size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>{mutedContactIds.has(String(modalContact?.connection_id)) ? "Unmute" : "Mute"}</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleCreateGroup}>
                <Ionicons name="people-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>{`Create group chat with '${modalContact?.first_name ?? ""}'`}</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleMarkUnread}>
                <Ionicons name="mail-unread-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>Mark as unread</Text>
              </Pressable>
              <Pressable style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color="#DC2626" style={styles.actionIcon} />
                <Text style={[styles.actionText, { color: "#DC2626" }]}>Delete</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={isGroupActionModalVisible} transparent animationType={"slide"} statusBarTranslucent={true} onRequestClose={hideGroupActions}>
        <Pressable style={styles.modalOverlay} onPress={hideGroupActions} />
        <View style={styles.actionSheetWrap} pointerEvents="box-none">
          <SafeAreaView style={styles.actionSheetSafeArea} edges={["bottom"]}>
            <View style={styles.actionSheet}>
              <Text style={styles.actionSheetTitle}>{modalGroup?.name ?? "Group Chat"}</Text>
              <Pressable style={styles.actionItem} onPress={handleArchiveGroup}>
                <Ionicons name="archive-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>Archive</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleIgnoreGroup}>
                <Ionicons name="eye-off-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>Ignore</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleAddMembers}>
                <Ionicons name="person-add-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>Add members</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleMuteGroup}>
                <Ionicons name={mutedGroupIds.has(String(modalGroup?.id)) ? "volume-high-outline" : "volume-mute-outline"} size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>{mutedGroupIds.has(String(modalGroup?.id)) ? "Unmute" : "Mute"}</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleMarkGroupUnread}>
                <Ionicons name="mail-unread-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>Mark as unread</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleLeaveGroup}>
                <Ionicons name="exit-outline" size={20} color="#DC2626" style={styles.actionIcon} />
                <Text style={[styles.actionText, { color: "#DC2626" }]}>Leave group</Text>
              </Pressable>
              <Pressable style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={handleDeleteGroup}>
                <Ionicons name="trash-outline" size={20} color="#DC2626" style={styles.actionIcon} />
                <Text style={[styles.actionText, { color: "#DC2626" }]}>Delete</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ChatScreen;
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
} from "../services/messageQueries";
import { getFollowers, getFollowing } from "../services/connectionQueries";
import { getAvatarUri } from "../utils/imageUtils";
import { useCurrentUserProfile } from "../context/CurrentUserProfileContext";
import { useUnreadMessages } from "../context/UnreadMessagesContext";
import styles from "../styles/ChatScreen.styles";
import { ThemedAlert } from "../components/ThemedAlert";

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

// In ChatScreen.js, update the openConversation function
const openConversation = (contact) => {
  const contactName = `${contact?.first_name ?? ""} ${contact?.last_name ?? ""}`.trim() || "Alumni";
  const contactAvatar = getAvatarUri(contactName, contact?.alumni_photo);
  // Use the composite ID or the connection_id
  const conversationId = contact?.id;
  
  // Get receiver type from contact data
  const receiverType = contact?.user_type || 'alumni';

  setConversationViewTimestamps((prev) => ({
    ...prev,
    [conversationId]: Date.now(),
  }));

  const parentNavigator = navigation.getParent?.();
  if (parentNavigator?.navigate) {
    parentNavigator.navigate("ConvoScreen", { 
      contactId: contact?.connection_id, // Use the actual numeric ID for sending messages
      contactName, 
      contactAvatar,
      receiverType, // Pass the receiver type (alumni or admin)
    });
    return;
  }
  navigation.navigate("ConvoScreen", { 
    contactId: contact?.connection_id, // Use the actual numeric ID for sending messages
    contactName, 
    contactAvatar,
    receiverType, // Pass the receiver type
  });
};

  const openGroupConversation = (groupChat) => {
    const groupName = groupChat?.name ?? "Group Chat";
    const groupAvatar = getAvatarUri(groupName, groupChat?.avatar_url);
    const groupMembers = Array.isArray(groupChat?.members) ? groupChat.members : [];
    const conversationId = groupChat?.id;

    setConversationViewTimestamps((prev) => ({
      ...prev,
      [conversationId]: Date.now(),
    }));

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
    const favoritesPromise = supabase.from("favorite_chats").select("contact_id").eq("user_id", supaUser.id);

    const [conversations, groupChatsData, followingRows, followerRows, favoritesRes] = await Promise.all([
      conversationsPromise,
      groupChatsPromise,
      followingPromise,
      followersPromise,
      favoritesPromise,
    ]);

    setUserData(supaUser);
    const connectionsMap = new Map();

    (followingRows || []).forEach((row) => {
      const contact = row?.followed;
      if (!contact?.id) return;
      connectionsMap.set(`alumni_${contact.id}`, {
        id: `alumni_${contact.id}`, // Composite ID
        connection_id: contact.id, // Actual numeric ID
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
      if (!contact?.id) return;
      const key = `alumni_${contact.id}`;
      if (connectionsMap.has(key)) return;
      connectionsMap.set(key, {
        id: key, // Composite ID
        connection_id: contact.id, // Actual numeric ID
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
      const key = conversation.id; // Already composite from getConversations
      const baseContact = connectionsMap.get(key) || {};
      connectionsMap.set(key, {
        ...baseContact, 
        ...conversation, 
        id: conversation.id, // Keep composite ID
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
      // For favorites, we need to handle both alumni and admin contacts
      const favoriteIds = (favoritesRes.data || []).map((row) => row.contact_id);
      setFavoriteContactIds(new Set(favoriteIds));
    } catch (e) {}

    const nextGroupChats = Array.isArray(groupChatsData) ? groupChatsData : [];
    setGroupChats(nextGroupChats);
    setAdmins([]);
    cachedContacts = nextContacts;
    cachedContactsLoadedAt = Date.now();
    void refreshUnreadMessages();
  } catch (error) {
    setUserData(null);
    setContacts([]);
    setGroupChats([]);
  } finally {
    setIsLoadingChatData(false);
    setIsLoadingAdmins(false);
  }
}, []);

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
          const key = conversation.id; // Already composite
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
  } catch (error) {} finally {
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
        .filter((item) => favoriteContactIds.has(item?.id))
        .map((contact) => ({ ...contact, __chatType: "contact", is_favorite: true }));
      return sortChatsByLatestMessage(favoriteChats);
    }
    const mergedChats = [
      ...groupChats.map((groupChat) => ({ ...groupChat, __chatType: "group" })),
      ...contacts.map((contact) => ({ ...contact, __chatType: "contact", is_favorite: favoriteContactIds.has(contact?.id) })),
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
    
    // Handle different message structures
    const latestMessage =
      item?.latest_message?.content ||
      item?.last_message ||
      (typeof item?.latest_message === 'string' ? item.latest_message : null) ||
      "No messages yet";

    const latestMessageTime =
      item?.latest_message?.created_at ||
      item?.last_message_at ||
      item?.updated_at ||
      item?.created_at;
    
    const messageTimestampLabel = formatChatTimestamp(latestMessageTime);
    const isFavorited = favoriteContactIds.has(item?.id);

    return (
      <Pressable
        style={({ pressed }) => [styles.chatItem, pressed && styles.chatItemPressed]}
        onPress={() => openConversation(item)}
        onLongPress={() => { setModalContact(item); setIsActionModalVisible(true); }}
      >
        <Image source={{ uri: contactAvatar }} style={styles.chatAvatar} />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeaderRow}>
            <Text style={styles.chatName} numberOfLines={1}>{contactName}</Text>
            {isFavorited && <Ionicons name="star" size={14} color="#F2C919" style={styles.starIcon} />}
          </View>
          <View style={styles.chatSubRow}>
            <Text style={[styles.chatMessage, unreadCount > 0 && styles.chatMessageUnread]} numberOfLines={1}>
              {latestMessage}
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

  const updateDMSettings = async (contactId, updates) => {
    if (!userData?.id || !contactId) return;
    try {
      const { error } = await supabase.from("dm_settings").upsert(
        { user_id: userData.id, contact_id: contactId, ...updates },
        { onConflict: "user_id, contact_id" },
      );
      if (error) throw error;
    } catch (e) {}
  };

  const handleArchive = async () => { hideContactActions(); await updateDMSettings(modalContact?.id, { is_archived: true }); ThemedAlert.alert("Archived", "Conversation has been archived."); };
  const handleMute = async () => { hideContactActions(); await updateDMSettings(modalContact?.id, { is_muted: true }); ThemedAlert.alert("Muted", "Notifications for this chat are now muted."); };
  const handleCreateGroup = async () => {
    hideContactActions();
    const connectionName = `${modalContact?.first_name ?? ""} ${modalContact?.last_name ?? ""}`.trim() || "Connection";
    const parentNavigator = navigation.getParent?.();
    const params = { prefillName: connectionName, members: [modalContact] };
    if (parentNavigator?.navigate) parentNavigator.navigate("CreateGroup", params);
    else navigation.navigate("CreateGroup", params);
  };
  const handleMarkUnread = async () => {
    hideContactActions();
    try {
      const { data, error } = await supabase.from("messages").select("id").eq("sender_id", modalContact?.id).eq("receiver_id", userData?.id).order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        const { error: updateError } = await supabase.from("messages").update({ is_read: false }).eq("id", data[0].id);
        if (updateError) throw updateError;
        void loadChatData();
      }
    } catch (e) {}
  };
  const handleRestrict = async () => { hideContactActions(); await updateDMSettings(modalContact?.id, { is_restricted: true }); ThemedAlert.alert("Restricted", "This user has been restricted."); };
  const handleBlock = async () => { hideContactActions(); await updateDMSettings(modalContact?.id, { is_blocked: true }); ThemedAlert.alert("Blocked", "This user has been blocked."); };
  const handleDelete = async () => {
    ThemedAlert.alert("Delete conversation", "Are you sure you want to remove this conversation from your list?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          hideContactActions();
          await updateDMSettings(modalContact?.id, { is_hidden: true });
          setContacts((prev) => prev.filter((c) => c.id !== modalContact?.id));
        },
      },
    ]);
  };

  const renderGroupChatItem = ({ item }) => {
    const groupName = item?.name ?? "Group Chat";
    const groupAvatar = getAvatarUri(groupName, item?.avatar_url);
    const latestMessage = item?.latest_message?.content ?? "No messages yet";
    const memberCount = Array.isArray(item?.members) ? item.members.length : 0;
    const unreadCount = Number(item?.unread_count ?? 0);
    const latestMessageTime = item?.latest_message?.created_at || item?.updated_at || item?.created_at;
    const messageTimestampLabel = formatChatTimestamp(latestMessageTime);

    return (
      <Pressable
        style={({ pressed }) => [styles.chatItem, pressed && styles.chatItemPressed]}
        onPress={() => openGroupConversation(item)}
        onLongPress={() => { setModalGroup(item); setIsGroupActionModalVisible(true); }}
      >
        <Image source={{ uri: groupAvatar }} style={styles.chatAvatar} />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeaderRow}>
            <Text style={styles.chatName} numberOfLines={1}>{groupName}</Text>
          </View>
          <View style={styles.chatSubRow}>
            <Text style={[styles.chatMessage, unreadCount > 0 && styles.chatMessageUnread]} numberOfLines={1}>{latestMessage}</Text>
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

  const handleToggleFavorite = async (contactId) => {
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
      if (!userData?.id) throw new Error("Missing current user id");
      if (nextState) {
        const { error } = await supabase.from("favorite_chats").insert({ user_id: userData.id, contact_id: contactId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favorite_chats").delete().eq("user_id", userData.id).eq("contact_id", contactId);
        if (error) throw error;
      }
    } catch (e) {
      setFavoriteContactIds(prevSet);
    }
  };

  const hideGroupActions = () => { setIsGroupActionModalVisible(false); setModalGroup(null); };

  const handleArchiveGroup = async () => { hideGroupActions(); try { await supabase.from("group_chat_members").update({ archived: true }).eq("group_chat_id", modalGroup?.id).eq("alumni_id", userData?.id); } catch (e) {} };
  const handleIgnoreGroup = async () => { hideGroupActions(); try { await supabase.from("group_chat_members").update({ ignored: true }).eq("group_chat_id", modalGroup?.id).eq("alumni_id", userData?.id); } catch (e) {} };
  const handleAddMembers = () => { hideGroupActions(); const parentNavigator = navigation.getParent?.(); const params = { groupId: modalGroup?.id, prefillName: modalGroup?.name }; if (parentNavigator?.navigate) parentNavigator.navigate("EditGroup", params); else navigation.navigate("EditGroup", params); };
  const handleMuteGroup = async () => { hideGroupActions(); try { await supabase.from("group_chat_members").update({ muted: true }).eq("group_chat_id", modalGroup?.id).eq("alumni_id", userData?.id); } catch (e) {} };
  const handleMarkGroupUnread = async () => { hideGroupActions(); try { await supabase.from("group_chat_members").update({ last_read_message_id: 0 }).eq("group_chat_id", modalGroup?.id).eq("alumni_id", userData?.id); loadChatData(); } catch (e) {} };
  const handleLeaveGroup = async () => { ThemedAlert.alert("Leave group", "Are you sure you want to leave this group?", [{ text: "Cancel", style: "cancel" }, { text: "Leave", style: "destructive", onPress: async () => { hideGroupActions(); try { await supabase.from("group_chat_members").delete().eq("group_chat_id", modalGroup?.id).eq("alumni_id", userData?.id); setGroupChats((prev) => prev.filter((g) => g.id !== modalGroup?.id)); } catch (e) {} } }]); };
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
       
        {/* BLUE HEADER SECTION WITH SPACE BACKGROUND */}
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
             
              <TouchableOpacity style={styles.avatarButton}>
                <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
              </TouchableOpacity>
            </View>
          </View>

          {/* TRANSLUCENT SEGMENTED TABS */}
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

        {/* WHITE BOTTOM SECTION (CHAT LIST) */}
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

      {/* Action modal for long-press on direct messages */}
      <Modal visible={isActionModalVisible} transparent animationType={"slide"} statusBarTranslucent={true} onRequestClose={hideContactActions}>
        <Pressable style={styles.modalOverlay} onPress={hideContactActions} />
        <View style={styles.actionSheetWrap} pointerEvents="box-none">
          <SafeAreaView style={styles.actionSheetSafeArea} edges={["bottom"]}>
            <View style={styles.actionSheet}>
              <Text style={styles.actionSheetTitle}>
                {`${modalContact?.first_name ?? ""} ${modalContact?.last_name ?? ""}`.trim() || "Conversation"}
              </Text>
              <Pressable style={styles.actionItem} onPress={() => handleToggleFavorite(modalContact?.id)}>
                <Ionicons name="star-outline" size={20} color="#F2C919" style={styles.actionIcon} />
                <Text style={[styles.actionText, { color: "#F2C919" }]}>Favorite</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleArchive}>
                <Ionicons name="archive-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>Archive</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleMute}>
                <Ionicons name="volume-mute-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>Mute</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleCreateGroup}>
                <Ionicons name="people-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>{`Create group chat with '${modalContact?.first_name ?? ""}'`}</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleMarkUnread}>
                <Ionicons name="mail-unread-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>Mark as unread</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleRestrict}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>Restrict</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={handleBlock}>
                <Ionicons name="close-circle-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>Block</Text>
              </Pressable>
              <Pressable style={[styles.actionItem, { borderBottomWidth: 0 }]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color="#DC2626" style={styles.actionIcon} />
                <Text style={[styles.actionText, { color: "#DC2626" }]}>Delete</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Group action modal for long-press on group chats */}
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
                <Ionicons name="volume-mute-outline" size={20} color="#31429B" style={styles.actionIcon} />
                <Text style={styles.actionText}>Mute</Text>
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
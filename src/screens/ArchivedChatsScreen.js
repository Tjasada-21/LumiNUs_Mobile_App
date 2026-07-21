import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import supabase from "../services/supabase";
import { getAvatarUri } from "../utils/imageUtils";
import {
  getArchivedConversations,
  getDeletedConversations,
  getArchivedGroupChats,
  unarchiveConversation,
  restoreConversation,
} from "../services/messageQueries";
import { useCurrentUserProfile } from "../context/CurrentUserProfileContext";
import { ThemedAlert } from "../components/ThemedAlert";
import AvatarInitials from "../components/AvatarInitials";
import styles from "../styles/ArchivedChatsScreen.styles";

const TABS = [
  { key: "archived", label: "Archived" },
  { key: "deleted", label: "Deleted" },
];

// 3 minutes for testing (change to 30 * 24 * 60 * 60 * 1000 for 30 days)
const DELETE_RETENTION_MS = 3 * 60 * 1000;

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

const formatTimeRemaining = (deletedAt) => {
  if (!deletedAt) return "";
  const now = Date.now();
  const deletedTime = new Date(deletedAt).getTime();
  const expiresAt = deletedTime + DELETE_RETENTION_MS;
  const remaining = expiresAt - now;

  if (remaining <= 0) return "Expired";

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s remaining`;
  }
  return `${seconds}s remaining`;
};

const ArchivedChatsScreen = () => {
  const navigation = useNavigation();
  const { currentUserProfile } = useCurrentUserProfile();

  const [selectedTab, setSelectedTab] = useState("archived");
  const [archivedChats, setArchivedChats] = useState([]);
  const [deletedChats, setDeletedChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

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

  // Timer to refresh countdown on "Deleted" tab
  useEffect(() => {
    if (selectedTab !== "deleted" || deletedChats.length === 0) return;
    const interval = setInterval(() => {
      // Force re-render to update countdown
      setDeletedChats((prev) => [...prev]);
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedTab, deletedChats.length]);

  const loadArchivedData = useCallback(async () => {
    try {
      setIsLoading(true);
      const userId = currentUserProfile?.id;
      if (!userId) return;

      // Fetch all three in parallel using the new query functions
      const [archivedDMs, deletedDMs, archivedGroups] = await Promise.all([
        getArchivedConversations(userId),
        getDeletedConversations(userId),
        getArchivedGroupChats(userId),
      ]);

      // Merge archived DMs and groups, sort by archivedAt
      const formattedArchived = archivedDMs
        .concat(archivedGroups)
        .sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());

      setArchivedChats(formattedArchived);

      // Filter out expired deleted chats
      const now = Date.now();
      const validDeleted = deletedDMs.filter((chat) => {
        const deletedTime = new Date(chat.deletedAt).getTime();
        return (now - deletedTime) < DELETE_RETENTION_MS;
      });

      setDeletedChats(validDeleted);
    } catch (error) {
      console.error("Failed to load archived/deleted chats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserProfile?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadArchivedData();
    }, [loadArchivedData]),
  );

  const handleRestore = async (chat) => {
    setRestoringId(chat.id);
    try {
      const userId = currentUserProfile?.id;
      if (!userId) throw new Error("User not found");

      if (chat.type === "group") {
        const { error } = await supabase
          .from("group_chat_members")
          .update({ archived: false })
          .eq("id", chat.memberId);

        if (error) throw error;
      } else {
        if (selectedTab === "deleted") {
          await restoreConversation(userId, chat.contact_id);
        } else {
          await unarchiveConversation(userId, chat.contact_id);
        }
      }

      // Remove from whichever list it was in
      setArchivedChats((prev) => prev.filter((c) => c.id !== chat.id));
      setDeletedChats((prev) => prev.filter((c) => c.id !== chat.id));

      ThemedAlert.alert("Restored", "Chat has been restored successfully.");
    } catch (error) {
      console.error("Failed to restore chat:", error);
      ThemedAlert.alert("Error", "Failed to restore chat. Please try again.");
    } finally {
      setRestoringId(null);
    }
  };

  const renderChatItem = ({ item }) => {
    const contactName = item.name;
    const contactAvatar = getAvatarUri(contactName, item.photo);
    const hasPhoto =
      item.photo &&
      typeof item.photo === "string" &&
      item.photo.trim() !== "" &&
      !item.photo.includes("undefined") &&
      !item.photo.includes("null");
    const isGroup = item.type === "group";
    const isRestoring = restoringId === item.id;
    const isDeleted = selectedTab === "deleted";
    const timeRemaining = isDeleted ? formatTimeRemaining(item.deletedAt) : null;

    return (
      <View style={styles.chatItem}>
        {hasPhoto ? (
          <Image source={{ uri: contactAvatar }} style={styles.chatAvatar} />
        ) : (
          <AvatarInitials name={contactName} size={56} style={styles.chatAvatar} />
        )}

        <View style={styles.chatInfo}>
          <View style={styles.chatHeaderRow}>
            <Text style={styles.chatName} numberOfLines={1}>
              {contactName}
            </Text>
            {isGroup && (
              <View style={styles.groupBadge}>
                <Ionicons name="people" size={10} color="#31429B" />
              </View>
            )}
          </View>
          <Text style={styles.chatSubText} numberOfLines={1}>
            {isGroup ? "Group conversation" : item.email || "Direct message"}
          </Text>
          {isDeleted ? (
            <Text
              style={[
                styles.expiryText,
                timeRemaining === "Expired" && styles.expiryTextExpired,
              ]}
            >
              {timeRemaining}
            </Text>
          ) : (
            <Text style={styles.archivedDate}>
              Archived {formatChatTimestamp(item.archivedAt)}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={() => handleRestore(item)}
          disabled={isRestoring}
          activeOpacity={0.7}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color="#31429B" />
          ) : (
            <Ionicons name="arrow-undo-outline" size={18} color="#31429B" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = (type) => {
    const isArchived = type === "archived";
    return (
      <View style={styles.emptyWrap}>
        <Ionicons
          name={isArchived ? "archive-outline" : "trash-outline"}
          size={56}
          color="#CBD5E1"
          style={{ marginBottom: 16 }}
        />
        <Text style={styles.emptyTitle}>
          {isArchived ? "No archived chats" : "No deleted chats"}
        </Text>
        <Text style={styles.emptyText}>
          {isArchived
            ? "Archived conversations will appear here."
            : "Deleted conversations will appear here for 3 minutes before being permanently removed."}
        </Text>
      </View>
    );
  };

  const renderShimmerSkeleton = () => (
    <View style={styles.skeletonListWrap}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={`skeleton-${index}`} style={styles.skeletonCard}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonTextWrap}>
            <View style={styles.skeletonLinePrimary} />
            <View style={styles.skeletonLineSecondary} />
          </View>
        </View>
      ))}
    </View>
  );

  const shimmerTranslateStyle = useMemo(
    () => ({
      transform: [
        {
          translateX: shimmerProgress.interpolate({
            inputRange: [-1, 1],
            outputRange: [-220, 220],
          }),
        },
      ],
    }),
    [shimmerProgress],
  );

  const tabContentAnimatedStyle = useMemo(
    () => ({
      opacity: tabContentAnimation,
      transform: [
        {
          translateY: tabContentAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [8, 0],
          }),
        },
      ],
    }),
    [tabContentAnimation],
  );

  const activeData = selectedTab === "archived" ? archivedChats : deletedChats;

  const getListEmptyComponent = () => {
    if (isLoading) return renderShimmerSkeleton();
    return renderEmptyState(selectedTab);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* BLUE HEADER SECTION */}
        <View style={styles.blueHeaderSection}>
          <Image
            source={require("../../assets/images/Space_HeaderBG_White 2.png")}
            style={styles.headerBgImage}
            resizeMode="cover"
          />

          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#31429B" />
            </TouchableOpacity>
            <Text style={styles.headerTitleWhite}>Chats</Text>
            {/* Spacer to balance the back button */}
            <View style={{ width: 40 }} />
          </View>

          {/* Tabs: Archived | Deleted */}
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
                  <Text
                    style={[styles.tabText, isActive && styles.tabTextActive]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* WHITE BODY */}
        <View style={styles.whiteBodyContainer}>
          {/* DELETED WARNING BANNER */}
          {selectedTab === "deleted" && (
            <View style={styles.deletedBanner}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#DC2626"
              />
              <Text style={styles.deletedBannerText}>
                Deleted chats are permanently removed after 3 minutes.
              </Text>
            </View>
          )}

          <Animated.View style={[styles.listArea, tabContentAnimatedStyle]}>
            <FlatList
              data={activeData}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              refreshing={isLoading}
              onRefresh={loadArchivedData}
              ListEmptyComponent={getListEmptyComponent}
            />
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ArchivedChatsScreen;
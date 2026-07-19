import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
import { getUserPosts } from "../services/postQueries";
import { getDismissedNotifications, dismissNotification } from "../services/utilityQueries";
import { getAvatarUri } from "../utils/imageUtils";
import styles from "../styles/NotificationsScreen.styles";
import { useCurrentUserProfile } from "../context/CurrentUserProfileContext";

export default function NotificationsScreen({ navigation }) {
  const { currentUserProfile } = useCurrentUserProfile();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Modal State ---
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const currentProfile = currentUserProfile ?? (await getCurrentUser().catch(() => null));
      const currentUserId = currentProfile?.id ?? null;
      if (!currentUserId) { setNotifications([]); return; }

      const dismissedNotificationKeys = await getDismissedNotifications(currentUserId).catch(() => []);
      const dismissedNotificationKeySet = new Set((dismissedNotificationKeys || []).map((key) => String(key)));

      const ownedPosts = await getUserPosts(currentUserId, 50, 0).catch(() => []);
      const ownedPostsById = new Map((ownedPosts || []).map((post) => [post.id, post]));
      const postIds = (ownedPosts || []).map((post) => post?.id).filter(Boolean);

      const [commentsResult, reactionsResult, repostsResult, announcementsResult] = await Promise.all([
        postIds.length > 0 ? supabase.from("comments").select(`id, post_id, comment, created_at, alumni:alumni_id(id, first_name, last_name, alumni_photo)`).in("post_id", postIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
        postIds.length > 0 ? supabase.from("reactions").select(`id, post_id, reaction, created_at, alumni:alumni_id(id, first_name, last_name, alumni_photo)`).in("post_id", postIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
        postIds.length > 0 ? supabase.from("reposts").select(`id, post_id, caption, created_at, alumni:alumni_id(id, first_name, last_name, alumni_photo)`).in("post_id", postIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
        supabase.from("announcements").select(`id, title, announcement_description, date_posted, admin:admin_id(id, admin_first_name, admin_last_name, photo)`).order("date_posted", { ascending: false }).limit(20),
      ]);

      const buildActor = (row) => row?.alumni ?? row?.alumnis ?? null;
      const notificationsFeed = [];

      // Mock connection request 
      notificationsFeed.push({
        id: 'mock-connection-1',
        type: 'connection',
        actor: { first_name: 'Timothy John', last_name: 'Asada', alumni_photo: null },
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      });

      (commentsResult.data ?? []).forEach((comment) => {
        const actor = buildActor(comment);
        const targetPost = ownedPostsById.get(comment.post_id);
        if (!actor?.id || actor.id === currentUserId || !targetPost) return;
        notificationsFeed.push({ id: `comment-${comment.id}`, type: "comment", actor, created_at: comment.created_at ?? targetPost.created_at ?? null });
      });

      (reactionsResult.data ?? []).forEach((reaction) => {
        const actor = buildActor(reaction);
        const targetPost = ownedPostsById.get(reaction.post_id);
        if (!actor?.id || actor.id === currentUserId || !targetPost) return;
        notificationsFeed.push({ id: `reaction-${reaction.id}`, type: "reaction", reaction: reaction.reaction ?? "like", actor, created_at: reaction.created_at ?? targetPost.created_at ?? null });
      });

      (repostsResult.data ?? []).forEach((repost) => {
        const actor = buildActor(repost);
        const targetPost = ownedPostsById.get(repost.post_id);
        if (!actor?.id || actor.id === currentUserId || !targetPost) return;
        notificationsFeed.push({ id: `repost-${repost.id}`, type: "repost", actor, created_at: repost.created_at ?? targetPost.created_at ?? null });
      });

      (announcementsResult.data ?? []).forEach((announcement) => {
        notificationsFeed.push({ 
          id: `announcement-${announcement.id}`, 
          type: "announcement", 
          actor: { id: announcement?.admin?.id ?? null, first_name: "NU Lipa Alumni Affairs", last_name: "Office", alumni_photo: announcement?.admin?.photo ?? null }, 
          created_at: announcement.date_posted ?? null 
        });
      });

      const visibleNotifications = notificationsFeed
        .filter((item) => !dismissedNotificationKeySet.has(String(item?.id ?? "")))
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      setNotifications(visibleNotifications);
    } catch(err) {
      console.warn("Error fetching notifs: ", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserProfile]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleDismiss = async (id) => {
    const currentProfile = currentUserProfile ?? (await getCurrentUser().catch(() => null));
    if (currentProfile?.id) {
      await dismissNotification(currentProfile.id, id).catch(() => {});
    }
    setNotifications((curr) => curr.filter((item) => item.id !== id));
  };

  // --- Mark All As Read ---
  const handleMarkAllAsRead = async () => {
    if (notifications.length === 0) return;
    const currentProfile = currentUserProfile ?? (await getCurrentUser().catch(() => null));
    const idsToDismiss = notifications.map((n) => n.id);
    
    // Optimistically clear the UI instantly
    setNotifications([]);

    // Process removals in the background
    if (currentProfile?.id) {
      Promise.all(idsToDismiss.map((id) => dismissNotification(currentProfile.id, id).catch(() => {})));
    }
  };

  // --- Modal Handlers ---
  const openNotificationModal = (item) => {
    setSelectedNotif(item);
    setIsModalVisible(true);
  };

  const closeNotificationModal = () => {
    setIsModalVisible(false);
    setSelectedNotif(null);
  };

  const removeNotificationFromModal = () => {
    if (selectedNotif) {
      handleDismiss(selectedNotif.id);
    }
    closeNotificationModal();
  };

  const formatNotificationTime = (value) => {
    if (!value) return "";
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return "";
    const elapsedMinutes = Math.max(1, Math.floor((Date.now() - parsedDate.getTime()) / (1000 * 60)));
    if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return `${elapsedHours}h`;
    const elapsedDays = Math.floor(elapsedHours / 24);
    return `${elapsedDays}d`;
  };

  const getNotificationText = (item) => {
    if (!item) return { name: "", actionText: "", time: "", isAnnouncement: false, avatarUri: "" };
    
    const isAnnouncement = item.type === "announcement";
    const name = `${item?.actor?.first_name ?? ""} ${item?.actor?.last_name ?? ""}`.trim();
    const time = formatNotificationTime(item.created_at);
    const avatarUri = isAnnouncement 
      ? Image.resolveAssetSource(require("../../assets/images/nulogo.png")).uri
      : getAvatarUri(name, item?.actor?.alumni_photo);

    let actionText = "";
    if (isAnnouncement) actionText = "posted an announcement.";
    else if (item.type === "comment") actionText = "commented on your post.";
    else if (item.type === "reaction") actionText = "liked your post.";
    else if (item.type === "repost") actionText = "reposted your post.";
    else if (item.type === "connection") actionText = "sent you a connection request.";

    return { name, actionText, time, isAnnouncement, avatarUri };
  };

  const renderNotificationItem = ({ item }) => {
    const isConnection = item.type === "connection";
    const { name, actionText, time, isAnnouncement, avatarUri } = getNotificationText(item);

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => openNotificationModal(item)}
        activeOpacity={0.7}
      >
        <Image 
          source={isAnnouncement ? require("../../assets/images/nulogo.png") : { uri: avatarUri }} 
          style={styles.avatar} 
          resizeMode={isAnnouncement ? "contain" : "cover"}
        />
        <View style={styles.textContainer}>
          <Text style={styles.messageText}>
            <Text style={styles.nameText}>{name}</Text> {actionText} <Text style={styles.timeText}>{time}</Text>
          </Text>

          {/* Render Action Buttons for Connection Requests */}
          {isConnection && (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.acceptButton} onPress={() => handleDismiss(item.id)}>
                <Text style={styles.acceptButtonText}>Accepted</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDismiss(item.id)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={[styles.header, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
          <TouchableOpacity 
            style={[styles.markReadButton, notifications.length === 0 && styles.markReadDisabled]}
            onPress={handleMarkAllAsRead} 
            disabled={notifications.length === 0} 
            hitSlop={10}
            activeOpacity={0.7}
          >
             <Text style={[styles.markReadText, notifications.length === 0 && styles.markReadTextDisabled]}>Mark all read</Text>
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { flex: 1, textAlign: "center" }]}>Notifications</Text>
          
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-forward" size={28} color="#31429B" />
          </TouchableOpacity>
        </View>

        {/* BODY */}
        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#31429B" />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContainer}
            renderItem={renderNotificationItem}
            ListEmptyComponent={
              <View style={styles.centerWrap}>
                <Text style={styles.emptyText}>You're all caught up!</Text>
              </View>
            }
          />
        )}

        <View style={styles.footer}>
          <Image 
            source={require("../../assets/images/lumi-n-us-logo-landscape-2.png")} 
            style={styles.footerLogo} 
            resizeMode="contain" 
          />
        </View>
      </View>

      {/* FLOATING MODAL */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeNotificationModal}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeNotificationModal} />
          
          {selectedNotif && (
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, width: "100%", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 }}>
              <Image 
                source={getNotificationText(selectedNotif).isAnnouncement ? require("../../assets/images/nulogo.png") : { uri: getNotificationText(selectedNotif).avatarUri }} 
                style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 16, backgroundColor: "#E5E7EB" }} 
                resizeMode={getNotificationText(selectedNotif).isAnnouncement ? "contain" : "cover"}
              />
              <Text style={{ fontSize: 18, fontFamily: "Poppins_700Bold", color: "#1C1C1E", textAlign: "center", marginBottom: 4 }}>
                {getNotificationText(selectedNotif).name}
              </Text>
              <Text style={{ fontSize: 14, fontFamily: "Poppins_400Regular", color: "#64748B", textAlign: "center", marginBottom: 24 }}>
                {getNotificationText(selectedNotif).actionText} {getNotificationText(selectedNotif).time}
              </Text>

              <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: "#F1F5F9", alignItems: "center" }} onPress={closeNotificationModal}>
                  <Text style={{ color: "#475569", fontSize: 14, fontFamily: "Poppins_600SemiBold" }}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: "#FEE2E2", alignItems: "center" }} onPress={removeNotificationFromModal}>
                  <Text style={{ color: "#EF4444", fontSize: 14, fontFamily: "Poppins_600SemiBold" }}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}
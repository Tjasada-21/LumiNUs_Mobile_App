import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
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

      // Note: In a real app, you would also fetch Connection Requests here. 
      // I have added a mock connection request to demonstrate the UI you requested!
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

  const renderNotificationItem = ({ item }) => {
    const isAnnouncement = item.type === "announcement";
    const isConnection = item.type === "connection";
    const name = `${item?.actor?.first_name ?? ""} ${item?.actor?.last_name ?? ""}`.trim();
    const time = formatNotificationTime(item.created_at);
    
    // Set avatars - use NU logo for announcements
    const avatarUri = isAnnouncement 
      ? Image.resolveAssetSource(require("../../assets/images/nulogo.png")).uri
      : getAvatarUri(name, item?.actor?.alumni_photo);

    let actionText = "";
    if (isAnnouncement) actionText = "posted an announcement.";
    else if (item.type === "comment") actionText = "commented on your post.";
    else if (item.type === "reaction") actionText = "liked your post.";
    else if (item.type === "repost") actionText = "reposted your post.";
    else if (isConnection) actionText = "sent you a connection request.";

    return (
      <View style={styles.card}>
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
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
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
    </SafeAreaView>
  );
}
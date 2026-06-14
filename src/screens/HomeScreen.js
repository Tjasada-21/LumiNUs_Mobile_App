import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  ImageBackground,
  Linking,
  Animated,
  Pressable,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import supabase from "../services/supabase";
import { getCurrentUser } from "../services/supabaseAuth";
import { getAllEvents } from "../services/eventQueries";
import { getUserPosts } from "../services/postQueries";
import { getAvatarUri } from "../utils/imageUtils";
import { useCurrentUserProfile } from "../context/CurrentUserProfileContext";
import HomeHeader from "../components/HomeHeader";
import { responsiveHeight, responsiveWidth } from "../utils/responsive";
import styles from "../styles/HomeScreen.styles";
import { dismissNotification, getDismissedNotifications } from "../services/utilityQueries";
import { registerForPushNotificationsAsync, saveTokenToSupabase } from "../services/notificationService";

const formatEventDateRange = (startDate, endDate) => {
  if (!startDate) return "Date to be announced";
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  if (Number.isNaN(start.getTime())) return "Date to be announced";
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (!end || Number.isNaN(end.getTime()) || end.getTime() === start.getTime()) return startLabel;
  const endLabel = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} - ${endLabel}`;
};

const getEventLocationLabel = (event) => {
  if (event?.venue?.name) return event.venue.name;
  if (event?.platform) return event.platform;
  return "NU Lipa";
};

const NotificationRow = ({ children, onRemove }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const isRemovingRef = useRef(false);

  const handleRemove = useCallback(() => {
    if (isRemovingRef.current) return;
    isRemovingRef.current = true;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 36, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) void onRemove?.();
      isRemovingRef.current = false;
    });
  }, [onRemove, opacity, translateX]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      {children(handleRemove)}
    </Animated.View>
  );
};

const HomeScreen = ({ navigation }) => {
  const { currentUserProfile } = useCurrentUserProfile();
  const { width, height } = useWindowDimensions();
  const isCompactWidth = width < 375;
  const isTablet = width >= 768;
  
  const layout = {
    horizontalPadding: isTablet ? 32 : isCompactWidth ? 16 : 20,
    menuWidth: Math.min(width * 0.85, 360),
    notifWidth: Math.min(width * 0.88, 360),
    heroCardWidth: width - (isTablet ? 64 : isCompactWidth ? 32 : 40),
    promoCardWidth: responsiveWidth(width, 0.6, 220, isTablet ? 300 : 250),
    promoCardHeight: responsiveHeight(height, 0.28, 220, 260),
  };

  const [userData, setUserData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [isLoadingFeaturedEvents, setIsLoadingFeaturedEvents] = useState(false);
  const [isRefreshingHome, setIsRefreshingHome] = useState(false);
  const [isIdFlipped, setIsIdFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const menuTranslateX = useRef(new Animated.Value(-Math.min(width * 0.92, 360))).current;
  
  const curveSize = width * 2.5;

  const openNotifications = () => {
    navigation.navigate("NotificationsScreen");
  };

  const closeMenu = () => {
    Animated.timing(menuTranslateX, { toValue: -layout.menuWidth, duration: 200, useNativeDriver: true })
      .start(() => setIsMenuVisible(false));
  };
  const openMenu = () => {
    setIsMenuVisible(true);
    requestAnimationFrame(() => {
      Animated.timing(menuTranslateX, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    });
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoadingNotifications(true);
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

      (commentsResult.data ?? []).forEach((comment) => {
        const actor = buildActor(comment);
        const targetPost = ownedPostsById.get(comment.post_id);
        if (!actor?.id || actor.id === currentUserId || !targetPost) return;
        notificationsFeed.push({ id: `comment-${comment.id}`, type: "comment", actor, created_at: comment.created_at ?? targetPost.created_at ?? null, detail: comment.comment ?? "", source_post_caption: targetPost.caption ?? "" });
      });

      (reactionsResult.data ?? []).forEach((reaction) => {
        const actor = buildActor(reaction);
        const targetPost = ownedPostsById.get(reaction.post_id);
        if (!actor?.id || actor.id === currentUserId || !targetPost) return;
        notificationsFeed.push({ id: `reaction-${reaction.id}`, type: "reaction", reaction: reaction.reaction ?? "like", actor, created_at: reaction.created_at ?? targetPost.created_at ?? null, detail: "", source_post_caption: targetPost.caption ?? "" });
      });

      (repostsResult.data ?? []).forEach((repost) => {
        const actor = buildActor(repost);
        const targetPost = ownedPostsById.get(repost.post_id);
        if (!actor?.id || actor.id === currentUserId || !targetPost) return;
        notificationsFeed.push({ id: `repost-${repost.id}`, type: "repost", actor, created_at: repost.created_at ?? targetPost.created_at ?? null, detail: repost.caption ?? "", source_post_caption: targetPost.caption ?? "" });
      });

      (announcementsResult.data ?? []).forEach((announcement) => {
        notificationsFeed.push({ id: `announcement-${announcement.id}`, type: "announcement", actor: { id: announcement?.admin?.id ?? null, first_name: announcement?.admin?.admin_first_name ?? "NU LIPA", last_name: announcement?.admin?.admin_last_name ?? "Alumni Affairs", alumni_photo: announcement?.admin?.photo ?? null }, created_at: announcement.date_posted ?? null, title: announcement.title ?? "Announcement", detail: announcement.announcement_description ?? "", source_post_caption: "" });
      });

      const visibleNotifications = notificationsFeed
        .filter((item) => !dismissedNotificationKeySet.has(String(item?.id ?? "")))
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      const seenIds = new Set();
      const deduplicatedNotifications = visibleNotifications.filter((notif) => {
        const id = String(notif?.id ?? "");
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });

      setNotifications(deduplicatedNotifications);
    } catch(err) {
      console.warn("Error fetching notifs: ", err);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [currentUserProfile]);

  const fetchFeaturedEvents = useCallback(async () => {
    try {
      setIsLoadingFeaturedEvents(true);
      const events = await getAllEvents(3, 0);
      setFeaturedEvents(Array.isArray(events) ? events.slice(0, 3) : []);
    } catch (err) {
      console.error("[HomeScreen] Failed to fetch featured events from Supabase:", err.message || err);
      setFeaturedEvents([]);
    } finally {
      setIsLoadingFeaturedEvents(false);
    }
  }, []);

  const refreshHomeContent = useCallback(async () => {
    try {
      setIsRefreshingHome(true);
      await Promise.all([fetchNotifications(), fetchFeaturedEvents()]);
    } finally {
      setIsRefreshingHome(false);
    }
  }, [fetchFeaturedEvents, fetchNotifications]);

  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo?.({ y: 0, animated: false });
      let isActive = true;

      const fetchUserData = async () => {
        try {
          const alumniData = await getCurrentUser();
          if (!alumniData || !isActive) {
            setUserData(null);
            return;
          }
          if (isActive) setUserData(alumniData);
        } catch (error) {
          console.error("[HomeScreen] Failed to fetch user profile:", error.message || error);
          setUserData(null);
        }
      };

      fetchUserData();
      fetchFeaturedEvents();
      fetchNotifications();
      return () => { isActive = false; };
    }, [fetchFeaturedEvents, fetchNotifications])
  );

  useEffect(() => {
    const setupNotifications = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) await saveTokenToSupabase(token);
    };
    setupNotifications();
  }, []);

  const activeUserData = currentUserProfile ?? userData;

  const openNUWebsite = async () => {
    const url = "https://national-u.edu.ph/";
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  };

  const openPerksScreen = () => {
    const parentNavigator = navigation.getParent?.();
    if (parentNavigator?.navigate) { parentNavigator.navigate("Explore", { screen: "Perks" }); return; }
    navigation.navigate("Explore", { screen: "Perks" });
  };

  const openTracerScreen = () => navigation.navigate("AlumniTracer");

  const openMastersWebsite = async () => {
    const url = "https://onlineapp.nu-lipa.edu.ph/portal/services.php";
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  };

  const openViewYearbook = () => navigation.navigate("ViewYearbook");

  const openEventsScreen = () => {
    const parentNavigator = navigation.getParent?.();
    if (parentNavigator?.navigate) { parentNavigator.navigate("Home", { screen: "EventsScreen" }); return; }
    navigation.navigate("Home", { screen: "EventsScreen" });
  };

  const openAccountSettings = () => {
    closeMenu();
    const parentNavigator = navigation.getParent?.();
    if (parentNavigator?.navigate) { parentNavigator.navigate("AccountSettings"); return; }
    navigation.navigate("AccountSettings");
  };

  const signOut = async () => {
    closeMenu();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await supabase.from("alumnis").update({ is_online: false, push_token: null }).eq("email", user.email);
      }
      try { await supabase.auth.signOut(); } catch (err) {}
    } catch (err) {}
    const parent = navigation.getParent?.();
    const root = parent?.getParent?.() ?? parent;
    if (root?.dispatch) {
      root.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
      return;
    }
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
  };

  const menuItems = [
    { key: "account-settings", title: "Account Settings", subtitle: "Manage Your Information", icon: "person-outline", onPress: openAccountSettings },
    { key: "connections", title: "My Connections", subtitle: "View Your Connections", icon: "people-outline", onPress: () => { closeMenu(); const parentNavigator = navigation.getParent?.(); if (navigation?.navigate) { navigation.navigate("ConnectionsScreen"); return; } if (parentNavigator?.navigate) { parentNavigator.navigate("Home", { screen: "ConnectionsScreen" }); } } },
    { key: "registrations", title: "My Registrations", subtitle: "View Your Event Registrations", icon: "reader-outline", onPress: () => { closeMenu(); const parentNavigator = navigation.getParent?.(); const rootNavigator = parentNavigator?.getParent?.() ?? parentNavigator; if (rootNavigator?.navigate) { rootNavigator.navigate("Home", { screen: "RegisteredEventsScreen" }); return; } if (parentNavigator?.navigate) { parentNavigator.navigate("RegisteredEventsScreen"); return; } navigation.navigate("RegisteredEventsScreen"); } },
    { key: "masters", title: "Get your Master’s Degree", subtitle: "Continue studying your chosen field", icon: "book-outline", onPress: () => { closeMenu(); void openMastersWebsite(); } },
    { key: "explore", title: "Explore the App", subtitle: "Take a Tour of the App!", icon: "search-outline", onPress: () => { closeMenu(); navigation.navigate("Explore"); } },
  ];

  const serviceItems = [
    { key: "view-all", label: "View All", icon: require("../../assets/images/nulogo.png"), onPress: () => navigation.navigate("Explore") },
    { key: "events", label: "Events", icon: require("../../assets/images/view-events-icon.png"), onPress: openEventsScreen },
    { key: "perks", label: "Perks", icon: require("../../assets/images/view-perks-icon-in-blue-1.png"), onPress: openPerksScreen },
    { key: "yearbook", label: "Yearbook", icon: require("../../assets/images/view-yearbook-icon.png"), onPress: openViewYearbook },
    { key: "website", label: "NU Website", icon: require("../../assets/images/nulogo.png"), onPress: openNUWebsite },
    { key: "nuquest", label: "NUQuest", icon: require("../../assets/images/trace-icon-in-blue.png"), onPress: openTracerScreen },
  ];

  const toggleIdCard = () => {
    const nextValue = isIdFlipped ? 0 : 1;
    Animated.timing(flipAnimation, { toValue: nextValue, duration: 500, useNativeDriver: true })
      .start(() => setIsIdFlipped(!isIdFlipped));
  };

  const frontRotateY = flipAnimation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotateY = flipAnimation.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
  const graduationYear = userData?.year_graduated ? String(userData.year_graduated).slice(0, 4) : "LOADING...";
  
  const notificationCount = Array.isArray(notifications) ? notifications.length : 0;
  
  const visibleFeaturedEvents = Array.isArray(featuredEvents) ? featuredEvents.filter((event) => {
    if (event?.end_date) { const endDate = new Date(event.end_date); if (!Number.isNaN(endDate.getTime()) && endDate < new Date()) return false; }
    else if (event?.start_date) { const startDate = new Date(event.start_date); if (!Number.isNaN(startDate.getTime()) && startDate < new Date()) return false; }
    return true;
  }) : [];

  const openEventDetails = (event) => {
    const parentNavigator = navigation.getParent?.();
    const rootNavigator = parentNavigator?.getParent?.() ?? parentNavigator;
    const eventPayload = { ...event, cover_image_url: event?.cover_image_url ?? event?.images?.[0]?.image_path ?? null };
    if (rootNavigator?.navigate) { rootNavigator.navigate("ViewEventsScreen", { event: eventPayload }); return; }
    navigation.navigate("ViewEventsScreen", { event: eventPayload });
  };

  const renderFeaturedEventCard = (event) => {
    const imageSource = event?.cover_image_url ? { uri: event.cover_image_url } : require("../../assets/icons/Group.png");
    return (
      <Pressable key={`featured-event-${event?.id ?? event?.title}`} style={({ pressed }) => [ styles.featuredEventCard, { width: layout.promoCardWidth }, pressed && styles.featuredEventCardPressed ]} onPress={() => openEventDetails(event)}>
        <Image source={imageSource} style={styles.featuredEventImage} resizeMode={event?.cover_image_url ? "cover" : "contain"} />
      </Pressable>
    );
  };

  return (
    <View style={styles.safeAreaTop}>
      <View style={styles.container}>
        <HomeHeader />
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.mainScrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshingHome} onRefresh={refreshHomeContent} tintColor="#31429B" colors={["#31429B"]} />}
        >
          <View style={styles.homeContentShell}>
            <View style={styles.greetingRow}>
              <View style={styles.profileInfo}>
                <TouchableOpacity style={styles.avatarRingTouchable} activeOpacity={0.85} onPress={openMenu}>
                  <Image
                    source={{ uri: getAvatarUri(`${activeUserData?.first_name ?? ""} ${activeUserData?.last_name ?? ""}`.trim() || "Alumni", activeUserData?.alumni_photo) }}
                    style={styles.avatar}
                  />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={openMenu} style={styles.profileTextWrap}>
                  <Text style={styles.greetingIntro}>Good Day!</Text>
                  <Text style={styles.greetingName} numberOfLines={1}>
                    {activeUserData ? `${activeUserData.first_name}` : "Alumni"}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.bellIcon} onPress={openNotifications} activeOpacity={0.85}>
                <View style={styles.bellIconInner}>
                  <Ionicons name="notifications-outline" size={26} color="#31429B" />
                  {notificationCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>{notificationCount > 99 ? "99+" : notificationCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.idSection}>
              <Pressable onPress={toggleIdCard}>
                <View style={styles.idCardPerspective}>
                  <Animated.View style={[styles.idCardFace, styles.idCardFrontFace, { transform: [{ perspective: 1000 }, { rotateY: frontRotateY }] }]}>
                    <ImageBackground source={require("../../assets/images/BlankID_Front 1.png")} style={styles.idBackground} imageStyle={styles.idBackgroundImage} resizeMode="contain">
                      <Image source={{ uri: getAvatarUri(`${userData?.first_name ?? ""} ${userData?.last_name ?? ""}`.trim() || "Alumni", userData?.card_photo) }} style={styles.idPhoto} resizeMode="cover" />
                      <View style={styles.idCardContent}>
                        <Text style={styles.idName}>{userData ? `${userData.first_name}\n${userData.last_name}`.toUpperCase() : "LOADING..."}</Text>
                        <Text style={styles.idCourse}>{userData?.program ? userData.program.toUpperCase() : "LOADING..."}</Text>
                        <Text style={styles.idClass}>Class of {graduationYear}</Text>
                      </View>
                    </ImageBackground>
                  </Animated.View>
                  <Animated.View style={[styles.idCardFace, styles.idCardBackFace, { transform: [{ perspective: 1000 }, { rotateY: backRotateY }] }]}>
                    <Image source={require("../../assets/images/BlankID_Back 1.png")} style={styles.idBackImage} resizeMode="contain" />
                  </Animated.View>
                </View>
              </Pressable>

              <View style={styles.accountIdRow}>
                <Text style={styles.accountIdLabel}>Account ID: </Text>
                <Text style={styles.accountIdValue}>LIPA2026123456</Text>
              </View>
            </View>

            <View style={styles.servicesSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Services</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Explore")} activeOpacity={0.8} style={styles.sectionHeaderAction}>
                  <Text style={styles.sectionHeaderActionText}>View All</Text>
                  <Ionicons name="arrow-forward" size={17} color="#31429B" />
                </TouchableOpacity>
              </View>

              <View style={styles.servicesGrid}>
                {serviceItems.map((item) => (
                  <TouchableOpacity key={item.key} style={styles.serviceTile} activeOpacity={0.86} onPress={item.onPress}>
                    <View style={styles.serviceIconCircle}>
                      <Image source={item.icon} style={{ width: 44, height: 44 }} resizeMode="contain" />
                    </View>
                    <Text style={styles.serviceLabel} numberOfLines={2}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.curveContainer}>
            <View
              style={[
                styles.curveShape,
                {
                  width: curveSize,
                  height: curveSize,
                  borderRadius: curveSize / 2,
                },
              ]}
            />
          </View>

          <View style={styles.newsSection}>
            <Text style={styles.newsTitle}>WHAT'S <Text style={styles.newsTitleEmphasis}>NEW?</Text></Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ zIndex: 10 }} contentContainerStyle={styles.featuredScrollContent}>
              {isLoadingFeaturedEvents ? (
                <View style={[styles.promoLoadingCard, { width: layout.promoCardWidth, height: layout.promoCardHeight }]}>
                  <ActivityIndicator size="small" color="#F2C919" />
                  <Text style={styles.promoLoadingText}>Loading events...</Text>
                </View>
              ) : visibleFeaturedEvents.length > 0 ? (
                visibleFeaturedEvents.map(renderFeaturedEventCard)
              ) : (
                <View style={[styles.promoEmptyCard, { width: layout.promoCardWidth, height: layout.promoCardHeight }]}>
                  <Text style={styles.promoEyebrow}>NO EVENTS YET</Text>
                  <Text style={styles.promoTitleMain}>Check back soon for the latest posted events.</Text>
                </View>
              )}
            </ScrollView>

            {/* UPGRADED EXPLORER SECTION WITH POSTER IMAGE */}
            <View style={styles.explorerSection}>
              <Image 
                source={require("../../assets/images/TracerPoster.png")} 
                style={styles.tracerPosterImage} 
                resizeMode="cover" 
              />
              <TouchableOpacity 
                style={styles.exploreButton} 
                activeOpacity={0.9} 
                onPress={openTracerScreen}
              >
                <Text style={styles.exploreButtonText}>Explore</Text>
                <Ionicons name="rocket-outline" size={24} color="#1A237E" />
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>

        {/* SIDE MENU MODAL ONLY */}
        <Modal transparent visible={isMenuVisible} animationType="none" onRequestClose={closeMenu}>
          <View style={styles.sideMenuRoot}>
            <Pressable style={styles.sideMenuOverlay} onPress={closeMenu} />
            <Animated.View style={[styles.sideMenuContainer, { width: layout.menuWidth, transform: [{ translateX: menuTranslateX }] }]}>
              <View style={styles.sideMenuHeader}>
                <Text style={styles.sideMenuTitle}>Menu</Text>
                <TouchableOpacity onPress={closeMenu}><Ionicons name="close" size={32} color="#F2C919" /></TouchableOpacity>
              </View>
              <View style={styles.sideMenuAccent} />
              <View style={styles.sideMenuBody}>
                {menuItems.map((item) => (
                  <TouchableOpacity key={item.key} style={styles.menuItem} activeOpacity={0.8} onPress={item.onPress}>
                    <View style={styles.menuIconCircle}><Ionicons name={item.icon} size={22} color="#FFFFFF" /></View>
                    <View style={styles.menuTextWrap}>
                      <Text style={styles.menuItemTitle}>{item.title}</Text>
                      <Text style={styles.menuItemSub}>{item.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.sideMenuFooter}>
                <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                  <Text style={styles.signOutButtonText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </View>
  );
};

export default HomeScreen;
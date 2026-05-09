import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Modal, FlatList, ImageBackground, Linking, Animated, Pressable, Dimensions, RefreshControl, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import supabase from '../services/supabase';
import { getCurrentUser } from '../services/supabaseAuth';
import { getAllEvents } from '../services/eventQueries';
import { getUserPosts } from '../services/postQueries';
import { getAlumniProfile, getAlumniByEmail } from '../services/alumniQueries';
import { getAvatarUri } from '../utils/imageUtils';
import { useCurrentUserProfile } from '../context/CurrentUserProfileContext';
import BrandHeader from '../components/BrandHeader';
import { responsiveHeight, responsiveWidth } from '../utils/responsive';
import styles from '../styles/HomeScreen.styles';
import { clearAuthCredentials } from '../services/authStorage';
import { dismissNotification, getDismissedNotifications } from '../services/utilityQueries';

const formatEventDateRange = (startDate, endDate) => {
  if (!startDate) {
    return 'Date to be announced';
  }

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  if (Number.isNaN(start.getTime())) {
    return 'Date to be announced';
  }

  const startLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (!end || Number.isNaN(end.getTime()) || end.getTime() === start.getTime()) {
    return startLabel;
  }

  const endLabel = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${startLabel} - ${endLabel}`;
};

const getEventLocationLabel = (event) => {
  if (event?.venue?.name) {
    return event.venue.name;
  }

  if (event?.platform) {
    return event.platform;
  }

  return 'NU Lipa';
};

const NotificationRow = ({ children, onRemove }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const isRemovingRef = useRef(false);

  const handleRemove = useCallback(() => {
    if (isRemovingRef.current) {
      return;
    }

    isRemovingRef.current = true;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 36,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        void onRemove?.();
      }

      isRemovingRef.current = false;
    });
  }, [onRemove, opacity, translateX]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateX }],
      }}
    >
      {children(handleRemove)}
    </Animated.View>
  );
};

const HomeScreen = ({ navigation }) => {
  const { currentUserProfile } = useCurrentUserProfile();
	// SECTION: Layout values
  const { width, height } = useWindowDimensions();
  const isCompactWidth = width < 375;
  const isTablet = width >= 768;
  const layout = {
    headerLogoWidth: responsiveWidth(width, 0.28, 122, isTablet ? 176 : 146),
    headerLogoHeight: responsiveHeight(height, 0.045, 30, 42),
    horizontalPadding: isTablet ? 28 : isCompactWidth ? 16 : 20,
    menuWidth: Math.min(width * 0.92, 340),
    notifWidth: Math.min(width * 0.88, 340),
    promoCardWidth: responsiveWidth(width, 0.75, 240, isTablet ? 360 : 300),
    promoCardHeight: responsiveHeight(height, 0.17, 118, 150),
    quickLinkWidth: responsiveWidth(width, 0.42, 150, isTablet ? 230 : 192),
    quickLinkIconSize: responsiveWidth(width, 0.09, 28, 42),
    quickLinkIconNUSize: responsiveWidth(width, 0.07, 24, 34),
  };

	// SECTION: Screen state
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
    const menuTranslateX = useRef(new Animated.Value(-Math.min(width * 0.92, 340))).current;

    // Notifications panel animation (slide from right)
    const [isNotifVisible, setIsNotifVisible] = useState(false);
    const notifTranslateX = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  	// HANDLER: Open the notifications panel
    const openNotifications = () => {
      setIsNotifVisible(true);
      requestAnimationFrame(() => {
        Animated.timing(notifTranslateX, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    };

  	// HANDLER: Close the notifications panel
    const closeNotifications = () => {
      Animated.timing(notifTranslateX, {
        toValue: Dimensions.get('window').width,
        duration: 180,
        useNativeDriver: true,
      }).start(() => setIsNotifVisible(false));
    };

    const fetchNotifications = useCallback(async () => {
      try {
        setIsLoadingNotifications(true);
        setNotifications([]);

        const currentProfile = currentUserProfile ?? userData ?? await getCurrentUser().catch(() => null);
        const currentUserId = currentProfile?.id ?? null;

        if (!currentUserId) {
          setNotifications([]);
          return;
        }

        const dismissedNotificationKeys = await getDismissedNotifications(currentUserId).catch(() => []);
        const dismissedNotificationKeySet = new Set((dismissedNotificationKeys || []).map((key) => String(key)));

        const ownedPosts = await getUserPosts(currentUserId, 50, 0).catch(() => []);
        const ownedPostsById = new Map((ownedPosts || []).map((post) => [post.id, post]));
        const postIds = (ownedPosts || []).map((post) => post?.id).filter(Boolean);

        const [commentsResult, reactionsResult, repostsResult, announcementsResult] = await Promise.all([
          postIds.length > 0
            ? supabase
                .from('comments')
                .select(`
                  id,
                  post_id,
                  comment,
                  created_at,
                  alumni:alumni_id(id, first_name, last_name, alumni_photo)
                `)
                .in('post_id', postIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          postIds.length > 0
            ? supabase
                .from('reactions')
                .select(`
                  id,
                  post_id,
                  reaction,
                  created_at,
                  alumni:alumni_id(id, first_name, last_name, alumni_photo)
                `)
                .in('post_id', postIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          postIds.length > 0
            ? supabase
                .from('reposts')
                .select(`
                  id,
                  post_id,
                  caption,
                  created_at,
                  alumni:alumni_id(id, first_name, last_name, alumni_photo)
                `)
                .in('post_id', postIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from('announcements')
            .select(`
              id,
              title,
              announcement_description,
              date_posted,
              admin:admin_id(id, admin_first_name, admin_last_name, photo)
            `)
            .order('date_posted', { ascending: false })
            .limit(20),
        ]);

        if (commentsResult.error) throw commentsResult.error;
        if (reactionsResult.error) throw reactionsResult.error;
        if (repostsResult.error) throw repostsResult.error;
        if (announcementsResult.error) throw announcementsResult.error;

        const buildActor = (row) => row?.alumni ?? row?.alumnis ?? null;
        const notificationsFeed = [];

        (commentsResult.data ?? []).forEach((comment) => {
          const actor = buildActor(comment);
          const targetPost = ownedPostsById.get(comment.post_id);

          if (!actor?.id || actor.id === currentUserId || !targetPost) {
            return;
          }

          notificationsFeed.push({
            id: `comment-${comment.id}`,
            type: 'comment',
            actor,
            created_at: comment.created_at ?? targetPost.created_at ?? null,
            detail: comment.comment ?? '',
            source_post_caption: targetPost.caption ?? '',
          });
        });

        (reactionsResult.data ?? []).forEach((reaction) => {
          const actor = buildActor(reaction);
          const targetPost = ownedPostsById.get(reaction.post_id);

          if (!actor?.id || actor.id === currentUserId || !targetPost) {
            return;
          }

          notificationsFeed.push({
            id: `reaction-${reaction.id}`,
            type: 'reaction',
            reaction: reaction.reaction ?? 'like',
            actor,
            created_at: reaction.created_at ?? targetPost.created_at ?? null,
            detail: '',
            source_post_caption: targetPost.caption ?? '',
          });
        });

        (repostsResult.data ?? []).forEach((repost) => {
          const actor = buildActor(repost);
          const targetPost = ownedPostsById.get(repost.post_id);

          if (!actor?.id || actor.id === currentUserId || !targetPost) {
            return;
          }

          notificationsFeed.push({
            id: `repost-${repost.id}`,
            type: 'repost',
            actor,
            created_at: repost.created_at ?? targetPost.created_at ?? null,
            detail: repost.caption ?? '',
            source_post_caption: targetPost.caption ?? '',
          });
        });

        (announcementsResult.data ?? []).forEach((announcement) => {
          notificationsFeed.push({
            id: `announcement-${announcement.id}`,
            type: 'announcement',
            actor: {
              id: announcement?.admin?.id ?? null,
              first_name: announcement?.admin?.admin_first_name ?? 'NU LIPA',
              last_name: announcement?.admin?.admin_last_name ?? 'Alumni Affairs',
              alumni_photo: announcement?.admin?.photo ?? null,
            },
            created_at: announcement.date_posted ?? null,
            title: announcement.title ?? 'Announcement',
            detail: announcement.announcement_description ?? '',
            source_post_caption: '',
          });
        });

        const visibleNotifications = notificationsFeed
          .filter((item) => !dismissedNotificationKeySet.has(String(item?.id ?? '')))
          .sort((firstItem, secondItem) => new Date(secondItem.created_at || 0).getTime() - new Date(firstItem.created_at || 0).getTime());

        setNotifications(visibleNotifications);
      } finally {
        setIsLoadingNotifications(false);
      }
    }, [currentUserProfile, userData]);

    const fetchFeaturedEvents = useCallback(async () => {
      try {
        setIsLoadingFeaturedEvents(true);
        try {
          const events = await getAllEvents(3, 0);
          // getAllEvents returns an array; use first three
          setFeaturedEvents(Array.isArray(events) ? events.slice(0, 3) : []);
        } catch (err) {
          console.error('[HomeScreen] Failed to fetch featured events from Supabase:', err.message || err);
          setFeaturedEvents([]);
        }
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

  	// HANDLER: Open the side menu
    const openMenu = () => {
        setIsMenuVisible(true)
        requestAnimationFrame(() => {
            Animated.timing(menuTranslateX, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
            }).start();
        });
    };

  	// HANDLER: Close the side menu
    const closeMenu = () => {
        Animated.timing(menuTranslateX, {
        toValue: -layout.menuWidth,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setIsMenuVisible(false));
    };

  	// SECTION: Load user data
  	useFocusEffect(
  		useCallback(() => {
        scrollViewRef.current?.scrollTo?.({ y: 0, animated: false });

        let isActive = true;

        const fetchUserData = async () => {
          try {
            // getCurrentUser() now returns the alumni profile directly from the alumnis table
            const alumniData = await getCurrentUser();

            if (!alumniData || !isActive) {
              // if (__DEV__) console.log('[HomeScreen] No alumni data returned from getCurrentUser');
              setUserData(null);
              return;
            }

            // Alumni data is already fetched, use it directly
            if (isActive) {
              // if (__DEV__) console.log('[HomeScreen] Setting user data:', alumniData.id);
              setUserData(alumniData);
            }
          } catch (error) {
            console.error('[HomeScreen] Failed to fetch user profile:', error.message || error);
            setUserData(null);
          }
        };

        fetchUserData();
        fetchFeaturedEvents();

        return () => {
          isActive = false;
        };

		}, [fetchFeaturedEvents])
  	);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

	const activeUserData = currentUserProfile ?? userData;

	// HANDLER: Open the NU website
  const openNUWebsite = async () => {
    const url = 'https://national-u.edu.ph/';
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.error('Cannot open URL:', url);
    }
  };

	// HANDLER: Open the yearbook screen
  const openViewYearbook = () => {
    navigation.navigate('ViewYearbook');
  };

	// HANDLER: Open the events screen
  const openEventsScreen = () => {
    const parentNavigator = navigation.getParent?.();

    if (parentNavigator?.navigate) {
      parentNavigator.navigate('Home', { screen: 'EventsScreen' });
      return;
    }

    navigation.navigate('Home', { screen: 'EventsScreen' });
  };

	// HANDLER: Open account settings
  const openAccountSettings = () => {
    closeMenu();
    const parentNavigator = navigation.getParent?.();

    if (parentNavigator?.navigate) {
      parentNavigator.navigate('AccountSettings');
      return;
    }

    navigation.navigate('AccountSettings');
  };

	// HANDLER: Sign out the user
  const signOut = async () => {
    // close the menu first
    closeMenu();
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email) {
        await supabase
          .from('alumnis')
          .update({ is_online: false })
          .eq('email', user.email);
      }

      // Sign out from Supabase and clear any stored credentials
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[HomeScreen] signOut error:', err?.message || err);
      }

      await clearAuthCredentials();
    } catch (err) {
      console.error('Failed to clear secure store during sign out', err);
    }

    const parent = navigation.getParent?.();
    const root = parent?.getParent?.() ?? parent;

    if (root?.dispatch) {
      root.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
      return;
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

	// SECTION: Side menu items
  const menuItems = [
    {
      key: 'account-settings',
      title: 'Account Settings',
      subtitle: 'Manage Your Information',
      icon: 'person-outline',
      onPress: openAccountSettings,
    },
    {
      key: 'connections',
      title: 'My Connections',
      subtitle: 'View Your Connections',
      icon: 'people-outline',
      onPress: () => {
        closeMenu();
        const parentNavigator = navigation.getParent?.();

        if (navigation?.navigate) {
          navigation.navigate('ConnectionsScreen');
          return;
        }

        if (parentNavigator?.navigate) {
          parentNavigator.navigate('Home', { screen: 'ConnectionsScreen' });
        }
      },
    },
    {
      key: 'registrations',
      title: 'My Registrations',
      subtitle: 'View Your Event Registrations',
      icon: 'reader-outline',
      onPress: () => {
        closeMenu();
        const parentNavigator = navigation.getParent?.();
        const rootNavigator = parentNavigator?.getParent?.() ?? parentNavigator;

        if (rootNavigator?.navigate) {
          rootNavigator.navigate('Home', { screen: 'RegisteredEventsScreen' });
          return;
        }

        if (parentNavigator?.navigate) {
          parentNavigator.navigate('RegisteredEventsScreen');
          return;
        }

        navigation.navigate('RegisteredEventsScreen');
      },
    },
    {
      key: 'masters',
      title: 'Get your Master’s or Second Degree',
      subtitle: 'Continue studying your chosen field',
      icon: 'book-outline',
      onPress: () => {
        closeMenu();
        const parentNavigator = navigation.getParent?.();

        if (parentNavigator?.navigate) {
          parentNavigator.navigate('Explore', { screen: 'Perks' });
          return;
        }

        navigation.navigate('Explore', { screen: 'Perks' });
      },
    },
    {
      key: 'explore',
      title: 'Explore the App',
      subtitle: 'Take a Tour of the App!',
      icon: 'search-outline',
      onPress: () => {
        closeMenu();
        navigation.navigate('Explore');
      },
    },
  ];

	// HANDLER: Flip the ID card
  const toggleIdCard = () => {
    const nextValue = isIdFlipped ? 0 : 1;

    Animated.timing(flipAnimation, {
      toValue: nextValue,
      duration: 450,
      useNativeDriver: true,
    }).start(() => {
      setIsIdFlipped(!isIdFlipped);
    });
  };

	// DERIVED VALUES: Card rotation and display data
  const frontRotateY = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backRotateY = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const graduationYear = userData?.year_graduated
    ? String(userData.year_graduated).slice(0, 4)
    : 'LOADING...';

  const notifData = Array.isArray(notifications) ? notifications : [];
  const notificationCount = notifData.length;
  const visibleFeaturedEvents = Array.isArray(featuredEvents)
    ? featuredEvents.filter((event) => {
        // Filter out past events (where end_date has passed)
        if (event?.end_date) {
          const endDate = new Date(event.end_date);
          if (!Number.isNaN(endDate.getTime()) && endDate < new Date()) {
            return false; // Skip past events
          }
        } else if (event?.start_date) {
          const startDate = new Date(event.start_date);
          if (!Number.isNaN(startDate.getTime()) && startDate < new Date()) {
            return false; // Skip past events
          }
        }
        return true;
      })
    : [];

  const openEventDetails = (event) => {
    const parentNavigator = navigation.getParent?.();
    const rootNavigator = parentNavigator?.getParent?.() ?? parentNavigator;
    const eventPayload = {
      ...event,
      cover_image_url: event?.cover_image_url ?? event?.images?.[0]?.image_path ?? null,
    };

    if (rootNavigator?.navigate) {
      rootNavigator.navigate('ViewEventsScreen', { event: eventPayload });
      return;
    }

    navigation.navigate('ViewEventsScreen', { event: eventPayload });
  };

  const getNotificationTypeLabel = (type) => {
    if (type === 'announcement') {
      return 'Announcement';
    }

    if (type === 'reaction') {
      return 'Reaction';
    }

    if (type === 'comment') {
      return 'Comment';
    }

    if (type === 'repost') {
      return 'Repost';
    }

    if (type === 'follow') {
      return 'Follow';
    }

    return 'Update';
  };

  const getNotificationActionText = (item) => {
    if (item?.type === 'announcement') {
      return 'posted an announcement.';
    }

    if (item?.type === 'reaction') {
      return 'reacted to your post.';
    }

    if (item?.type === 'comment') {
      return 'commented on your post.';
    }

    if (item?.type === 'repost') {
      return 'reposted your post.';
    }

    if (item?.type === 'follow') {
      return 'sent you a follow request.';
    }

    return 'interacted with your post.';
  };

  const formatNotificationTime = (value) => {
    if (!value) {
      return '';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return '';
    }

    const elapsedMs = Date.now() - parsedDate.getTime();
    const elapsedMinutes = Math.max(1, Math.floor(elapsedMs / (1000 * 60)));

    if (elapsedMinutes < 60) {
      return `${elapsedMinutes}m ago`;
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60);

    if (elapsedHours < 24) {
      return `${elapsedHours}h ago`;
    }

    const elapsedDays = Math.floor(elapsedHours / 24);

    if (elapsedDays < 30) {
      return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`;
    }

    const elapsedMonths = Math.floor(elapsedDays / 30);

    if (elapsedMonths < 12) {
      return `${elapsedMonths} month${elapsedMonths === 1 ? '' : 's'} ago`;
    }

    const elapsedYears = Math.floor(elapsedDays / 365);
    return `${elapsedYears} year${elapsedYears === 1 ? '' : 's'} ago`;
  };

  const removeNotification = useCallback(async (notificationKey) => {
    const currentProfile = currentUserProfile ?? userData ?? await getCurrentUser().catch(() => null);
    const currentUserId = currentProfile?.id ?? null;

    if (currentUserId && notificationKey) {
      await dismissNotification(currentUserId, notificationKey).catch((error) => {
        console.error('[HomeScreen] Failed to persist dismissed notification:', error?.message || error);
      });
    }

    setNotifications((currentNotifications) => currentNotifications.filter((item) => item?.id !== notificationKey));
  }, [currentUserProfile, userData]);

	// RENDER HELPER: Empty notifications state
  const renderEmptyNotifications = () => (
    <View style={styles.emptyNotifWrap}>
      <Text style={styles.emptyNotifText}>No notifications yet.</Text>
    </View>
  );

	// RENDER HELPER: Featured event card
  const renderFeaturedEventCard = (event) => {
    const imageSource = event?.cover_image_url
      ? { uri: event.cover_image_url }
      : require('../../assets/icons/Group.png');

    return (
      <Pressable
        key={`featured-event-${event?.id ?? event?.title}`}
        style={({ pressed }) => [
          styles.featuredEventCard,
          { width: layout.promoCardWidth },
          pressed ? styles.featuredEventCardPressed : null,
        ]}
        onPress={() => openEventDetails(event)}
      >
        <Image source={imageSource} style={styles.featuredEventImage} resizeMode={event?.cover_image_url ? 'cover' : 'contain'} />
      </Pressable>
    );
  };

	// RENDER HELPER: Notification row
  const renderNotificationItem = ({ item }) => {
    const isAnnouncement = item?.type === 'announcement';
    const firstName = String(item?.actor?.first_name ?? 'Unknown');
    const lastName = String(item?.actor?.last_name ?? 'User');
    const name = isAnnouncement ? 'NU LIPA ALUMNI AFFAIRS' : `${firstName} ${lastName}`.trim();
    const time = formatNotificationTime(item?.created_at);
    const avatarUri = isAnnouncement
      ? null
      : getAvatarUri(name, item?.actor?.alumni_photo);
    const actionText = isAnnouncement
      ? 'posted an announcement.'
      : item?.type === 'comment'
      ? 'commented on your post.'
      : item?.type === 'reaction'
        ? `${String(item?.reaction ?? 'liked').toLowerCase()} your post.`
        : 'reposted your post.';
    const detailLines = [
      isAnnouncement && item?.title ? String(item.title) : '',
      item?.detail ? String(item.detail) : '',
      item?.source_post_caption ? `On your post: ${String(item.source_post_caption)}` : '',
    ].filter(Boolean);

    return (
      <NotificationRow onRemove={() => removeNotification(item?.id)}>
        {(handleAnimatedRemove) => (
          <View style={styles.notifCard}>
            {isAnnouncement ? (
              <Image
                source={require('../../assets/images/nu-lipa-logo-portrait-white-version-21.png')}
                style={styles.notifAvatar}
                resizeMode="contain"
              />
            ) : (
              <Image source={{ uri: avatarUri }} style={styles.notifAvatar} />
            )}
            <View style={styles.notifBody}>
              <View style={styles.notifTopRow}>
                <Text style={styles.notifName}>{name}</Text>
              </View>
              <Text style={styles.notifAction}>{actionText}</Text>
              {detailLines.map((detailLine, detailIndex) => (
                <Text
                  key={`${item.id}-detail-${detailIndex}`}
                  style={styles.notifDetail}
                  numberOfLines={isAnnouncement ? 2 : 2}
                >
                  {detailLine}
                </Text>
              ))}
              {!!time && <Text style={styles.notifTime}>{time}</Text>}
            </View>
            <TouchableOpacity
              style={styles.notifDeleteButton}
              activeOpacity={0.75}
              onPress={handleAnimatedRemove}
              accessibilityRole="button"
              accessibilityLabel="Remove notification"
            >
              <Ionicons name="close" size={18} color="#B91C1C" />
            </TouchableOpacity>
          </View>
        )}
      </NotificationRow>
    );
  };

  return (
    <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
      <View style={styles.container}>
        <BrandHeader />
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.mainScrollContent}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshingHome}
              onRefresh={refreshHomeContent}
              tintColor="#31429B"
              colors={['#31429B']}
            />
          )}
        >
          {/* SECTION: User profile and ID card */}
          <View style={styles.profileCardWrapper}>
            <View style={styles.profileSection}>
              <TouchableOpacity style={styles.profileInfo} activeOpacity={0.8} onPress={openMenu}>
                <Image
                  source={{
                    uri: getAvatarUri(`${activeUserData?.first_name ?? ''} ${activeUserData?.last_name ?? ''}`.trim() || 'Alumni', activeUserData?.alumni_photo),
                  }}
                  style={styles.avatar}
                />
                <View>
                  <Text style={styles.greeting}>
                    Hi, {userData ? `${userData.first_name}` : 'Loading...'}!
                  </Text>
                  <Text style={styles.studentId}>
                    Student {userData ? userData.student_id_number : '...'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.bellIcon} onPress={openNotifications}>
                <View style={styles.bellIconInner}>
                  <Ionicons name="notifications" size={24} color="#00205B" />
                  {notificationCount > 0 ? (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.idSection}>
              <Pressable onPress={toggleIdCard}>
                <View style={styles.idCardPerspective}>
                  <Animated.View
                    style={[
                      styles.idCardFace,
                      styles.idCardFrontFace,
                      { transform: [{ perspective: 1000 }, { rotateY: frontRotateY }] },
                    ]}
                  >
                    <ImageBackground
                      source={require('../../assets/images/BlankID_Front 1.png')}
                      style={styles.idBackground}
                      imageStyle={styles.idBackgroundImage}
                      resizeMode="contain"
                    >
                      <Image
                        source={{
                          uri: getAvatarUri(`${userData?.first_name ?? ''} ${userData?.last_name ?? ''}`.trim() || 'Alumni', userData?.card_photo),
                        }}
                        style={styles.idPhoto}
                        resizeMode="cover"
                      />

                      <View style={styles.idCardContent}>
                        <Text style={styles.idName}>
                          {userData ? `${userData.first_name}\n${userData.last_name}`.toUpperCase() : 'LOADING...'}
                        </Text>
                        <Text style={styles.idCourse}>
                          {userData?.program ? userData.program.toUpperCase() : 'LOADING...'}
                        </Text>
                        <Text style={styles.idClass}>Class of {graduationYear}</Text>
                      </View>
                    </ImageBackground>
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.idCardFace,
                      styles.idCardBackFace,
                      { transform: [{ perspective: 1000 }, { rotateY: backRotateY }] },
                    ]}
                  >
                    <Image
                      source={require('../../assets/images/BlankID_Back 1.png')}
                      style={styles.idBackImage}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </View>
              </Pressable>
            </View>
          </View>

          {/* SECTION: What's New */}
          <View style={[styles.sectionContainer, styles.sectionInset, styles.sectionNudgeRight]}>
            <Text style={styles.sectionTitle}>What's New</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {isLoadingFeaturedEvents ? (
                <View style={[styles.promoLoadingCard, { width: layout.promoCardWidth, height: layout.promoCardHeight }]}>
                  <ActivityIndicator size="small" color="#31429B" />
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
          </View>

          {/* SECTION: Quick Links */}
          <View
            style={[
              styles.sectionContainer,
              styles.sectionInset,
              styles.sectionNudgeRight,
              styles.quickLinksSection,
              { marginBottom: layout.quickLinksOverlap },
            ]}
          >
            <Text style={styles.sectionTitle}>Quick Links</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickLinksScrollContent}
            >
              <TouchableOpacity style={[styles.quickLinkBox, { width: layout.quickLinkWidth }]} onPress={openViewYearbook}>
                <Image
                  source={require('../../assets/images/view-yearbook-icon.png')}
                  style={[styles.quickLinkIcon, { width: layout.quickLinkIconSize, height: layout.quickLinkIconSize }]}
                />
                <Text style={styles.quickLinkText}>View My{'\n'}Yearbook</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.quickLinkBox, { width: layout.quickLinkWidth }]} onPress={openEventsScreen}>
                <Image
                  source={require('../../assets/images/view-events-icon.png')}
                  style={[styles.quickLinkIcon, { width: layout.quickLinkIconSize, height: layout.quickLinkIconSize }]}
                />
                <Text style={styles.quickLinkText}>View{'\n'}Events</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.quickLinkBox, { width: layout.quickLinkWidth }]} onPress={openNUWebsite}>
                <Image
                  source={require('../../assets/images/nulogo.png')}
                  style={[styles.quickLinkIconNU, { width: layout.quickLinkIconNUSize, height: layout.quickLinkIconNUSize }]}
                />
                <Text style={styles.quickLinkText}>National-U{'\n'}Website</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

        </ScrollView>

        {/* SECTION: Side menu modal */}
        <Modal
          transparent
          visible={isMenuVisible}
          animationType="none"
          onRequestClose={closeMenu}
        >
          <View style={styles.sideMenuRoot}>
            <Pressable style={styles.sideMenuOverlay} onPress={closeMenu} />
            <Animated.View
              style={[
                styles.sideMenuContainer,
                { width: layout.menuWidth },
                { transform: [{ translateX: menuTranslateX }] }
              ]}
            >
              <View style={styles.sideMenuHeader}>
                <Text style={styles.sideMenuTitle}>Menu</Text>
                <TouchableOpacity onPress={closeMenu}>
                  <Ionicons name="close" size={34} color="#F2C919" />
                </TouchableOpacity>
              </View>

              <View style={styles.sideMenuAccent} />

              <View style={styles.sideMenuBody}>
                {menuItems.map((item) => (
                  <TouchableOpacity key={item.key} style={styles.menuItem} activeOpacity={0.8} onPress={item.onPress}>
                    <View style={styles.menuIconCircle}>
                      <Ionicons name={item.icon} size={22} color="#31429B" />
                    </View>
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

        {/* --- NOTIFICATIONS SIDE PANEL (slides in from right) --- */}
        <Modal
          animationType="none"
          transparent={true}
          visible={isNotifVisible}
          onRequestClose={closeNotifications}
        >
          <SafeAreaView style={[styles.modalOverlay, { alignItems: 'flex-end', justifyContent: 'flex-start' }]} edges={['top', 'bottom']}>
            <Animated.View
              style={[
                styles.modalSideContainer,
                { width: layout.notifWidth },
                { transform: [{ translateX: notifTranslateX }] }
              ]}
            >
              {/* Top Blue Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closeNotifications} style={styles.closeBtn}>
                  <Ionicons name="close" size={28} color="#F2C919" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Notifications</Text>
                <View style={styles.modalHeaderSpacer} />
              </View>

              {/* Yellow Accent Line */}
              <View style={styles.modalAccentLine} />

              {/* Notification List */}
              {isLoadingNotifications ? (
                <View style={styles.emptyNotifWrap}>
                  <ActivityIndicator size="small" color="#31429B" />
                  <Text style={styles.emptyNotifText}>Loading notifications...</Text>
                </View>
              ) : null}
              <FlatList
                data={notifData}
                keyExtractor={(item, index) => String(item?.id ?? index)}
                contentContainerStyle={styles.notifList}
                ListEmptyComponent={renderEmptyNotifications}
                renderItem={renderNotificationItem}
              />
            </Animated.View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import supabase from '../services/supabase';
import { getCurrentUser } from '../services/supabaseAuth';
import { getConversations, getUserGroupChats, getUnreadMessageCount } from '../services/messageQueries';
import { getFollowers, getFollowing } from '../services/connectionQueries';
import { getAvatarUri } from '../utils/imageUtils';
import { useCurrentUserProfile } from '../context/CurrentUserProfileContext';
import BrandHeader from '../components/BrandHeader';
import styles from '../styles/ChatScreen.styles';
// authStorage no longer used; Supabase auth is used instead
import { ThemedAlert } from '../components/ThemedAlert';

const CONTACTS_CACHE_TTL_MS = 15000;
let cachedContacts = null;
let cachedContactsLoadedAt = 0;

const getCachedContacts = () => {
	if (!cachedContacts) {
		return null;
	}

	if (Date.now() - cachedContactsLoadedAt > CONTACTS_CACHE_TTL_MS) {
		cachedContacts = null;
		cachedContactsLoadedAt = 0;
		return null;
	}

	return cachedContacts;
};

const TABS = [
	{ key: 'all', label: 'All Chats' },
	{ key: 'channels', label: 'Channels' },
	{ key: 'favorites', label: 'Favorites' },
];

const formatChatTimestamp = (value) => {
	if (!value) return '';

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	const now = new Date();
	const sameDay =
		now.getFullYear() === date.getFullYear()
		&& now.getMonth() === date.getMonth()
		&& now.getDate() === date.getDate();

	if (sameDay) {
		return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
	}

	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	const isYesterday =
		yesterday.getFullYear() === date.getFullYear()
		&& yesterday.getMonth() === date.getMonth()
		&& yesterday.getDate() === date.getDate();

	if (isYesterday) {
		return 'Yesterday';
	}

	return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const ChatScreen = ({ navigation }) => {
	const { currentUserProfile } = useCurrentUserProfile();
	// SECTION: Layout values
	const { width } = useWindowDimensions();
	const isCompactWidth = width < 375;
	const isTablet = width >= 768;
	const layout = {
		headerLogoWidth: isTablet ? 176 : isCompactWidth ? 124 : 146,
		headerLogoHeight: isTablet ? 44 : isCompactWidth ? 32 : 36,
		avatarSize: isTablet ? 46 : isCompactWidth ? 34 : 38,
		actionSize: isTablet ? 46 : isCompactWidth ? 38 : 40,
		contentPadding: isCompactWidth ? 14 : 16,
	};

	const [selectedTab, setSelectedTab] = useState('all');
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
	const tabAnimationValuesRef = useRef({
		all: new Animated.Value(1),
		channels: new Animated.Value(0),
		favorites: new Animated.Value(0),
	});
	const tabContentAnimation = useRef(new Animated.Value(1)).current;
	const shimmerProgress = useRef(new Animated.Value(-1)).current;

	useEffect(() => {
		const shimmerLoop = Animated.loop(
			Animated.timing(shimmerProgress, {
				toValue: 1,
				duration: 1300,
				easing: Easing.inOut(Easing.ease),
				useNativeDriver: true,
			})
		);

		shimmerLoop.start();

		return () => {
			shimmerLoop.stop();
			shimmerProgress.stopAnimation();
		};
	}, [shimmerProgress]);

	useEffect(() => {
		const tabAnimations = TABS.map((tab) => {
			const animationValue = tabAnimationValuesRef.current[tab.key];
			return Animated.timing(animationValue, {
				toValue: selectedTab === tab.key ? 1 : 0,
				duration: 180,
				easing: Easing.out(Easing.quad),
				useNativeDriver: true,
			});
		});

		Animated.parallel(tabAnimations).start();
	}, [selectedTab]);

	useEffect(() => {
		tabContentAnimation.setValue(0);
		Animated.timing(tabContentAnimation, {
			toValue: 1,
			duration: 220,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		}).start();
	}, [selectedTab, tabContentAnimation]);

	// HANDLER: Open the search screen
	const openSearchMessage = () => {
		const parentNavigator = navigation.getParent?.();

		if (parentNavigator?.navigate) {
			parentNavigator.navigate('SearchMessage');
			return;
		}

		navigation.navigate('SearchMessage');
	};

	// HANDLER: Open the new message screen
	const openNewMessage = () => {
		const parentNavigator = navigation.getParent?.();

		if (parentNavigator?.navigate) {
			parentNavigator.navigate('NewMessage');
			return;
		}

		navigation.navigate('NewMessage');
	};

	const openConversation = (contact) => {
		const contactName = `${contact?.first_name ?? ''} ${contact?.last_name ?? ''}`.trim() || 'Alumni';
		const contactAvatar = getAvatarUri(contactName, contact?.alumni_photo);
		const conversationId = contact?.id;

		// Track when this conversation was viewed
		setConversationViewTimestamps((prev) => ({
			...prev,
			[conversationId]: Date.now(),
		}));

		const parentNavigator = navigation.getParent?.();

		if (parentNavigator?.navigate) {
			parentNavigator.navigate('ConvoScreen', {
				contactId: contact?.id,
				contactName,
				contactAvatar,
			});
			return;
		}

		navigation.navigate('ConvoScreen', {
			contactId: contact?.id,
			contactName,
			contactAvatar,
		});
	};

	const openGroupConversation = (groupChat) => {
		const groupName = groupChat?.name ?? 'Group Chat';
		const groupAvatar = groupChat?.avatar_url
			? groupChat.avatar_url
			: `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=31429B&color=fff`;
		const groupMembers = Array.isArray(groupChat?.members) ? groupChat.members : [];
		const conversationId = groupChat?.id;

		// Track when this conversation was viewed
		setConversationViewTimestamps((prev) => ({
			...prev,
			[conversationId]: Date.now(),
		}));

		const parentNavigator = navigation.getParent?.();

		const conversationParams = {
			groupId: groupChat?.id,
			groupName,
			groupAvatar,
			groupMembers,
		};

		if (parentNavigator?.navigate) {
			parentNavigator.navigate('ConvoScreen', conversationParams);
			return;
		}

		navigation.navigate('ConvoScreen', conversationParams);
	};

		const loadChatData = useCallback(async () => {
			try {
				setIsLoadingChatData(true);
				setIsLoadingAdmins(true);
				// Use Supabase auth to get current user
				const supaUser = await getCurrentUser();

				if (!supaUser) {
					setUserData(null);
					setContacts([]);
					setGroupChats([]);
					return;
				}

				// Load conversations (direct messages) and group chats from the server so
				// unread badges clear as soon as the user has opened the conversation.
				const conversationsPromise = getConversations(supaUser.id);
				const groupChatsPromise = getUserGroupChats(supaUser.id).catch(() => []);
				const followingPromise = getFollowing(supaUser.id).catch(() => []);
				const followersPromise = getFollowers(supaUser.id).catch(() => []);
				const favoritesPromise = supabase
					.from('favorite_chats')
					.select('contact_id')
					.eq('user_id', supaUser.id);

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
					connectionsMap.set(contact.id, {
						id: contact.id,
						connection_id: contact.id,
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
					if (connectionsMap.has(contact.id)) return;
					connectionsMap.set(contact.id, {
						id: contact.id,
						connection_id: contact.id,
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
					const baseContact = connectionsMap.get(conversation.id) || {};
					connectionsMap.set(conversation.id, {
						...baseContact,
						...conversation,
						id: conversation.id,
						connection_id: conversation.connection_id ?? conversation.id,
						first_name: conversation.first_name ?? baseContact.first_name,
						last_name: conversation.last_name ?? baseContact.last_name,
						email: conversation.email ?? baseContact.email,
						alumni_photo: conversation.alumni_photo ?? baseContact.alumni_photo,
					});
				});

				const nextContacts = Array.from(connectionsMap.values());
				setContacts(nextContacts);
				// Initialize favorites from the new table
				try {
					const favoriteIds = (favoritesRes.data || []).map((row) => row.contact_id);
					setFavoriteContactIds(new Set(favoriteIds));
				} catch (e) {
					console.warn('[ChatScreen] Failed to map initial favorites', e);
				}
				const nextGroupChats = Array.isArray(groupChatsData) ? groupChatsData : [];
				setGroupChats(nextGroupChats);
				setAdmins([]); // no explicit admins table in Supabase schema by default
				cachedContacts = nextContacts;
				cachedContactsLoadedAt = Date.now();
			} catch (error) {
				console.error('Failed to fetch chat screen data:', error);
				setUserData(null);
				setContacts([]);
				setGroupChats([]);
			} finally {
				setIsLoadingChatData(false);
				setIsLoadingAdmins(false);
			}
		}, []);

	useFocusEffect(
		useCallback(() => {
			void loadChatData();
		}, [loadChatData])
	);

	// DERIVED VALUE: Display name
	const displayName = useMemo(() => {
		if (!userData) {
			return 'Alumni User';
		}
		return `${userData.first_name ?? ''}`.trim() || 'Alumni User';
	}, [userData]);

	// DERIVED VALUE: Avatar URI
	const avatarUri = useMemo(() => {
		return getAvatarUri(displayName, currentUserProfile?.alumni_photo ?? userData?.alumni_photo);
	}, [currentUserProfile?.alumni_photo, displayName, userData?.alumni_photo]);

	const sortChatsByLatestMessage = (chats) => {
		return chats.sort((firstItem, secondItem) => {
			const firstConversationId = firstItem?.group_chat_id ?? firstItem?.connection_id ?? firstItem?.id;
			const secondConversationId = secondItem?.group_chat_id ?? secondItem?.connection_id ?? secondItem?.id;

			const firstViewedAt = conversationViewTimestamps[firstConversationId] ?? 0;
			const secondViewedAt = conversationViewTimestamps[secondConversationId] ?? 0;

			const firstTimestamp = Math.max(
				firstViewedAt,
				new Date(
					firstItem?.updated_at
						?? firstItem?.latest_message?.created_at
						?? firstItem?.created_at
						?? 0
				).getTime()
			);

			const secondTimestamp = Math.max(
				secondViewedAt,
				new Date(
					secondItem?.updated_at
						?? secondItem?.latest_message?.created_at
						?? secondItem?.created_at
						?? 0
				).getTime()
			);

			return secondTimestamp - firstTimestamp;
		});
	};

	const activeChats = useMemo(() => {
		if (selectedTab === 'channels') {
			const channelChats = groupChats.map((groupChat) => ({ ...groupChat, __chatType: 'group' }));
			return sortChatsByLatestMessage(channelChats);
		}

		if (selectedTab === 'favorites') {
			const favoriteChats = contacts
				.filter((item) => favoriteContactIds.has(item?.id))
				.map((contact) => ({ ...contact, __chatType: 'contact', is_favorite: true }));
			return sortChatsByLatestMessage(favoriteChats);
		}

		const mergedChats = [
			...groupChats.map((groupChat) => ({ ...groupChat, __chatType: 'group' })),
			...contacts.map((contact) => ({
				...contact,
				__chatType: 'contact',
				is_favorite: favoriteContactIds.has(contact?.id),
			})),
		];

		return sortChatsByLatestMessage(mergedChats);
	}, [contacts, groupChats, selectedTab, favoriteContactIds, conversationViewTimestamps]);

	const tabCounts = useMemo(() => {
		const favoritesCount = contacts.filter((item) => favoriteContactIds.has(item?.id)).length;

		return {
			all: contacts.length + groupChats.length,
			channels: groupChats.length,
			favorites: favoritesCount,
		};
	}, [contacts, groupChats, favoriteContactIds]);

	const renderEmptyState = useCallback((title, description) => {
		return (
			<View style={styles.emptyWrap}>
				<Text style={styles.emptyTitle}>{title}</Text>
				<Text style={styles.emptyText}>{description}</Text>
			</View>
		);
	}, []);

	const shimmerTranslateStyle = useMemo(() => ({
		transform: [
			{
				translateX: shimmerProgress.interpolate({
					inputRange: [-1, 1],
					outputRange: [-220, 220],
				}),
			},
		],
	}), [shimmerProgress]);

	const getTabAnimatedStyle = useCallback((tabKey) => {
		const animationValue = tabAnimationValuesRef.current[tabKey];

		return {
			opacity: animationValue.interpolate({
				inputRange: [0, 1],
				outputRange: [0.9, 1],
			}),
			transform: [
				{
					scale: animationValue.interpolate({
						inputRange: [0, 1],
						outputRange: [0.98, 1],
					}),
				},
			],
		};
	}, []);

	const tabContentAnimatedStyle = useMemo(() => ({
		opacity: tabContentAnimation,
		transform: [
			{
				translateY: tabContentAnimation.interpolate({
					inputRange: [0, 1],
					outputRange: [8, 0],
				}),
			},
		],
	}), [tabContentAnimation]);

	const renderShimmerSkeleton = useCallback(() => (
		<View style={styles.skeletonListWrap}>
			{Array.from({ length: 6 }).map((_, index) => (
				<View key={`chat-skeleton-${index}`} style={styles.skeletonCard}>
					<View style={styles.skeletonAvatar} />
					<View style={styles.skeletonTextWrap}>
						<View style={styles.skeletonLinePrimary} />
						<View style={styles.skeletonLineSecondary} />
					</View>
					<View style={styles.skeletonTail} />
					<Animated.View pointerEvents="none" style={[styles.skeletonShimmer, shimmerTranslateStyle]} />
				</View>
			))}
		</View>
	), [shimmerTranslateStyle]);

	const renderContactItem = ({ item }) => {
		const contactName = `${item?.first_name ?? ''} ${item?.last_name ?? ''}`.trim() || 'Alumni';
		const contactAvatar = getAvatarUri(contactName, item?.alumni_photo);
		const unreadCount = Number(item?.unread_count ?? (item?.is_read === false ? 1 : 0));
		const latestMessage = item?.latest_message?.content || item?.last_message || item?.latest_message_text || 'Connected';
		const latestMessageTime =
			item?.latest_message?.created_at
			|| item?.last_message_at
			|| item?.updated_at
			|| item?.created_at;
		const messageTimestampLabel = formatChatTimestamp(latestMessageTime);

		const isFavorited = favoriteContactIds.has(item?.id);

		return (
			<Pressable
				style={({ pressed }) => [styles.contactCard, pressed ? styles.chatCardPressed : null]}
				onPress={() => openConversation(item)}
				onLongPress={() => {
					setModalContact(item);
					setIsActionModalVisible(true);
				}}
			>
				<Image source={{ uri: contactAvatar }} style={styles.contactAvatar} />
				<View style={styles.contactTextWrap}>
					<View style={styles.contactTopRow}>
						<Text style={styles.contactName} numberOfLines={1}>{contactName}</Text>
						{messageTimestampLabel ? (
							<Text style={styles.contactTimestamp} numberOfLines={1}>{messageTimestampLabel}</Text>
						) : null}
					</View>
					<Text style={styles.contactMeta} numberOfLines={1}>{latestMessage}</Text>
				</View>
				<View style={styles.contactRightWrap}>
					{unreadCount > 0 ? (
						<View style={styles.contactUnreadIndicator}>
							<Text style={styles.contactUnreadText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
						</View>
					) : null}
					{isFavorited ? (
						<Ionicons name="star" size={16} color="#F2C919" style={{ marginRight: 8 }} />
					) : null}
					<Ionicons name="chevron-forward" size={18} color="#8A94A6" />
				</View>
			</Pressable>
		);
	};

		const showContactActions = (contact) => {
			setModalContact(contact);
			setIsActionModalVisible(true);
		};

		const hideContactActions = () => {
			setIsActionModalVisible(false);
			setModalContact(null);
		};

		const handleArchive = async () => {
			hideContactActions();
			// console.log('Archive', modalContact?.id);
			try {
				// Best-effort: mark contact as archived in Supabase if table exists
				await supabase.from('contacts').update({ archived: true }).eq('id', modalContact?.id);
			} catch (e) {
				console.warn('[ChatScreen] Archive operation failed or contacts table missing', e?.message || e);
			}
		};

		const handleMute = async () => {
			hideContactActions();
			// console.log('Mute', modalContact?.id);
			try {
				await supabase.from('contacts').update({ muted: true }).eq('id', modalContact?.id);
			} catch (e) {
				console.warn('[ChatScreen] Mute operation failed or contacts table missing', e?.message || e);
			}
		};

		const handleCreateGroup = async () => {
			hideContactActions();
			const connectionName = `${modalContact?.first_name ?? ''} ${modalContact?.last_name ?? ''}`.trim() || 'Connection';
			// console.log('Create group with', connectionName);
			// Navigate to group creation screen with prefilled name/members if available
			const parentNavigator = navigation.getParent?.();
			const params = { prefillName: connectionName, members: [modalContact] };
			if (parentNavigator?.navigate) parentNavigator.navigate('CreateGroup', params);
			else navigation.navigate('CreateGroup', params);
		};

		const handleMarkUnread = async () => {
			hideContactActions();
			// console.log('Mark unread', modalContact?.id);
			try {
				// Best-effort: mark recent messages as unread for this contact
				// Attempt to find messages between current user and contact and mark them unread
				// If messages table/schema differs, this may no-op.
				// No-op fallback: warn.
				console.warn('[ChatScreen] mark-unread not implemented on Supabase; skipping');
			} catch (e) {
				console.warn('[ChatScreen] Mark unread operation failed', e?.message || e);
			}
		};

		const handleRestrict = async () => {
			hideContactActions();
			// console.log('Restrict', modalContact?.id);
			try {
				await supabase.from('contacts').update({ restricted: true }).eq('id', modalContact?.id);
			} catch (e) {
				console.warn('[ChatScreen] Restrict operation failed or contacts table missing', e?.message || e);
			}
		};

		const handleBlock = async () => {
			hideContactActions();
			// console.log('Block', modalContact?.id);
			try {
				await supabase.from('contacts').update({ blocked: true }).eq('id', modalContact?.id);
			} catch (e) {
				console.warn('[ChatScreen] Block operation failed or contacts table missing', e?.message || e);
			}
		};

		const handleDelete = async () => {
			ThemedAlert.alert('Delete conversation', 'Are you sure you want to delete this conversation?', [
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Delete', style: 'destructive', onPress: async () => {
					hideContactActions();
					// console.log('Delete', modalContact?.id);
					try {
						// Attempt to delete contact row from Supabase if table exists
						await supabase.from('contacts').delete().eq('id', modalContact?.id);
					} catch (e) {
						console.warn('[ChatScreen] Delete operation failed or contacts table missing', e?.message || e);
					}
				} }
			]);
		};

	const renderGroupChatItem = ({ item }) => {
		const groupName = item?.name ?? 'Group Chat';
		const groupAvatar = item?.avatar_url
			? item.avatar_url
			: `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=31429B&color=fff`;
		const latestMessage = item?.latest_message?.content ?? 'No messages yet';
		const memberCount = Array.isArray(item?.members) ? item.members.length : 0;
		const unreadCount = Number(item?.unread_count ?? 0);

		return (
			<Pressable
				style={({ pressed }) => [styles.groupCard, pressed ? styles.chatCardPressed : null]}
				onPress={() => openGroupConversation(item)}
				onLongPress={() => {
					setModalGroup(item);
					setIsGroupActionModalVisible(true);
				}}
			>
				<Image source={{ uri: groupAvatar }} style={styles.groupAvatar} />
				<View style={styles.groupTextWrap}>
					<View style={styles.groupTitleRow}>
						<Text style={styles.groupName} numberOfLines={1}>{groupName}</Text>
						{unreadCount > 0 ? (
							<View style={styles.groupUnreadPill}>
								<Text style={styles.groupUnreadText}>{unreadCount}</Text>
							</View>
						) : null}
					</View>
					<Text style={styles.groupMeta} numberOfLines={1}>{memberCount} members</Text>
					<Text style={styles.groupPreview} numberOfLines={1}>{latestMessage}</Text>
				</View>
				<View style={styles.contactRightWrap}>
					<Ionicons name="chevron-forward" size={18} color="#8A94A6" />
				</View>
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
			if (!userData?.id) {
				throw new Error('Missing current user id');
			}

			if (nextState) {
				const { error } = await supabase
					.from('favorite_chats')
					.insert({ user_id: userData.id, contact_id: contactId });

				if (error) throw error;
			} else {
				const { error } = await supabase
					.from('favorite_chats')
					.delete()
					.eq('user_id', userData.id)
					.eq('contact_id', contactId);

				if (error) throw error;
			}
		} catch (e) {
			console.warn('[ChatScreen] Failed to persist favorite state', e?.message || e);
			setFavoriteContactIds(prevSet);
		}
	};

		const hideGroupActions = () => {
			setIsGroupActionModalVisible(false);
			setModalGroup(null);
		};

		const handleArchiveGroup = async () => {
			hideGroupActions();
			console.log('Archive group', modalGroup?.id);
			try {
				await api.post(`/group-chats/${modalGroup?.id}/archive`);
			} catch (e) {
				console.warn('Archive group API failed', e?.message || e);
			}
		};

		const handleIgnoreGroup = async () => {
			hideGroupActions();
			console.log('Ignore group', modalGroup?.id);
			try {
				await api.post(`/group-chats/${modalGroup?.id}/ignore`);
			} catch (e) {
				console.warn('Ignore group API failed', e?.message || e);
			}
		};

		const handleAddMembers = () => {
			hideGroupActions();
			const parentNavigator = navigation.getParent?.();
			const params = { groupId: modalGroup?.id, prefillName: modalGroup?.name };
			if (parentNavigator?.navigate) parentNavigator.navigate('EditGroup', params);
			else navigation.navigate('EditGroup', params);
		};

		const handleMuteGroup = async () => {
			hideGroupActions();
			console.log('Mute group', modalGroup?.id);
			try {
				await api.post(`/group-chats/${modalGroup?.id}/mute`);
			} catch (e) {
				console.warn('Mute group API failed', e?.message || e);
			}
		};

		const handleMarkGroupUnread = async () => {
			hideGroupActions();
			console.log('Mark group unread', modalGroup?.id);
			try {
				await api.post(`/group-chats/${modalGroup?.id}/mark-unread`);
			} catch (e) {
				console.warn('Mark group unread API failed', e?.message || e);
			}
		};

		const handleLeaveGroup = async () => {
			ThemedAlert.alert('Leave group', 'Are you sure you want to leave this group?', [
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Leave', style: 'destructive', onPress: async () => {
					hideGroupActions();
					console.log('Leave group', modalGroup?.id);
					try {
						await api.post(`/group-chats/${modalGroup?.id}/leave`);
					} catch (e) {
						console.warn('Leave group API failed', e?.message || e);
					}
				} }
			]);
		};

		const handleDeleteGroup = async () => {
			ThemedAlert.alert('Delete group', 'Are you sure you want to delete this group?', [
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Delete', style: 'destructive', onPress: async () => {
					hideGroupActions();
					console.log('Delete group', modalGroup?.id);
					try {
						await api.delete(`/group-chats/${modalGroup?.id}`);
					} catch (e) {
						console.warn('Delete group API failed', e?.message || e);
					}
				} }
			]);
		};

	const renderAdminItem = ({ item }) => {
		const adminName = `${item?.admin_first_name ?? item?.first_name ?? ''} ${item?.admin_last_name ?? item?.last_name ?? ''}`.trim() || 'Admin';
		const adminAvatar = item?.photo || item?.admin_photo
			? (item.photo || item.admin_photo)
			: `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=31429B&color=fff`;

		return (
			<Pressable
				style={({ pressed }) => [styles.contactCard, pressed ? styles.chatCardPressed : null]}
				onPress={() => openConversation({ id: item?.id, first_name: item?.admin_first_name ?? item?.first_name, last_name: item?.admin_last_name ?? item?.last_name, alumni_photo: item?.photo ?? item?.admin_photo })}
				onLongPress={() => {
					setModalContact({ id: item?.id, first_name: item?.admin_first_name ?? item?.first_name, last_name: item?.admin_last_name ?? item?.last_name, alumni_photo: item?.photo ?? item?.admin_photo });
					setIsActionModalVisible(true);
				}}
			>
				<Image source={{ uri: adminAvatar }} style={styles.contactAvatar} />
				<View style={styles.contactTextWrap}>
					<Text style={styles.contactName} numberOfLines={1}>{adminName}</Text>
					<Text style={styles.contactMeta}>Admin</Text>
				</View>
				<View style={styles.contactRightWrap}>
					<Ionicons name="chevron-forward" size={18} color="#8A94A6" />
				</View>
			</Pressable>
		);
	};

	const getListEmptyComponent = useCallback(() => {
		if (isLoadingChatData) {
			return renderShimmerSkeleton();
		}

		if (selectedTab === 'channels') {
			return renderEmptyState('No group chats yet.', 'Create a group conversation and it will appear here.');
		}

		if (selectedTab === 'favorites') {
			return renderEmptyState('No favorites yet.', 'Mark a chat as a favorite to keep it here.');
		}

		return renderEmptyState('No contacts yet.', 'Accepted connections will appear here as chat contacts.');
	}, [isLoadingChatData, renderEmptyState, renderShimmerSkeleton, selectedTab]);

	const listData = activeChats;
	const renderItem = ({ item }) => {
		if (item?.__chatType === 'group') {
			return renderGroupChatItem({ item });
		}

		return renderContactItem({ item });
	};

	return (
		<SafeAreaView style={styles.safeArea} edges={['top']}>
			<View style={styles.container}>
				<BrandHeader />

				<View style={styles.contentWrap}>
					<View style={styles.userRow}>
						<View style={styles.userInfoRow}>
							<Image source={{ uri: avatarUri }} style={[styles.avatar, { width: layout.avatarSize, height: layout.avatarSize, borderRadius: layout.avatarSize / 2 }]} />
							<View style={styles.userTextWrap}>
								<Text style={styles.helloText}>Hello,</Text>
								<Text style={styles.nameText} numberOfLines={1}>
									{displayName}
								</Text>
							</View>
						</View>

						<View style={styles.actionsRow}>
							<TouchableOpacity
								style={[styles.circleAction, { width: layout.actionSize, height: layout.actionSize, borderRadius: layout.actionSize / 2 }]}
								onPress={openSearchMessage}
								activeOpacity={0.8}
							>
								<Ionicons name="search-outline" size={25} color="#31429B" />
							</TouchableOpacity>
							<TouchableOpacity style={[styles.circleAction, styles.composeAction, { width: layout.actionSize, height: layout.actionSize, borderRadius: layout.actionSize / 2 }]} onPress={openNewMessage} activeOpacity={0.8}>
								<Ionicons name="create-outline" size={20} color="#FFFFFF" />
							</TouchableOpacity>
						</View>
					</View>

							{/* Admin messaging quick access */}
							{isLoadingAdmins ? (
								<View style={styles.adminLoadingWrap}>
									<ActivityIndicator color="#31429B" />
								</View>
							) : admins && admins.length > 0 ? (
								admins.length === 1 ? (
									<Pressable
										style={({ pressed }) => [styles.contactCard, pressed ? styles.chatCardPressed : null]}
										onPress={() => openConversation({ id: admins[0]?.id, first_name: admins[0]?.admin_first_name ?? admins[0]?.first_name, last_name: admins[0]?.admin_last_name ?? admins[0]?.last_name, alumni_photo: admins[0]?.photo ?? admins[0]?.admin_photo })}
									>
										<Image source={{ uri: admins[0]?.photo ?? admins[0]?.admin_photo ?? `https://ui-avatars.com/api/?name=${encodeURIComponent((admins[0]?.admin_first_name ?? admins[0]?.first_name) || 'Admin')}&background=31429B&color=fff` }} style={styles.contactAvatar} />
										<View style={styles.contactTextWrap}>
											<Text style={styles.contactName} numberOfLines={1}>{`${admins[0]?.admin_first_name ?? admins[0]?.first_name ?? ''} ${admins[0]?.admin_last_name ?? admins[0]?.last_name ?? ''}`.trim() || 'Admin'}</Text>
											<Text style={styles.contactMeta}>Message Admin</Text>
										</View>
										<View style={styles.contactRightWrap}>
											<Ionicons name="chevron-forward" size={18} color="#8A94A6" />
										</View>
									</Pressable>
								) : (
									<FlatList
										data={admins}
										renderItem={renderAdminItem}
										keyExtractor={(item) => `admin-${String(item?.id)}`}
										showsVerticalScrollIndicator={false}
										contentContainerStyle={styles.listContent}
									/>
								)
							) : null}

							<View style={styles.segmentedWrap}>
						{TABS.map((tab) => {
							const isActive = selectedTab === tab.key;
							return (
								<Animated.View key={tab.key} style={[styles.segmentItemMotionWrap, getTabAnimatedStyle(tab.key)]}>
									<TouchableOpacity
										style={[styles.segmentItem, isActive && styles.segmentItemActive]}
										onPress={() => setSelectedTab(tab.key)}
										activeOpacity={0.9}
									>
										<View style={styles.segmentInnerRow}>
											<Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
												{tab.label}
											</Text>
											<View style={[styles.segmentCountPill, isActive && styles.segmentCountPillActive]}>
												<Text style={[styles.segmentCountText, isActive && styles.segmentCountTextActive]}>
													{tabCounts[tab.key] ?? 0}
												</Text>
											</View>
										</View>
									</TouchableOpacity>
								</Animated.View>
							);
						})}
					</View>

					<Animated.View style={[styles.listArea, tabContentAnimatedStyle]}>
						<FlatList
							data={listData}
							renderItem={renderItem}
							keyExtractor={(item) => `${item?.__chatType ?? 'chat'}-${String(item?.group_chat_id ?? item?.connection_id ?? item?.id)}`}
							showsVerticalScrollIndicator={false}
							contentContainerStyle={styles.listContent}
							refreshing={isLoadingChatData}
							onRefresh={loadChatData}
							ListEmptyComponent={getListEmptyComponent}
						/>
					</Animated.View>
				</View>
			</View>
				{/* Action modal for long-press on direct messages */}
					<Modal visible={isActionModalVisible} transparent animationType={'slide'} statusBarTranslucent={true} onRequestClose={hideContactActions}>
						<Pressable style={styles.modalOverlay} onPress={hideContactActions} />
						<View style={styles.actionSheetWrap} pointerEvents="box-none">
							<SafeAreaView style={styles.actionSheetSafeArea} edges={['bottom']}>
								<View style={styles.actionSheet}>
								<Text style={styles.actionSheetTitle}>{`${modalContact?.first_name ?? ''} ${modalContact?.last_name ?? ''}`.trim() || 'Conversation'}</Text>
								<Pressable style={styles.actionItem} onPress={() => handleToggleFavorite(modalContact?.id)}>
									<Ionicons name="star-outline" size={20} color="#F2C919" style={styles.actionIcon} />
									<Text style={[styles.actionText, styles.favoriteText]}>Favorite</Text>
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
									<Text style={styles.actionText}>{`Create group chat with '${(modalContact?.first_name ?? '')}'`}</Text>
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
								<Pressable style={[styles.actionItem, styles.destructiveAction]} onPress={handleDelete}>
									<Ionicons name="trash-outline" size={20} color="#DC2626" style={styles.actionIcon} />
									<Text style={[styles.actionText, styles.destructiveText]}>Delete</Text>
								</Pressable>
								</View>
							</SafeAreaView>
						</View>
					</Modal>
					{/* Group action modal for long-press on group chats */}
					<Modal visible={isGroupActionModalVisible} transparent animationType={'slide'} statusBarTranslucent={true} onRequestClose={hideGroupActions}>
						<Pressable style={styles.modalOverlay} onPress={hideGroupActions} />
						<View style={styles.actionSheetWrap} pointerEvents="box-none">
							<SafeAreaView style={styles.actionSheetSafeArea} edges={['bottom']}>
								<View style={styles.actionSheet}>
								<Text style={styles.actionSheetTitle}>{modalGroup?.name ?? 'Group Chat'}</Text>
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
								<Pressable style={[styles.actionItem, styles.destructiveAction]} onPress={handleLeaveGroup}>
									<Ionicons name="exit-outline" size={20} color="#DC2626" style={styles.actionIcon} />
									<Text style={[styles.actionText, styles.destructiveText]}>Leave group</Text>
								</Pressable>
								<Pressable style={[styles.actionItem, styles.destructiveAction]} onPress={handleDeleteGroup}>
									<Ionicons name="trash-outline" size={20} color="#DC2626" style={styles.actionIcon} />
									<Text style={[styles.actionText, styles.destructiveText]}>Delete</Text>
								</Pressable>
								</View>
							</SafeAreaView>
						</View>
					</Modal>
			</SafeAreaView>
		);
};

export default ChatScreen;

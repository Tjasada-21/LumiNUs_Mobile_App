import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, Image, Modal, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import HomeHeader from '../components/HomeHeader';
import CustomKeyboardView from '../components/CustomKeyboardView';
import styles from '../styles/UserFeedScreen.styles';
import { getCurrentUser } from '../services/supabase';
import { getAlumniByEmail } from '../services/alumniQueries';
import { getAvatarUri } from '../utils/imageUtils';
import { useCurrentUserProfile } from '../context/CurrentUserProfileContext';
import {
	getFeedPosts,
	getPostById,
	getPostComments,
	addComment,
	addReaction,
	removeReaction,
	createRepost,
	deletePost,
	updateComment,
	deleteComment,
	updatePost,
} from '../services/postQueries';
import supabase from '../services/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_ZOOM_SCALE = 2.5;
const VIEWER_IMAGE_WIDTH = SCREEN_WIDTH * 0.92;
const VIEWER_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.72;
const MENTION_PATTERN = /(@[a-zA-Z0-9_.-]+)/g;
const SWIPE_DISMISS_THRESHOLD = 100;

const extractMentionQuery = (value) => {
	const text = String(value ?? '');
	const match = text.match(/(^|\s)@([a-zA-Z0-9_.-]*)$/);
	if (!match) return null;
	const query = match[2] ?? '';
	const mentionStart = text.length - query.length - 1;
	return { query, mentionStart, mentionEnd: text.length };
};

const toMentionHandle = (firstName, lastName) => {
	const normalizedHandle = `${firstName ?? ''}_${lastName ?? ''}`
		.toLowerCase()
		.replace(/\s+/g, '_')
		.replace(/[^a-z0-9_.-]/g, '')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');
	return normalizedHandle || 'alumni';
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getTouchDistance = (touches) => {
	if (!touches || touches.length < 2) return 0;
	const [firstTouch, secondTouch] = touches;
	const deltaX = firstTouch.pageX - secondTouch.pageX;
	const deltaY = firstTouch.pageY - secondTouch.pageY;
	return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
};

const resolveFeedInteractionTarget = (post) => {
	if (!post) return { feedType: 'post', postId: null, announcementId: null, originalPostId: null };
	if (post.feed_type === 'announcement') return { feedType: 'announcement', postId: null, announcementId: post.id ?? null, originalPostId: null };
	if (post.feed_type === 'repost') {
		const originalPost = post.original_post ?? null;
		const originalPostId = originalPost?.id ?? post.original_post_id ?? post.post_id ?? null;
		return { feedType: 'repost', postId: originalPostId, announcementId: null, originalPostId };
	}
	return { feedType: 'post', postId: post.id ?? null, announcementId: null, originalPostId: post.id ?? null };
};

const getFeedItemTimestamp = (item) => {
	const rawValue = item?.created_at ?? item?.date_posted ?? item?.posted_at ?? item?.published_at ?? null;
	if (!rawValue) return 0;
	const timestamp = new Date(rawValue).getTime();
	return Number.isFinite(timestamp) ? timestamp : 0;
};

const getFeedJitter = (itemId, refreshNonce) => {
	const seed = `${String(itemId ?? '')}:${String(refreshNonce ?? 0)}`;
	let hash = 0;
	for (let index = 0; index < seed.length; index += 1) {
		hash = ((hash << 5) - hash) + seed.charCodeAt(index);
		hash |= 0;
	}
	return (Math.abs(hash) % 1000) / 1000;
};

const ZoomableViewer = ({
	images = [], initialIndex = 0, visible, post = null, viewerAuthorName = '', postAvatarUri = '',
	timeLabel = '', postVisibilityLabel = 'Public', reactionCount = 0, commentCount = 0, repostCount = 0,
	isReacted = false, onRequestClose, onAuthorPress, onReactionPress, onCommentPress, onRepostPress, onMenuPress,
}) => {
	const pagerRef = useRef(null);
	const scale = useRef(new Animated.Value(1)).current;
	const zoomedInRef = useRef(false);
	const lastTapRef = useRef(0);
	const pinchStartDistanceRef = useRef(0);
	const pinchStartScaleRef = useRef(1);
	const isPinchingRef = useRef(false);
	const resolvedImages = images.filter((image) => Boolean(image?.uri));

	useEffect(() => {
		if (!visible) {
			scale.setValue(1);
			zoomedInRef.current = false;
			return;
		}
		const clampedInitialIndex = clamp(initialIndex, 0, Math.max(resolvedImages.length - 1, 0));
		requestAnimationFrame(() => {
			pagerRef.current?.scrollTo({ x: clampedInitialIndex * SCREEN_WIDTH, y: 0, animated: false });
		});
	}, [initialIndex, resolvedImages.length, scale, visible]);

	const handleImageTap = () => {
		const now = Date.now();
		const isDoubleTap = now - lastTapRef.current < 300;
		lastTapRef.current = now;
		if (!isDoubleTap) return;
		const nextZoomedState = !zoomedInRef.current;
		zoomedInRef.current = nextZoomedState;
		Animated.spring(scale, { toValue: nextZoomedState ? MAX_ZOOM_SCALE : 1, useNativeDriver: true, bounciness: 4 }).start();
	};

	const handleTouchStart = (event) => {
		const touches = event.nativeEvent.touches ?? [];
		if (touches.length >= 2) {
			isPinchingRef.current = true;
			pinchStartDistanceRef.current = getTouchDistance(touches);
			scale.stopAnimation((currentScale) => { pinchStartScaleRef.current = currentScale; });
		}
	};

	const handleTouchMove = (event) => {
		const touches = event.nativeEvent.touches ?? [];
		if (touches.length >= 2) {
			const currentDistance = getTouchDistance(touches);
			const startDistance = pinchStartDistanceRef.current;
			if (!startDistance) { pinchStartDistanceRef.current = currentDistance; return; }
			const distanceScale = currentDistance / startDistance;
			const nextScale = clamp(pinchStartScaleRef.current * distanceScale, 1, MAX_ZOOM_SCALE);
			scale.setValue(nextScale);
			zoomedInRef.current = nextScale > 1;
		}
	};

	const handleTouchEnd = (event) => {
		const touches = event.nativeEvent.touches ?? [];
		if (touches.length < 2) {
			isPinchingRef.current = false;
			pinchStartDistanceRef.current = 0;
			pinchStartScaleRef.current = 1;
			if (!zoomedInRef.current) scale.setValue(1);
		}
	};

	if (!visible || resolvedImages.length === 0) return null;

	return (
		<Modal transparent visible={visible} animationType="fade" onRequestClose={onRequestClose}>
			<StatusBar barStyle="light-content" backgroundColor="#000000" translucent />
			<View style={styles.viewerBackdrop}>
				<Pressable style={StyleSheet.absoluteFillObject} onPress={onRequestClose} />
				<View style={styles.viewerContent}>
					<ScrollView
						ref={pagerRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
						style={styles.viewerPager} contentContainerStyle={styles.viewerScrollContent}
					>
						{resolvedImages.map((image, index) => {
							const imageKey = image?.uri ?? String(index);
							return (
								<View key={imageKey} style={styles.viewerScrollItem}>
									<View style={styles.viewerImageCard}>
										<Pressable
											style={styles.viewerImagePressable} onPress={handleImageTap}
											onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
											onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}
										>
											<Animated.Image
												source={{ uri: image.uri }}
												style={[styles.viewerImage, { transform: [{ scale }], width: VIEWER_IMAGE_WIDTH, height: VIEWER_IMAGE_HEIGHT }]}
												resizeMode="contain"
											/>
										</Pressable>
									</View>
								</View>
							);
						})}
					</ScrollView>

					{post ? (
						<View style={styles.viewerFooter} pointerEvents="box-none">
							<View style={styles.viewerAuthorCard}>
								<Pressable onPress={onAuthorPress} style={styles.viewerAuthorPressable} hitSlop={8}>
									<Image source={{ uri: postAvatarUri }} style={styles.viewerAuthorAvatar} />
								</Pressable>
								<View style={styles.viewerAuthorTextWrap}>
									<Pressable onPress={onAuthorPress} hitSlop={8}>
										<Text style={styles.viewerAuthorName}>{viewerAuthorName}</Text>
									</Pressable>
									<View style={styles.viewerAuthorMetaRow}>
										<Text style={styles.viewerAuthorMeta}>{timeLabel}</Text>
										<Text style={styles.viewerAuthorMetaSeparator}>•</Text>
										<Ionicons name="earth-outline" size={12} color="#FFFFFF" />
										<Text style={styles.viewerAuthorMeta}>{postVisibilityLabel}</Text>
									</View>
								</View>
							</View>
							{post.feed_type !== 'announcement' ? (
								<>
									<View style={styles.viewerActionsRow}>
										<Pressable style={styles.viewerActionButton} onPress={onReactionPress}>
											<Ionicons name={isReacted ? 'heart' : 'heart-outline'} size={18} color={isReacted ? '#EF4444' : '#FFFFFF'} />
											<Text style={styles.viewerActionLabel}>Like</Text>
										</Pressable>
										<Pressable style={styles.viewerActionButton} onPress={onCommentPress}>
											<Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
											<Text style={styles.viewerActionLabel}>Comment</Text>
										</Pressable>
										<Pressable style={styles.viewerActionButton} onPress={onRepostPress}>
											<Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
											<Text style={styles.viewerActionLabel}>Share</Text>
										</Pressable>
									</View>
									<View style={styles.viewerCountsRow}>
										<Text style={styles.viewerCountText}>{reactionCount} reactions</Text>
										<Text style={styles.viewerCountText}>{commentCount} comments</Text>
										<Text style={styles.viewerCountText}>{repostCount} shares</Text>
									</View>
								</>
							) : null}
						</View>
					) : null}

					<View style={styles.viewerTopBar} pointerEvents="box-none">
						<Pressable style={styles.viewerTopButton} onPress={onRequestClose} hitSlop={10}>
							<Ionicons name="close" size={26} color="#FFFFFF" />
						</Pressable>
						<Pressable style={styles.viewerTopButton} onPress={onMenuPress} hitSlop={10}>
							<Ionicons name="ellipsis-vertical" size={22} color="#FFFFFF" />
						</Pressable>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const UserFeedScreen = ({ navigation }) => {
	const { currentUserProfile } = useCurrentUserProfile();
	const [userData, setUserData] = useState(null);
	const [posts, setPosts] = useState([]);
	const [isLoadingPosts, setIsLoadingPosts] = useState(true);
	const [isRefreshingPosts, setIsRefreshingPosts] = useState(false);
	const [postImageRatios, setPostImageRatios] = useState({});
	const [viewerVisible, setViewerVisible] = useState(false);
	const [viewerImages, setViewerImages] = useState([]);
	const [viewerIndex, setViewerIndex] = useState(0);
	const [viewerPost, setViewerPost] = useState(null);
	const [feedError, setFeedError] = useState('');
	const [reactionPulsePostId, setReactionPulsePostId] = useState(null);
	const [commentsVisible, setCommentsVisible] = useState(false);
	const [activeCommentPost, setActiveCommentPost] = useState(null);
	const [replyingToComment, setReplyingToComment] = useState(null);
	const [editingComment, setEditingComment] = useState(null);
	const [commentDraft, setCommentDraft] = useState('');
	const [commentInputHeight, setCommentInputHeight] = useState(46);
	const [comments, setComments] = useState([]);
	const [commentsLoading, setCommentsLoading] = useState(false);
	const [commentsError, setCommentsError] = useState('');
	const [commentActionsVisible, setCommentActionsVisible] = useState(false);
	const [activeCommentActionComment, setActiveCommentActionComment] = useState(null);
	const [isCommentActionSaving, setIsCommentActionSaving] = useState(false);
	const [expandedCommentParents, setExpandedCommentParents] = useState({});
	const [expandedCaptions, setExpandedCaptions] = useState({});
	const [captionOverflowMap, setCaptionOverflowMap] = useState({});
	const [repostComposerVisible, setRepostComposerVisible] = useState(false);
	const [activeRepostPost, setActiveRepostPost] = useState(null);
	const [repostCaptionDraft, setRepostCaptionDraft] = useState('');
	const [postActionsVisible, setPostActionsVisible] = useState(false);
	const [activePostActionPost, setActivePostActionPost] = useState(null);
	const [isPostActionSaving, setIsPostActionSaving] = useState(false);
	const [isDeletingPost, setIsDeletingPost] = useState(false);
	const [themedAlertState, setThemedAlertState] = useState({ visible: false, title: '', message: '', actions: [] });
	const [connections, setConnections] = useState([]);
	const [feedSortMode, setFeedSortMode] = useState('relevant');
	const [feedRefreshNonce, setFeedRefreshNonce] = useState(0);
	const reactionPulseScale = useRef(new Animated.Value(1)).current;

	const postActionsTranslateY = useRef(new Animated.Value(0)).current;
	const repostComposerTranslateY = useRef(new Animated.Value(0)).current;
	const commentsTranslateY = useRef(new Animated.Value(0)).current;
	const postMediaTapTimeoutRef = useRef(null);
	const postMediaTapStateRef = useRef({ postKey: null, imageIndex: null });
	const postActionsSwipeStartRef = useRef(0);
	const postActionsInitialYRef = useRef(0);
	const repostComposerSwipeStartRef = useRef(0);
	const repostComposerInitialYRef = useRef(0);
	const commentsSwipeStartRef = useRef(0);
	const commentsInitialYRef = useRef(0);

	const applyRubberBandingOffset = (distance) => {
		const RESISTANCE_FACTOR = 0.3;
		if (distance <= 0) return distance;
		if (distance <= SWIPE_DISMISS_THRESHOLD) return distance;
		return SWIPE_DISMISS_THRESHOLD + (distance - SWIPE_DISMISS_THRESHOLD) * RESISTANCE_FACTOR;
	};

	const handlePostActionsSwipe = (evt) => {
		const currentY = evt.nativeEvent.pageY;
		if (postActionsSwipeStartRef.current === 0) { postActionsSwipeStartRef.current = currentY; postActionsInitialYRef.current = 0; }
		const distance = currentY - postActionsSwipeStartRef.current;
		postActionsTranslateY.setValue(applyRubberBandingOffset(distance));
		if (distance > SWIPE_DISMISS_THRESHOLD && distance > 0) { closePostActions(); postActionsSwipeStartRef.current = 0; }
	};

	const handleRepostComposerSwipe = (evt) => {
		const currentY = evt.nativeEvent.pageY;
		if (repostComposerSwipeStartRef.current === 0) { repostComposerSwipeStartRef.current = currentY; repostComposerInitialYRef.current = 0; }
		const distance = currentY - repostComposerSwipeStartRef.current;
		repostComposerTranslateY.setValue(applyRubberBandingOffset(distance));
		if (distance > SWIPE_DISMISS_THRESHOLD && distance > 0) { closeRepostComposer(); repostComposerSwipeStartRef.current = 0; }
	};

	const handleCommentsSwipe = (evt) => {
		const currentY = evt.nativeEvent.pageY;
		if (commentsSwipeStartRef.current === 0) { commentsSwipeStartRef.current = currentY; commentsInitialYRef.current = 0; }
		const distance = currentY - commentsSwipeStartRef.current;
		commentsTranslateY.setValue(applyRubberBandingOffset(distance));
		if (distance > SWIPE_DISMISS_THRESHOLD && distance > 0) { closeCommentsModal(); commentsSwipeStartRef.current = 0; }
	};

	const resetSwipeRefs = () => {
		postActionsSwipeStartRef.current = 0; repostComposerSwipeStartRef.current = 0; commentsSwipeStartRef.current = 0;
		Animated.spring(postActionsTranslateY, { toValue: 0, useNativeDriver: false }).start();
		Animated.spring(repostComposerTranslateY, { toValue: 0, useNativeDriver: false }).start();
		Animated.spring(commentsTranslateY, { toValue: 0, useNativeDriver: false }).start();
	};

	const repostMentionContext = useMemo(() => extractMentionQuery(repostCaptionDraft), [repostCaptionDraft]);
	const commentMentionContext = useMemo(() => extractMentionQuery(commentDraft), [commentDraft]);

	const mentionDirectory = useMemo(() => connections.map((connection) => {
		const name = `${connection?.first_name ?? ''} ${connection?.last_name ?? ''}`.trim() || 'Alumni';
		return {
			id: connection?.id, name,
			handle: toMentionHandle(connection?.first_name, connection?.last_name),
			avatar: getAvatarUri(name, connection?.alumni_photo),
		};
	}), [connections]);

	const repostMentionSuggestions = useMemo(() => {
		if (!repostMentionContext) return [];
		const query = repostMentionContext.query.toLowerCase();
		return mentionDirectory.filter((item) => (!query ? true : item.name.toLowerCase().includes(query) || item.handle.includes(query))).slice(0, 5);
	}, [mentionDirectory, repostMentionContext]);

	const commentMentionSuggestions = useMemo(() => {
		if (!commentMentionContext) return [];
		const query = commentMentionContext.query.toLowerCase();
		return mentionDirectory.filter((item) => (!query ? true : item.name.toLowerCase().includes(query) || item.handle.includes(query))).slice(0, 5);
	}, [commentMentionContext, mentionDirectory]);

	const closeThemedAlert = useCallback(() => setThemedAlertState((curr) => ({ ...curr, visible: false })), []);
	const showThemedAlert = useCallback(({ title, message, actions }) => {
		setThemedAlertState({ visible: true, title, message, actions: Array.isArray(actions) && actions.length > 0 ? actions : [{ text: 'OK' }] });
	}, []);
	const handleThemedAlertAction = (action) => { closeThemedAlert(); if (typeof action?.onPress === 'function') action.onPress(); };
	const openGlobalSearch = useCallback(() => navigation.navigate('GlobalSearch'), [navigation]);
	const openCreatePost = useCallback(() => navigation.navigate('CreatePostScreen'), [navigation]);

	const displayedPosts = useMemo(() => {
		const sourcePosts = Array.isArray(posts) ? [...posts] : [];
		if (feedSortMode === 'newest') return sourcePosts.sort((a, b) => getFeedItemTimestamp(b) - getFeedItemTimestamp(a));
		return sourcePosts.sort((a, b) => {
			const aScore = (Number(a?.relevance_score ?? 0) || 0) + (getFeedJitter(a?.id ?? a?.feed_id, feedRefreshNonce) * 0.08);
			const bScore = (Number(b?.relevance_score ?? 0) || 0) + (getFeedJitter(b?.id ?? b?.feed_id, feedRefreshNonce) * 0.08);
			if (bScore !== aScore) return bScore - aScore;
			return getFeedItemTimestamp(b) - getFeedItemTimestamp(a);
		});
	}, [feedRefreshNonce, feedSortMode, posts]);

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const supaUser = await getCurrentUser();
				if (!supaUser?.email) return;
				const profile = await getAlumniByEmail(supaUser.email).catch(() => null);
				setUserData(profile ?? null);
				try {
					const { getFollowing } = await import('../services/connectionQueries');
					const following = await getFollowing(profile?.id).catch(() => []);
					setConnections(Array.isArray(following) ? following.map((f) => f.followed ?? f) : []);
				} catch (e) { setConnections([]); }
			} catch (error) { console.error('Failed to fetch feed profile:', error); setConnections([]); }
		};
		fetchProfile();
	}, []);

	const fetchPosts = useCallback(async ({ showLoadingState = false } = {}) => {
		try {
			if (showLoadingState) setIsRefreshingPosts(true); else setIsLoadingPosts(true);
			setFeedError('');
			let currentUserId = null;
			let rawPosts = [];
			try {
				const supaUser = await getCurrentUser();
				const cachedAlumniId = userData?.id ?? currentUserProfile?.id ?? null;
				if (cachedAlumniId) currentUserId = cachedAlumniId;
				else if (supaUser?.email) {
					const profile = await getAlumniByEmail(supaUser.email).catch(() => null);
					currentUserId = profile?.id ?? null;
				}
				rawPosts = await getFeedPosts(currentUserId).catch(() => []);
			} catch (e) { rawPosts = []; }

			const mappedPosts = (rawPosts || []).map((post) => {
				const images = Array.isArray(post.images) && post.images.length > 0 ? post.images : Array.isArray(post.images_posts) ? post.images_posts.map((img) => ({
					...img, image_url: img.image_path ?? img.image_url ?? img.uri ?? null,
				})) : [];
				const author = post.alumnis ?? post.alumni ?? post.author ?? {};
				const authorId = author?.id ?? null;
				const isOwnedByCurrentUser = Boolean(currentUserId && authorId && String(authorId) === String(currentUserId));
				return { ...post, images, alumni: author, is_owner: isOwnedByCurrentUser, can_manage: isOwnedByCurrentUser };
			});
			setPosts(mappedPosts);
		} catch (error) {
			console.error('Failed to fetch feed posts:', error);
			setFeedError('Unable to load posts right now.');
		} finally {
			setIsLoadingPosts(false);
			setIsRefreshingPosts(false);
		}
	}, [currentUserProfile?.id, userData?.id]);

	useFocusEffect(useCallback(() => { fetchPosts(); }, [fetchPosts]));

	const renderPostAuthorName = (post) => {
		const source = post?.author ?? post?.alumni ?? {};
		return [source.first_name, source.middle_name, source.last_name].filter(Boolean).join(' ').trim() || 'Alumni';
	};

	const renderPostAvatarUri = (post) => {
		const source = post?.author ?? post?.alumni ?? {};
		return getAvatarUri(renderPostAuthorName(post), source.alumni_photo);
	};

	const getPostVisibilityLabel = (post) => {
		if (post?.is_draft) return 'Draft';
		const visibility = String(post?.visibility ?? 'public').toLowerCase();
		if (visibility === 'friends') return 'Friends';
		if (visibility === 'private') return 'Private';
		return 'Public';
	};

	const canManagePost = useCallback((post) => Boolean(
		post?.feed_type === 'post' && (post?.is_owner === true || post?.can_manage === true || (() => {
			const sourceAuthor = post?.alumni ?? post?.author ?? post?.alumnis ?? {};
			return Boolean(userData?.id && sourceAuthor?.id && String(sourceAuthor.id) === String(userData.id));
		})())
	), [userData?.id]);

	const canManageComment = useCallback((comment) => Boolean(
		userData?.id && (() => {
			const sourceAuthor = comment?.alumni ?? comment?.author ?? comment?.alumnis ?? {};
			return Boolean(sourceAuthor?.id && String(sourceAuthor.id) === String(userData.id));
		})()
	), [userData?.id]);

	const openPostActions = useCallback((post) => { setActivePostActionPost(post); setPostActionsVisible(true); }, []);
	const openCommentActions = useCallback((comment) => { setActiveCommentActionComment(comment); setCommentActionsVisible(true); }, []);
	const closePostActions = useCallback(() => { if (!isPostActionSaving) { setPostActionsVisible(false); setActivePostActionPost(null); } }, [isPostActionSaving]);
	const closeCommentActions = useCallback(() => { if (!isCommentActionSaving) { setCommentActionsVisible(false); setActiveCommentActionComment(null); } }, [isCommentActionSaving]);

	const handleReportPost = useCallback(async () => {
		if (!activePostActionPost?.id) return;
		setPostActionsVisible(false);
		try {
			try {
				await supabase.from('post_reports').insert([{ post_id: activePostActionPost.id, reason: 'Inappropriate' }]);
			} catch (e) { console.warn('Report failed', e); }
			showThemedAlert({ title: 'Reported', message: 'Thanks — the post has been reported.' });
		} catch (e) { showThemedAlert({ title: 'Error', message: 'Could not report the post.' }); }
	}, [activePostActionPost, showThemedAlert]);

	const handleMuteAuthor = useCallback(async () => {
		if (!activePostActionPost?.alumni?.id) return;
		setPostActionsVisible(false);
		try {
			try {
				const supaUser = await getCurrentUser();
				if (supaUser?.id) await supabase.from('muted_users').insert([{ user_id: supaUser.id, muted_user_id: activePostActionPost.alumni.id }]);
			} catch (e) { console.warn('Mute failed', e); }
			showThemedAlert({ title: 'Muted', message: 'You will no longer see posts from this user.' });
		} catch (e) { showThemedAlert({ title: 'Error', message: 'Could not mute the user.' }); }
	}, [activePostActionPost, showThemedAlert]);

	const handleHidePost = useCallback(async () => {
		if (!activePostActionPost?.id) return;
		setPostActionsVisible(false);
		setPosts((curr) => curr.filter((p) => !(p.feed_type === 'post' && p.id === activePostActionPost.id)));
		showThemedAlert({ title: 'Hidden', message: 'This post has been hidden.' });
	}, [activePostActionPost, showThemedAlert]);

	const handleCopyLink = useCallback(async () => {
		if (!activePostActionPost?.id) return;
		const linkBaseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
		const link = linkBaseUrl ? `${linkBaseUrl}/posts/${activePostActionPost.id}` : `post:${activePostActionPost.id}`;
		try {
			import('expo-clipboard').then((mod) => mod.setStringAsync(link));
			showThemedAlert({ title: 'Link copied', message: 'Post link copied to clipboard.' });
		} catch (e) { showThemedAlert({ title: 'Error', message: 'Could not copy link.' }); }
	}, [activePostActionPost, showThemedAlert]);

	const handleEditComment = useCallback(() => {
		if (!activeCommentActionComment?.id) return;
		setCommentActionsVisible(false);
		setEditingComment(activeCommentActionComment);
		setReplyingToComment(null);
		setCommentDraft(activeCommentActionComment.comment ?? activeCommentActionComment.body ?? activeCommentActionComment.text ?? '');
		setCommentsVisible(true);
	}, [activeCommentActionComment]);

	const handleDeleteCommentAction = useCallback(() => {
		if (!activeCommentActionComment?.id) return;
		showThemedAlert({
			title: 'Delete comment?', message: 'This action cannot be undone.',
			actions: [
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete', style: 'destructive', onPress: async () => {
						try {
							setIsCommentActionSaving(true);
							await deleteComment(activeCommentActionComment.id);
							setComments((curr) => curr.filter((c) => c.id !== activeCommentActionComment.id));
							setPosts((curr) => curr.map((p) => p.id === activeCommentPost?.id ? { ...p, comment_count: Math.max(0, (p.comment_count ?? 1) - 1) } : p));
							closeCommentActions();
						} catch (error) { showThemedAlert({ title: 'Delete failed', message: 'Unable to delete the comment right now.' }); }
						finally { setIsCommentActionSaving(false); }
					},
				},
			],
		});
	}, [activeCommentActionComment, activeCommentPost?.id, closeCommentActions, showThemedAlert]);

	const syncPostInFeed = useCallback((updatedPost) => {
		if (!updatedPost?.id) return;
		setPosts((curr) => curr.map((p) => p.feed_type === 'post' && p.id === updatedPost.id ? { ...p, caption: updatedPost.caption ?? p.caption, visibility: updatedPost.visibility ?? p.visibility, is_draft: typeof updatedPost.is_draft === 'boolean' ? updatedPost.is_draft : p.is_draft, images: Array.isArray(updatedPost.images) && updatedPost.images.length > 0 ? updatedPost.images : p.images } : p));
		setViewerPost((curr) => curr && curr.feed_type === 'post' && curr.id === updatedPost.id ? { ...curr, caption: updatedPost.caption ?? curr.caption, visibility: updatedPost.visibility ?? curr.visibility, is_draft: typeof updatedPost.is_draft === 'boolean' ? updatedPost.is_draft : curr.is_draft, images: Array.isArray(updatedPost.images) && updatedPost.images.length > 0 ? updatedPost.images : curr.images } : curr);
	}, []);

	const removePostFromFeed = useCallback((postId) => {
		setPosts((curr) => curr.filter((p) => !(p.feed_type === 'post' && p.id === postId)));
		setViewerPost((curr) => curr && curr.feed_type === 'post' && curr.id === postId ? null : curr);
		if (viewerPost?.feed_type === 'post' && viewerPost?.id === postId) { setViewerVisible(false); setViewerImages([]); setViewerIndex(0); }
	}, [viewerPost]);

	const updateActivePost = useCallback(async (payload, successTitle, successMessage) => {
		if (!activePostActionPost?.id || isPostActionSaving) return;
		try {
			setIsPostActionSaving(true);
			const updated = await updatePost(activePostActionPost.id, payload).catch((e) => { throw e; });
			syncPostInFeed(updated ?? { ...activePostActionPost, ...payload });
			setPostActionsVisible(false); setActivePostActionPost(null);
			showThemedAlert({ title: successTitle, message: successMessage });
		} catch (error) { showThemedAlert({ title: 'Update failed', message: 'Unable to update the post right now.' }); }
		finally { setIsPostActionSaving(false); }
	}, [activePostActionPost, isPostActionSaving, syncPostInFeed, showThemedAlert]);

	const handleEditActivePost = () => { if (activePostActionPost) { setPostActionsVisible(false); setActivePostActionPost(null); navigation.navigate('CreatePostScreen', { post: activePostActionPost }); } };
	const handleEditPostFromFeed = useCallback((post) => { if (!canManagePost(post)) { showThemedAlert({ title: 'Edit unavailable', message: 'You can only edit your own posts.' }); return; } navigation.navigate('CreatePostScreen', { post }); }, [canManagePost, navigation, showThemedAlert]);
	const handleToggleActivePostDraft = () => { if (activePostActionPost) updateActivePost({ is_draft: !activePostActionPost.is_draft }, activePostActionPost.is_draft ? 'Post published' : 'Draft saved', activePostActionPost.is_draft ? 'Your post is visible again.' : 'Your post was saved as a draft.'); };
	const handleChangeActivePostVisibility = (visibility) => updateActivePost({ visibility }, 'Visibility updated', `This post is now visible to ${getPostVisibilityLabel({ visibility })}.`);
	const handleDeleteActivePost = () => {
		if (!activePostActionPost) return;
		showThemedAlert({
			title: 'Delete post?', message: 'This action cannot be undone.',
			actions: [
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete', style: 'destructive', onPress: async () => {
						const postId = activePostActionPost.id;
						try {
							setPostActionsVisible(false); setActivePostActionPost(null); setIsDeletingPost(true);
							await deletePost(postId); removePostFromFeed(postId); showThemedAlert({ title: 'Post deleted', message: 'Your post has been removed.' });
						} catch (error) { showThemedAlert({ title: 'Delete failed', message: 'Unable to delete the post right now.' }); }
						finally { setIsDeletingPost(false); }
					},
				},
			],
		});
	};

	const getFeedItemKey = (post) => post?.feed_id ? post.feed_id : `${post?.feed_type ?? 'post'}-${post.id}`;

	const getRelativeTimeLabel = (dateValue) => {
		if (!dateValue) return '';
		const normalizedValue = typeof dateValue === 'string' ? (dateValue.includes('T') ? dateValue : dateValue.replace(' ', 'T')) : dateValue;
		const date = new Date(normalizedValue);
		if (Number.isNaN(date.getTime())) return '';
		const elapsedMs = Date.now() - date.getTime();
		const elapsedSeconds = Math.max(1, Math.floor(elapsedMs / 1000));
		const elapsedMinutes = Math.floor(elapsedSeconds / 60);
		const elapsedHours = Math.floor(elapsedMinutes / 60);
		const elapsedDays = Math.floor(elapsedHours / 24);

		if (elapsedSeconds < 60) return 'Just now';
		if (elapsedDays >= 7) return `${Math.floor(elapsedDays / 7)}w`;
		if (elapsedDays >= 1) return `${elapsedDays}d`;
		if (elapsedHours >= 1) return `${elapsedHours}h`;
		if (elapsedMinutes >= 1) return `${elapsedMinutes}m`;
		return 'Just now';
	};

	const getFeedItemDateValue = (item) => item?.created_at ?? item?.date_posted ?? item?.posted_at ?? item?.published_at ?? null;

	const isCaptionExpanded = useCallback((feedItemKey) => Boolean(expandedCaptions[feedItemKey]), [expandedCaptions]);
	const markCaptionOverflow = useCallback((feedItemKey, lineCount) => {
		setCaptionOverflowMap((curr) => {
			if (curr[feedItemKey] === lineCount) return curr;
			if (lineCount <= 3) { const next = { ...curr }; delete next[feedItemKey]; return next; }
			return { ...curr, [feedItemKey]: lineCount };
		});
	}, []);

	const handleCaptionMentionPress = useCallback((mentionText) => {
		const mentionHandle = String(mentionText ?? '').replace(/^@/, '').toLowerCase();
		if (!mentionHandle) return;
		const matchedConnection = mentionDirectory.find((item) => item.handle === mentionHandle);
		if (!matchedConnection?.id) { showThemedAlert({ title: 'Mention unavailable', message: `No profile found for @${mentionHandle}.` }); return; }
		if (matchedConnection.id === userData?.id) navigation.navigate('Profile'); else navigation.navigate('ProfileView', { userId: matchedConnection.id });
	}, [mentionDirectory, userData?.id, navigation, showThemedAlert]);

	const renderCaptionWithMentions = (caption, captionStyle) => {
		if (!caption) return null;
		const text = String(caption ?? '');
		const segments = text.split(MENTION_PATTERN);
		return segments.map((segment, index) => {
			const isMention = MENTION_PATTERN.test(segment);
			MENTION_PATTERN.lastIndex = 0;
			if (!isMention) return segment;
			return <Text key={`mention-${index}-${segment}`} style={[captionStyle, styles.captionMention]} onPress={() => handleCaptionMentionPress(segment)}>{segment}</Text>;
		});
	};

	const renderExpandableCaption = (feedItemKey, caption, captionStyle) => {
		if (!caption) return null;
		const CAPTION_COLLAPSED_LINES = 3;
		const isExpanded = isCaptionExpanded(feedItemKey);
		const hasOverflow = (captionOverflowMap[feedItemKey] ?? 0) > CAPTION_COLLAPSED_LINES;
		const shouldShowToggle = hasOverflow;

		return (
			<View style={styles.captionBlock}>
				<View style={styles.captionMeasureWrap} pointerEvents="none">
					<Text style={[captionStyle, styles.captionMeasureText]} onTextLayout={(e) => markCaptionOverflow(feedItemKey, e.nativeEvent.lines?.length ?? 0)}>
						{caption}
					</Text>
				</View>
				<Text style={captionStyle} numberOfLines={isExpanded ? undefined : CAPTION_COLLAPSED_LINES}>
					{renderCaptionWithMentions(caption, captionStyle)}
				</Text>
				{shouldShowToggle ? (
					<Pressable onPress={() => setExpandedCaptions((curr) => ({ ...curr, [feedItemKey]: !isExpanded }))} style={styles.readMoreButton}>
						<Text style={styles.readMoreText}>{isExpanded ? 'Show less' : 'Read more'}</Text>
					</Pressable>
				) : null}
			</View>
		);
	};

	const renderPostImageUri = (image) => {
		const raw = image?.image_url ?? image?.image_path ?? '';
		if (!raw) return '';
		if (/^https?:\/\//i.test(raw)) return raw;
		const SUPABASE_URL = 'https://pmnirrvwibzqjlutbnwz.supabase.co';
		return `${SUPABASE_URL}/storage/v1/object/public/luminus_assets/${String(raw).replace(/^\/+/, '')}`;
	};

	const getPostImageKey = (postId, image, imageIndex) => image.id ?? `${postId}-${imageIndex}`;

	const updatePostImageRatio = useCallback((imageKey, width, height) => {
		if (!width || !height) return;
		const nextRatio = width / height;
		setPostImageRatios((curr) => curr[imageKey] === nextRatio ? curr : { ...curr, [imageKey]: nextRatio });
	}, []);

	const renderPostImage = (postId, image, imageIndex, imageStyle) => (
		<Image
			source={{ uri: renderPostImageUri(image) }}
			style={[styles.postMediaImage, imageStyle]}
			resizeMode="cover"
			onLoad={(e) => { const { width, height } = e.nativeEvent.source; updatePostImageRatio(getPostImageKey(postId, image, imageIndex), width, height); }}
		/>
	);

	const renderOverlayCount = (remainingCount, onPress) => remainingCount <= 0 ? null : (
		<Pressable style={styles.postImageOverlay} onPress={onPress}>
			<Text style={styles.postImageOverlayText}>+{remainingCount}</Text>
		</Pressable>
	);

	const openImageViewer = (post, postImages, imageIndex) => { setViewerPost(post); setViewerImages(postImages.map((img) => ({ uri: renderPostImageUri(img) }))); setViewerIndex(imageIndex); setViewerVisible(true); };
	const closeImageViewer = () => { setViewerVisible(false); setViewerPost(null); };

	const handlePostComment = useCallback((post) => { setActiveCommentPost(post); setReplyingToComment(null); setCommentDraft(''); setComments([]); setCommentsError(''); setExpandedCommentParents({}); setCommentsVisible(true); }, []);
	const handleReplyToComment = useCallback((comment) => { setReplyingToComment(comment); setEditingComment(null); }, []);
	const closeCommentsModal = () => { setCommentsVisible(false); setActiveCommentPost(null); setReplyingToComment(null); setEditingComment(null); setCommentDraft(''); setCommentInputHeight(48); setExpandedCommentParents({}); };
	const handleCommentInputContentSizeChange = (e) => setCommentInputHeight(Math.max(48, Math.min(e?.nativeEvent?.contentSize?.height ?? 48, 100)));

	const resolveActiveAlumniId = useCallback(async () => {
		if (userData?.id) return userData.id;
		const authUser = await getCurrentUser();
		if (!authUser?.email) return null;
		const profile = await getAlumniByEmail(authUser.email).catch(() => null);
		return profile?.id ?? null;
	}, [userData?.id]);

	const handleSubmitComment = () => {
		const trimmedComment = commentDraft.trim();
		if (!trimmedComment || !activeCommentPost) return;
		const target = resolveFeedInteractionTarget(activeCommentPost);

		if (editingComment?.id) {
			const prevText = editingComment.comment ?? editingComment.body ?? editingComment.text ?? '';
			setComments((curr) => curr.map((c) => c.id === editingComment.id ? { ...c, comment: trimmedComment } : c));
			setEditingComment(null); setReplyingToComment(null); setCommentDraft(''); setCommentInputHeight(48);
			updateComment(editingComment.id, trimmedComment).then((saved) => { if (saved) setComments((curr) => curr.map((c) => c.id === saved.id ? saved : c)); }).catch((e) => {
				console.error('Update comment failed:', e);
				setComments((curr) => curr.map((c) => c.id === editingComment.id ? { ...c, comment: prevText } : c));
				showThemedAlert({ title: 'Comments', message: 'Unable to update your comment right now.' });
			});
			return;
		}

		const pendingId = `temp-${Date.now()}`;
		const pendingComment = { id: pendingId, comment: trimmedComment, parent_id: replyingToComment?.id ?? null, created_at: new Date().toISOString(), is_pending: true, alumni: { id: userData?.id, first_name: userData?.first_name, last_name: userData?.last_name, alumni_photo: userData?.alumni_photo } };
		setComments((curr) => ([pendingComment, ...curr]));
		setPosts((curr) => curr.map((p) => p.id === activeCommentPost.id ? { ...p, comment_count: (p.comment_count ?? 0) + 1 } : p));
		setViewerPost((curr) => curr?.id === activeCommentPost.id ? { ...curr, comment_count: (curr.comment_count ?? 0) + 1 } : curr);
		setReplyingToComment(null); setEditingComment(null); setCommentDraft(''); setCommentInputHeight(48);

		resolveActiveAlumniId().then((alumniId) => addComment(target.postId, alumniId, trimmedComment, pendingComment.parent_id, target.announcementId)).then((saved) => {
			if (!saved) return;
			setComments((curr) => curr.map((c) => c.id === pendingId ? saved : c));
			setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, comment_count: saved.comment_count ?? p.comment_count ?? 0 } : p));
			setViewerPost((curr) => String(resolveFeedInteractionTarget(curr).postId) === String(target.postId) ? { ...curr, comment_count: saved.comment_count ?? curr.comment_count ?? 0 } : curr);
		}).catch((e) => {
			console.error('Save comment failed:', e);
			setComments((curr) => curr.filter((c) => c.id !== pendingId));
			setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, comment_count: Math.max(0, (p.comment_count ?? 1) - 1) } : p));
			setViewerPost((curr) => String(resolveFeedInteractionTarget(curr).postId) === String(target.postId) ? { ...curr, comment_count: Math.max(0, (curr.comment_count ?? 1) - 1) } : curr);
			showThemedAlert({ title: 'Comments', message: 'Unable to post your comment right now.' });
		});
	};

	useEffect(() => {
		if (!commentsVisible || !activeCommentPost) return;
		let isMounted = true;
		const fetchComments = async () => {
			try {
				setCommentsLoading(true); setCommentsError('');
				const res = await getPostComments(activeCommentPost?.feed_type === 'announcement' ? null : activeCommentPost.id, 50, activeCommentPost?.feed_type === 'announcement' ? activeCommentPost.id : null);
				if (isMounted) setComments(res ?? []);
			} catch (e) { if (isMounted) { console.error('Fetch comments failed:', e); setCommentsError('Unable to load comments right now.'); } }
			finally { if (isMounted) setCommentsLoading(false); }
		};
		fetchComments();
		return () => { isMounted = false; };
	}, [activeCommentPost, commentsVisible]);

	const toggleCommentReplies = (id) => setExpandedCommentParents((curr) => ({ ...curr, [id]: !curr[id] }));
	const commentTree = useMemo(() => {
		const repliesByParentId = new Map();
		const topLevelComments = [];
		comments.forEach((c) => { if (c?.parent_id) { const reps = repliesByParentId.get(c.parent_id) ?? []; reps.push(c); repliesByParentId.set(c.parent_id, reps); } else topLevelComments.push(c); });
		const buildChildren = (p) => (repliesByParentId.get(p.id) ?? []).map((c) => ({ comment: c, replies: buildChildren(c) }));
		return topLevelComments.map((c) => ({ comment: c, replies: buildChildren(c) }));
	}, [comments]);

	const renderCommentNode = (thread, depth = 0, parentComment = null) => {
		const { comment, replies } = thread;
		const hasReplies = replies.length > 0;
		const isExpanded = Boolean(expandedCommentParents[comment.id]);
		const likeCount = comment?.like_count ?? comment?.reaction_count ?? comment?.likes_count ?? null;
		const isReply = depth > 0;
		const canToggleReplies = depth === 0;
		const repliesListStyle = canToggleReplies ? styles.commentRepliesList : styles.commentNestedRepliesList;
		const canManageThisComment = canManageComment(comment);

		return (
			<View key={`comment-${String(comment?.id ?? `${depth}-${parentComment?.id ?? 'root'}`)}`} style={styles.commentThread}>
				<View style={[styles.commentItem, isReply ? styles.commentItemReply : null]}>
					<Image source={{ uri: renderCommentAvatarUri(comment) }} style={styles.commentAvatar} />
					<View style={styles.commentContentColumn}>
						<View style={styles.commentReplyHeaderRow}>
							<Text style={styles.commentAuthorName}>{isReply ? (comment?.alumni?.first_name ?? 'Alumni') : renderCommentAuthorName(comment)}</Text>
							{isReply && parentComment ? <Text style={styles.commentReplyingToHandle} numberOfLines={1}>▸ {parentComment?.alumni?.first_name ?? 'Alumni'}</Text> : null}
						</View>
						<Text style={styles.commentText}>{comment.comment ?? comment.body ?? comment.text ?? ''}</Text>
						<View style={styles.commentMetaRow}>
							<Text style={styles.commentTimestamp}>{getRelativeTimeLabel(comment.created_at)}</Text>
							<Pressable style={styles.commentReplyButton} onPress={() => handleReplyToComment(comment)}>
								<Text style={styles.commentReplyButtonText}>Reply</Text>
							</Pressable>
						</View>
					</View>
					<View style={styles.commentActionColumn}>
						<Pressable style={styles.commentActionButton} onPress={() => openCommentActions(comment)} hitSlop={8}>
							<Ionicons name="ellipsis-vertical" size={14} color={canManageThisComment ? '#31429B' : '#94A3B8'} />
						</Pressable>
						{likeCount !== null ? <><Ionicons name="heart-outline" size={14} color="#94A3B8" /><Text style={styles.commentLikeCount}>{likeCount}</Text></> : null}
					</View>
				</View>
				{canToggleReplies && hasReplies && !isExpanded ? (
					<Pressable style={styles.viewRepliesRow} onPress={() => toggleCommentReplies(comment.id)}>
						<View style={styles.viewRepliesLine} /><Text style={styles.viewRepliesText}>View {replies.length} replies</Text><Ionicons name="chevron-down" size={13} color="#94A3B8" />
					</Pressable>
				) : null}
				{hasReplies && (canToggleReplies ? isExpanded : true) ? (
					<View style={repliesListStyle}>
						{replies.map((reply) => renderCommentNode(reply, depth + 1, comment))}
						{canToggleReplies ? (
							<Pressable style={styles.hideRepliesRow} onPress={() => toggleCommentReplies(comment.id)}>
								<View style={styles.viewRepliesLine} /><Text style={styles.hideRepliesText}>Hide replies</Text><Ionicons name="chevron-up" size={13} color="#31429B" />
							</Pressable>
						) : null}
					</View>
				) : null}
			</View>
		);
	};

	const renderCommentAuthorName = (c) => [c?.alumni?.first_name ?? '', c?.alumni?.last_name ?? ''].filter(Boolean).join(' ').trim() || 'Alumni';
	const renderCommentAvatarUri = (c) => getAvatarUri(renderCommentAuthorName(c), c?.alumni?.alumni_photo);

	const playReactionPulse = (postId) => {
		setReactionPulsePostId(postId);
		reactionPulseScale.stopAnimation(); reactionPulseScale.setValue(0.94);
		Animated.sequence([
			Animated.timing(reactionPulseScale, { toValue: 1.08, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
			Animated.spring(reactionPulseScale, { toValue: 1, tension: 140, friction: 14, useNativeDriver: true }),
		]).start(() => setReactionPulsePostId((curr) => curr === postId ? null : curr));
	};

	const handlePostReaction = async (post) => {
		playReactionPulse(post.id);
		const target = resolveFeedInteractionTarget(post);
		const nextReaction = post.my_reaction ? null : 'like';
		setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, my_reaction: nextReaction, reaction_count: Math.max(0, (p.reaction_count ?? 0) + (nextReaction ? 1 : -1)) } : p));
		setViewerPost((curr) => curr && String(resolveFeedInteractionTarget(curr).postId) === String(target.postId) ? { ...curr, my_reaction: nextReaction, reaction_count: Math.max(0, (curr.reaction_count ?? 0) + (nextReaction ? 1 : -1)) } : curr);

		try {
			const alumniId = await resolveActiveAlumniId();
			if (!alumniId) throw new Error('No alumni profile');
			if (nextReaction) await addReaction(target.postId, alumniId, 'like', target.announcementId);
			else await removeReaction(target.postId, alumniId, 'like', target.announcementId);
			if (target.postId) {
				const refreshed = await getPostById(target.postId, alumniId).catch(() => null);
				if (refreshed) setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, reaction_count: refreshed.reactions_count ?? p.reaction_count, my_reaction: nextReaction } : p));
			}
		} catch (e) {
			console.error('Reaction failed:', e);
			setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, my_reaction: post.my_reaction ?? null, reaction_count: post.reaction_count ?? 0 } : p));
		}
	};

	const handlePostRepost = async (post, caption = '') => {
		const target = resolveFeedInteractionTarget(post);
		const nextRepostState = !post.my_repost;
		setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, my_repost: nextRepostState, repost_count: Math.max(0, (p.repost_count ?? 0) + (nextRepostState ? 1 : -1)) } : p));

		try {
			const alumniId = await resolveActiveAlumniId();
			if (!alumniId) throw new Error('No alumni profile');
			if (nextRepostState) await createRepost(target.postId, alumniId, caption);
			else await supabase.from('reposts').delete().eq('post_id', target.postId).eq('alumni_id', alumniId);
			const refreshed = await getPostById(target.postId, alumniId).catch(() => null);
			if (refreshed) setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, repost_count: refreshed.reposts_count ?? p.repost_count, my_repost: nextRepostState } : p));
			return true;
		} catch (e) {
			console.error('Repost failed:', e);
			setPosts((curr) => curr.map((p) => String(resolveFeedInteractionTarget(p).postId) === String(target.postId) ? { ...p, my_repost: post.my_repost ?? false, repost_count: post.repost_count ?? 0 } : p));
			showThemedAlert({ title: 'Repost', message: 'Unable to repost right now. Please try again.' });
			return false;
		}
	};

	const handlePostMediaTap = useCallback((post, postImages, imageIndex) => {
		const postKey = getFeedItemKey(post);
		const sameTapTarget = postMediaTapStateRef.current.postKey === postKey && postMediaTapStateRef.current.imageIndex === imageIndex;
		if (postMediaTapTimeoutRef.current) { clearTimeout(postMediaTapTimeoutRef.current); postMediaTapTimeoutRef.current = null; }
		if (sameTapTarget) { postMediaTapStateRef.current = { postKey: null, imageIndex: null }; handlePostReaction(post); return; }
		postMediaTapStateRef.current = { postKey, imageIndex };
		postMediaTapTimeoutRef.current = setTimeout(() => { postMediaTapTimeoutRef.current = null; postMediaTapStateRef.current = { postKey: null, imageIndex: null }; openImageViewer(post, postImages, imageIndex); }, 220);
	}, [handlePostReaction]);

	useEffect(() => () => { if (postMediaTapTimeoutRef.current) { clearTimeout(postMediaTapTimeoutRef.current); postMediaTapTimeoutRef.current = null; } }, []);

	const openRepostComposer = (post) => {
		if (post?.my_repost) {
			showThemedAlert({ title: 'Remove repost?', message: 'This will remove your repost from the feed.', actions: [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => handlePostRepost(post) }] });
			return;
		}
		setActiveRepostPost(post); setRepostCaptionDraft(''); setRepostComposerVisible(true);
	};
	const closeRepostComposer = () => { setRepostComposerVisible(false); setActiveRepostPost(null); setRepostCaptionDraft(''); };
	const submitRepostWithCaption = () => { if (activeRepostPost) { closeRepostComposer(); handlePostRepost(activeRepostPost, repostCaptionDraft.trim()); } };
	const handleRepostMentionPick = (handle) => { if (repostMentionContext) setRepostCaptionDraft((curr) => `${String(curr ?? '').slice(0, repostMentionContext.mentionStart)}@${handle} ${String(curr ?? '').slice(repostMentionContext.mentionEnd)}`); };
	const handleCommentMentionPick = (handle) => { if (commentMentionContext) setCommentDraft((curr) => `${String(curr ?? '').slice(0, commentMentionContext.mentionStart)}@${handle} ${String(curr ?? '').slice(commentMentionContext.mentionEnd)}`); };

	const renderPressableImage = (post, postImages, image, imageIndex, imageStyle) => (
		<Pressable style={styles.postImagePressable} onPress={() => handlePostMediaTap(post, postImages, imageIndex)}>
			{renderPostImage(post?.id ?? imageIndex, image, imageIndex, imageStyle)}
		</Pressable>
	);

	const renderPostImageLayout = (post, postId, postImages) => {
		if (postImages.length === 1) return <View style={[styles.postSingleImageWrap, { aspectRatio: postImageRatios[getPostImageKey(postId, postImages[0], 0)] ?? 1.2 }]}>{renderPressableImage(post, postImages, postImages[0], 0, styles.postSingleImage)}</View>;
		if (postImages.length === 2) return <View style={styles.postTwoGrid}><View style={[styles.postTwoPrimaryTile, { aspectRatio: postImageRatios[getPostImageKey(postId, postImages[0], 0)] ?? 1.05 }]}>{renderPressableImage(post, postImages, postImages[0], 0, styles.postCollageImage)}</View><View style={[styles.postTwoSecondaryTile, { aspectRatio: postImageRatios[getPostImageKey(postId, postImages[1], 1)] ?? 0.95 }]}>{renderPressableImage(post, postImages, postImages[1], 1, styles.postCollageImage)}</View></View>;
		if (postImages.length === 3) return <View style={styles.postThreeCollage}><View style={styles.postThreeLeftTile}>{renderPressableImage(post, postImages, postImages[0], 0, styles.postCollageImage)}</View><View style={styles.postThreeRightColumn}><View style={styles.postThreeRightTile}>{renderPressableImage(post, postImages, postImages[1], 1, styles.postCollageImage)}</View><View style={styles.postThreeRightTile}>{renderPressableImage(post, postImages, postImages[2], 2, styles.postCollageImage)}</View></View></View>;
		if (postImages.length === 4) return <View style={styles.postFourGrid}>{postImages.slice(0, 4).map((image, idx) => <View key={getPostImageKey(postId, image, idx)} style={styles.postFourGridTile}>{renderPressableImage(post, postImages, image, idx, styles.postCollageImage)}</View>)}</View>;
		const remainingCount = Math.max(postImages.length - 4, 0);
		return <View style={styles.postFivePlusGrid}>{postImages.slice(0, 4).map((image, idx) => <View key={getPostImageKey(postId, image, idx)} style={styles.postFivePlusTile}>{renderPressableImage(post, postImages, image, idx, styles.postCollageImage)}{idx === 3 ? renderOverlayCount(remainingCount, () => openImageViewer(post, postImages, idx)) : null}</View>)}</View>;
	};

	const handleRefreshPosts = () => { setFeedRefreshNonce((curr) => curr + 1); fetchPosts({ showLoadingState: true }); };
	const activePostActionVisibilityLabel = getPostVisibilityLabel(activePostActionPost);

	// Shared logic for rendering a single post (used for normal posts and nested original posts)
	const renderSinglePostContent = (postObj, isNested = false) => {
		const postAuthorName = renderPostAuthorName(postObj);
		const avatarUri = renderPostAvatarUri(postObj);
		const postImages = postObj.images ?? [];
		const isAnnouncement = postObj.feed_type === 'announcement';

		const gradYear = postObj.alumni?.batch || postObj.alumni?.grad_year || '2023';
		const program = postObj.alumni?.program || postObj.alumni?.course || 'BSIT';
		const timeStr = getRelativeTimeLabel(getFeedItemDateValue(postObj));
		const visibility = getPostVisibilityLabel(postObj);

		return (
			<>
				{isAnnouncement ? (
					<View style={styles.postHeader}>
						<Image source={require('../../assets/images/nu-lipa-logo-portrait-white-version-21.png')} style={styles.announcementAvatar} resizeMode="contain" />
						<View style={styles.postHeaderTextWrap}>
							<Text style={styles.postAuthorName}>NU LIPA ALUMNI AFFAIRS</Text>
							<Text style={styles.postMeta}>{timeStr} • Admin</Text>
						</View>
					</View>
				) : (
					<View style={styles.postHeader}>
						<Pressable onPress={() => { if (postObj.alumni?.id === userData?.id) navigation.navigate('Profile'); else navigation.navigate('ProfileView', { userId: postObj.alumni?.id }); }}>
							<Image source={{ uri: avatarUri }} style={styles.postAvatar} />
						</Pressable>
						<View style={styles.postHeaderTextWrap}>
							<Pressable onPress={() => { if (postObj.alumni?.id === userData?.id) navigation.navigate('Profile'); else navigation.navigate('ProfileView', { userId: postObj.alumni?.id }); }}>
								<Text style={styles.postAuthorName} numberOfLines={1}>{postAuthorName}</Text>
							</Pressable>
							<Text style={styles.postMeta}>
								Class of {gradYear} | {program} | {timeStr} • <Ionicons name="globe-outline" size={10} color="#6B7280" /> {visibility}
							</Text>
						</View>
						{!isNested && (
							<Pressable style={styles.postMenuButton} onPress={() => openPostActions(postObj)} hitSlop={8}>
								<Ionicons name="ellipsis-horizontal" size={20} color="#1F2937" />
							</Pressable>
						)}
					</View>
				)}

				{isAnnouncement ? (
					<>
						{postObj.announcement_title ? <Text style={styles.announcementTitle}>{postObj.announcement_title}</Text> : null}
						{renderExpandableCaption(getFeedItemKey(postObj), postObj.announcement_description, styles.postCaption)}
					</>
				) : renderExpandableCaption(getFeedItemKey(postObj), postObj.caption, styles.postCaption)}

				{postImages.length > 0 ? renderPostImageLayout(postObj, postObj.id, postImages) : null}

				{!isNested && (
					<View style={styles.postReactionRow}>
						<Pressable style={styles.postActionButton} onPress={() => handlePostReaction(postObj)}>
							<Ionicons name={postObj.my_reaction ? 'heart' : 'heart-outline'} size={22} color={postObj.my_reaction ? '#EF4444' : '#31429B'} />
							<Text style={styles.postActionCount}>{postObj.reaction_count ?? 0}</Text>
						</Pressable>
						<Pressable style={styles.postActionButton} onPress={() => handlePostComment(postObj)}>
							<Ionicons name="chatbubble-outline" size={20} color="#31429B" />
							<Text style={styles.postActionCount}>{postObj.comment_count ?? 0}</Text>
						</Pressable>
						{!isAnnouncement && (
							<Pressable style={styles.postActionButton} onPress={() => openRepostComposer(postObj)}>
								<Ionicons name="repeat" size={22} color={postObj.my_repost ? '#15803D' : '#31429B'} />
								<Text style={styles.postActionCount}>{postObj.repost_count ?? 0}</Text>
							</Pressable>
						)}
					</View>
				)}
			</>
		);
	};

	return (
			<View style={styles.container}>
				<HomeHeader />

				<View style={styles.searchContainer}>
					<Pressable style={styles.searchBar} onPress={openGlobalSearch}>
						<Ionicons name="search-outline" size={20} color="#888888" style={styles.searchIcon} />
						<Text style={styles.searchPlaceholderText}>Search</Text>
					</Pressable>

					{/* NEW CREATE POST BUTTON */}
					<Pressable style={styles.createPostButton} onPress={openCreatePost}>
						<Ionicons name="create" size={22} color="#333333" style={styles.createPostIcon} />
						<Text style={styles.createPostText}>Create New Post</Text>
					</Pressable>
				</View>

				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.content}
					refreshControl={
						<RefreshControl refreshing={isRefreshingPosts} onRefresh={handleRefreshPosts} tintColor="#31429B" colors={['#31429B']} />
					}
				>
					{isLoadingPosts ? (
						<View style={styles.feedStateCard}>
							<ActivityIndicator size="small" color="#31429B" />
							<Text style={styles.feedStateText}>Loading posts...</Text>
						</View>
					) : feedError ? (
						<View style={styles.feedStateCard}>
							<Ionicons name="alert-circle-outline" size={22} color="#B42318" />
							<Text style={styles.feedStateText}>{feedError}</Text>
						</View>
					) : posts.length === 0 ? (
						<View style={styles.feedStateCard}>
							<Ionicons name="chatbubble-ellipses-outline" size={22} color="#8A94A6" />
							<Text style={styles.feedStateText}>No posts yet.</Text>
						</View>
					) : (
						<View>
							{displayedPosts.map((post) => {
								const isRepostFeedItem = post.feed_type === 'repost';
								const originalPost = post.original_post ?? null;
								
								// Repost Wrapper UI
								if (isRepostFeedItem && originalPost) {
									const reposterName = renderPostAuthorName(post);
									const reposterAvatar = renderPostAvatarUri(post);
									return (
										<View key={getFeedItemKey(post)} style={styles.repostWrapper}>
											<View style={styles.repostBanner}>
												<Image source={{ uri: reposterAvatar }} style={styles.repostBannerAvatar} />
												<Text style={styles.repostBannerText} numberOfLines={1}>
													<Text style={styles.repostBannerName}>{reposterName}</Text> reposted this.
												</Text>
											</View>
											<View style={styles.repostInnerCard}>
												{renderSinglePostContent(originalPost, true)}
												
												{/* Action row at the bottom of the white inner card for the repost itself */}
												<View style={styles.postReactionRow}>
													<Pressable style={styles.postActionButton} onPress={() => handlePostReaction(post)}>
														<Ionicons name={post.my_reaction ? 'heart' : 'heart-outline'} size={22} color={post.my_reaction ? '#EF4444' : '#31429B'} />
														<Text style={styles.postActionCount}>{post.reaction_count ?? 0}</Text>
													</Pressable>
													<Pressable style={styles.postActionButton} onPress={() => handlePostComment(post)}>
														<Ionicons name="chatbubble-outline" size={20} color="#31429B" />
														<Text style={styles.postActionCount}>{post.comment_count ?? 0}</Text>
													</Pressable>
													<Pressable style={styles.postActionButton} onPress={() => openRepostComposer(post)}>
														<Ionicons name="repeat" size={22} color={post.my_repost ? '#15803D' : '#31429B'} />
														<Text style={styles.postActionCount}>{post.repost_count ?? 0}</Text>
													</Pressable>
												</View>
											</View>
										</View>
									);
								}

								// Normal Post UI
								return (
									<View key={getFeedItemKey(post)} style={styles.postCard}>
										{renderSinglePostContent(post)}
									</View>
								);
							})}
						</View>
					)}
					<View style={styles.emptySpace} />
				</ScrollView>

				<ZoomableViewer
					images={viewerImages} initialIndex={viewerIndex} visible={viewerVisible} post={viewerPost}
					viewerAuthorName={viewerPost ? renderPostAuthorName(viewerPost) : ''}
					postAvatarUri={viewerPost ? renderPostAvatarUri(viewerPost) : ''}
					timeLabel={viewerPost ? getRelativeTimeLabel(getFeedItemDateValue(viewerPost)) : ''}
					postVisibilityLabel={viewerPost ? getPostVisibilityLabel(viewerPost) : 'Public'}
					reactionCount={viewerPost?.reaction_count ?? 0} commentCount={viewerPost?.comment_count ?? 0} repostCount={viewerPost?.repost_count ?? 0}
					isReacted={Boolean(viewerPost?.my_reaction)} onRequestClose={closeImageViewer}
					onAuthorPress={() => { if (!viewerPost?.alumni?.id) return; if (viewerPost.alumni.id === userData?.id) navigation.navigate('Profile'); else navigation.navigate('ProfileView', { userId: viewerPost.alumni.id }); }}
					onReactionPress={() => (viewerPost ? handlePostReaction(viewerPost) : null)} onCommentPress={() => (viewerPost ? handlePostComment(viewerPost) : null)}
					onRepostPress={() => (viewerPost ? openRepostComposer(viewerPost) : null)}
					onMenuPress={() => { if (canManagePost(viewerPost)) { openPostActions(viewerPost); return; } showThemedAlert({ title: 'Image options', message: 'More image actions are not available yet.', actions: [{ text: 'OK' }] }); }}
				/>

				<Modal transparent visible={postActionsVisible} animationType="slide" statusBarTranslucent={true} onRequestClose={closePostActions}>
					<View style={styles.postActionsBackdrop}>
						<SafeAreaView style={styles.postActionsSafeArea} edges={['bottom']}>
							<Animated.View style={[styles.postActionsCard, { transform: [{ translateY: postActionsTranslateY }] }]} onTouchMove={handlePostActionsSwipe} onTouchEnd={() => { resetSwipeRefs(); }}>
							<View style={{ height: 4, width: 40, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 4 }} />
							<View style={styles.postActionsHeader}>
								<Text style={styles.postActionsTitle}>{canManagePost(activePostActionPost) ? 'Manage Your Post' : 'Post Options'}</Text>
								<Pressable style={styles.postActionsCloseButton} onPress={closePostActions} hitSlop={8} disabled={isPostActionSaving}><Ionicons name="close" size={20} color="#31429B" /></Pressable>
							</View>
							{canManagePost(activePostActionPost) ? (
								<>
									<Text style={styles.postActionsSubtitle}>{activePostActionVisibilityLabel}. Edit the post, save it as a draft, change who can view it, or delete it.</Text>
									<View style={styles.postActionsRow}>
										<Pressable style={styles.postActionChoiceButton} onPress={handleEditActivePost} disabled={isPostActionSaving}><Ionicons name="create-outline" size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>Edit</Text></Pressable>
										<Pressable style={styles.postActionChoiceButton} onPress={handleToggleActivePostDraft} disabled={isPostActionSaving}><Ionicons name={activePostActionPost?.is_draft ? 'cloud-upload-outline' : 'bookmark-outline'} size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>{activePostActionPost?.is_draft ? 'Publish' : 'Draft'}</Text></Pressable>
									</View>
									<Text style={styles.postActionsLabel}>Who can view this post?</Text>
									<View style={styles.postVisibilityChoicesRow}>
										{['public', 'friends', 'private'].map((vis) => {
											const isSelected = (activePostActionPost?.visibility ?? 'public') === vis;
											return <Pressable key={vis} style={[styles.postVisibilityChoice, isSelected && styles.postVisibilityChoiceSelected]} onPress={() => handleChangeActivePostVisibility(vis)} disabled={isPostActionSaving}><Text style={styles.postVisibilityChoiceText}>{getPostVisibilityLabel({ visibility: vis })}</Text></Pressable>;
										})}
									</View>
									<Pressable style={styles.postDeleteButton} onPress={handleDeleteActivePost} disabled={isPostActionSaving}><Ionicons name="trash-outline" size={16} color="#B42318" /><Text style={styles.postDeleteButtonText}>Delete Post</Text></Pressable>
								</>
							) : (
								<>
									<Text style={styles.postActionsSubtitle}>Actions for this post</Text>
									<View style={styles.postActionsRow}>
										<Pressable style={styles.postActionChoiceButton} onPress={handleReportPost}><Ionicons name="flag-outline" size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>Report</Text></Pressable>
										<Pressable style={styles.postActionChoiceButton} onPress={handleMuteAuthor}><Ionicons name="volume-mute-outline" size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>Mute user</Text></Pressable>
									</View>
									<View style={styles.postActionsRow}>
										<Pressable style={styles.postActionChoiceButton} onPress={handleHidePost}><Ionicons name="eye-off-outline" size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>Hide post</Text></Pressable>
										<Pressable style={styles.postActionChoiceButton} onPress={handleCopyLink}><Ionicons name="link-outline" size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>Copy link</Text></Pressable>
									</View>
								</>
							)}
						</Animated.View>
						</SafeAreaView>
					</View>
				</Modal>

				<Modal transparent visible={commentActionsVisible} animationType="slide" statusBarTranslucent={true} onRequestClose={closeCommentActions}>
					<View style={styles.postActionsBackdrop}>
						<SafeAreaView style={styles.postActionsSafeArea} edges={['bottom']}>
							<View style={styles.postActionsCard}>
								<View style={{ height: 4, width: 40, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 4 }} />
								<View style={styles.postActionsHeader}>
									<Text style={styles.postActionsTitle}>{canManageComment(activeCommentActionComment) ? 'Manage Comment' : 'Comment Options'}</Text>
									<Pressable style={styles.postActionsCloseButton} onPress={closeCommentActions} hitSlop={8} disabled={isCommentActionSaving}><Ionicons name="close" size={20} color="#31429B" /></Pressable>
								</View>
								{canManageComment(activeCommentActionComment) ? (
									<>
										<Text style={styles.postActionsSubtitle}>Edit or delete your comment.</Text>
										<View style={styles.postActionsRow}>
											<Pressable style={styles.postActionChoiceButton} onPress={handleEditComment} disabled={isCommentActionSaving}><Ionicons name="create-outline" size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>Edit</Text></Pressable>
											<Pressable style={styles.postActionChoiceButton} onPress={handleDeleteCommentAction} disabled={isCommentActionSaving}><Ionicons name="trash-outline" size={16} color="#B42318" /><Text style={styles.postActionChoiceText}>Delete</Text></Pressable>
										</View>
									</>
								) : (
									<>
										<Text style={styles.postActionsSubtitle}>Actions for this comment</Text>
										<View style={styles.postActionsRow}>
											<Pressable style={styles.postActionChoiceButton} onPress={() => { closeCommentActions(); showThemedAlert({ title: 'Reported', message: 'Thanks - the comment has been reported.' }); }}><Ionicons name="flag-outline" size={16} color="#31429B" /><Text style={styles.postActionChoiceText}>Report</Text></Pressable>
										</View>
									</>
								)}
							</View>
						</SafeAreaView>
					</View>
				</Modal>

				<Modal visible={isDeletingPost} transparent animationType="fade" statusBarTranslucent>
					<View style={styles.deleteLoadingBackdrop}>
						<View style={styles.deleteLoadingCard}>
							<ActivityIndicator size="large" color="#31429B" />
							<Text style={styles.deleteLoadingTitle}>Deleting post</Text>
							<Text style={styles.deleteLoadingText}>Please wait while the post is removed.</Text>
						</View>
					</View>
				</Modal>

				<Modal transparent visible={repostComposerVisible} animationType="slide" onRequestClose={closeRepostComposer}>
					<View style={styles.repostModalBackdrop}>
						<Pressable style={StyleSheet.absoluteFillObject} onPress={closeRepostComposer} />
						<SafeAreaView style={styles.repostModalSafeArea} edges={['bottom']}>
							<Animated.View style={[styles.repostModalCard, { transform: [{ translateY: repostComposerTranslateY }] }]} onTouchMove={handleRepostComposerSwipe} onTouchEnd={() => { resetSwipeRefs(); }}>
								<View style={{ height: 4, width: 40, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 8 }} />
								<Text style={styles.repostModalTitle}>Repost with your caption</Text>
								<Text style={styles.repostModalSubtitle} numberOfLines={1}>{activeRepostPost ? `Reposting ${renderPostAuthorName(activeRepostPost)}'s post` : 'Add context to your repost'}</Text>
								<TextInput value={repostCaptionDraft} onChangeText={setRepostCaptionDraft} placeholder="Share your thoughts..." placeholderTextColor="#8A94A6" style={styles.repostCaptionInput} multiline textAlignVertical="top" />
								{repostMentionContext && repostMentionSuggestions.length > 0 ? (
									<View style={styles.mentionPanel}>
										{repostMentionSuggestions.map((item) => (
											<Pressable key={`repost-mention-${String(item.id ?? item.name)}`} style={styles.mentionItem} onPress={() => handleRepostMentionPick(item.handle)}>
												<Image source={{ uri: item.avatar }} style={styles.mentionAvatar} /><Text style={styles.mentionName} numberOfLines={1}>@{item.handle}</Text>
											</Pressable>
										))}
									</View>
								) : null}
								<View style={styles.repostModalActionsRow}>
									<Pressable style={styles.repostCancelButton} onPress={closeRepostComposer}><Text style={styles.repostCancelButtonText}>Cancel</Text></Pressable>
									<Pressable style={styles.repostSubmitButton} onPress={submitRepostWithCaption}><Text style={styles.repostSubmitButtonText}>Repost</Text></Pressable>
								</View>
							</Animated.View>
						</SafeAreaView>
					</View>
				</Modal>

				<Modal transparent visible={themedAlertState.visible} animationType="fade" onRequestClose={closeThemedAlert}>
					<View style={styles.themedAlertBackdrop}>
						<Pressable style={StyleSheet.absoluteFillObject} onPress={closeThemedAlert} />
						<View style={styles.themedAlertCard}>
							<Text style={styles.themedAlertTitle}>{themedAlertState.title}</Text>
							<Text style={styles.themedAlertMessage}>{themedAlertState.message}</Text>
							<View style={styles.themedAlertActionsRow}>
								{themedAlertState.actions.map((action, actionIndex) => {
									const isDestructive = action?.style === 'destructive';
									const isCancel = action?.style === 'cancel';
									return (
										<Pressable key={`${action.text}-${actionIndex}`} style={[styles.themedAlertButton, isDestructive ? styles.themedAlertButtonDestructive : null, isCancel ? styles.themedAlertButtonNeutral : null]} onPress={() => handleThemedAlertAction(action)}>
											<Text style={[styles.themedAlertButtonText, isDestructive ? styles.themedAlertButtonTextDestructive : null, isCancel ? styles.themedAlertButtonTextNeutral : null]}>{action.text}</Text>
										</Pressable>
									);
								})}
							</View>
						</View>
					</View>
				</Modal>

        {/* --- SLEEK NEW COMMENTS MODAL --- */}
				<Modal transparent visible={commentsVisible} animationType="slide" onRequestClose={closeCommentsModal}>
					<View style={styles.commentsModalBackdrop}>
						<Pressable style={StyleSheet.absoluteFillObject} onPress={closeCommentsModal} />
						<SafeAreaView style={styles.commentsSheet} edges={['top', 'bottom']}>
							<Animated.View style={{ flex: 1, transform: [{ translateY: commentsTranslateY }] }} onTouchMove={handleCommentsSwipe} onTouchEnd={() => { resetSwipeRefs(); }}>
								
                {/* Drag Handle */}
                <View style={{ height: 5, width: 40, backgroundColor: '#D1D5DB', borderRadius: 3, alignSelf: 'center', marginTop: 8, marginBottom: 12 }} />
								
                {/* Header Row */}
                <View style={styles.commentsHeaderRow}>
									<Text style={styles.commentsTitle}>{activeCommentPost?.comment_count ?? comments.length} comments</Text>
									<Pressable style={styles.commentsCloseButton} onPress={closeCommentsModal}>
                    <Ionicons name="close" size={24} color="#1C1C1E" />
                  </Pressable>
								</View>

								<CustomKeyboardView style={styles.commentsBody} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} footer={(
									<View style={styles.commentComposerSafeArea}>
										<View style={styles.commentComposer}>
											<View style={styles.commentComposerContent}>
												{editingComment ? (
													<View style={styles.commentReplyContext}><Text style={styles.commentReplyContextText} numberOfLines={1}>Editing comment</Text><Pressable style={styles.commentReplyContextCancel} onPress={() => { setEditingComment(null); setCommentDraft(''); }}><Ionicons name="close" size={14} color="#31429B" /></Pressable></View>
												) : null}
												{replyingToComment ? (
													<View style={styles.commentReplyContext}><Text style={styles.commentReplyContextText} numberOfLines={1}>Replying to {renderCommentAuthorName(replyingToComment)}</Text><Pressable style={styles.commentReplyContextCancel} onPress={() => setReplyingToComment(null)}><Ionicons name="close" size={14} color="#31429B" /></Pressable></View>
												) : null}
												
                        {/* New Pill-Shaped Input */}
                        <View style={styles.commentInputWrap}>
													<TextInput value={commentDraft} onChangeText={setCommentDraft} onContentSizeChange={handleCommentInputContentSizeChange} placeholder={editingComment ? 'Edit your comment...' : replyingToComment ? 'Write a reply...' : 'Write a comment...'} placeholderTextColor="#94A3B8" style={[styles.commentInput, { height: commentInputHeight }]} multiline scrollEnabled={false} textAlignVertical="center" />
													<Pressable style={[styles.commentSendButtonInside, !commentDraft.trim() ? styles.commentSendButtonDisabled : null]} onPress={handleSubmitComment} disabled={!commentDraft.trim()}>
                            <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
                          </Pressable>
												</View>

												{commentMentionContext && commentMentionSuggestions.length > 0 ? (
													<View style={styles.commentMentionPanel}>
														{commentMentionSuggestions.map((item) => (
															<Pressable key={`comment-mention-${String(item.id ?? item.name)}`} style={styles.mentionItem} onPress={() => handleCommentMentionPick(item.handle)}>
																<Image source={{ uri: item.avatar }} style={styles.mentionAvatar} /><Text style={styles.mentionName} numberOfLines={1}>@{item.handle}</Text>
															</Pressable>
														))}
													</View>
												) : null}
											</View>
										</View>
									</View>
								)}>
									<ScrollView style={styles.commentsList} contentContainerStyle={styles.commentsListContent} showsVerticalScrollIndicator={false} nestedScrollEnabled>
										{commentsLoading ? (
											<View style={styles.commentsEmptyState}><ActivityIndicator size="small" color="#31429B" /><Text style={styles.commentsEmptyText}>Loading comments...</Text></View>
										) : commentsError ? (
											<View style={styles.commentsEmptyState}><Ionicons name="alert-circle-outline" size={26} color="#B42318" /><Text style={styles.commentsEmptyText}>{commentsError}</Text></View>
										) : comments.length === 0 ? (
											<View style={styles.commentsEmptyState}><Ionicons name="chatbubble-ellipses-outline" size={26} color="#94A3B8" /><Text style={styles.commentsEmptyText}>No comments loaded yet.</Text></View>
										) : (
											commentTree.map((thread) => renderCommentNode(thread))
										)}
									</ScrollView>
								</CustomKeyboardView>
							</Animated.View>
						</SafeAreaView>
					</View>
				</Modal>
			</View>
	);
};

export default UserFeedScreen;
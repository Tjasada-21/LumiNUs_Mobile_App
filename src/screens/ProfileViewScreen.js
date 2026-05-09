import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// Using Supabase queries instead of legacy API
import BrandHeader from '../components/BrandHeader';
import styles from '../styles/ProfileViewScreen.styles';
import { getAlumniProfile } from '../services/alumniQueries';
import { getUserPosts } from '../services/postQueries';
import { getFollowers, getFollowing, rejectFollowRequest, sendFollowRequest, unfollowUser } from '../services/connectionQueries';
import { getCurrentUser } from '../services/supabaseAuth';
import { ThemedAlert } from '../components/ThemedAlert';

const ProfileViewScreen = ({ navigation, route }) => {
	const userId = route?.params?.userId;
	const { width } = useWindowDimensions();
	const isCompactWidth = width < 375;
	const isTablet = width >= 768;
	const layout = {
		avatarSize: isTablet ? 118 : isCompactWidth ? 88 : 102,
		heroPadding: isCompactWidth ? 14 : 16,
		nameSize: isCompactWidth ? 19 : 22,
		workPageWidth: Math.max(width - (isCompactWidth ? 28 : 36), 280),
	};
	const [userData, setUserData] = useState(null);
	const [profilePosts, setProfilePosts] = useState([]);
	const [profileLoading, setProfileLoading] = useState(true);
	const [postsLoading, setPostsLoading] = useState(true);
	const [followLoading, setFollowLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [activeWorkExperienceIndex, setActiveWorkExperienceIndex] = useState(0);
	const [resolvedConnectionsCount, setResolvedConnectionsCount] = useState(0);
	const workPagerRef = useRef(null);

	const profileName = useMemo(() => {
		if (!userData) {
			return 'Alumni';
		}

		return [userData.first_name, userData.last_name].filter(Boolean).join(' ').trim() || 'Alumni';
	}, [userData]);

	const profileImageUri = useMemo(() => {
		if (userData?.alumni_photo) {
			const photoUrl = userData.alumni_photo;
			
			// If it's already a full HTTPS URL, return as-is
			if (/^https?:\/\//i.test(photoUrl)) {
				return photoUrl;
			}
			
			// It's a relative path - construct the full Supabase public URL using luminus_assets bucket
			const SUPABASE_URL = 'https://pmnirrvwibzqjlutbnwz.supabase.co';
			const cleanPath = String(photoUrl).replace(/^\/+/, '');
			return `${SUPABASE_URL}/storage/v1/object/public/luminus_assets/${cleanPath}`;
		}

		return `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=1F2F6E&color=fff&size=256`;
	}, [profileName, userData]);

	const postsCount = useMemo(
		() => profilePosts.filter((post) => (post?.feed_type ?? 'post') !== 'repost').length,
		[profilePosts]
	);

	const repostsCount = useMemo(
		() => profilePosts.filter((post) => post?.feed_type === 'repost').length,
		[profilePosts]
	);

	const profileSummary = useMemo(() => ({
		headlineText: userData?.headline || 'Alumni member',
		locationText: userData?.location || 'NU Lipa',
		classTag: userData?.year_graduated
			? `Class of ${String(userData.year_graduated).match(/\d{4}/)?.[0] ?? String(userData.year_graduated).slice(0, 4)}`
			: 'Class of',
		sectionTag: userData?.program || 'BSIT',
		connectionsCount: Number.isFinite(Number(userData?.connections_count))
			? Number(userData.connections_count)
			: resolvedConnectionsCount,
		connectionStatus: userData?.connection_status || 'none',
		postsCount,
		biographyText: userData?.bio || 'No biography available yet.',
	}), [postsCount, resolvedConnectionsCount, userData]);

	const isConnected = profileSummary.connectionStatus === 'connected';
	const isPendingConnection = profileSummary.connectionStatus === 'pending';
	const isConnectionActionDisabled = followLoading;
	const connectionButtonLabel = followLoading
		? isConnected
			? 'Removing...'
			: 'Adding...'
		: isConnected
			? 'Remove Connection'
			: isPendingConnection
				? 'Connection Pending'
				: 'Add Connection';

	const openConversation = () => {
		if (!isConnected) {
			ThemedAlert.alert(
				'Message unavailable',
				'You can only message alumni after you are connected with them.'
			);
			return;
		}

		navigation.navigate('ConvoScreen', {
			contactId: userId,
			contactName: profileName,
			contactAvatar: profileImageUri,
		});
	};

	const openConnectionsScreen = () => {
		navigation.navigate('ConnectionsScreen');
	};

		const handleAddConnection = async () => {
			if (!userId || followLoading) return;

			try {
				setFollowLoading(true);
				const currentUser = await getCurrentUser().catch(() => null);
				if (!currentUser?.id) {
					ThemedAlert.alert('Connection failed', 'Please sign in again to send a connection request.');
					return;
				}

				// send follow request via Supabase
				await sendFollowRequest(currentUser.id, userId);
				setUserData((current) => (current ? { ...current, connection_status: 'pending' } : current));
				ThemedAlert.alert('Connection updated', 'Connection request sent.');
			} catch (followError) {
				console.error('Failed to add connection (Supabase):', followError);
				ThemedAlert.alert('Connection failed', 'Unable to add this connection right now.');
			} finally {
				setFollowLoading(false);
			}
		};

		const handleCancelPendingRequestConfirmed = async () => {
			if (!userId || followLoading || !isPendingConnection) return;

			try {
				setFollowLoading(true);
				const currentUser = await getCurrentUser().catch(() => null);
				if (!currentUser?.id) {
					ThemedAlert.alert('Cancel request failed', 'Please sign in again to update this request.');
					return;
				}

				await rejectFollowRequest(currentUser.id, userId);
				setUserData((current) => (current ? { ...current, connection_status: 'none' } : current));
				ThemedAlert.alert('Request cancelled', 'Connection request cancelled.');
				if (navigation.canGoBack()) {
					navigation.goBack();
				}
			} catch (cancelError) {
				console.error('Failed to cancel pending request (Supabase):', cancelError);
				ThemedAlert.alert('Cancel request failed', 'Unable to cancel this request right now.');
			} finally {
				setFollowLoading(false);
			}
		};

		const handleRemoveConnectionConfirmed = async () => {
			if (!userId || followLoading || !isConnected) return;

			try {
				setFollowLoading(true);
				const currentUser = await getCurrentUser().catch(() => null);
				if (!currentUser?.id) {
					ThemedAlert.alert('Remove connection failed', 'Please sign in again to update this connection.');
					return;
				}

				await unfollowUser(currentUser.id, userId);
				setUserData((current) => {
					if (!current) return current;
					return {
						...current,
						connection_status: 'none',
						connections_count: Math.max(0, Number(current.connections_count ?? 0) - 1),
					};
				});
				ThemedAlert.alert('Connection removed', 'Connection removed successfully.');
			} catch (removeError) {
				console.error('Failed to remove connection (Supabase):', removeError);
				ThemedAlert.alert('Remove connection failed', 'Unable to remove this connection right now.');
			} finally {
				setFollowLoading(false);
			}
		};

	const confirmRemoveConnection = () => {
		ThemedAlert.alert(
			'Remove connection',
			`Are you sure you want to remove the connection with ${profileName}?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Remove', style: 'destructive', onPress: () => handleRemoveConnectionConfirmed() },
			]
		);
	};

	const confirmCancelPendingRequest = () => {
		ThemedAlert.alert(
			'Cancel connection request',
			`Do you want to cancel your connection request to ${profileName}?`,
			[
				{ text: 'Keep Pending', style: 'cancel' },
				{ text: 'Cancel Request', style: 'destructive', onPress: () => handleCancelPendingRequestConfirmed() },
			]
		);
	};

	const workExperiences = useMemo(() => {
		if (Array.isArray(userData?.work_experiences) && userData.work_experiences.length > 0) {
			return [...userData.work_experiences]
				.map((experience, index) => ({ experience, index }))
				.sort((a, b) => {
					const getStartYear = (item) => {
						const directStartDate = item?.start_date ?? item?.startDate;

						if (directStartDate) {
							const year = Number(String(directStartDate).slice(0, 4));
							if (Number.isFinite(year)) {
								return year;
							}
						}

						if (item?.startYear) {
							const year = Number(item.startYear);
							if (Number.isFinite(year)) {
								return year;
							}
						}

						const periodYear = String(item?.period ?? '').match(/\d{4}/)?.[0];
						if (periodYear) {
							return Number(periodYear);
						}

						return Number.MAX_SAFE_INTEGER;
					};

					const aYear = getStartYear(a.experience);
					const bYear = getStartYear(b.experience);

					if (aYear === bYear) {
						return a.index - b.index;
					}

					return aYear - bYear;
				})
				.map(({ experience }) => experience);
		}

		return [];
	}, [userData]);

	useEffect(() => {
		setActiveWorkExperienceIndex(0);
		workPagerRef.current?.scrollTo?.({ x: 0, animated: false });
	}, [workExperiences.length]);

	const handleWorkPagerScrollEnd = (event) => {
		const pageWidth = event?.nativeEvent?.layoutMeasurement?.width ?? 1;
		const nextIndex = Math.round((event?.nativeEvent?.contentOffset?.x ?? 0) / pageWidth);
		setActiveWorkExperienceIndex(nextIndex);
	};

	const getPostAuthorName = (post) => {
		const firstName = post?.alumni?.first_name ?? '';
		const lastName = post?.alumni?.last_name ?? '';

		return [firstName, lastName].filter(Boolean).join(' ').trim() || 'Alumni';
	};

	const getPostImageUri = (image) => {
		const raw = image?.image_url ?? image?.image_path ?? '';

		if (!raw) {
			return '';
		}

		// If it's already a full HTTPS URL, return as-is
		if (/^https?:\/\//i.test(raw)) {
			return raw;
		}

		// It's a relative path - construct the full Supabase public URL using luminus_assets bucket
		const SUPABASE_URL = 'https://pmnirrvwibzqjlutbnwz.supabase.co';
		const cleanPath = String(raw).replace(/^\/+/, '');
		return `${SUPABASE_URL}/storage/v1/object/public/luminus_assets/${cleanPath}`;
	};

	const renderProfilePostImages = (postImages = []) => {
		if (!Array.isArray(postImages) || postImages.length === 0) {
			return null;
		}

		const visibleImages = postImages.slice(0, 4);
		const remainingCount = Math.max(postImages.length - 4, 0);

		return (
			<View style={styles.profilePostImagesGrid}>
				{visibleImages.map((image, imageIndex) => (
					<View key={image?.id ?? `${imageIndex}-${getPostImageUri(image)}`} style={[styles.profilePostImageTile, imageIndex === 0 && visibleImages.length === 1 ? styles.profilePostImageTileSingle : null, imageIndex > 0 ? styles.profilePostImageTileWithGap : null]}>
						<Image
							source={{ uri: getPostImageUri(image) }}
							style={styles.profilePostImage}
							resizeMode="cover"
						/>
						{imageIndex === 3 && remainingCount > 0 ? (
							<View
								style={{
									position: 'absolute',
									top: 0,
									right: 0,
									bottom: 0,
									left: 0,
									backgroundColor: 'rgba(15, 23, 42, 0.45)',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>+{remainingCount}</Text>
							</View>
						) : null}
					</View>
				))}
			</View>
		);
	};

	useEffect(() => {
		if (!userId) {
			setErrorMessage('Missing profile information.');
			setProfileLoading(false);
			setPostsLoading(false);
			return;
		}

		let isMounted = true;

		const fetchProfile = async () => {
			try {
				setProfileLoading(true);
				setPostsLoading(true);
				setErrorMessage('');

				// Use Supabase queries
				try {
					const currentUser = await getCurrentUser().catch(() => null);
					const profile = await getAlumniProfile(userId, currentUser?.id ?? null);
					if (!isMounted) return;
					setUserData(profile ?? null);
					setProfileLoading(false);

					const [posts, followingRows, followerRows] = await Promise.all([
						getUserPosts(userId, 50, 0),
						getFollowing(userId).catch(() => []),
						getFollowers(userId).catch(() => []),
					]);
					if (!isMounted) return;
					setProfilePosts(Array.isArray(posts) ? posts : []);

					const connectionIds = new Set();
					(followingRows || []).forEach((row) => {
						if (row?.followed?.id) connectionIds.add(row.followed.id);
					});
					(followerRows || []).forEach((row) => {
						if (row?.follower?.id) connectionIds.add(row.follower.id);
					});
					setResolvedConnectionsCount(connectionIds.size);
				} catch (err) {
					console.error('Failed to fetch profile view (Supabase):', err);
					if (isMounted) setErrorMessage('Unable to load this profile right now.');
				}
			} catch (fetchError) {
				console.error('Failed to fetch profile view:', fetchError);

				if (isMounted) {
					setErrorMessage('Unable to load this profile right now.');
				}
			} finally {
				if (isMounted) {
					setProfileLoading(false);
					setPostsLoading(false);
				}
			}
		};

		fetchProfile();

		return () => {
			isMounted = false;
		};
	}, [userId]);

	return (
		<SafeAreaView style={styles.safeArea} edges={['top']}>
			<View style={styles.container}>
				<BrandHeader />

				<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
						{profileLoading && !userData ? (
						<View style={styles.stateWrap}>
							<ActivityIndicator size="large" color="#31429B" />
						</View>
					) : errorMessage ? (
						<View style={styles.stateWrap}>
							<Text style={styles.errorText}>{errorMessage}</Text>
							<Pressable style={styles.actionButton} onPress={() => navigation.goBack()}>
								<Text style={styles.actionButtonText}>Go Back</Text>
							</Pressable>
						</View>
					) : (
						<>
								<View style={[styles.heroCard, { padding: layout.heroPadding }]}>
									<View style={styles.heroBackRow}>
										<Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
											<Ionicons name="arrow-back" size={18} color="#31429B" />
										</Pressable>
									</View>

									<View style={styles.heroRow}>
										<Image
											source={{ uri: profileImageUri }}
											style={[
												styles.avatar,
												{
													width: layout.avatarSize,
													height: layout.avatarSize,
													borderRadius: layout.avatarSize / 2,
												},
											]}
										/>

										<View style={styles.heroCopy}>
											<View style={styles.heroTitleRow}>
												<Text style={[styles.name, { fontSize: layout.nameSize, lineHeight: layout.nameSize + 2 }]}>
													{profileName}
												</Text>
											</View>

											<View style={styles.tagPill}>
												<Ionicons name="school" size={11} color="#31429B" />
												<Text style={styles.tagText}>
													{profileSummary.classTag} | {profileSummary.sectionTag}
												</Text>
											</View>

											<View style={styles.statsRow}>
												<TouchableOpacity style={styles.statBlock} activeOpacity={0.85} onPress={openConnectionsScreen}>
													<Text style={styles.statValue}>{profileSummary.connectionsCount}</Text>
													<Text style={styles.statLabel}>Connections</Text>
												</TouchableOpacity>
												<View style={styles.statBlock}>
													<Text style={styles.statValue}>{profileSummary.postsCount}</Text>
													<Text style={styles.statLabel}>Posts</Text>
												</View>
												<View style={styles.statBlock}>
													<Text style={styles.statValue}>{repostsCount}</Text>
													<Text style={styles.statLabel}>Reposts</Text>
												</View>
											</View>
										</View>
									</View>

									<View style={styles.heroActionsRow}>
										<TouchableOpacity
											style={[
												styles.addConnectionButton,
												isConnected && styles.removeConnectionButton,
												isPendingConnection && styles.pendingConnectionButton,
												!isPendingConnection && isConnectionActionDisabled && styles.addConnectionButtonDisabled,
											]}
											activeOpacity={0.85}
											onPress={isConnected ? confirmRemoveConnection : isPendingConnection ? confirmCancelPendingRequest : handleAddConnection}
											disabled={isConnectionActionDisabled}
										>
											<Ionicons name={isConnected ? 'person-remove-outline' : isPendingConnection ? 'time-outline' : 'person-add-outline'} size={14} color="#FFFFFF" />
											<Text style={styles.addConnectionButtonText}>{connectionButtonLabel}</Text>
										</TouchableOpacity>

										<TouchableOpacity
											style={[styles.messageButton, !isConnected && styles.messageButtonDisabled]}
											activeOpacity={0.85}
											onPress={openConversation}
											disabled={!isConnected}
										>
											<Ionicons name="chatbubble-ellipses-outline" size={12} color="#31429B" />
											<Text style={styles.messageButtonText}>Message</Text>
										</TouchableOpacity>
									</View>
								</View>

								<View style={styles.aboutSectionWrap}>
										<View style={styles.aboutSectionCard}>
											<View style={styles.sectionHeaderRow}>
												<Text style={styles.sectionHeading}>About Me</Text>
											</View>
											<View style={styles.aboutItem}>
												<Ionicons name="briefcase" size={16} color="#404040" />
												<Text style={styles.aboutText}>{profileSummary.headlineText}</Text>
											</View>
											<View style={styles.aboutItem}>
												<Ionicons name="location-sharp" size={16} color="#404040" />
												<Text style={styles.aboutText}>{profileSummary.locationText}</Text>
											</View>
										</View>
									</View>

								<View style={styles.sectionBlock}>
									<View style={styles.bioSectionCard}>
										<View style={styles.sectionHeaderRow}>
											<Text style={styles.sectionHeading}>Biography</Text>
										</View>
										<Text style={styles.biographyText}>{profileSummary.biographyText}</Text>
									</View>
								</View>

								<View style={styles.sectionBlock}>
									<View style={styles.workSectionCard}>
										<Text style={styles.sectionHeading}>Work Experience</Text>
										{workExperiences.length === 0 ? (
											<Text style={styles.emptyPostsText}>No Work Experience yet</Text>
										) : null}

										<ScrollView
											ref={workPagerRef}
											horizontal
											pagingEnabled
											showsHorizontalScrollIndicator={false}
											decelerationRate="fast"
											snapToInterval={layout.workPageWidth}
											snapToAlignment="start"
											contentContainerStyle={styles.workPagerContent}
											onMomentumScrollEnd={handleWorkPagerScrollEnd}
										>
											{workExperiences.map((experience, index) => (
												<View
													key={experience.id ?? `${experience.title}-${experience.period}-${index}`}
													style={[styles.workPage, { width: layout.workPageWidth }]}
												>
													<View style={styles.workCard}>
														<View style={styles.workRow}>
															<View style={styles.workContent}>
																<View style={styles.workTitleRow}>
																	<Ionicons name="briefcase" size={15} color="#31429B" />
																	<Text style={styles.workTitle}>{experience.title}</Text>
																</View>
																<Text style={styles.workSubtitle}>{experience.subtitle}</Text>
																<Text style={styles.workPeriod}>{experience.period}</Text>
																<View style={styles.workLocationRow}>
																	<Ionicons name="location-sharp" size={15} color="#5C6471" />
																	<Text style={styles.workLocation}>{experience.location}</Text>
																</View>
																<Text style={styles.workDescription}>{experience.description}</Text>
															</View>
														</View>
													</View>
												</View>
											))}
										</ScrollView>

										{workExperiences.length > 1 ? (
											<View style={styles.paginationRow}>
												{workExperiences.map((_, index) => (
													<View
														key={`work-dot-${index}`}
														style={[
															styles.paginationDot,
															activeWorkExperienceIndex === index ? styles.paginationDotActive : null,
														]}
													/>
												))}
											</View>
										) : null}
									</View>
								</View>

								<View style={styles.postsSectionBlock}>
									<View style={styles.postsHeaderRow}>
										<Text style={styles.sectionHeading}>Posts</Text>
										<View style={styles.createPostButton}>
											<Ionicons name="document-text-outline" size={14} color="#FFFFFF" />
											<Text style={styles.createPostButtonText}>View</Text>
										</View>
									</View>
									<View style={styles.postsCard}>
										{postsLoading && profilePosts.length === 0 ? (
											<View style={styles.postsLoadingWrap}>
												<ActivityIndicator size="small" color="#31429B" />
												<Text style={styles.postsLoadingText}>Loading posts...</Text>
											</View>
										) : profilePosts.length === 0 ? (
											<Text style={styles.emptyPostsText}>No posts yet.</Text>
										) : (
											profilePosts.map((post) => {
												const isRepost = post.feed_type === 'repost';
												const originalCaption = post.original_post?.caption ?? '';
												const postImages = post.images ?? [];

												return (
													<View key={post.feed_id ?? `${post.feed_type}-${post.id}-${post.created_at}`} style={styles.profilePostItem}>
														<View style={styles.profilePostHeaderRow}>
															<View style={[
																styles.profilePostTypePill,
																isRepost ? styles.profileRepostPill : styles.profilePostPill,
															]}>
																<Ionicons
																	name={isRepost ? 'repeat' : 'document-text-outline'}
																	size={12}
																	color={isRepost ? '#15803D' : '#31429B'}
																/>
																<Text style={[
																styles.profilePostTypeText,
																isRepost ? styles.profileRepostTypeText : null,
															]}>
																	{isRepost ? 'Repost' : 'Post'}
																</Text>
															</View>

															<Text style={styles.profilePostTime}>{new Date(post.created_at).toLocaleString()}</Text>
														</View>

														{post.caption ? <Text style={styles.profilePostCaption}>{post.caption}</Text> : null}

														{isRepost ? (
															<View style={styles.profileOriginalWrap}>
																<Text style={styles.profileOriginalLabel}>Original by {getPostAuthorName({ alumni: post.original_post?.alumni })}</Text>
																{originalCaption ? <Text style={styles.profileOriginalCaption}>{originalCaption}</Text> : null}
															</View>
														) : null}

														{postImages.length > 0 ? renderProfilePostImages(postImages) : null}

														<View style={styles.profilePostMetricsRow}>
															<Text style={styles.profilePostMetricText}>{post.reaction_count ?? 0} reacts</Text>
															<Text style={styles.profilePostMetricText}>{post.comment_count ?? 0} comments</Text>
															<Text style={styles.profilePostMetricText}>{post.repost_count ?? 0} reposts</Text>
														</View>
													</View>
												);
											})
										)}
									</View>
								</View>
						</>
					)}
				</ScrollView>
			</View>
		</SafeAreaView>
	);
};

export default ProfileViewScreen;


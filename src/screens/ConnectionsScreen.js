import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getCurrentUser } from '../services/supabaseAuth';
import { getFollowers, getFollowing, getPendingFollowRequests, getSentPendingRequests, acceptFollowRequest, rejectFollowRequest, sendFollowRequest } from '../services/connectionQueries';
import { getAllAlumni, getAlumniByEmail } from '../services/alumniQueries';
import BrandHeader from '../components/BrandHeader';
import styles from '../styles/ConnectionsScreen.styles';
import { getAvatarUri } from '../utils/imageUtils';

const ConnectionsScreen = ({ navigation }) => {
	const [connections, setConnections] = useState([]);
	const [allAlumni, setAllAlumni] = useState([]);
	const [connectionRequests, setConnectionRequests] = useState([]);
	const [pendingOutgoing, setPendingOutgoing] = useState([]);
	const [currentAlumniId, setCurrentAlumniId] = useState(null);
	const [loading, setLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	const [refreshTick, setRefreshTick] = useState(0);

	useFocusEffect(
		useCallback(() => {
			setRefreshTick((prev) => prev + 1);
		}, [])
	);

	useEffect(() => {
		let isMounted = true;

		const fetchConnections = async () => {
			try {
				setLoading(true);
				setErrorMessage('');

				const user = await getCurrentUser();
				if (!user?.id && !user?.email) {
					setErrorMessage('No active session found.');
					return;
				}

				const alumniId = user?.id ?? null;
				const alumni = alumniId ? { id: alumniId } : await getAlumniByEmail(user.email).catch(() => null);
				if (!alumni?.id) {
					setErrorMessage('Unable to resolve alumni profile.');
					return;
				}

				setCurrentAlumniId(alumni.id);

				const [followingRows, followerRows, allAlumniRows, incomingRows, outgoingRows] = await Promise.all([
					getFollowing(alumni.id).catch((err) => {
						console.error('Failed to fetch following:', err);
						return [];
					}),
					getFollowers(alumni.id).catch((err) => {
						console.error('Failed to fetch followers:', err);
						return [];
					}),
					getAllAlumni(500).catch((err) => {
						console.error('Failed to fetch alumni suggestions:', err);
						return [];
					}),
					getPendingFollowRequests(alumni.id).catch((err) => {
						console.error('Failed to fetch connection requests:', err);
						return [];
					}),
					getSentPendingRequests(alumni.id).catch((err) => {
						console.error('Failed to fetch sent pending requests:', err);
						return [];
					}),
				]);

				const normalizedFollowing = (followingRows || [])
					.map((row) => ({
						...(row?.followed || {}),
						connection_id: row?.id,
					}))
					.filter((row) => Boolean(row?.id));

				const normalizedFollowers = (followerRows || [])
					.map((row) => ({
						...(row?.follower || {}),
						connection_id: row?.id,
					}))
					.filter((row) => Boolean(row?.id));

				const dedupedConnections = Array.from(
					new Map([...normalizedFollowing, ...normalizedFollowers].map((row) => [row.id, row])).values()
				);

				if (!isMounted) return;
				setConnections(dedupedConnections);
				setAllAlumni(Array.isArray(allAlumniRows) ? allAlumniRows : []);
				setConnectionRequests(Array.isArray(incomingRows) ? incomingRows : []);
				setPendingOutgoing(Array.isArray(outgoingRows) ? outgoingRows : []);
			} catch (fetchError) {
				console.error('Failed to fetch connections:', fetchError);
				if (isMounted) {
					setErrorMessage('Unable to load connections right now.');
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		fetchConnections();

		return () => {
			isMounted = false;
		};
	}, [refreshTick]);

	const openProfile = (userId) => {
		navigation.navigate('ProfileView', { userId });
	};

	const handleAccept = async (row) => {
		try {
			await acceptFollowRequest(row.follower_alumni_id, row.followed_alumni_id);
			setConnectionRequests((prev) => prev.filter((r) => r.id !== row.id));
			const newConnection = row.follower ? { ...row.follower, connection_id: row.id } : null;
			if (newConnection?.id) {
				setConnections((prev) => {
					if (prev.some((c) => c.id === newConnection.id)) return prev;
					return [...prev, newConnection];
				});
			}
		} catch (err) {
			console.error('Failed to accept request:', err);
		}
	};

	const handleDecline = async (row) => {
		try {
			await rejectFollowRequest(row.follower_alumni_id, row.followed_alumni_id);
			setConnectionRequests((prev) => prev.filter((r) => r.id !== row.id));
		} catch (err) {
			console.error('Failed to decline request:', err);
		}
	};

	const handleSendRequest = async (alumni) => {
		if (!currentAlumniId || !alumni?.id) return;
		try {
			const result = await sendFollowRequest(currentAlumniId, alumni.id);
			setPendingOutgoing((prev) => [
				...prev,
				{ id: result?.id, follower_alumni_id: currentAlumniId, followed_alumni_id: alumni.id, followed: alumni },
			]);
		} catch (err) {
			console.error('Failed to send connection request:', err);
		}
	};

	const visibleConnections = useMemo(() => {
		const normalizedQuery = searchQuery.trim().toLowerCase();

		if (!normalizedQuery) {
			return connections;
		}

		return connections.filter((contact) => {
			const fullName = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.toLowerCase();
			const email = String(contact.email ?? '').toLowerCase();
			const program = String(contact.program ?? '').toLowerCase();

			return fullName.includes(normalizedQuery)
				|| email.includes(normalizedQuery)
				|| program.includes(normalizedQuery);
		});
	}, [connections, searchQuery]);

	const connectedIds = useMemo(
		() => new Set((connections || []).map((contact) => contact?.id).filter(Boolean)),
		[connections]
	);

	const pendingOutgoingIds = useMemo(
		() => new Set((pendingOutgoing || []).map((row) => row?.followed?.id).filter(Boolean)),
		[pendingOutgoing]
	);

	const visibleSuggestions = useMemo(() => {
		const normalizedQuery = searchQuery.trim().toLowerCase();

		return (allAlumni || []).filter((alumni) => {
			if (!alumni?.id || alumni.id === currentAlumniId || connectedIds.has(alumni.id) || pendingOutgoingIds.has(alumni.id)) {
				return false;
			}

			if (!normalizedQuery) {
				return true;
			}

			const fullName = `${alumni.first_name ?? ''} ${alumni.last_name ?? ''}`.toLowerCase();
			const email = String(alumni.email ?? '').toLowerCase();
			const program = String(alumni.program ?? '').toLowerCase();

			return fullName.includes(normalizedQuery)
				|| email.includes(normalizedQuery)
				|| program.includes(normalizedQuery);
		});
	}, [allAlumni, connectedIds, currentAlumniId, searchQuery]);

	const goBack = () => {
		if (navigation.canGoBack()) {
			navigation.goBack();
			return;
		}

		navigation.navigate('HomeTab');
	};

	return (
		<SafeAreaView style={styles.safeArea} edges={['top']}>
			<View style={styles.container}>
				<BrandHeader />
				<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
					<View style={styles.headerCard}>
						<View style={styles.titleRow}>
							<TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={goBack}>
								<Ionicons name="arrow-back" size={16} color="#31429B" />
							</TouchableOpacity>
							<Text style={styles.title}>Connections</Text>
							<TouchableOpacity
								style={styles.globalSearchButton}
								activeOpacity={0.8}
								onPress={() => navigation.navigate('GlobalSearch')}
								accessibilityRole="button"
								accessibilityLabel="Open global search"
							>
								<Ionicons name="search" size={16} color="#31429B" />
							</TouchableOpacity>
						</View>
						<Text style={styles.subtitle}>Accepted connections show up here and can be opened as chat contacts.</Text>
						<View style={styles.searchWrap}>
							<Ionicons name="search" size={16} color="#64748B" />
							<TextInput
								value={searchQuery}
								onChangeText={setSearchQuery}
								placeholder="Search connections"
								placeholderTextColor="#94A3B8"
								style={styles.searchInput}
								autoCapitalize="none"
								autoCorrect={false}
							/>
						</View>
					</View>

					{loading ? (
						<View style={styles.loadingWrap}>
							<ActivityIndicator color="#31429B" />
						</View>
					) : errorMessage ? (
						<View style={styles.emptyCard}>
							<Text style={styles.emptyTitle}>{errorMessage}</Text>
						</View>
					) : connections.length === 0 ? (
						<View style={styles.emptyCard}>
							<Text style={styles.emptyTitle}>No connections yet.</Text>
							<Text style={styles.emptyText}>Accepted requests will appear here.</Text>
						</View>
					) : visibleConnections.length === 0 ? (
						<View style={styles.emptyCard}>
							<Text style={styles.emptyTitle}>No matching connections.</Text>
							<Text style={styles.emptyText}>Try searching with a different name, email, or program.</Text>
						</View>
					) : (
						<View style={styles.contactList}>
							{visibleConnections.map((contact) => {
								const contactName = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Alumni';
								const contactAvatar = getAvatarUri(contactName, contact.alumni_photo);

								return (
									<TouchableOpacity
										key={String(contact.connection_id ?? contact.id)}
										style={styles.contactCard}
										activeOpacity={0.85}
										onPress={() => openProfile(contact.id)}
									>
										<Image source={{ uri: contactAvatar }} style={styles.contactAvatar} />
										<View style={styles.contactTextWrap}>
											<Text style={styles.contactName} numberOfLines={1}>{contactName}</Text>
											<Text style={styles.contactMeta}>Connected</Text>
										</View>
										<Ionicons name="chevron-forward" size={18} color="#8A94A6" />
									</TouchableOpacity>
								);
							})}
						</View>
					)}

					{!loading && !errorMessage && connectionRequests.length > 0 ? (
						<View style={styles.pendingSection}>
							<View style={styles.sectionHeaderRow}>
								<Text style={styles.sectionHeading}>Connection Requests</Text>
								<View style={styles.sectionBadge}>
									<Text style={styles.sectionBadgeText}>{connectionRequests.length}</Text>
								</View>
							</View>
							<View style={styles.contactList}>
								{connectionRequests.map((row) => {
									const requester = row.follower || {};
									const requesterName = `${requester.first_name ?? ''} ${requester.last_name ?? ''}`.trim() || 'Alumni';
									const requesterAvatar = getAvatarUri(requesterName, requester.alumni_photo);

									return (
										<View key={`request-${row.id}`} style={styles.contactCard}>
											<TouchableOpacity activeOpacity={0.85} onPress={() => openProfile(requester.id)} style={styles.contactCardInner}>
												<Image source={{ uri: requesterAvatar }} style={styles.contactAvatar} />
												<View style={styles.contactTextWrap}>
													<Text style={styles.contactName} numberOfLines={1}>{requesterName}</Text>
													<Text style={styles.contactMeta}>{requester.program || 'Alumni'}</Text>
												</View>
											</TouchableOpacity>
											<View style={styles.requestActions}>
												<TouchableOpacity style={styles.acceptButton} activeOpacity={0.8} onPress={() => handleAccept(row)}>
													<Ionicons name="checkmark" size={15} color="#FFFFFF" />
												</TouchableOpacity>
												<TouchableOpacity style={styles.declineButton} activeOpacity={0.8} onPress={() => handleDecline(row)}>
													<Ionicons name="close" size={15} color="#64748B" />
												</TouchableOpacity>
											</View>
										</View>
									);
								})}
							</View>
						</View>
					) : null}

					{!loading && !errorMessage && pendingOutgoing.length > 0 ? (
						<View style={styles.pendingSection}>
							<View style={styles.sectionHeaderRow}>
								<Text style={styles.sectionHeading}>Pending Connections</Text>
								<Text style={styles.sectionCaption}>{pendingOutgoing.length} sent</Text>
							</View>
							<View style={styles.contactList}>
								{pendingOutgoing.map((row) => {
									const target = row.followed || {};
									const targetName = `${target.first_name ?? ''} ${target.last_name ?? ''}`.trim() || 'Alumni';
									const targetAvatar = getAvatarUri(targetName, target.alumni_photo);

									return (
										<TouchableOpacity
											key={`pending-${row.id}`}
											style={styles.contactCard}
											activeOpacity={0.85}
											onPress={() => openProfile(target.id)}
										>
											<Image source={{ uri: targetAvatar }} style={styles.contactAvatar} />
											<View style={styles.contactTextWrap}>
												<Text style={styles.contactName} numberOfLines={1}>{targetName}</Text>
												<Text style={styles.contactMeta}>{target.program || 'Alumni'}</Text>
											</View>
											<View style={styles.pendingBadge}>
												<Text style={styles.pendingBadgeText}>Pending</Text>
											</View>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>
					) : null}

					{!loading && !errorMessage ? (
						<View style={styles.suggestionsSection}>
							<View style={styles.sectionHeaderRow}>
								<Text style={styles.sectionHeading}>Suggestions</Text>
								<Text style={styles.sectionCaption}>All Alumni</Text>
							</View>

							{visibleSuggestions.length === 0 ? (
								<View style={styles.emptyCard}>
									<Text style={styles.emptyTitle}>No alumni suggestions available.</Text>
									<Text style={styles.emptyText}>Try adjusting your search to discover more alumni.</Text>
								</View>
							) : (
								<View style={styles.contactList}>
									{visibleSuggestions.map((alumni) => {
										const alumniName = `${alumni.first_name ?? ''} ${alumni.last_name ?? ''}`.trim() || 'Alumni';
										const alumniAvatar = getAvatarUri(alumniName, alumni.alumni_photo);

										return (
											<TouchableOpacity
												key={`suggestion-${String(alumni.id)}`}
												style={styles.contactCard}
												activeOpacity={0.85}
												onPress={() => openProfile(alumni.id)}
											>
												<Image source={{ uri: alumniAvatar }} style={styles.contactAvatar} />
												<View style={styles.contactTextWrap}>
													<Text style={styles.contactName} numberOfLines={1}>{alumniName}</Text>
													<Text style={styles.contactMeta}>{alumni.program || 'Alumni'}</Text>
												</View>
												<TouchableOpacity
												style={styles.connectButton}
												activeOpacity={0.8}
												onPress={() => handleSendRequest(alumni)}
											>
												<Ionicons name="person-add" size={15} color="#FFFFFF" />
											</TouchableOpacity>
											</TouchableOpacity>
										);
									})}
								</View>
							)}
						</View>
					) : null}
				</ScrollView>
			</View>
		</SafeAreaView>
	);
};

export default ConnectionsScreen;
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../services/supabase';
import { getFollowing } from '../services/connectionQueries';
import { searchAlumni, getAlumniByEmail } from '../services/alumniQueries';
import BrandHeader from '../components/BrandHeader';
import styles from '../styles/SearchMessageScreen.styles';
import { getAvatarUri } from '../utils/imageUtils';

const SearchMessageScreen = ({ navigation }) => {
	// SECTION: Layout values
	const { width } = useWindowDimensions();
	const isCompactWidth = width < 375;
	const horizontalPadding = isCompactWidth ? 14 : 16;
	const avatarSize = isCompactWidth ? 40 : 42;

	const [query, setQuery] = useState('');
	const [connections, setConnections] = useState([]);
	const [suggestedPeople, setSuggestedPeople] = useState([]);
	const [searchResults, setSearchResults] = useState([]);
	const [connectionsLoading, setConnectionsLoading] = useState(false);
	const [suggestionsLoading, setSuggestionsLoading] = useState(false);
	const [searchLoading, setSearchLoading] = useState(false);
	const [connectionsError, setConnectionsError] = useState('');

	useEffect(() => {
		let isMounted = true;

		const fetchConnections = async () => {
			try {
				setConnectionsLoading(true);
				setConnectionsError('');

				const user = await getCurrentUser();
				if (!user?.email) {
					if (isMounted) setConnectionsError('No active session found.');
					return;
				}

				const alumni = await getAlumniByEmail(user.email).catch(() => null);
				if (!alumni?.id) {
					if (isMounted) setConnections([]);
					return;
				}

				const contacts = await getFollowing(alumni.id).catch((err) => {
					console.error('Failed to fetch connections:', err);
					return [];
				});

				if (!isMounted) return;
				setConnections((contacts || [])
					.map((connection) => connection?.followed ?? connection)
					.filter((connection) => Boolean(connection?.id)));
			} catch (fetchError) {
				console.error('Failed to fetch connections:', fetchError);
				if (isMounted) {
					setConnectionsError('Unable to load connections right now.');
				}
			} finally {
				if (isMounted) {
					setConnectionsLoading(false);
				}
			}
		};

		fetchConnections();

		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		let isMounted = true;

		const fetchSuggestedPeople = async () => {
			try {
				setSuggestionsLoading(true);

				const normalizedQuery = '';
				const results = await searchAlumni(normalizedQuery).catch(() => []);
				if (!isMounted) return;
				const connectedIds = new Set(connections.map((connection) => Number(connection?.id)).filter(Number.isFinite));
				setSuggestedPeople((results || []).filter((person) => {
					const personId = Number(person?.id);
					const connectionStatus = String(person?.connection_status ?? 'none').toLowerCase();
					return Number.isFinite(personId)
						&& !connectedIds.has(personId)
						&& connectionStatus !== 'connected'
						&& connectionStatus !== 'pending';
				}));
			} catch (error) {
				console.error('Failed to fetch suggested people:', error);
				if (isMounted) {
					setSuggestedPeople([]);
				}
			} finally {
				if (isMounted) {
					setSuggestionsLoading(false);
				}
			}
		};

		if (connections.length > 0 || !connectionsLoading) {
			fetchSuggestedPeople();
		}

		return () => {
			isMounted = false;
		};
	}, [connections, connectionsLoading]);

	useEffect(() => {
		let isMounted = true;
		const normalizedQuery = query.trim();

		if (normalizedQuery.length < 2) {
			setSearchResults([]);
			setSearchLoading(false);
			return () => {
				isMounted = false;
			};
		}

		const searchTimeout = setTimeout(async () => {
			try {
				setSearchLoading(true);

				const results = await searchAlumni(normalizedQuery).catch(() => []);

				if (!isMounted) return;

				const connectedIds = new Set(connections.map((connection) => Number(connection?.id)).filter(Number.isFinite));
				setSearchResults((results ?? []).filter((person) => {
					const personId = Number(person?.id);
					const connectionStatus = String(person?.connection_status ?? 'none').toLowerCase();
					return Number.isFinite(personId)
						&& !connectedIds.has(personId)
						&& connectionStatus !== 'connected'
						&& connectionStatus !== 'pending';
				}));
			} catch (error) {
				console.error('Failed to search alumni:', error);
				if (isMounted) {
					setSearchResults([]);
				}
			} finally {
				if (isMounted) {
					setSearchLoading(false);
				}
			}
		}, 250);

		return () => {
			isMounted = false;
			clearTimeout(searchTimeout);
		};
	}, [connections, query]);

	// DERIVED VALUE: Filtered people list
	const filteredPeople = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		if (!normalizedQuery) {
			return suggestedPeople;
		}

		if (normalizedQuery.length < 2) {
			return [];
		}

		return searchResults.filter((person) => {
			const personName = `${person?.first_name ?? ''} ${person?.last_name ?? ''}`.trim().toLowerCase();
			return personName.includes(normalizedQuery);
		});
	}, [query, searchResults, suggestedPeople]);

	// RENDER HELPER: Suggested person row
	const renderSuggestedPerson = ({ item }) => (
		<Pressable style={styles.resultRow} onPress={() => {}} android_ripple={{ color: '#F1F5F9' }}>
			<Image
				source={{ uri: getAvatarUri(`${item?.first_name ?? ''} ${item?.last_name ?? ''}`.trim() || 'Alumni', item?.alumni_photo) }}
				style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
			/>
			<Text style={styles.resultName} numberOfLines={1}>
				{`${item?.first_name ?? ''} ${item?.last_name ?? ''}`.trim() || 'Alumni'}
			</Text>
		</Pressable>
	);

	const renderConnectionRow = ({ item }) => {
		const connectionName = `${item?.first_name ?? ''} ${item?.last_name ?? ''}`.trim() || 'Alumni';
		const connectionAvatar = getAvatarUri(connectionName, item?.alumni_photo);

		return (
			<Pressable style={styles.resultRow} onPress={() => {}} android_ripple={{ color: '#F1F5F9' }}>
				<Image
					source={{ uri: connectionAvatar }}
					style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
				/>
				<Text style={styles.resultName} numberOfLines={1}>
					{connectionName}
				</Text>
			</Pressable>
		);
	};

	return (
		<SafeAreaView style={styles.safeArea} edges={['top']}>
			<View style={styles.container}>
				<BrandHeader />
				{/* SECTION: Search header */}
				<FlatList
					data={filteredPeople}
					renderItem={renderSuggestedPerson}
					keyExtractor={(item) => String(item.id)}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					ListHeaderComponent={(
						<View>
							<View style={styles.headerRow}>
								<Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={8}>
									<Ionicons name="arrow-back" size={24} color="#4A4A4A" />
								</Pressable>
								<Text style={styles.title}>Search</Text>
							</View>

							<View style={styles.searchWrap}>
								<TextInput
									value={query}
									onChangeText={setQuery}
									placeholder="Search a name or group"
									placeholderTextColor="#6D6D6D"
									style={styles.searchInput}
								/>
							</View>

							<Text style={styles.sectionLabel}>Connections</Text>

							{connectionsLoading ? (
								<ActivityIndicator color="#31429B" style={{ marginBottom: 10 }} />
							) : connections.length > 0 ? (
								<View style={styles.connectionsList}>
									<FlatList
										data={connections}
										renderItem={renderConnectionRow}
										keyExtractor={(item) => String(item.connection_id ?? item.id)}
										scrollEnabled={false}
										contentContainerStyle={styles.connectionsInlineList}
									/>
								</View>
							) : null}

							<Text style={styles.sectionLabel}>Suggested</Text>

							{searchLoading ? (
								<ActivityIndicator color="#31429B" style={{ marginTop: 6, marginBottom: 10 }} />
							) : null}
						</View>
					)}
					ListEmptyComponent={(
						<View style={styles.emptyWrap}>
							{suggestionsLoading || searchLoading ? (
								<ActivityIndicator color="#31429B" />
							) : (
								<Text style={styles.emptyText}>{connectionsError || 'No matching names or groups found.'}</Text>
							)}
						</View>
					)}
					contentContainerStyle={[
						styles.content,
						styles.resultsList,
						{ paddingHorizontal: horizontalPadding, paddingBottom: 24 },
					]}
				/>
			</View>
		</SafeAreaView>
	);
};

export default SearchMessageScreen;
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BrandHeader from '../components/BrandHeader';
import styles from '../styles/GlobalSearchScreen.styles';
import { getCurrentUser } from '../services/supabaseAuth';
import { getFollowers, getFollowing, getSentPendingRequests, sendFollowRequest } from '../services/connectionQueries';
import { getAllAlumni, getAlumniByEmail } from '../services/alumniQueries';
import { getAvatarUri } from '../utils/imageUtils';

const GlobalSearchScreen = ({ navigation, route }) => {
	const initialQuery = route?.params?.query ?? '';
	const [query, setQuery] = useState(initialQuery);
	const [loading, setLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState('');
	const [currentAlumniId, setCurrentAlumniId] = useState(null);
	const [allAlumni, setAllAlumni] = useState([]);
	const [connectedIds, setConnectedIds] = useState(new Set());
	const [pendingOutgoingIds, setPendingOutgoingIds] = useState(new Set());
	const [sendingIds, setSendingIds] = useState(new Set());

	const loadSearchData = useCallback(async () => {
		try {
			setLoading(true);
			setErrorMessage('');

			const user = await getCurrentUser();
			if (!user?.id && !user?.email) {
				setErrorMessage('No active session found.');
				return;
			}

			const alumni = user?.id ? { id: user.id } : await getAlumniByEmail(user.email).catch(() => null);
			if (!alumni?.id) {
				setErrorMessage('Unable to resolve your alumni profile.');
				return;
			}

			setCurrentAlumniId(alumni.id);

			const [alumniRows, followingRows, followerRows, outgoingRows] = await Promise.all([
				getAllAlumni(500).catch(() => []),
				getFollowing(alumni.id).catch(() => []),
				getFollowers(alumni.id).catch(() => []),
				getSentPendingRequests(alumni.id).catch(() => []),
			]);

			const connected = new Set([
				...(Array.isArray(followingRows) ? followingRows : []).map((row) => row?.followed?.id).filter(Boolean),
				...(Array.isArray(followerRows) ? followerRows : []).map((row) => row?.follower?.id).filter(Boolean),
			]);

			const pending = new Set(
				(Array.isArray(outgoingRows) ? outgoingRows : []).map((row) => row?.followed?.id).filter(Boolean)
			);

			setAllAlumni(Array.isArray(alumniRows) ? alumniRows : []);
			setConnectedIds(connected);
			setPendingOutgoingIds(pending);
		} catch (fetchError) {
			console.error('Failed to load global alumni search:', fetchError);
			setErrorMessage('Unable to load alumni right now.');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadSearchData();
	}, [loadSearchData]);

	const handleRequestConnection = async (alumni) => {
		if (!currentAlumniId || !alumni?.id) return;

		setSendingIds((prev) => new Set(prev).add(alumni.id));
		try {
			await sendFollowRequest(currentAlumniId, alumni.id);
			setPendingOutgoingIds((prev) => new Set(prev).add(alumni.id));
		} catch (requestError) {
			console.error('Failed to send connection request:', requestError);
		} finally {
			setSendingIds((prev) => {
				const next = new Set(prev);
				next.delete(alumni.id);
				return next;
			});
		}
	};

	const visibleAlumni = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return [];

		const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

		return (allAlumni || [])
			.filter((alumni) => {
				if (!alumni?.id || alumni.id === currentAlumniId) return false;

				const fullName = `${alumni.first_name ?? ''} ${alumni.last_name ?? ''}`.trim().toLowerCase();
				const program = String(alumni.program ?? '').toLowerCase();
				const year = String(alumni.year_graduated ?? '').toLowerCase();
				const email = String(alumni.email ?? '').toLowerCase();
				const haystack = `${fullName} ${program} ${year} ${email}`;

				return queryTokens.every((token) => haystack.includes(token));
			})
			.sort((left, right) => {
				const leftName = `${left.first_name ?? ''} ${left.last_name ?? ''}`.trim().toLowerCase();
				const rightName = `${right.first_name ?? ''} ${right.last_name ?? ''}`.trim().toLowerCase();
				const leftProgram = String(left.program ?? '').toLowerCase();
				const rightProgram = String(right.program ?? '').toLowerCase();
				const leftYear = String(left.year_graduated ?? '').toLowerCase();
				const rightYear = String(right.year_graduated ?? '').toLowerCase();

				const score = (alumni) => {
					const name = `${alumni.first_name ?? ''} ${alumni.last_name ?? ''}`.trim().toLowerCase();
					const programValue = String(alumni.program ?? '').toLowerCase();
					const yearValue = String(alumni.year_graduated ?? '').toLowerCase();

					if (yearValue === normalizedQuery) return 0;
					if (name.startsWith(normalizedQuery)) return 1;
					if (name.includes(normalizedQuery)) return 2;
					if (programValue.includes(normalizedQuery)) return 3;
					if (yearValue.includes(normalizedQuery)) return 4;
					return 5;
				};

				const leftScore = score(left);
				const rightScore = score(right);

				if (leftScore !== rightScore) return leftScore - rightScore;
				return leftName.localeCompare(rightName) || leftProgram.localeCompare(rightProgram) || leftYear.localeCompare(rightYear);
			});
	}, [allAlumni, currentAlumniId, query]);

	const renderResult = ({ item }) => {
		const fullName = `${item?.first_name ?? ''} ${item?.last_name ?? ''}`.trim() || 'Alumni';
		const year = item?.year_graduated ? `Class of ${String(item.year_graduated).slice(0, 4)}` : 'Class year not listed';
		const program = item?.program || 'Program not listed';
		const isConnected = connectedIds.has(item.id);
		const isPending = pendingOutgoingIds.has(item.id);
		const isSelf = item.id === currentAlumniId;
		const isSending = sendingIds.has(item.id);
		const avatarUri = getAvatarUri(fullName, item?.alumni_photo);

		let actionLabel = 'Request';
		let actionDisabled = false;

		if (isSelf) {
			actionLabel = 'You';
			actionDisabled = true;
		} else if (isConnected) {
			actionLabel = 'Connected';
			actionDisabled = true;
		} else if (isPending) {
			actionLabel = 'Pending';
			actionDisabled = true;
		} else if (isSending) {
			actionLabel = 'Sending';
			actionDisabled = true;
		}

		return (
			<Pressable
				style={({ pressed }) => [styles.resultCard, pressed ? styles.resultCardPressed : null]}
				onPress={() => navigation.navigate('ProfileView', { userId: item.id })}
			>
				<Image source={{ uri: avatarUri }} style={styles.avatar} />
				<View style={styles.resultBody}>
					<Text style={styles.resultName} numberOfLines={1}>{fullName}</Text>
					<Text style={styles.resultMeta} numberOfLines={1}>{program}</Text>
					<Text style={styles.resultSubmeta} numberOfLines={1}>{year}</Text>
				</View>
				<Pressable
					disabled={actionDisabled}
					onPress={() => handleRequestConnection(item)}
					style={({ pressed }) => [
						styles.actionButton,
						actionDisabled ? styles.actionButtonDisabled : null,
						pressed && !actionDisabled ? styles.actionButtonPressed : null,
					]}
				>
					<Text style={[styles.actionButtonText, actionDisabled ? styles.actionButtonTextDisabled : null]}>{actionLabel}</Text>
				</Pressable>
			</Pressable>
		);
	};

	const listHeader = (
		<View style={styles.headerCard}>
			<View style={styles.titleRow}>
				<Pressable style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
					<Ionicons name="arrow-back" size={16} color="#31429B" />
				</Pressable>
				<View style={styles.titleWrap}>
					<Text style={styles.title}>Global Search</Text>
					<Text style={styles.subtitle}>Search alumni by name, year of graduation, or program.</Text>
				</View>
			</View>

			<View style={styles.searchWrap}>
				<Ionicons name="search" size={16} color="#64748B" />
				<TextInput
					value={query}
					onChangeText={setQuery}
					placeholder="Search alumni"
					placeholderTextColor="#94A3B8"
					style={styles.searchInput}
					autoCapitalize="none"
					autoCorrect={false}
					returnKeyType="search"
				/>
			</View>

			<View style={styles.helperRow}>
				<Text style={styles.helperText}>Try a name, class year, or program like BSIT.</Text>
				<Text style={styles.helperCount}>{query.trim() ? `${visibleAlumni.length} result${visibleAlumni.length === 1 ? '' : 's'}` : 'Start typing to search'}</Text>
			</View>
		</View>
	);

	const listEmpty = () => {
		if (loading) {
			return (
				<View style={styles.loadingWrap}>
					<ActivityIndicator color="#31429B" />
				</View>
			);
		}

		if (errorMessage) {
			return (
				<View style={styles.emptyCard}>
					<Text style={styles.emptyTitle}>{errorMessage}</Text>
				</View>
			);
		}

		if (!query.trim()) {
			return (
				<View style={styles.emptyCard}>
					<Text style={styles.emptyTitle}>Search the alumni directory</Text>
					<Text style={styles.emptyText}>Use the search bar above to find alumni by name, graduation year, or program, then send a connection request.</Text>
				</View>
			);
		}

		return (
			<View style={styles.emptyCard}>
				<Text style={styles.emptyTitle}>No alumni found</Text>
				<Text style={styles.emptyText}>Try a different spelling, year, or program.</Text>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.safeArea} edges={['top']}>
			<View style={styles.container}>
				<BrandHeader />
				<FlatList
					data={visibleAlumni}
					keyExtractor={(item) => String(item.id)}
					renderItem={renderResult}
					ListHeaderComponent={listHeader}
					ListEmptyComponent={listEmpty}
					contentContainerStyle={styles.content}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				/>
			</View>
		</SafeAreaView>
	);
};

export default GlobalSearchScreen;
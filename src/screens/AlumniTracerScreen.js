import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
	View,
	Text,
	SectionList,
	ActivityIndicator,
	Pressable,
	Modal,
	ScrollView,
	RefreshControl,
	Image,
	TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from '../styles/AlumniTracerScreen.styles';
import { useNavigation } from '@react-navigation/native';
import BrandHeader from '../components/BrandHeader';
import { getCurrentUser } from '../services/supabase';
import { getAlumniByEmail } from '../services/alumniQueries';
import { getActiveForms, getDraftResponse, getUserTracerResponses } from '../services/tracerQueries';

// Fast data extraction from various response formats
const extractTracers = (response) => {
	const d = response?.data;
	if (Array.isArray(d?.tracer_forms)) return d.tracer_forms;
	if (Array.isArray(d?.data?.tracer_forms)) return d.data.tracer_forms;
	if (Array.isArray(d?.data)) return d.data;
	return Array.isArray(d) ? d : [];
};

// Format date to readable format
const formatDate = (dateStr) => {
	if (!dateStr) return '';
	try {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	} catch {
		return dateStr;
	}
};

// Utility functions - inline for speed
const getTitle = (i) => i?.form_title || i?.title || i?.name || 'Form';
const getDesc = (i) => i?.form_description || i?.description || '';
const getHdr = (i) => i?.form_header || i?.header || '';
const getFormId = (i) => i?.id || i?.form_id;
const getImageUrl = (i) => {
	const imageUrl = i?.form_header || i?.header;
	return imageUrl;
};
const getStatus = (i) => {
	const s = i?.status ?? i?.is_active;
	return s === undefined ? 'Inactive' : String(s) === '1' || String(s).toLowerCase() === 'active' ? 'Active' : 'Inactive';
};
const fmtKey = (k) => String(k).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const fmtVal = (v) => {
	if (v === null || v === undefined || v === '') return '—';
	if (typeof v === 'boolean') return v ? 'Yes' : 'No';
	if (String(v).includes('-') && String(v).includes(':')) return formatDate(v); // Date format
	return String(v);
};

// Memoized list item
const TracerItem = React.memo(({ item, onPress, completed }) => {
	const title = getTitle(item);
	const imageUrl = getImageUrl(item);
	const snippet = getDesc(item) ? String(getDesc(item)).slice(0, 90) : '';
	return (
		<Pressable
			style={styles.listItem}
			onPress={() => onPress(item)}
			accessibilityRole="button"
			hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
		>
			{imageUrl ? (
				<Image source={{ uri: imageUrl }} style={styles.cardImage} />
			) : (
				<View style={styles.cardImagePlaceholder} />
			)}
			<View style={styles.cardInfo}>
				<Text style={styles.tracerName}>{title}</Text>
				{snippet ? <Text style={{ color: '#6B7280', marginTop: 6 }}>{snippet}{snippet.length >= 90 ? '…' : ''}</Text> : null}
				<View style={[styles.statusBadge, completed ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
					<Text style={[styles.statusBadgeText, completed ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive]}>
						{completed ? 'Completed' : 'Pending'}
					</Text>
				</View>
			</View>
		</Pressable>
	);
});
TracerItem.displayName = 'TracerItem';

// Main screen
const AlumniTracerScreen = () => {
	const [tracers, setTracers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');
	const [selectedTracer, setSelectedTracer] = useState(null);
	const [modalVisible, setModalVisible] = useState(false);
	const [hasAnswered, setHasAnswered] = useState(false);
	const [hasDraftInProgress, setHasDraftInProgress] = useState(false);
	const [checkingResponse, setCheckingResponse] = useState(false);
	const [answeredFormIds, setAnsweredFormIds] = useState(new Set());
	const isMounted = useRef(true);
	const navigation = useNavigation();

	const fetchTracers = useCallback(async () => {
		try {
			setLoading(true);
			setError('');

			const [forms, supaUser] = await Promise.all([
				getActiveForms().catch(() => []),
				getCurrentUser().catch(() => null),
			]);

			const alumni = supaUser?.email ? await getAlumniByEmail(supaUser.email).catch(() => null) : null;
			const responses = alumni?.id ? await getUserTracerResponses(alumni.id).catch(() => []) : [];
			const answeredIds = new Set(
				responses
					.map((response) => response?.form?.id || response?.form_id)
					.filter(Boolean)
			);

			const data = Array.isArray(forms) ? forms : [];
			if (!isMounted.current) return;

			if (isMounted.current) {
				setTracers(data);
				setAnsweredFormIds(answeredIds);
			}
		} catch (err) {
			if (!isMounted.current) return;
			const msg = err?.response?.data?.message || err?.message || 'Failed to load';
			const status = err?.response?.status;
			setError(status ? `${status}: ${msg}` : msg);
			setTracers([]);
		} finally {
			if (isMounted.current) setLoading(false);
		}
	}, []);

	useEffect(() => {
		isMounted.current = true;
		fetchTracers();
		return () => {
			isMounted.current = false;
		};
	}, [fetchTracers]);

	useEffect(() => {
		if (modalVisible && selectedTracer) {
			const formId = selectedTracer?.id || selectedTracer?.form_id;
			if (formId) checkUserResponse(formId);
		}
	}, [modalVisible, selectedTracer, checkUserResponse]);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await fetchTracers();
		} finally {
			if (isMounted.current) setRefreshing(false);
		}
	}, [fetchTracers]);

	const checkUserResponse = useCallback(async (formId) => {
		if (!formId) return;
		try {
			setCheckingResponse(true);
			setHasDraftInProgress(false);
			const supaUser = await getCurrentUser().catch(() => null);
			const alumni = supaUser?.email ? await getAlumniByEmail(supaUser.email).catch(() => null) : null;
			if (!alumni?.id) {
				if (isMounted.current) {
					setHasAnswered(false);
					setHasDraftInProgress(false);
				}
				return;
			}

			const responses = await getUserTracerResponses(alumni.id).catch(() => []);
			const answered = responses.some((response) => String(response?.form?.id || response?.form_id) === String(formId));
			const draft = answered ? null : await getDraftResponse(alumni.id, formId).catch(() => null);
			if (isMounted.current) {
				setHasAnswered(answered);
				setHasDraftInProgress(Boolean(draft?.id));
			}
		} catch (err) {
			// If endpoint doesn't exist or fails, assume not answered
			if (isMounted.current) {
				setHasAnswered(false);
				setHasDraftInProgress(false);
			}
		} finally {
			if (isMounted.current) setCheckingResponse(false);
		}
	}, []);

	const openDetails = useCallback((item) => {
		setSelectedTracer(item);
		setModalVisible(true);
		const formId = item?.id || item?.form_id;
		if (formId) checkUserResponse(formId);
	}, [checkUserResponse]);

	const closeModal = useCallback(() => {
		setModalVisible(false);
		setHasAnswered(false);
		setHasDraftInProgress(false);
		setCheckingResponse(false);
	}, []);

	const sectionedData = useMemo(() => {
		const completed = tracers.filter((t) => answeredFormIds.has(getFormId(t)));
		const pending = tracers.filter((t) => !answeredFormIds.has(getFormId(t)));

		const sections = [];
		if (pending.length > 0) {
			sections.push({
				title: 'Pending',
				data: pending,
			});
		}
		if (completed.length > 0) {
			sections.push({
				title: 'Completed',
				data: completed,
			});
		}

		return sections;
	}, [tracers, answeredFormIds]);

	const renderItem = useCallback(
		({ item }) => <TracerItem item={item} onPress={openDetails} completed={answeredFormIds.has(getFormId(item))} />,
		[answeredFormIds, openDetails]
	);

	const renderSectionHeader = useCallback(
		({ section: { title, data } }) => (
			<View style={styles.sectionHeaderWrap}>
				{title === 'Completed' ? <Text style={styles.sectionHeaderLabel}>Tracers</Text> : null}
				<Text style={styles.sectionHeader}>
					{title} ({data?.length || 0})
				</Text>
			</View>
		),
		[]
	);

	const detailsModal = useMemo(() => {
		if (!selectedTracer) return null;
		const title = getTitle(selectedTracer);
		const imageUrl = getImageUrl(selectedTracer);
		const entries = Object.entries(selectedTracer).filter(
			([k]) => !['id', 'form_id', 'form_title', 'title', 'name', 'form_description', 'description', 'form_header', 'header', 'status', 'is_active', 'admin', 'admin_id', 'created_at', 'updated_at', 'tracer_questions', 'tracerQuestions', 'questions'].includes(k)
		);

		return (
			<Modal visible={modalVisible} onRequestClose={closeModal} animationType="slide" statusBarTranslucent>
				<SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
					<View style={styles.container}>
						<ScrollView style={styles.modalScroll}>
							{imageUrl ? (
								<Image source={{ uri: imageUrl }} style={styles.modalImage} />
							) : (
								<View style={styles.modalImagePlaceholder} />
							)}
							<View style={styles.modalContent}>
								<Text style={styles.modalHeader}>{title}</Text>
								{getDesc(selectedTracer) ? (
									<>
										<Text style={styles.modalDescriptionLabel}>Description</Text>
										<Text style={styles.modalDescription}>{getDesc(selectedTracer)}</Text>
									</>
								) : null}
								{entries.map(([k, v]) => (
									<View key={k} style={styles.modalField}>
										<Text style={styles.modalFieldKey}>{fmtKey(k)}</Text>
										<Text style={styles.modalFieldValue}>{fmtVal(v)}</Text>
									</View>
								))}
							</View>
						</ScrollView>
						<Pressable
							style={[styles.modalActionButton, hasAnswered && styles.modalActionButtonDisabled, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
							onPress={() => {
								if (hasAnswered) return;
								const nav = navigation;
								if (nav && selectedTracer) {
									nav.navigate('TracerForm', { tracer: selectedTracer });
								}
							}}
							disabled={hasAnswered}
							accessibilityRole="button"
							hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
						>
							{checkingResponse ? <ActivityIndicator size="small" color="#F9FAFB" style={{ marginRight: 8 }} /> : null}
							<Text style={[styles.modalActionText, hasAnswered && styles.modalActionTextDisabled]}>
								{checkingResponse ? 'Checking...' : hasAnswered ? '✓ Response Recorded' : hasDraftInProgress ? 'Continue Answering Tracer' : 'Answer Tracer'}
							</Text>
						</Pressable>
						<Pressable style={styles.modalCloseButton} onPress={closeModal}>
							<Text style={styles.modalCloseText}>Close</Text>
						</Pressable>
					</View>
				</SafeAreaView>
			</Modal>
		);
	}, [selectedTracer, modalVisible, closeModal, hasAnswered, hasDraftInProgress, checkingResponse]);

	const emptyList = useMemo(
		() => (
			<View style={styles.emptyState}>
				{error ? <Text style={styles.emptyText}>{error}</Text> : null}
				<Text style={styles.emptyText}>No tracer forms found.</Text>
				<Pressable onPress={handleRefresh} style={{ marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#31429B', borderRadius: 8 }} accessibilityRole="button" hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
					<Text style={{ color: '#F9FAFB', fontWeight: '700' }}>Refresh</Text>
				</Pressable>
			</View>
		),
		[error, handleRefresh]
	);

	return (
		<SafeAreaView style={styles.safeArea} edges={['top']}>
			<View style={styles.container}>
				<BrandHeader />
				<View style={styles.backRow}>
					<Pressable
						style={styles.backButton}
						onPress={() => navigation.navigate('Home', { screen: 'Explore' })}
						accessibilityRole="button"
						hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
					>
						<Text style={styles.backButtonText}>{'‹  Explore'}</Text>
					</Pressable>
				</View>
				<View style={styles.contentWrap}>
					<Text style={styles.title}>Alumni Tracer</Text>
					<View style={styles.listContainer}>
					{loading ? (
						<ActivityIndicator size="large" color="#31429B" style={{ marginTop: 50 }} />
					) : (
						<SectionList
							sections={sectionedData}
							keyExtractor={(item, index) => String(getFormId(item) || index)}
							renderItem={renderItem}
							renderSectionHeader={renderSectionHeader}
							showsVerticalScrollIndicator={false}
							maxToRenderPerBatch={15}
							updateCellsBatchingPeriod={50}
							initialNumToRender={15}
							removeClippedSubviews={true}
							refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#31429B']} tintColor="#31429B" />}
							ListEmptyComponent={emptyList}
							scrollEnabled={true}
						/>
					)}
					</View>
				</View>
			</View>
			{detailsModal}
			<SafeAreaView edges={['bottom']} style={styles.bottomSafe} />
		</SafeAreaView>
	);
};

export default AlumniTracerScreen;

import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#31429B',
	},
	bottomSafe: {
		backgroundColor: '#F9FAFB',
	},
	container: {
		flex: 1,
		alignItems: 'stretch',
		justifyContent: 'flex-start',
		paddingHorizontal: 0,
		backgroundColor: '#F9FAFB',
	},
	backRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2 },
	backButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 2 },
	backButtonText: { fontSize: 15, color: '#31429B', fontWeight: '600' },
	contentWrap: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 12,
		backgroundColor: '#F9FAFB',
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		color: '#31429B',
		textAlign: 'center',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: '#4B5563',
		textAlign: 'center',
	},
	listContainer: {
		flex: 1,
		width: '100%',
		paddingHorizontal: 12,
		paddingTop: 12,
	},
	listItem: {
		flexDirection: 'column',
		backgroundColor: '#F9FAFB',
		borderRadius: 12,
		overflow: 'hidden',
		marginBottom: 10,
		shadowColor: '#000',
		shadowOpacity: 0.03,
		shadowRadius: 6,
		shadowOffset: { width: 0, height: 3 },
		elevation: 1,
	},
	cardImage: {
		width: '100%',
		height: 180,
		resizeMode: 'cover',
	},
	cardImagePlaceholder: {
		width: '100%',
		height: 180,
		backgroundColor: '#E6EEF9',
	},
	cardInfo: {
		paddingVertical: 12,
		paddingHorizontal: 12,
	},
	tracerName: {
		fontSize: 15,
		fontWeight: '800',
		color: '#24346F',
	},
	tracerMeta: {
		fontSize: 13,
		color: '#6B7280',
		marginTop: 2,
	},
	statusBadge: {
		alignSelf: 'flex-start',
		borderRadius: 999,
		paddingHorizontal: 10,
		paddingVertical: 4,
		marginTop: 6,
		marginBottom: 4,
	},
	statusBadgeActive: {
		backgroundColor: '#E7F8EE',
	},
	statusBadgeInactive: {
		backgroundColor: '#FDECEC',
	},
	statusBadgeText: {
		fontSize: 12,
		fontWeight: '700',
	},
	statusBadgeTextActive: {
		color: '#1F7A3F',
	},
	statusBadgeTextInactive: {
		color: '#B42318',
	},

	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 32,
	},
	emptyText: {
		color: '#6B7280',
		fontSize: 15,
		marginBottom: 12,
	},
	refreshButton: {
		backgroundColor: '#31429B',
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 8,
	},
	refreshButtonText: {
		color: '#F9FAFB',
		fontWeight: '700',
	},

	modalContent: {
		flex: 1,
		padding: 16,
		backgroundColor: '#F9FAFB',
		justifyContent: 'flex-start',
	},
	modalImage: {
		width: '100%',
		height: 240,
		resizeMode: 'cover',
	},
	modalImagePlaceholder: {
		width: '100%',
		height: 240,
		backgroundColor: '#E6EEF9',
	},
	modalHeader: {
		fontSize: 20,
		fontWeight: '800',
		color: '#31429B',
		marginBottom: 12,
		marginTop: 16,
	},
	modalDescriptionLabel: {
		fontSize: 13,
		color: '#31429B',
		fontWeight: '700',
		marginBottom: 6,
		marginTop: 12,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	modalScroll: {
		flex: 1,
		marginBottom: 12,
	},
	modalField: {
		marginBottom: 10,
	},
	modalFieldKey: {
		fontSize: 12,
		color: '#6B7280',
		textTransform: 'capitalize',
	},
	modalFieldValue: {
		fontSize: 15,
		color: '#24346F',
		marginTop: 2,
	},
	modalDescription: {
		fontSize: 14,
		color: '#1F2937',
		marginBottom: 12,
	},
	modalActionButton: {
		alignSelf: 'stretch',
		paddingVertical: 12,
		alignItems: 'center',
		borderRadius: 8,
		backgroundColor: '#F2C919',
		marginBottom: 10,
	},
	modalActionButtonDisabled: {
		backgroundColor: '#22C55E',
		opacity: 1,
	},
	modalActionText: {
		color: '#24346F',
		fontWeight: '700',
		fontSize: 16,
	},
	modalActionTextDisabled: {
		color: '#F9FAFB',
	},
	modalCloseButton: {
		alignSelf: 'stretch',
		paddingVertical: 12,
		alignItems: 'center',
		borderRadius: 8,
		backgroundColor: '#31429B',
	},
	modalCloseText: {
		color: '#F9FAFB',
		fontWeight: '700',
	},
	sectionHeader: {
		fontSize: 14,
		fontWeight: '700',
		color: '#31429B',
		paddingHorizontal: 12,
		paddingTop: 8,
		paddingBottom: 10,
		backgroundColor: '#F5F8FF',
		marginTop: 8,
		marginBottom: 4,
	},
	sectionHeaderWrap: {
		marginTop: 8,
	},
	sectionHeaderLabel: {
		fontSize: 12,
		fontWeight: '800',
		color: '#6B7280',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		paddingHorizontal: 12,
		marginBottom: 4,
	},
});

export default styles;


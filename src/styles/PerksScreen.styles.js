import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#31429B',
	},
	container: {
		flex: 1,
		backgroundColor: '#F4F6FB',
	},
	content: {
		flex: 1,
		paddingHorizontal: 14,
		paddingTop: 12,
		paddingBottom: 18,
	},
	searchWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#D1D5DB',
		paddingHorizontal: 12,
		height: 40,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: '#1F2937',
		paddingVertical: 0,
	},
	heading: {
		fontSize: 26,
		lineHeight: 31,
		fontWeight: '800',
		color: '#3A3A3A',
		marginTop: 14,
		marginBottom: 14,
	},
	headingTablet: {
		fontSize: 30,
		lineHeight: 36,
	},
	gridContent: {
		paddingBottom: 18,
	},
	gridRow: {
		gap: 12,
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 18,
		padding: 10,
		shadowColor: '#BFC6D3',
		shadowOpacity: 0.24,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 6 },
		elevation: 3,
	},
	cardPressed: {
		transform: [{ scale: 0.98 }],
		opacity: 0.94,
	},
	cardImageWrap: {
		borderRadius: 14,
		overflow: 'hidden',
		backgroundColor: '#E9EEF8',
		height: 160,
		marginBottom: 10,
	},
	cardImage: {
		width: '100%',
		height: '100%',
	},
	cardImagePlaceholder: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 12,
	},
	placeholderText: {
		marginTop: 6,
		fontSize: 12,
		color: '#9CA3AF',
		fontWeight: '600',
	},
	cardTitle: {
		fontSize: 18,
		lineHeight: 21,
		fontWeight: '800',
		color: '#444444',
		marginBottom: 6,
	},
	cardDescription: {
		fontSize: 13,
		lineHeight: 18,
		color: '#6B6B6B',
		minHeight: 54,
	},
	cardFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 10,
	},
	cardFooterText: {
		marginLeft: 6,
		fontSize: 12,
		color: '#4F4F4F',
		fontWeight: '500',
	},
	loadingWrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 36,
	},
	loadingText: {
		marginTop: 12,
		fontSize: 14,
		color: '#4B5563',
	},
	stateWrap: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 44,
	},
	stateTitle: {
		fontSize: 18,
		fontWeight: '800',
		color: '#31429B',
		marginBottom: 8,
	},
	stateText: {
		fontSize: 14,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 20,
		maxWidth: 280,
	},
	retryButton: {
		marginTop: 16,
		backgroundColor: '#31429B',
		paddingHorizontal: 18,
		paddingVertical: 10,
		borderRadius: 999,
	},
	retryButtonText: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '700',
	},
});

export default styles;

import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#31429B',
	},
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	content: {
		flexGrow: 1,
		paddingTop: 14,
		paddingBottom: 24,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	backButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: -4,
		marginRight: 6,
	},
	title: {
		fontSize: 26,
		lineHeight: 30,
		fontWeight: '800',
		color: '#404040',
	},
	searchWrap: {
		paddingBottom: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#E6E6E6',
		marginBottom: 16,
	},
	searchInput: {
		fontSize: 15,
		lineHeight: 20,
		color: '#2E2E2E',
		paddingVertical: 0,
	},
	sectionLabel: {
		fontSize: 12,
		lineHeight: 16,
		color: '#6D6D6D',
		marginBottom: 12,
	},
	resultsList: {
		paddingBottom: 10,
	},
	resultRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 18,
	},
	avatar: {
		width: 42,
		height: 42,
		borderRadius: 21,
		marginRight: 14,
		backgroundColor: '#E5E7EB',
	},
	resultName: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: '700',
		color: '#4D4D4D',
		flexShrink: 1,
	},
	emptyWrap: {
		paddingTop: 24,
		alignItems: 'center',
	},
	emptyText: {
		fontSize: 14,
		lineHeight: 20,
		color: '#6B7280',
		textAlign: 'center',
	},
});

export default styles;
import { Dimensions, StyleSheet } from 'react-native';
import { responsiveFontSize, responsiveHeight, responsiveSpacing, responsiveWidth } from '../utils/responsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#31429B',
	},
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	titleStrip: {
		backgroundColor: '#FFFFFF',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: responsiveSpacing(SCREEN_WIDTH, 18, 14, 24),
		paddingVertical: responsiveSpacing(SCREEN_HEIGHT, 12, 10, 18),
	},
	title: {
		fontSize: responsiveFontSize(SCREEN_WIDTH, 20, 18, 24),
		fontWeight: '800',
		color: '#31429B',
		lineHeight: responsiveFontSize(SCREEN_WIDTH, 23, 20, 28),
	},
	homeButton: {
		width: responsiveWidth(SCREEN_WIDTH, 0.11, 40, 48),
		height: responsiveWidth(SCREEN_WIDTH, 0.11, 40, 48),
		borderRadius: responsiveWidth(SCREEN_WIDTH, 0.055, 20, 24),
		backgroundColor: '#F2C919',
		alignItems: 'center',
		justifyContent: 'center',
	},
	body: {
		flex: 1,
	},
	cardSection: {
		backgroundColor: '#31429B',
		alignItems: 'center',
		justifyContent: 'center',
		flex: 1,
		paddingVertical: responsiveSpacing(SCREEN_HEIGHT, 8, 6, 14),
	},
	coverFrame: {
		borderRadius: 18,
		overflow: 'hidden',
		backgroundColor: '#2D3E97',
		shadowColor: '#000000',
		shadowOpacity: 0.22,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 7 },
		elevation: 7,
	},
	coverImage: {
		flex: 1,
		justifyContent: 'space-between',
	},
	coverImageInner: {
		borderRadius: 18,
	},
	coverShade: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(37, 48, 124, 0.42)',
	},
	coverAccentLeft: {
		position: 'absolute',
		left: responsiveSpacing(SCREEN_WIDTH, -14, -18, -8),
		top: responsiveSpacing(SCREEN_HEIGHT, 48, 34, 58),
		width: '52%',
		height: '54%',
		backgroundColor: 'rgba(248, 205, 18, 0.72)',
		transform: [{ rotate: '35deg' }],
	},
	coverAccentBottom: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		height: responsiveHeight(SCREEN_HEIGHT, 0.024, 16, 22),
		backgroundColor: '#F2C919',
	},
	coverHeaderText: {
		position: 'absolute',
		top: responsiveSpacing(SCREEN_HEIGHT, 14, 10, 18),
		right: responsiveSpacing(SCREEN_WIDTH, 14, 10, 18),
		alignItems: 'flex-end',
	},
	coverBrand: {
		fontSize: responsiveFontSize(SCREEN_WIDTH, 26, 22, 32),
		lineHeight: responsiveFontSize(SCREEN_WIDTH, 30, 24, 36),
		fontWeight: '900',
		color: '#FFFFFF',
	},
	coverLevels: {
		marginTop: 5,
		fontSize: responsiveFontSize(SCREEN_WIDTH, 13, 11, 15),
		lineHeight: responsiveFontSize(SCREEN_WIDTH, 16, 13, 19),
		color: '#FFFFFF',
		textAlign: 'right',
	},
	coverFooterText: {
		position: 'absolute',
		left: responsiveSpacing(SCREEN_WIDTH, 14, 10, 18),
		bottom: responsiveSpacing(SCREEN_HEIGHT, 12, 10, 16),
	},
	coverTagline: {
		fontSize: responsiveFontSize(SCREEN_WIDTH, 11, 10, 13),
		lineHeight: responsiveFontSize(SCREEN_WIDTH, 14, 12, 16),
		fontStyle: 'italic',
		color: '#FFFFFF',
		fontWeight: '600',
	},
	pageControls: {
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		paddingTop: responsiveSpacing(SCREEN_HEIGHT, 8, 6, 12),
		paddingBottom: responsiveSpacing(SCREEN_HEIGHT, 8, 6, 12),
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	navRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	navButton: {
		width: responsiveWidth(SCREEN_WIDTH, 0.095, 34, 42),
		height: responsiveWidth(SCREEN_WIDTH, 0.095, 34, 42),
		alignItems: 'center',
		justifyContent: 'center',
	},
	pageCounter: {
		marginTop: 4,
		fontSize: responsiveFontSize(SCREEN_WIDTH, 13, 11, 15),
		lineHeight: responsiveFontSize(SCREEN_WIDTH, 16, 13, 19),
		color: '#31429B',
		fontWeight: '600',
	},
	navbar: {
		height: responsiveHeight(SCREEN_HEIGHT, 0.085, 60, 74),
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingTop: 0,
		paddingBottom: 0,
		paddingHorizontal: 0,
		elevation: 10,
	},
	navbarButton: {
		bottom: responsiveSpacing(SCREEN_HEIGHT, 10, 8, 14),
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		height: '100%',
		paddingVertical: 0,
	},
});

export default styles;

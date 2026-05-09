import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandHeader from '../components/BrandHeader';
import styles from '../styles/ViewYearbookScreen.styles';

const pageTemplates = [
	{
		label: 'Class Moments',
		subtitle: 'Captured memories from campus life.',
		image: require('../../assets/images/LumiNUs_Load.png'),
	},
	{
		label: 'Student Leaders',
		subtitle: 'Recognizing the people who led the way.',
		image: require('../../assets/images/unnamed.png'),
	},
	{
		label: 'Campus Highlights',
		subtitle: 'A look back at the places we shared.',
		image: require('../../assets/images/frame-12.png'),
	},
];

const ViewYearbookScreen = () => {
	// SECTION: Page state
	const [pageIndex, setPageIndex] = React.useState(0);

	const totalPages = 25;
	const currentPage = pageTemplates[pageIndex % pageTemplates.length];
	const currentPageNumber = pageIndex + 1;
	const isFirstPage = pageIndex === 0;
	const isLastPage = pageIndex === totalPages - 1;

	// HANDLER: Go to the first page
	const goToFirstPage = () => {
		setPageIndex(0);
	};

	// HANDLER: Go to the previous page
	const goToPreviousPage = () => {
		setPageIndex((currentValue) => Math.max(0, currentValue - 1));
	};

	// HANDLER: Go to the next page
	const goToNextPage = () => {
		setPageIndex((currentValue) => Math.min(totalPages - 1, currentValue + 1));
	};

	// HANDLER: Go to the last page
	const goToLastPage = () => {
		setPageIndex(totalPages - 1);
	};

	return (
		<SafeAreaView style={styles.safeArea} edges={['top']}>
			<View style={styles.container}>
				<BrandHeader />

				{/* SECTION: Yearbook viewer */}
				<View style={screenStyles.content}>
					<View style={screenStyles.titleStrip}>
						<Text style={screenStyles.title}>Virtual Yearbook</Text>
						<View style={screenStyles.homeButton}>
							<Ionicons name="home-outline" size={28} color="#31429B" />
						</View>
					</View>

					<View style={screenStyles.coverArea}>
						<View style={screenStyles.coverCard}>
							<View style={screenStyles.coverAccentLeft} />
							<View style={screenStyles.coverAccentRight} />
							<View style={screenStyles.coverBottomBand} />

							<View style={screenStyles.coverHeaderRow}>
								<View style={screenStyles.coverBrandBlock}>
									<Image
										source={require('../../assets/images/nu-lipa-logo-portrait-white-version-21.png')}
										style={screenStyles.coverLogo}
										resizeMode="contain"
									/>
									<Text style={screenStyles.coverBrand}>NU LIPA</Text>
								</View>
								<Text style={screenStyles.coverLevels}>
									Senior High School{'\n'}College{'\n'}Graduate Studies
								</Text>
							</View>

							<View style={screenStyles.coverCenterWrap}>
								<View style={screenStyles.coverCenterPanel}>
									<View style={screenStyles.coverCenterImageFrame}>
										<Image
											source={currentPage.image}
											style={screenStyles.coverCenterImage}
											resizeMode="cover"
										/>
										<View style={screenStyles.coverImageTint} />
										<View style={screenStyles.coverImageLabel}>
											<Text style={screenStyles.coverImageTitle}>{currentPage.label}</Text>
											<Text style={screenStyles.coverImageSubtitle}>{currentPage.subtitle}</Text>
										</View>
									</View>
								</View>
							</View>

							<View style={screenStyles.coverFooterText}>
								<Text style={screenStyles.coverTagline}>Education that works.</Text>
							</View>
						</View>
					</View>

					<View style={screenStyles.pageControls}>
						<View style={screenStyles.navRow}>
							<Pressable
								onPress={goToFirstPage}
								hitSlop={10}
								style={screenStyles.pageButton}
								accessibilityRole="button"
								accessibilityLabel="First page"
							>
								<View style={screenStyles.doubleChevronGroup}>
									<Ionicons name="chevron-back" size={34} color="#31429B" />
									<Ionicons name="chevron-back" size={34} color="#31429B" style={screenStyles.doubleChevronOverlap} />
								</View>
							</Pressable>

							<Pressable
								onPress={goToPreviousPage}
								hitSlop={10}
								style={screenStyles.pageButton}
								accessibilityRole="button"
								accessibilityLabel="Previous page"
								disabled={isFirstPage}
							>
								<Ionicons
									name="chevron-back"
									size={34}
									color={isFirstPage ? '#A4B0D8' : '#31429B'}
								/>
							</Pressable>

							<Pressable
								onPress={goToNextPage}
								hitSlop={10}
								style={screenStyles.pageButton}
								accessibilityRole="button"
								accessibilityLabel="Next page"
								disabled={isLastPage}
							>
								<Ionicons
									name="chevron-forward"
									size={34}
									color={isLastPage ? '#A4B0D8' : '#31429B'}
								/>
							</Pressable>

							<Pressable
								onPress={goToLastPage}
								hitSlop={10}
								style={screenStyles.pageButton}
								accessibilityRole="button"
								accessibilityLabel="Last page"
							>
								<View style={screenStyles.doubleChevronGroup}>
									<Ionicons name="chevron-forward" size={34} color="#31429B" />
									<Ionicons name="chevron-forward" size={34} color="#31429B" style={screenStyles.doubleChevronOverlap} />
								</View>
							</Pressable>
						</View>

						<Text style={screenStyles.pageCounter}>Page {currentPageNumber} of {totalPages}</Text>
					</View>
				</View>
			</View>
		</SafeAreaView>
	);
};

const screenStyles = StyleSheet.create({
	content: {
		flex: 1,
		justifyContent: 'space-between',
		backgroundColor: '#FFFFFF',
	},
	titleStrip: {
		backgroundColor: '#FFFFFF',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18,
		paddingVertical: 12,
	},
	title: {
		fontSize: 20,
		fontWeight: '800',
		color: '#31429B',
		lineHeight: 23,
	},
	homeButton: {
		width: 36,
		height: 36,
		borderRadius: 28,
		backgroundColor: '#F2C919',
		alignItems: 'center',
		justifyContent: 'center',
	},
	coverArea: {
		flex: 1,
		backgroundColor: '#31429B',
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 12,
	},
	coverCard: {
		flex: 1,
		borderRadius: 26,
		backgroundColor: '#2D3E97',
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOpacity: 0.25,
		shadowRadius: 18,
		shadowOffset: { width: 0, height: 10 },
		elevation: 12,
	},
	coverAccentLeft: {
		position: 'absolute',
		left: -58,
		top: 120,
		width: 230,
		height: 220,
		backgroundColor: 'rgba(242, 201, 25, 0.96)',
		transform: [{ rotate: '35deg' }],
	},
	coverAccentRight: {
		position: 'absolute',
		right: 0,
		top: 230,
		width: 8,
		height: 140,
		backgroundColor: '#F2C919',
	},
	coverBottomBand: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		height: 18,
		backgroundColor: '#F2C919',
	},
	coverHeaderRow: {
		paddingTop: 22,
		paddingHorizontal: 22,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
	},
	coverBrandBlock: {
		flexDirection: 'row',
		alignItems: 'center',
		flexShrink: 1,
	},
	coverLogo: {
		width: 54,
		height: 54,
		marginRight: 10,
	},
	coverBrand: {
		fontSize: 20,
		lineHeight: 24,
		fontWeight: '900',
		color: '#FFFFFF',
	},
	coverLevels: {
		fontSize: 13,
		lineHeight: 17,
		color: '#FFFFFF',
		textAlign: 'right',
		fontWeight: '500',
		paddingTop: 4,
	},
	coverCenterWrap: {
		flex: 1,
		paddingHorizontal: 18,
		paddingTop: 24,
		paddingBottom: 34,
	},
	coverCenterPanel: {
		flex: 1,
		borderRadius: 24,
		overflow: 'hidden',
		backgroundColor: '#FFFFFF',
		borderWidth: 10,
		borderColor: 'rgba(242, 201, 25, 0.96)',
	},
	coverCenterImageFrame: {
		flex: 1,
		backgroundColor: '#E9EDF9',
		position: 'relative',
	},
	coverCenterImage: {
		...StyleSheet.absoluteFillObject,
		width: '100%',
		height: '100%',
	},
	coverImageTint: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(34, 46, 120, 0.22)',
	},
	coverImageLabel: {
		position: 'absolute',
		left: 16,
		right: 16,
		bottom: 16,
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderRadius: 18,
		backgroundColor: 'rgba(255, 255, 255, 0.92)',
	},
	coverImageTitle: {
		fontSize: 20,
		lineHeight: 24,
		fontWeight: '900',
		color: '#31429B',
	},
	coverImageSubtitle: {
		marginTop: 2,
		fontSize: 13,
		lineHeight: 17,
		color: '#31429B',
	},
	coverFooterText: {
		position: 'absolute',
		left: 28,
		bottom: 30,
	},
	coverTagline: {
		fontSize: 12,
		lineHeight: 16,
		fontStyle: 'italic',
		color: '#FFFFFF',
		fontWeight: '600',
	},
	pageControls: {
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		paddingTop: 8,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	navRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	pageButton: {
		paddingHorizontal: 4,
		paddingVertical: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	doubleChevronGroup: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	doubleChevronOverlap: {
		marginLeft: -12,
	},
	pageCounter: {
		marginTop: 6,
		fontSize: 13,
		lineHeight: 16,
		color: '#31429B',
		fontWeight: '600',
	},
});

export default ViewYearbookScreen;

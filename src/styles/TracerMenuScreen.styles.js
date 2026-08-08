// TracerMenuScreen.styles.js
import { StyleSheet, Platform, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isSmallDevice = SCREEN_WIDTH < 375;
const isTablet = SCREEN_WIDTH >= 768;

const COLORS = {
  // NU Blue-based Space Palette
  deepSpace: '#1A2247',        // Darker than NU blue but still space-like
  spaceNavy: '#1E2A52',        // Slightly lighter deep space
  midnight: '#24305E',         // Card backgrounds
  darkBlue: '#2A3870',         // Card alt
  cosmos: '#32418C',           // NU Brand Blue (base reference)
  
  // Accent Colors
  goldStar: '#FFD404',
  goldGlow: '#FFE566',
  goldLight: '#FFF3B0',
  starlight: '#F0F2FF',
  nebulaPurple: '#7C3AED',
  nebulaPink: '#EC4899',
  nebulaCyan: '#06B6D4',
  nebulaBlue: '#60A5FA',
  nebulaGreen: '#10B981',
  
  // Functional
  white: '#FFFFFF',
  whiteAlpha06: 'rgba(255,255,255,0.06)',
  whiteAlpha08: 'rgba(255,255,255,0.08)',
  whiteAlpha10: 'rgba(255,255,255,0.10)',
  whiteAlpha12: 'rgba(255,255,255,0.12)',
  whiteAlpha15: 'rgba(255,255,255,0.15)',
  whiteAlpha20: 'rgba(255,255,255,0.20)',
  whiteAlpha30: 'rgba(255,255,255,0.30)',
  whiteAlpha40: 'rgba(255,255,255,0.40)',
  whiteAlpha50: 'rgba(255,255,255,0.50)',
  whiteAlpha60: 'rgba(255,255,255,0.60)',
  whiteAlpha70: 'rgba(255,255,255,0.70)',
  whiteAlpha80: 'rgba(255,255,255,0.80)',
  whiteAlpha90: 'rgba(255,255,255,0.90)',
  cardBg: '#24305E',
  cardBgAlt: '#2A3870',
  border: 'rgba(255,255,255,0.10)',
  borderLight: 'rgba(255,255,255,0.15)',
  textPrimary: '#F0F2FF',
  textSecondary: '#C8CDE8',
  textMuted: '#8B90B8',
};

const FONTS = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

const GLOW = Platform.select({
  ios: {
    shadowColor: COLORS.goldStar,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  android: { elevation: 8 },
  default: {},
});

const styles = StyleSheet.create({
  // ─────────────────────────────────────────────
  // LAYOUT
  // ─────────────────────────────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.deepSpace,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.deepSpace,
  },
  scrollContent: {
    paddingTop: 12, // Extra space below header
    paddingBottom: 40,
  },

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    marginTop: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.deepSpace,
  },
  loadingText: {
    marginTop: 20,
    color: COLORS.whiteAlpha60,
    fontSize: 15,
    fontFamily: FONTS.medium,
  },

  // ─────────────────────────────────────────────
  // STARS / CONSTELLATION BACKGROUND
  // ─────────────────────────────────────────────
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // ─────────────────────────────────────────────
  // HERO SECTION
  // ─────────────────────────────────────────────
  heroSection: {
    marginTop: 100,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: FONTS.bold,
    fontSize: isSmallDevice ? 26 : isTablet ? 38 : 32,
    color: COLORS.starlight,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: isSmallDevice ? 13 : isTablet ? 18 : 15,
    color: COLORS.whiteAlpha60,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.3,
  },

  // ─────────────────────────────────────────────
  // PROGRESS SECTION (Stars + Percentage)
  // ─────────────────────────────────────────────
  progressSection: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.whiteAlpha50,
    letterSpacing: 2,
    marginBottom: 14,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  progressStarContainer: {
    flexDirection: 'row',
    marginRight: 12,
  },
  progressStar: {
    fontSize: isSmallDevice ? 18 : 22,
    marginHorizontal: 1,
  },
  progressStarEmpty: {
    opacity: 0.2,
  },
  progressPercentContainer: {
    backgroundColor: COLORS.goldStar + '20',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.goldStar + '30',
  },
  progressPercentText: {
    fontFamily: FONTS.bold,
    fontSize: isSmallDevice ? 18 : 22,
    color: COLORS.goldStar,
  },
  
  // Progress bar
  progressBarContainer: {
    marginBottom: 18,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: COLORS.whiteAlpha08,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 10,
    backgroundColor: COLORS.goldStar,
    borderRadius: 5,
  },

  // Milestones
  milestonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  milestoneItem: {
    alignItems: 'center',
  },
  milestoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.whiteAlpha15,
    marginBottom: 6,
  },
  milestoneDotReached: {
    backgroundColor: COLORS.goldStar,
    ...GLOW,
  },
  milestoneLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.whiteAlpha40,
  },
  milestoneLabelReached: {
    color: COLORS.whiteAlpha80,
  },

  // ─────────────────────────────────────────────
  // SECTION HEADER
  // ─────────────────────────────────────────────
  phasesSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: isSmallDevice ? 18 : 22,
    marginRight: 10,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: isSmallDevice ? 17 : isTablet ? 24 : 20,
    color: COLORS.starlight,
  },
  sectionBadge: {
    backgroundColor: COLORS.whiteAlpha08,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha12,
  },
  sectionBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.whiteAlpha60,
  },

  // ─────────────────────────────────────────────
  // EMPTY STATE
  // ─────────────────────────────────────────────
  emptyState: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: isSmallDevice ? 32 : 44,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: isSmallDevice ? 40 : 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: isSmallDevice ? 17 : 20,
    color: COLORS.starlight,
    marginBottom: 10,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: isSmallDevice ? 13 : 14,
    color: COLORS.whiteAlpha40,
    textAlign: 'center',
    lineHeight: 21,
  },

  // ─────────────────────────────────────────────
  // PHASE CARD
  // ─────────────────────────────────────────────
  phaseCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  phaseCardDone: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: '#1C2A4A',
  },
  accentLine: {
    height: 3,
    width: '100%',
  },
  phaseCardContent: {
    padding: isSmallDevice ? 14 : 18,
  },
  phaseHeader: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  phaseIconContainer: {
    width: isSmallDevice ? 44 : 52,
    height: isSmallDevice ? 44 : 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha06,
  },
  phaseIcon: {
    fontSize: isSmallDevice ? 22 : 26,
  },
  phaseHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  phaseHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 8,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha08,
  },
  phaseBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 7,
  },
  phaseBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  completedBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.nebulaGreen,
    letterSpacing: 0.5,
  },
  phaseTitle: {
    fontFamily: FONTS.bold,
    fontSize: isSmallDevice ? 15 : 17,
    color: COLORS.starlight,
    lineHeight: isSmallDevice ? 21 : 24,
  },
  phaseSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: isSmallDevice ? 12 : 13,
    color: COLORS.whiteAlpha60,
    marginTop: 3,
    lineHeight: 18,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressPin: {
    fontSize: 13,
    marginRight: 5,
  },
  progressCount: {
    fontFamily: FONTS.bold,
    fontSize: isSmallDevice ? 14 : 16,
  },
  progressTotal: {
    fontFamily: FONTS.regular,
    fontSize: isSmallDevice ? 12 : 13,
    color: COLORS.whiteAlpha50,
  },
  progressPercent: {
    fontFamily: FONTS.bold,
    fontSize: isSmallDevice ? 13 : 14,
  },
  progressBarCardBg: {
    height: 7,
    backgroundColor: COLORS.whiteAlpha08,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarCardFill: {
    height: 7,
    borderRadius: 4,
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 2,
  },
  actionHintText: {
    fontFamily: FONTS.medium,
    fontSize: isSmallDevice ? 12 : 13,
    color: COLORS.whiteAlpha50,
    marginRight: 5,
  },
  actionArrow: {
    fontFamily: FONTS.bold,
    fontSize: 16,
  },

  // ─────────────────────────────────────────────
  // VIEW ALL BUTTON
  // ─────────────────────────────────────────────
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 8,
    backgroundColor: COLORS.whiteAlpha08,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha12,
  },
  viewAllText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.goldStar,
    letterSpacing: 0.3,
  },

  // ─────────────────────────────────────────────
  // SHARE YOUR JOURNEY SECTION
  // ─────────────────────────────────────────────
  journeySection: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: isSmallDevice ? 20 : 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  journeyTitle: {
    fontFamily: FONTS.bold,
    fontSize: isSmallDevice ? 18 : isTablet ? 26 : 22,
    color: COLORS.starlight,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: isSmallDevice ? 25 : 30,
  },
  journeyHighlight: {
    fontFamily: FONTS.bold,
    fontSize: isSmallDevice ? 14 : isTablet ? 18 : 16,
    color: COLORS.goldStar,
    textAlign: 'center',
    marginBottom: 10,
  },
  journeyText: {
    fontFamily: FONTS.regular,
    fontSize: isSmallDevice ? 13 : 14,
    color: COLORS.whiteAlpha70,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  
  // Mascot Image Container
  mascotContainer: {
    width: isSmallDevice ? 160 : 190,
    height: isSmallDevice ? 120 : 150,
    // borderRadius: isSmallDevice ? 60 : 75,
    // backgroundColor: COLORS.spaceNavy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    // borderWidth: 2,
    borderColor: COLORS.goldStar + '30',
    overflow: 'hidden',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mascotPlaceholder: {
    fontSize: isSmallDevice ? 40 : 55,
  },

  // Alumni count
  alumniCountContainer: {
    backgroundColor: COLORS.spaceNavy,
    borderRadius: 16,
    padding: isSmallDevice ? 14 : 16,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.goldStar + '20',
  },
  alumniCountText: {
    fontFamily: FONTS.regular,
    fontSize: isSmallDevice ? 13 : 14,
    color: COLORS.whiteAlpha80,
    textAlign: 'center',
    lineHeight: 22,
  },
  alumniCountNumber: {
    fontFamily: FONTS.bold,
    color: COLORS.goldStar,
    fontSize: isSmallDevice ? 16 : 20,
  },

  // ─────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: COLORS.whiteAlpha20,
    marginBottom: 14,
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.whiteAlpha40,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  footerStars: {
    fontSize: 14,
    marginTop: 8,
    letterSpacing: 8,
    color: COLORS.whiteAlpha20,
  },
});

export { COLORS, FONTS };
export default styles;
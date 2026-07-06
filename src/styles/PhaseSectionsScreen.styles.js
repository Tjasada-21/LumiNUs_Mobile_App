// PhaseSectionsScreen.styles.js
import { StyleSheet, Platform } from "react-native";

const COLORS = {
  deepSpace: '#0A0E27',
  spaceNavy: '#0F1535',
  midnight: '#131A3D',
  darkBlue: '#1A2355',
  cardBg: '#161E4A',
  cardBgAlt: '#1A2358',
  
  goldStar: '#FFD404',
  starlight: '#F0F2FF',
  nebulaBlue: '#3B82F6',
  nebulaGreen: '#10B981',
  
  white: '#FFFFFF',
  whiteAlpha06: 'rgba(255,255,255,0.06)',
  whiteAlpha08: 'rgba(255,255,255,0.08)',
  whiteAlpha10: 'rgba(255,255,255,0.10)',
  whiteAlpha12: 'rgba(255,255,255,0.12)',
  whiteAlpha15: 'rgba(255,255,255,0.15)',
  whiteAlpha20: 'rgba(255,255,255,0.20)',
  whiteAlpha40: 'rgba(255,255,255,0.40)',
  whiteAlpha50: 'rgba(255,255,255,0.50)',
  whiteAlpha60: 'rgba(255,255,255,0.60)',
  whiteAlpha70: 'rgba(255,255,255,0.70)',
  whiteAlpha80: 'rgba(255,255,255,0.80)',
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.12)',
  textPrimary: '#F0F2FF',
  textSecondary: '#C8CDE8',
  textMuted: '#7B83A8',
};

const FONTS = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

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
    paddingBottom: 40,
  },
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.deepSpace,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.whiteAlpha60,
    fontSize: 15,
    fontFamily: FONTS.medium,
  },

  // ─────────────────────────────────────────────
  // BACK BUTTON
  // ─────────────────────────────────────────────
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.goldStar,
    marginLeft: 8,
  },

  // ─────────────────────────────────────────────
  // PHASE PROGRESS HEADER
  // ─────────────────────────────────────────────
  phaseProgressContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  phaseInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  phaseIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha10,
  },
  phaseIconEmoji: {
    fontSize: 24,
  },
  phaseInfoText: {
    flex: 1,
  },
  phaseLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.whiteAlpha40,
    letterSpacing: 2,
    marginBottom: 2,
  },
  phaseName: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.starlight,
  },
  phaseProgressBar: {
    // contained
  },
  phaseProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseProgressLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.whiteAlpha60,
  },
  phaseProgressPct: {
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  phaseProgressBg: {
    height: 8,
    backgroundColor: COLORS.whiteAlpha08,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  phaseProgressFill: {
    height: 8,
    borderRadius: 4,
  },
  phaseProgressDetail: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.whiteAlpha50,
    textAlign: 'center',
  },

  // ─────────────────────────────────────────────
  // SECTIONS LIST
  // ─────────────────────────────────────────────
  sectionsList: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionListTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.starlight,
  },
  sectionListBadge: {
    backgroundColor: COLORS.whiteAlpha08,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha12,
  },
  sectionListBadgeText: {
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
    padding: 44,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.starlight,
    marginBottom: 10,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.whiteAlpha40,
    textAlign: 'center',
    lineHeight: 21,
  },

  // ─────────────────────────────────────────────
  // SECTION CARD
  // ─────────────────────────────────────────────
  sectionCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  sectionCardLocked: {
    opacity: 0.5,
  },
  accentLine: {
    height: 3,
    width: '100%',
  },
  sectionCardContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sectionNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.whiteAlpha08,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.whiteAlpha10,
  },
  sectionNumber: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.whiteAlpha60,
  },
  sectionHeaderInfo: {
    flex: 1,
  },
  sectionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  questionCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.whiteAlpha06,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  questionCountText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.starlight,
    lineHeight: 21,
  },
  sectionTitleLocked: {
    color: COLORS.whiteAlpha40,
  },
  sectionDescription: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.whiteAlpha50,
    marginTop: 3,
    lineHeight: 17,
  },
  sectionDescriptionLocked: {
    color: COLORS.whiteAlpha20,
  },
  sectionStatusIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusEmoji: {
    fontSize: 22,
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
    fontSize: 13,
    color: COLORS.whiteAlpha40,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export { COLORS, FONTS };
export default styles;
// SectionCompleteScreen.styles.js
import { StyleSheet } from "react-native";

const COLORS = {
  deepSpace: '#0A0E27',
  spaceNavy: '#0F1535',
  cardBg: '#161E4A',
  
  goldStar: '#FFD404',
  starlight: '#F0F2FF',
  nebulaBlue: '#3B82F6',
  nebulaGreen: '#10B981',
  nebulaPurple: '#7C3AED',
  
  white: '#FFFFFF',
  whiteAlpha08: 'rgba(255,255,255,0.08)',
  whiteAlpha10: 'rgba(255,255,255,0.10)',
  whiteAlpha15: 'rgba(255,255,255,0.15)',
  whiteAlpha20: 'rgba(255,255,255,0.20)',
  whiteAlpha40: 'rgba(255,255,255,0.40)',
  whiteAlpha50: 'rgba(255,255,255,0.50)',
  whiteAlpha60: 'rgba(255,255,255,0.60)',
  whiteAlpha70: 'rgba(255,255,255,0.70)',
  whiteAlpha80: 'rgba(255,255,255,0.80)',
  border: 'rgba(255,255,255,0.08)',
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
  safeArea: { flex: 1, backgroundColor: COLORS.deepSpace },
  container: { flex: 1, backgroundColor: COLORS.deepSpace },
  starsContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  confettiContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  content: {
    flex: 1, paddingHorizontal: 24, justifyContent: 'center',
    paddingBottom: 40,
  },

  // ─────────────────────────────────────────────
  // HERO / RING
  // ─────────────────────────────────────────────
  heroSection: {
    alignItems: 'center', marginBottom: 24,
  },
  ringContainer: {
    width: 120, height: 120, alignItems: 'center', justifyContent: 'center',
  },
  ringBg: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 6, borderColor: COLORS.whiteAlpha10, position: 'absolute',
  },
  ringArc: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 6, borderColor: 'transparent',
    borderTopColor: COLORS.goldStar, borderRightColor: COLORS.goldStar,
    position: 'absolute',
  },
  ringCenter: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.spaceNavy, alignItems: 'center',
    justifyContent: 'center', borderWidth: 2,
    borderColor: 'rgba(255,212,4,0.3)',
  },
  ringEmoji: { fontSize: 36 },

  // ─────────────────────────────────────────────
  // TITLES
  // ─────────────────────────────────────────────
  congratsLabel: {
    fontFamily: FONTS.bold, fontSize: 11, color: COLORS.goldStar,
    letterSpacing: 3, textAlign: 'center', marginBottom: 8,
  },
  congratsTitle: {
    fontFamily: FONTS.bold, fontSize: 28, color: COLORS.starlight,
    textAlign: 'center', marginBottom: 10,
  },
  congratsSubtitle: {
    fontFamily: FONTS.regular, fontSize: 14, color: COLORS.whiteAlpha60,
    textAlign: 'center', lineHeight: 21, marginBottom: 24,
    paddingHorizontal: 10,
  },

  // ─────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────
  statsContainer: {
    flexDirection: 'row', backgroundColor: COLORS.cardBg,
    borderRadius: 16, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statItem: {
    flex: 1, alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.bold, fontSize: 22, color: COLORS.goldStar,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: FONTS.regular, fontSize: 10, color: COLORS.whiteAlpha50,
    textAlign: 'center', lineHeight: 14,
  },
  statDivider: {
    width: 1, height: '80%', backgroundColor: COLORS.whiteAlpha10,
    alignSelf: 'center',
  },

  // ─────────────────────────────────────────────
  // ACHIEVEMENTS
  // ─────────────────────────────────────────────
  achievementsContainer: {
    marginBottom: 16, gap: 8,
  },
  achievementBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.cardBg, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: COLORS.whiteAlpha10,
  },
  achievementEmoji: {
    fontSize: 28, marginRight: 12,
  },
  achievementInfo: { flex: 1 },
  achievementTitle: {
    fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.starlight,
    marginBottom: 2,
  },
  achievementDescription: {
    fontFamily: FONTS.regular, fontSize: 11, color: COLORS.whiteAlpha50,
  },

  // ─────────────────────────────────────────────
  // XP CARD
  // ─────────────────────────────────────────────
  xpCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,212,4,0.06)', borderRadius: 14,
    padding: 14, marginBottom: 24, borderWidth: 1,
    borderColor: 'rgba(255,212,4,0.12)',
  },
  xpIcon: { fontSize: 28, marginRight: 12 },
  xpText: {
    fontFamily: FONTS.medium, fontSize: 13, color: COLORS.whiteAlpha70,
    flex: 1, lineHeight: 19,
  },

  // ─────────────────────────────────────────────
  // BUTTONS
  // ─────────────────────────────────────────────
  buttonsContainer: { gap: 10 },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.goldStar, paddingVertical: 15,
    borderRadius: 28, gap: 8,
    shadowColor: COLORS.goldStar, shadowOpacity: 0.3,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  primaryButtonText: {
    fontFamily: FONTS.bold, fontSize: 16, color: '#1A237E',
  },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.whiteAlpha08, paddingVertical: 15,
    borderRadius: 28, gap: 8, borderWidth: 1, borderColor: COLORS.goldStar + '30',
  },
  secondaryButtonText: {
    fontFamily: FONTS.semiBold, fontSize: 16, color: COLORS.goldStar,
  },
});

export { COLORS, FONTS };
export default styles;
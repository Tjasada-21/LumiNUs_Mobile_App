import { StyleSheet, Platform } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 120 : 100,
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
  },

  // --- WHITE HERO SECTION ---
  heroSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  heroBackRow: {
    marginBottom: 16,
    flexDirection: "row",
  },
  backIconBtn: {
    paddingRight: 10,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    backgroundColor: "#E2E8F0",
    marginRight: 20,
    borderWidth: 2,
    borderColor: "#F1F5F9",
  },
  heroCopy: {
    flex: 1,
  },
  name: {
    fontSize: 26,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    lineHeight: 30,
    marginBottom: 8,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFD404",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 10,
  },
  tagText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#31429B",
    fontFamily: "Poppins_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 14,
  },
  statText: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
  },
  statNumber: {
    fontSize: 14,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
  },
  
  // --- CONNECTION BUTTONS ---
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#31429B",
    borderRadius: 16,
    height: 36,
    gap: 6,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
  pendingButton: {
    backgroundColor: "#7C3AED",
  },
  disabledButton: {
    opacity: 0.7,
  },
  messageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#31429B",
    borderRadius: 16,
    height: 36,
    gap: 6,
  },
  messageButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
  disconnectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  // --- ABOUT ME ---
  aboutSection: {
    marginTop: 20,
  },
  sectionHeadingBlack: {
    fontSize: 20,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    marginBottom: 12,
  },
  aboutItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  aboutIcon: {
    width: 24,
    textAlign: "center",
  },
  aboutText: {
    fontSize: 15,
    color: "#333333",
    fontFamily: "Poppins_500Medium",
    marginLeft: 8,
    flex: 1,
  },

  // --- DARK SECTION ---
  darkSection: {
    backgroundColor: "#1F2B67",
    paddingTop: 32,
    paddingBottom: 40,
    width: "100%",
  },
  sectionHeadingYellow: {
    fontSize: 20,
    color: "#FFD404",
    fontFamily: "Poppins_700Bold",
    marginBottom: 12,
    paddingHorizontal: 20, // Insets the heading
  },
  biographyText: {
    fontSize: 14,
    lineHeight: 24,
    color: "#FFFFFF",
    fontFamily: "Poppins_400Regular",
    marginBottom: 32,
    paddingHorizontal: 20, // Insets the bio text
  },

  // --- WORK EXPERIENCE CARDS ---
  workScrollContent: {
    gap: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  workCard: {
    width: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  workBriefcase: {
    marginBottom: 12,
  },
  workTitle: {
    fontSize: 18,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },
  workSubtitle: {
    fontSize: 12,
    color: "#1C1C1E",
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  workPeriod: {
    fontSize: 12,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    marginBottom: 12,
  },
  workDescription: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },

  // --- SKILLS GRID ---
  skillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  skillPill: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skillText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
  viewAllButton: {
    alignSelf: "center",
    backgroundColor: "#FFD404",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewAllText: {
    color: "#1F2B67",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },

  // --- POSTS SECTION ---
  postsSection: {
    backgroundColor: "#F5F6FA",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },

  // --- POST STYLING (PORTED FROM FEED) ---
  repostWrapper: {
    backgroundColor: "#FFD404",
    borderRadius: 20,
    marginBottom: 16,
    paddingTop: 14,
  },
  repostBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  repostBannerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: "#E5E7EB",
  },
  repostBannerText: {
    fontSize: 14,
    color: "#1F2937",
    fontFamily: "Poppins_400Regular",
  },
  repostBannerName: {
    fontFamily: "Poppins_700Bold",
  },
  repostInnerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
  },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E5E7EB",
    marginRight: 12,
  },
  postHeaderTextWrap: {
    flex: 1,
    paddingRight: 8,
    justifyContent: "center",
  },
  postAuthorName: {
    fontSize: 16,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    marginBottom: 2,
  },
  postMeta: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Poppins_400Regular",
  },
  postMenuButton: {
    width: 28,
    height: 28,
    alignItems: "flex-end",
  },
  postCaption: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1C1C1E",
    fontFamily: "Poppins_400Regular",
    marginBottom: 12,
  },
  postSingleImageWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    width: "100%",
  },
  postTwoGrid: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  postTwoPrimaryTile: { flex: 1.15, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6" },
  postTwoSecondaryTile: { flex: 0.85, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6" },
  postThreeCollage: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  postThreeLeftTile: { flex: 1.45, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6", aspectRatio: 0.92 },
  postThreeRightColumn: { flex: 0.9, gap: 8, alignSelf: "stretch", justifyContent: "space-between" },
  postThreeRightTile: { flex: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6", aspectRatio: 1 },
  postFourGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  postFourGridTile: { width: "48.5%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6" },
  postFivePlusGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  postFivePlusTile: { width: "48.5%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6" },
  postCollageImage: { width: "100%", height: "100%", backgroundColor: "#F3F4F6" },
  postImageOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(20, 25, 42, 0.45)", alignItems: "center", justifyContent: "center" },
  postImageOverlayText: { fontSize: 28, color: "#F9FAFB", fontFamily: "Poppins_700Bold" },
  postReactionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 16, 
  },
  postActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  postActionCount: {
    fontSize: 14,
    color: "#31429B",
    fontFamily: "Poppins_500Medium",
  },
  emptyPostsText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    marginTop: 10,
  },

  stateWrap: {
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 20,
  },
  errorText: {
    color: "#B91C1C",
    textAlign: "center",
    fontSize: 15,
  },
  backActionButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#31429B",
    borderRadius: 14,
  },
  backActionButtonText: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default styles;
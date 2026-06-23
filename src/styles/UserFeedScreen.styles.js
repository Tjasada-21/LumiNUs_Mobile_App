import { Dimensions, StyleSheet, Platform } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF", // Matches the white background of HomeHeader
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA", // Light grey background for the feed
  },
  content: {
    paddingBottom: 24,
  },
  
  // --- SEARCH BAR (from mockup) ---
  searchContainer: {
    paddingHorizontal: 16,
    // Provide clearance for the absolutely positioned HomeHeader
    paddingTop: Platform.OS === "ios" ? 140 : 120, 
    paddingBottom: 8,
    backgroundColor: "#F5F6FA",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholderText: {
    fontSize: 16,
    color: "#888888",
    fontFamily: "Poppins_400Regular",
  },

  // --- REPOST WRAPPER ---
  repostWrapper: {
    backgroundColor: "#FFD404", // Solid yellow wrapper
    borderRadius: 20,
    marginHorizontal: 16,
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
    flexShrink: 1,
  },
  repostBannerName: {
    fontFamily: "Poppins_700Bold",
  },
  repostInnerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
  },

  // --- POST CARD ---
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
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
  announcementAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F9FAFB",
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
    justifyContent: "flex-start",
  },
  postCaption: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1C1C1E",
    fontFamily: "Poppins_400Regular",
    marginBottom: 12,
  },
  captionMention: {
    fontFamily: "Poppins_700Bold",
    color: "#31429B",
  },
  captionBlock: {
    marginBottom: 12,
  },
  captionMeasureWrap: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
    zIndex: -1,
  },
  captionMeasureText: {
    position: "relative",
  },
  readMoreButton: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  readMoreText: {
    fontSize: 14,
    color: "#31429B",
    fontFamily: "Poppins_600SemiBold",
  },
  announcementTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: "#1F2937",
    fontFamily: "Poppins_700Bold",
    marginBottom: 6,
  },

  // --- POST IMAGES ---
  postSingleImageWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    width: "100%",
  },
  postSingleImage: {
    width: "100%",
    height: "100%",
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
  postImagePressable: { width: "100%", height: "100%" },
  postMediaImage: { width: "100%", height: "100%", backgroundColor: "#F3F4F6" },
  postImageOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(20, 25, 42, 0.45)", alignItems: "center", justifyContent: "center",
  },
  postImageOverlayText: {
    fontSize: 28, color: "#F9FAFB", fontFamily: "Poppins_700Bold",
  },

  // --- POST ACTIONS (FOOTER) ---
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

  // --- LOADING / EMPTY STATES ---
  feedStateCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    paddingVertical: 40,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 20,
  },
  feedStateText: {
    fontSize: 14,
    color: "#5A5A5A",
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
  },
  emptySpace: {
    flex: 1,
    minHeight: 120,
  },

  // --- MODALS / VIEWER / ETC (UNCHANGED FUNCTIONAL STYLES) ---
  viewerBackdrop: { flex: 1, backgroundColor: "#1F2937", alignItems: "stretch", justifyContent: "flex-start" },
  viewerContent: { flex: 1, backgroundColor: "#1F2937", position: "relative" },
  viewerPager: { flex: 1 },
  viewerScrollContent: { flexGrow: 1 },
  viewerScrollItem: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, alignItems: "center", justifyContent: "center" },
  viewerImageCard: { width: "100%", height: "100%", overflow: "hidden", backgroundColor: "#1F2937" },
  viewerImagePressable: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  viewerImage: { backgroundColor: "transparent", alignSelf: "center" },
  viewerTopBar: { position: "absolute", top: 0, left: 0, right: 0, paddingTop: 48, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  viewerTopButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  viewerFooter: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 20, backgroundColor: "rgba(0, 0, 0, 0.70)" },
  viewerAuthorCard: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  viewerAuthorPressable: { marginRight: 12 },
  viewerAuthorAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#1F2937", borderWidth: 2, borderColor: "#2F80ED" },
  viewerAuthorTextWrap: { flex: 1 },
  viewerAuthorName: { fontSize: 20, fontWeight: "500", color: "#F9FAFB" },
  viewerAuthorMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  viewerAuthorMeta: { fontSize: 12, fontWeight: "600", color: "rgba(255, 255, 255, 0.82)" },
  viewerAuthorMetaSeparator: { fontSize: 11, fontWeight: "800", color: "rgba(255, 255, 255, 0.70)" },
  viewerActionsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingTop: 8, paddingBottom: 10 },
  viewerActionButton: { alignItems: "center", justifyContent: "center", gap: 6, minWidth: 72 },
  viewerActionLabel: { fontSize: 13, fontWeight: "600", color: "#F9FAFB" },
  viewerCountsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 2 },
  viewerCountText: { fontSize: 11, fontWeight: "700", color: "rgba(255, 255, 255, 0.70)" },
  repostModalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.58)", justifyContent: "flex-end" },
  repostModalSafeArea: { flex: 1, justifyContent: "flex-end" },
  repostModalCard: { width: "100%", height: "88%", borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#F9FAFB", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24 },
  repostModalTitle: { fontSize: 18, fontWeight: "900", color: "#24346F" },
  repostModalSubtitle: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 12 },
  repostCaptionInput: { minHeight: 118, maxHeight: 220, borderRadius: 14, borderWidth: 1, borderColor: "#D9DDE8", backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#24346F" },
  mentionPanel: { marginHorizontal: 12, marginTop: 4, borderRadius: 14, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D9E2FF", paddingVertical: 6, overflow: "hidden" },
  commentMentionPanel: { marginHorizontal: 12, marginTop: 4, borderRadius: 14, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#D9E2FF", paddingVertical: 6, overflow: "hidden" },
  mentionItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8 },
  mentionAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8, backgroundColor: "#E5E7EB" },
  mentionName: { flex: 1, color: "#24346F", fontSize: 13, fontWeight: "700" },
  repostModalActionsRow: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10 },
  repostCancelButton: { minWidth: 88, height: 40, borderRadius: 999, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#E2E8F0" },
  repostCancelButtonText: { fontSize: 13, fontWeight: "800", color: "#334155" },
  repostSubmitButton: { minWidth: 98, height: 40, borderRadius: 999, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#31429B" },
  repostSubmitButtonText: { fontSize: 13, fontWeight: "900", color: "#F9FAFB" },
  themedAlertBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.58)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  themedAlertCard: { width: "100%", maxWidth: 390, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#DCE3F5" },
  themedAlertTitle: { fontSize: 18, fontWeight: "900", color: "#24346F" },
  themedAlertMessage: { marginTop: 6, fontSize: 14, fontWeight: "600", color: "#475569" },
  themedAlertActionsRow: { marginTop: 16, flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  themedAlertButton: { minWidth: 88, height: 38, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#31429B", alignItems: "center", justifyContent: "center" },
  themedAlertButtonNeutral: { backgroundColor: "#E2E8F0" },
  themedAlertButtonDestructive: { backgroundColor: "#FEE2E2" },
  themedAlertButtonText: { fontSize: 13, fontWeight: "900", color: "#F9FAFB" },
  themedAlertButtonTextNeutral: { color: "#334155" },
  themedAlertButtonTextDestructive: { color: "#B42318" },
  postActionsBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.58)", alignItems: "stretch", justifyContent: "flex-end", paddingHorizontal: 0 },
  postActionsSafeArea: { flex: 1, justifyContent: "flex-end", alignItems: "stretch" },
  deleteLoadingBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.58)", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  deleteLoadingCard: { width: "100%", maxWidth: 320, backgroundColor: "#F9FAFB", borderRadius: 22, paddingVertical: 24, paddingHorizontal: 20, alignItems: "center", borderWidth: 1, borderColor: "#DCE3F5" },
  deleteLoadingTitle: { fontSize: 18, fontWeight: "900", color: "#24346F", marginTop: 14 },
  deleteLoadingText: { fontSize: 13, fontWeight: "600", color: "#475569", textAlign: "center", marginTop: 6 },
  postActionsCard: { width: "100%", backgroundColor: "#F9FAFB", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingBottom: 18, paddingHorizontal: 12, borderWidth: 0 },
  postActionsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  postActionsTitle: { fontSize: 18, fontWeight: "900", color: "#24346F" },
  postActionsCloseButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF2FF" },
  postActionsSubtitle: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 14 },
  postActionsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  postActionChoiceButton: { flex: 1, minHeight: 44, borderRadius: 999, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#EEF2FF" },
  postActionChoiceText: { fontSize: 13, fontWeight: "800", color: "#31429B" },
  postActionsLabel: { fontSize: 12, fontWeight: "800", color: "#475569", marginBottom: 8 },
  postVisibilityChoicesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  postVisibilityChoice: { borderWidth: 1, borderColor: "#D9E2FF", backgroundColor: "#F8FAFF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  postVisibilityChoiceSelected: { borderColor: "#AFC0F7", backgroundColor: "#EAF0FF" },
  postVisibilityChoiceText: { color: "#31429B", fontSize: 12, fontWeight: "800" },
  postDeleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2", paddingVertical: 10 },
  postDeleteButtonText: { color: "#B42318", fontSize: 13, fontWeight: "800" },

  // --- SLEEK NEW COMMENTS MODAL ---
  commentsModalBackdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.4)", justifyContent: "flex-end" },
  commentsSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, height: "94%" },
  commentsHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 40, marginBottom: 16, position: "relative" },
  commentsTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#1C1C1E" },
  commentsCloseButton: { position: "absolute", right: 0, top: 4, width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  
  commentsEmptyState: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 18, marginBottom: 16 },
  commentsEmptyText: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#94A3B8", textAlign: "center" },
  
  commentsBody: { flex: 1, minHeight: 0 },
  commentsList: { flex: 1, minHeight: 0 },
  commentsListContent: { paddingBottom: 8 },
  
  commentItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9" },
  commentContentColumn: { flex: 1, alignSelf: "stretch", minWidth: 0 },
  commentAuthorName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#1C1C1E", marginBottom: 2 },
  commentText: { fontSize: 14, lineHeight: 20, fontFamily: "Poppins_400Regular", color: "#333333" },
  commentMetaRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 12 },
  commentTimestamp: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  commentReplyButton: { paddingHorizontal: 0, paddingVertical: 0 },
  commentReplyButtonText: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#94A3B8" },
  
  commentThread: { marginBottom: 4 },
  commentItemReply: { marginLeft: 48 },
  
  viewRepliesRow: { marginTop: 0, marginLeft: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  viewRepliesLine: { width: 28, height: 1, backgroundColor: "#E2E8F0" },
  viewRepliesText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#31429B" },
  commentRepliesList: { marginTop: 0, paddingLeft: 0 },
  commentNestedRepliesList: { marginTop: 0, paddingLeft: 0 },
  hideRepliesRow: { marginTop: 6, marginLeft: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  hideRepliesText: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#31429B" },
  
  commentReplyHeaderRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  commentReplyingToHandle: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#94A3B8" },
  
  commentActionColumn: { alignItems: "center", justifyContent: "center", minWidth: 42, paddingTop: 0 },
  commentActionButton: { padding: 4, marginBottom: 2 },
  commentLikeCount: { marginTop: 1, fontSize: 11, fontFamily: "Poppins_600SemiBold", color: "#94A3B8" },
  
  // --- COMPOSER ---
  commentComposerSafeArea: { marginTop: 1, backgroundColor: "#FFFFFF" },
  commentComposer: { flexDirection: "row", alignItems: "flex-end", gap: 0, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 12 : 8 },
  commentComposerContent: { flex: 1 },
  
  commentReplyContext: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: "#F1F5F9" },
  commentReplyContextText: { flex: 1, fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#31429B" },
  commentReplyContextCancel: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  
  // Pill-shaped input to match ConvoScreen
  commentInputWrap: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#F1F5F9', borderRadius: 24, minHeight: 48, paddingLeft: 16, paddingRight: 6, paddingVertical: 6 },
  commentInput: { flex: 1, minHeight: 36, maxHeight: 100, fontSize: 15, color: '#1C1C1E', fontFamily: 'Poppins_400Regular', paddingTop: Platform.OS === 'ios' ? 8 : 4, paddingBottom: Platform.OS === 'ios' ? 8 : 4, marginRight: 8 },
  commentSendButtonInside: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#31429B', alignItems: 'center', justifyContent: "center", marginBottom: 0 },
  commentSendButtonDisabled: { opacity: 0.4 },
});

export default styles;
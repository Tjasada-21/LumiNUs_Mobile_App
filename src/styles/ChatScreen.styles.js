// styles/ChatScreen.styles.js
import { StyleSheet, Platform, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  // --- ORIGINAL CHAT CONVERSATION STYLES ---
  safeArea: {
    flex: 1,
    backgroundColor: "#32418C",
  },
  container: {
    flex: 1,
    backgroundColor: "#31429B",
  },
  chatScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  
  // Original header styles (for ConvoScreen)
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    zIndex: 2,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerProfileWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#32418C",
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    lineHeight: 20,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: "Poppins_400Regular",
    lineHeight: 16,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // Original body styles
  chatBody: {
    flex: 1,
    position: "relative",
    backgroundColor: "#FFFFFF",
  },
  messagesArea: {
    flex: 1,
    zIndex: 1,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },

  // Original empty state styles
  emptyConversationState: {
    flex: 1,
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyConversationFlipped: {
    transform: [{ scale: -1 }],
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 20,
  },
  emptyConversationLoadingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minWidth: 180,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#31429B",
  },
  emptyConversationLoadingText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 18,
  },
  emptyConversationTitle: {
    marginTop: 12,
    fontSize: 18,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    lineHeight: 22,
  },
  emptyConversationText: {
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
    color: "#94A3B8",
    fontFamily: "Poppins_400Regular",
    lineHeight: 18,
  },
  threadErrorText: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 11,
    color: "#EF4444",
    fontFamily: "Poppins_400Regular",
    lineHeight: 14,
  },

  // Original chat bubble styles
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 6,
  },
  messageRowOutgoing: {
    justifyContent: "flex-end",
  },
  messageRowIncoming: {
    justifyContent: "flex-start",
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: "#32418C",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 2,
  },
  messageBubbleOutgoing: {
    backgroundColor: "#31429B",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4,
  },
  messageBubbleIncoming: {
    backgroundColor: "#F1F5F9",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 20,
    borderWidth: 0,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  messageTextOutgoing: {
    color: "#FFFFFF",
    fontFamily: "Poppins_400Regular",
  },
  messageTextIncoming: {
    color: "#1C1C1E",
    fontFamily: "Poppins_400Regular",
  },
  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    justifyContent: "flex-end",
  },
  messageTime: {
    fontSize: 10,
    color: "#94A3B8",
    fontFamily: "Poppins_400Regular",
    lineHeight: 12,
  },

  // Original reactions styles
  reactionsRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  reactionBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reactionText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    lineHeight: 16,
  },

  // Original composer styles
  composerWrap: {
    backgroundColor: "#FFFFFF",
    zIndex: 10,
  },
  composerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  composerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  composerInputWrap: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  composerInput: {
    color: "#1C1C1E",
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    paddingVertical: 0,
    maxHeight: 160,
    minHeight: 32,
    lineHeight: 20,
  },
  composerEmojiButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  composerSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#31429B",
  },
  composerSendButtonDisabled: {
    opacity: 0.5,
  },
  composerFooterWrap: {
    gap: 6,
    backgroundColor: "#FFFFFF",
  },

  // Original attachment styles
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 16,
  },
  attachmentPreviewImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 10,
  },
  attachmentPreviewFileText: {
    marginLeft: 6,
    color: "#31429B",
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    lineHeight: 18,
  },
  attachmentPreviewRemove: {
    marginLeft: "auto",
  },

  // Original typing/mentions styles
  typingIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 20,
    marginBottom: 6,
  },
  typingBubble: {
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typingText: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontStyle: "italic",
    lineHeight: 16,
  },
  mentionPanel: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 4,
  },
  mentionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mentionAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    backgroundColor: "#32418C",
  },
  mentionName: {
    flex: 1,
    color: "#1C1C1E",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 18,
  },

  // Original modals styles
  reactionPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  reactionPickerContent: {
    width: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  reactionPickerTitle: {
    fontSize: 15,
    color: "#1C1C1E",
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 14,
    lineHeight: 20,
  },
  reactionPickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 14,
    gap: 8,
  },
  reactionPickerEmoji: {
    padding: 10,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    width: "100%",
    alignItems: "center",
    marginBottom: 6,
  },
  reactionPickerEmojiText: {
    fontSize: 15,
    color: "#1C1C1E",
    fontFamily: "Poppins_500Medium",
    lineHeight: 20,
  },
  reactionPickerClose: {
    marginTop: 6,
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 16,
  },
  reactionPickerCloseText: {
    color: "#DC2626",
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 20,
  },

  // ==========================================
  // CHAT LIST STYLES
  // ==========================================
  
  blueHeaderSection: {
    backgroundColor: "#32418C",
    paddingBottom: 20,
    position: "relative",
  },
  headerBgImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.25,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 20 : 10,
    paddingBottom: 14,
    zIndex: 2,
  },
  headerTitleWhite: {
    fontSize: 32,
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    lineHeight: 38,
  },
  iconButtonWhite: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconButtonYellow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F2C919",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },

  // Tab styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    marginHorizontal: 20,
    padding: 3,
    zIndex: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: "#31429B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: "Poppins_500Medium",
    lineHeight: 16,
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 16,
  },

  // White body
  whiteBodyContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  listArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Chat item styles
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  chatItemPressed: {
    opacity: 0.7,
  },
  chatAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#32418C",
    overflow: "hidden", 
  },
  chatInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  chatHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  chatName: {
    fontSize: 16,
    color: "#1C1C1E",
    fontFamily: "Poppins_600SemiBold",
    flexShrink: 1,
    lineHeight: 20,
  },
  starIcon: {
    marginLeft: 6,
  },
  chatSubRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chatMessage: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    flexShrink: 1,
    lineHeight: 18,
  },
  chatMessageUnread: {
    color: "#1C1C1E",
    fontFamily: "Poppins_600SemiBold",
  },
  chatTime: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    marginLeft: 6,
    lineHeight: 14,
  },
  unreadPill: {
    backgroundColor: "#31429B",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
    lineHeight: 12,
  },

  // Empty state
  emptyWrap: {
    paddingTop: 60,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    color: "#1C1C1E",
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 6,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
    lineHeight: 18,
  },

  // Skeleton/Shimmer
  skeletonListWrap: {
    paddingTop: 16,
  },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  skeletonAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
  },
  skeletonTextWrap: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  skeletonLinePrimary: {
    width: "60%",
    height: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonLineSecondary: {
    width: "80%",
    height: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
  },
  skeletonShimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 50,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },

  // Modals/Action sheets
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  actionSheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  actionSheetSafeArea: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  actionSheet: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 12 : 20,
  },
  actionSheetTitle: {
    fontSize: 16,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    marginBottom: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  actionIcon: {
    marginRight: 14,
  },
  actionText: {
    fontSize: 15,
    color: "#1C1C1E",
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 20,
  },

   // ===== AVATAR PROFILE MODAL (FIXED) =====
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  avatarModalSheetWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  avatarModalSafeArea: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  avatarModalSheet: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === "ios" ? 20 : 24,
  },
  avatarModalProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarModalPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#32418C",
  },
  avatarModalProfileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  avatarModalName: {
    fontSize: 17,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    lineHeight: 22,
  },
  avatarModalEmail: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    lineHeight: 18,
    marginTop: 2,
  },
  avatarModalDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 8,
  },
  avatarModalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  avatarModalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarModalItemText: {
    flex: 1,
    fontSize: 15,
    color: "#1C1C1E",
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 20,
  },

});

export default styles;
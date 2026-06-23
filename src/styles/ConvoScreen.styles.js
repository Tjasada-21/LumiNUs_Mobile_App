import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  chatScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  
  // -- HEADER --
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
    backgroundColor: "#E2E8F0",
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    fontFamily: "Poppins_400Regular",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // -- BODY --
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
    paddingTop: 16,
    paddingBottom: 24,
  },

  // -- EMPTY STATE --
  emptyConversationState: {
    flex: 1,
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyConversationFlipped: {
    transform: [{ scaleY: -1 }],
    alignItems: "center",
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
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  emptyConversationTitle: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: "800",
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
  },
  emptyConversationText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    color: "#94A3B8",
    fontFamily: "Poppins_400Regular",
  },
  threadErrorText: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 12,
    color: "#EF4444",
    fontFamily: "Poppins_400Regular",
  },

  // -- CHAT BUBBLES (iMessage Style Teardrops) --
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
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
    backgroundColor: "#E2E8F0",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 2,
  },
  // Sharp bottom-right corner for sender
  messageBubbleOutgoing: {
    backgroundColor: "#31429B",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4, 
  },
  // Sharp bottom-left corner for receiver
  messageBubbleIncoming: {
    backgroundColor: "#F1F5F9",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 20,
    borderWidth: 0, // Removed border for clean modern look
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
  },
  messageTextOutgoing: {
    color: "#FFFFFF",
  },
  messageTextIncoming: {
    color: "#1C1C1E",
  },
  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    justifyContent: "flex-end",
  },
  messageTime: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Poppins_400Regular",
  },

  // -- REACTIONS --
  reactionsRow: {
    flexDirection: "row",
    marginTop: 6,
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
    fontSize: 13,
  },

  // -- COMPOSER / INPUT --
  composerWrap: {
    backgroundColor: "#FFFFFF",
    zIndex: 10,
  },
  composerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9", // Soft separator line
  },
  composerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  // Soft gray pill matching the design
  composerInputWrap: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: "#F1F5F9", 
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  composerInput: {
    color: "#1C1C1E",
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    paddingVertical: 0,
    maxHeight: 160,
    minHeight: 36,
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
    gap: 8,
    backgroundColor: "#FFFFFF",
  },

  // -- ATTACHMENTS --
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
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
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
  },
  attachmentPreviewRemove: {
    marginLeft: "auto",
  },

  // -- TYPING / MENTIONS --
  typingIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 20,
    marginBottom: 8,
  },
  typingBubble: {
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typingText: {
    color: "#94A3B8",
    fontSize: 13,
    fontStyle: "italic",
    fontFamily: "Poppins_400Regular",
  },
  mentionPanel: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 6,
  },
  mentionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mentionAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    backgroundColor: "#E2E8F0",
  },
  mentionName: {
    flex: 1,
    color: "#1C1C1E",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },

  // -- MODALS (Reactions & Actions) --
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
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 16,
  },
  reactionPickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8,
  },
  reactionPickerEmoji: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  reactionPickerEmojiText: {
    fontSize: 16,
    color: "#1C1C1E",
    fontFamily: "Poppins_500Medium",
  },
  reactionPickerClose: {
    marginTop: 8,
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 16,
  },
  reactionPickerCloseText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
  },
});

export default styles;
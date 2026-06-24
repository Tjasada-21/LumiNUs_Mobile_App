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

  // --- HEADER ROW ---
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 16 : 8,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    marginLeft: 16,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerDraftsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    marginRight: 12,
  },
  headerPostButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#31429B",
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
  },
  headerPostButtonDisabled: {
    opacity: 0.4,
  },
  headerPostButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },

  // --- CONTENT AREA ---
  content: {
    padding: 20,
    paddingBottom: 24, // Reduced since toolbar isn't absolute anymore
  },
  postInput: {
    fontSize: 18,
    lineHeight: 26,
    color: "#1C1C1E",
    fontFamily: "Poppins_400Regular",
    minHeight: 120, // Forces the input area to be large enough to tap easily
  },

  // --- MENTIONS ---
  mentionPanel: {
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  mentionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  mentionName: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: "#31429B",
  },

  // --- IMAGE PREVIEWS ---
  previewImageWrap: {
    marginTop: 20,
    width: "100%",
  },
  previewMediaItem: {
    position: "relative",
    width: "100%",
  },
  previewImage: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  previewRemoveButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(28, 28, 30, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  previewGridItem: {
    position: "relative",
    width: "48%",
  },
  previewThumbnail: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },

  // --- BOTTOM TOOLBAR ---
  bottomToolbar: {
    flexDirection: "row",
    justifyContent: "center", 
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  pillButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1C1C1E",
    backgroundColor: "#FFFFFF",
  },
  pillText: {
    fontSize: 14,
    color: "#1C1C1E",
    fontFamily: "Poppins_500Medium",
  },

  // --- MODALS ---
  uploadModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  uploadModalCard: {
    width: "100%",
    maxWidth: 300,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  uploadModalTitle: {
    fontSize: 18,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    marginTop: 16,
    marginBottom: 6,
  },
  uploadModalText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
});

export default styles;
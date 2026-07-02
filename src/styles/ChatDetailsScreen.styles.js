import { StyleSheet, Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  
  // --- TOP ARTWORK WRAPPER ---
  headerArtworkWrap: {
    position: "relative",
    width: "100%",
    paddingBottom: 24,
  },
  doodleBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: 220, 
    opacity: 1, 
    zIndex: -1,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    height: 60, // Fixed height area to guarantee layout alignment
    justifyContent: "center",
    zIndex: 10,
  },
  backBtn: {
    alignSelf: "flex-start",
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // --- PROFILE SECTION ---
  profileSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 5,
    marginTop: 18, // Pushes avatar down so it sits perfectly in the background center
  },
  avatarCircular: {
    width: 84, // Reduced to match sleek standard sizes
    height: 84,
    borderRadius: 42,
    backgroundColor: "#E2E8F0",
    marginBottom: 16,
  },
  avatarSquareWrap: {
    width: 84, // Reduced to match sleek standard sizes
    height: 84,
    borderRadius: 24,
    backgroundColor: "#31429B", 
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  avatarSquare: {
    width: "100%",
    height: "100%",
  },
  profileName: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#1C1C1E",
    textAlign: "center",
  },

  // --- QUICK ACTIONS ---
  quickActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    marginTop: 24,
  },
  quickActionWrap: {
    alignItems: "center",
  },
  quickActionCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  quickActionLabel: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#6B7280",
    marginTop: 8,
  },

  // --- MEDIA SECTION ---
  sectionHeading: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#8A8F9A",
    marginLeft: 24,
    marginTop: 30,
    marginBottom: 12,
  },
  mediaScroll: {
    paddingHorizontal: 24,
    gap: 12,
  },
  mediaBox: {
    width: 130,
    height: 130,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
  },

  // --- ACTIONS SECTION ---
  actionsList: {
    paddingHorizontal: 24,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  actionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRowText: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#1C1C1E",
    marginLeft: 16,
  },

  // --- FOOTER ---
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: "#384A9C",
    alignItems: "center",
    justifyContent: "center",
  },
  footerLogo: {
    width: 140,
    height: 40,
  },

  // --- MODALS ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#1C1C1E",
  },
  editLabel: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#6B7280",
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#1C1C1E",
    marginBottom: 20,
  },
  saveGroupButton: {
    backgroundColor: "#31429B",
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  saveGroupButtonText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    fontSize: 15,
  },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#1C1C1E",
  },
  candidateList: {
    maxHeight: 300,
  },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  candidateAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  candidateName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
    color: "#1C1C1E",
    marginLeft: 12,
    marginRight: 10,
  },
  candidateAddButton: {
    backgroundColor: "#31429B",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  candidateAddButtonText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    fontSize: 13,
  },
});
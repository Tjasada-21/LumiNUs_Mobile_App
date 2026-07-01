import { StyleSheet, Dimensions, Platform } from "react-native";

const { width } = Dimensions.get("window");
const cardWidth = (width - 48) / 2; // 2 columns with 16 padding on edges and 16 gap

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1F2B67",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6", 
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  
  // --- HERO SECTION ---
  heroWrapper: {
    position: "relative",
    zIndex: 10,
    backgroundColor: "#F3F4F6", // Base behind the curved cut
  },
  heroBackground: {
    backgroundColor: "#31429B",
    paddingTop: Platform.OS === 'ios' ? 120 : 100, // Account for absolute TopHeaderDark
    paddingHorizontal: 20,
    alignItems: "center",
    paddingBottom: 60, 
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  
  heroImage: {
    width: 300,
    height: 200,
    marginTop: 10,
  },

  // --- FLOATING SEARCH BAR ---
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 999,
    marginTop: -25, // Forces it to float half over the blue hero and half over the white content
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#1C1C1E",
  },

  // --- WHITE CONTENT AREA ---
  whiteContentArea: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
    marginLeft: 4,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  // --- ALUMNI CARD ---
  cardWrapper: {
    width: cardWidth,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    alignItems: "center",
    width: "100%",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E2E8F0",
    marginBottom: 12,
  },
  cardName: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#1F2937",
    lineHeight: 20,
    marginBottom: 10,
    textAlign: "center",
    height: 40, 
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFD404",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 14,
  },
  tagText: {
    color: "#31429B",
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    marginLeft: 4,
  },

  // Simulated Mutual Connections
  mutualRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  mutualAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  mutualText: {
    fontSize: 9,
    fontFamily: "Poppins_400Regular",
    color: "#4B5563",
    marginLeft: 6,
    lineHeight: 12,
  },

  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#31429B",
    width: "100%",
    paddingVertical: 10,
    borderRadius: 999,
  },
  connectButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    marginLeft: 6,
  },

  // --- SHOW ALL BUTTON ---
  showAllButton: {
    width: "100%",
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#6B7280",
    borderRadius: 999,
    alignItems: "center",
    marginTop: 8,
  },
  showAllText: {
    color: "#4B5563",
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
  },

  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
});

export default styles;
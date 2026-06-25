import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF", 
  },
  container: {
    flex: 1,
    backgroundColor: "#31429B", 
  },
  
  // --- WHITE HEADER CARD ---
  whiteHeaderCard: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#1C1C1E",
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    marginRight: 24, // Maintained the gap for the back arrow
  },
  smallAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#31429B",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  smallAddText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    marginLeft: 6,
  },

  // --- MIDDLE BLUE SECTION ---
  middleBlueSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: "#31429B",
  },

  // --- COMPACT TABS ---
 tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    padding: 2, // Reduced padding to make the container thinner
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6, // Reduced height for thinner tabs
    borderRadius: 999,
  },
  activeTabButton: {
    backgroundColor: "#31429B",
    elevation: 0,
    shadowOpacity: 0,
  },
  tabText: {
    fontSize: 9, // Slightly smaller font
    color: "#94A3B8",
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
  },

  // --- SEARCH BAR ---
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 42,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1C1C1E",
    fontFamily: "Poppins_400Regular",
  },

  // --- WHITE BOTTOM SHEET ---
  whiteBottomSheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  listContent: {
    paddingBottom: 40,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  errorText: {
    color: "#B42318",
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },

  // --- LIST ITEMS (SEAMLESS) ---
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  listInfoArea: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E2E8F0",
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  nameText: {
    color: "#1C1C1E",
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    marginBottom: 2,
  },
  metaText: {
    color: "#475569",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  // --- BUTTONS ---
  messageButton: {
    backgroundColor: "#FFD404",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  messageButtonText: {
    color: "#31429B",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  declineButton: {
    backgroundColor: "#F1F5F9",
  },
  declineButtonText: {
    color: "#475569",
  },
  disabledButton: {
    backgroundColor: "#F1F5F9",
    elevation: 0,
    shadowOpacity: 0,
  },
  disabledButtonText: {
    color: "#94A3B8",
  },
});

export default styles;
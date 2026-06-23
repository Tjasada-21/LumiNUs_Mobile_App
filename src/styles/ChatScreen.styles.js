import { StyleSheet, Platform } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#32418C", // Sets top status bar area to match the blue header
  },
  container: {
    flex: 1,
    backgroundColor: "#31429B", 
  },
  
  // --- BLUE HEADER SECTION ---
  blueHeaderSection: {
    backgroundColor: "#32418C",
    paddingBottom: 24,
    position: "relative",
  },
  headerBgImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.25, // Adjusted to let the white stars/lines show subtly
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 24 : 12,
    paddingBottom: 16,
    zIndex: 2,
  },
  headerTitleWhite: {
    fontSize: 34,
    color: "#FFFFFF",
    fontWeight: "900",
    fontFamily: "Poppins_700Bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  headerAvatar: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E2E8F0",
  },

  // --- TRANSLUCENT TAB STYLES ---
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)", // Almost solid white pill
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
    fontWeight: "600",
    fontFamily: "Poppins_500Medium",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },

  // --- WHITE BODY CONTAINER ---
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
    paddingTop: 24, // Padding so the first item isn't hugging the curved edge
    paddingBottom: 40,
  },
  
  // --- CHAT ITEM STYLES ---
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  chatItemPressed: {
    opacity: 0.7,
  },
  chatAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E2E8F0",
  },
  chatInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  chatHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 18,
    color: "#1C1C1E",
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
    flexShrink: 1, 
  },
  starIcon: {
    marginLeft: 8,
  },
  chatSubRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chatMessage: {
    fontSize: 15,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    flexShrink: 1, 
  },
  chatMessageUnread: {
    color: "#1C1C1E",
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "700",
  },
  chatTime: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    marginLeft: 8,
  },
  unreadPill: {
    backgroundColor: "#31429B",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "Poppins_700Bold",
  },

  // --- EMPTY STATE ---
  emptyWrap: {
    paddingTop: 60,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    color: "#1C1C1E",
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },

  // --- SHIMMER / SKELETON ---
  skeletonListWrap: {
    paddingTop: 16,
  },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    overflow: "hidden",
  },
  skeletonAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
  },
  skeletonTextWrap: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  skeletonLinePrimary: {
    width: "60%",
    height: 18,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonLineSecondary: {
    width: "80%",
    height: 14,
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

  // --- MODALS / ACTION SHEETS ---
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
    paddingTop: 24,
    paddingBottom: Platform.OS === "ios" ? 12 : 24,
  },
  actionSheetTitle: {
    fontSize: 18,
    color: "#1C1C1E",
    fontWeight: "800",
    fontFamily: "Poppins_700Bold",
    marginBottom: 16,
    textAlign: "center",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  actionIcon: {
    marginRight: 16,
  },
  actionText: {
    fontSize: 16,
    color: "#1C1C1E",
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
  },
});

export default styles;
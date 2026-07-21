import { StyleSheet, Platform } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#32418C",
  },
  container: {
    flex: 1,
    backgroundColor: "#31429B",
  },

  // ===== BLUE HEADER =====
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
  backButton: {
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
  headerTitleWhite: {
    fontSize: 28,
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    lineHeight: 34,
  },

  // ===== TABS =====
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
    paddingVertical: 8,
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
    fontSize: 13,
    color: "#94A3B8",
    fontFamily: "Poppins_500Medium",
    lineHeight: 18,
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 18,
  },

  // ===== WHITE BODY =====
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
    paddingTop: 16,
    paddingBottom: 40,
  },

  // ===== DELETED BANNER =====
  deletedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 8,
  },
  deletedBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#991B1B",
    fontFamily: "Poppins_400Regular",
    lineHeight: 16,
  },

  // ===== CHAT ITEM =====
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  chatAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#32418C",
  },
  chatInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  chatHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    color: "#1C1C1E",
    fontFamily: "Poppins_600SemiBold",
    flexShrink: 1,
    lineHeight: 20,
  },
  groupBadge: {
    marginLeft: 6,
    backgroundColor: "#EBF0FF",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  chatSubText: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    lineHeight: 18,
    marginBottom: 2,
  },
  archivedDate: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Poppins_400Regular",
    lineHeight: 14,
  },
  expiryText: {
    fontSize: 11,
    color: "#DC2626",
    fontFamily: "Poppins_500Medium",
    lineHeight: 14,
  },
  expiryTextExpired: {
    color: "#94A3B8",
  },

  // ===== RESTORE BUTTON =====
  restoreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EBF0FF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  // ===== EMPTY STATE =====
  emptyWrap: {
    paddingTop: 80,
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

  // ===== SKELETON =====
  skeletonListWrap: {
    paddingTop: 16,
  },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
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
});

export default styles;
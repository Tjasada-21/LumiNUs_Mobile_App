import { StyleSheet } from "react-native";

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA", // Soft light gray background from image
  },
  
  // HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end", // Aligns content to the right
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
  },
  headerTitle: {
    top: 15,
    fontSize: 20,
    fontWeight: "900",
    color: "#2C3E50",
    fontFamily: "Poppins_700Bold",
    marginRight: 12,
  },
  backButton: {
    top: 15,
    padding: 4,
  },

  // LIST & CARDS
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100, // Space for footer
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: "#F3F4F6",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4B5563",
    fontFamily: "Poppins_400Regular",
  },
  nameText: {
    fontWeight: "800",
    color: "#1F2937",
    fontFamily: "Poppins_700Bold",
  },
  timeText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "600",
  },

  // CONNECTION REQUEST BUTTONS
  actionButtonsRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  acceptButton: {
    backgroundColor: "#2C3B89", // Dark blue pill
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  acceptButtonText: {
    color: "#F2C919", // Yellow text
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "Poppins_700Bold",
  },
  deleteButton: {
    backgroundColor: "#D1D5DB", // Light gray pill
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  deleteButtonText: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },

  // FOOTER
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 85,
    backgroundColor: "#31429B",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 15, // Lift for modern phone home bars
  },
  footerLogo: {
    width: 160,
    height: 50,
  },

  // UTILS
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
    fontFamily: "Poppins_600SemiBold",
  },
});
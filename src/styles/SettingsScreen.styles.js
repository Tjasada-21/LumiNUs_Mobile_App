import { StyleSheet, Platform } from "react-native";

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  
  // --- HEADER ---
  headerCard: {
    backgroundColor: "#FFFFFF",
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 24,
    // Shadow using bottom border approach instead
    borderBottomWidth: 1,
    borderBottomColor: "#E8EAFF",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8F9FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#32418C",
  },

  // --- MENU SECTIONS ---
  sectionBlock: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#666680",
    marginBottom: 10,
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: "#F8F9FF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E8EAFF",
    overflow: "hidden",
  },

  // --- MENU ROWS ---
  row: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  rowPressed: {
    backgroundColor: "rgba(50, 65, 140, 0.04)",
  },
  rowWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E8EAFF",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowIcon: {
    marginRight: 14,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    fontWeight: "500",
    color: "#1A1A2E",
  },

  // --- FOOTER ---
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: "#32418C",
    alignItems: "center",
    justifyContent: "center",
  },
  footerLogo: {
    width: 140,
    height: 40,
  },

  // ===================================
  // --- MODALS STYLING ---
  // ===================================
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EAFF",
  },
  modalBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8F9FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1A1A2E",
  },
  modalContent: {
    flex: 1,
    paddingTop: 16,
  },

  // --- NOTIFICATIONS MODAL ---
  notifCard: {
    backgroundColor: "#F8F9FF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E8EAFF",
    marginHorizontal: 20,
    overflow: "hidden",
  },
  notifRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EAFF",
  },
  notifRowLast: {
    borderBottomWidth: 0,
  },
  notifLabel: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    color: "#1A1A2E",
    flex: 1,
    paddingRight: 10,
  },

  // --- CHANGE PASSWORD MODAL ---
  inputWrap: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#666680",
    marginBottom: 8,
  },
  inputBoxContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FF",
    borderWidth: 1.5,
    borderColor: "#E8EAFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
  },
  inputBoxContainerFocused: {
    borderColor: "#32418C",
    backgroundColor: "#FFFFFF",
  },
  inputBox: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#1A1A2E",
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },

  // --- MODAL BUTTONS ---
  modalBottomWrap: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modalPrimaryButton: {
    backgroundColor: "#FBD117",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...Platform.select({
      ios: {
        shadowColor: "#FBD117",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: "#E8EAFF",
    shadowOpacity: 0,
    elevation: 0,
  },
  modalPrimaryButtonText: {
    color: "#32418C",
    fontSize: 16,
    fontFamily: "Poppins-Bold",
  },
});
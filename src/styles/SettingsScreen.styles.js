import { StyleSheet } from "react-native";

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
  
  // --- WHITE HEADER CARD ---
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 10,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#1C1C1E",
  },

  // --- MENU SECTIONS ---
  sectionBlock: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 10,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: "#F8FAFC", 
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // --- MENU ROWS ---
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowIcon: {
    marginRight: 14,
  },
  iconSpacer: {
    width: 22,
    marginRight: 14,
  },
  rowLabel: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#1C1C1E",
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
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#1C1C1E",
    marginLeft: 16,
  },
  modalContent: {
    flex: 1,
  },

  // --- NOTIFICATIONS MODAL ---
  notifCard: {
    backgroundColor: "#F4F6F8",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 10,
  },
  notifRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  notifLabel: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#333333",
    flex: 1,
    paddingRight: 10,
  },

  // --- CHANGE PASSWORD MODAL ---
  inputWrap: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#4A4A4A",
    marginBottom: 8,
  },
  inputBoxContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A0A0A0",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: "#FFFFFF",
  },
  inputBox: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#1C1C1E",
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
    backgroundColor: "#384A9C",
    height: 54,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryButtonText: {
    color: "#FFD404",
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
  },
});
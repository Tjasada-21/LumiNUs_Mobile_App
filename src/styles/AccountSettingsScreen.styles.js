import { StyleSheet, Platform } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // --- WHITE HEADER ---
  whiteHeaderCard: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 25,
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
  backBtn: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#1C1C1E",
  },

  // --- AVATAR SECTION ---
  avatarContainer: {
    alignSelf: "center",
    marginBottom: 30,
    position: "relative",
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E7EB",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFD404",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // --- FORM SECTIONS ---
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#4A4A4A",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#8A8F9A",
    marginBottom: 6,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: "#A0A0A0",
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#1C1C1E",
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
    justifyContent: "center",
  },
  dateInputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A0A0A0",
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  dateText: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#1C1C1E",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#A0A0A0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 140,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
    color: "#1C1C1E",
    backgroundColor: "#FFFFFF",
  },

  // --- HELPER TEXTS ---
  helperTextItalic: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    fontStyle: "italic",
    color: "#8A8F9A",
    marginTop: -8, // Pulls it closer to the input above
    marginBottom: 14,
    textAlign: "center",
  },
  helperTextItalicRight: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    fontStyle: "italic",
    color: "#8A8F9A",
    marginTop: 6,
    textAlign: "right",
  },

  // --- iOS Date Picker ---
  iosDateDoneBtn: {
    alignSelf: "flex-end",
    padding: 10,
    marginTop: -10,
    marginBottom: 10,
  },
  iosDateDoneText: {
    color: "#31429B",
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
  },

  // --- REMINDERS CARD ---
  remindersCard: {
    backgroundColor: "#384A9C",
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
  },
  remindersTitle: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#FFD404",
    marginBottom: 8,
  },
  remindersText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_400Regular",
    color: "#FFFFFF",
  },

  // --- BOTTOM BUTTONS ---
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  discardButton: {
    flex: 1,
    backgroundColor: "#9CA3AF", // Grey
    height: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  discardButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#FFD404", // Yellow
    height: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  saveButtonText: {
    color: "#31429B", // Dark Blue
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
  },
});

export default styles;
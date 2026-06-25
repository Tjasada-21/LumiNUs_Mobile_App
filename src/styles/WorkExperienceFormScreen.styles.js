import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#31429B", // Header background color bleeds into safe area
  },
  
  // --- HEADER ---
  header: {
    backgroundColor: "#31429B",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    zIndex: 10,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
  },

  // --- CONTENT ---
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    backgroundColor: "#FFFFFF", // Off-white/White background
    flexGrow: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    color: "#4A4A4A",
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 16,
    color: "#4A4A4A",
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    marginBottom: 12,
  },
  
  // --- FORM FIELDS ---
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#888888",
    fontFamily: "Poppins_500Medium",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#A0A0A0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1C1C1E",
    fontFamily: "Poppins_400Regular",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#A0A0A0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    color: "#1C1C1E",
    fontFamily: "Poppins_400Regular",
    backgroundColor: "#FFFFFF",
    minHeight: 120,
  },
  
  // --- RADIOS & CHECKBOXES ---
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  radioText: {
    marginLeft: 8,
    fontSize: 15,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
  },
  underlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: "#A0A0A0",
    marginLeft: 30, // Aligns under the text of the radio button
    marginRight: 20,
    paddingVertical: 4,
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    fontStyle: "italic",
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: "#A0A0A0",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: "#31429B",
    borderColor: "#31429B",
  },
  checkboxText: {
    fontSize: 14,
    color: "#888888",
    fontFamily: "Poppins_500Medium",
  },

  // --- ROWS & HELPERS ---
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  flex1: {
    flex: 1,
  },
  localFieldsContainer: {
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: "#888888",
    fontFamily: "Poppins_400Regular",
    marginBottom: 12,
  },
  italicHelperText: {
    fontSize: 12,
    color: "#888888",
    fontFamily: "Poppins_400Regular",
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 20,
    marginTop: -4,
  },
  charCountText: {
    fontSize: 12,
    color: "#888888",
    fontFamily: "Poppins_400Regular",
    fontStyle: "italic",
    textAlign: "right",
    marginTop: 6,
  },

  // --- REMINDER CARD ---
  reminderCard: {
    backgroundColor: "#31429B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
  },
  reminderTitle: {
    color: "#FFD404",
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    marginBottom: 8,
  },
  reminderText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    lineHeight: 18,
    marginBottom: 8,
  },

  // --- ACTION BUTTONS ---
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  discardButton: {
    flex: 1,
    backgroundColor: "#8F949F", // Medium Grey
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
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
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#31429B", // Deep Blue text on yellow
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
  },
});

export default styles;
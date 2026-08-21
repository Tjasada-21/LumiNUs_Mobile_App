import { StyleSheet, Dimensions, Platform } from "react-native";
const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: "100%", height: "100%" },
  overlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.35)" },
  keyboardView: { flex: 1, width: "100%" },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 24, paddingHorizontal: 20 },
  
  cardContainer: {
    width: width * 0.92,
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#32418C", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 12 },
    }),
  },
  cardScrollView: { borderRadius: 24 },
  cardContent: { padding: 24, paddingTop: 20, paddingBottom: 28 },
  
  logoContainer: { alignItems: "center", marginBottom: 16, paddingHorizontal: 10 },
  logo: { width: "85%", height: 45, alignSelf: "center" },
  
  headerSection: { alignItems: "center", marginBottom: 20, position: 'relative' },
  backButton: { position: 'absolute', top: 0, left: 0, padding: 5, zIndex: 10 },
  iconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF8E1", justifyContent: "center", alignItems: "center", marginBottom: 12, marginTop: 8 },
  title: { fontFamily: "Poppins-Bold", fontSize: 22, color: "#32418C", marginBottom: 6, textAlign: "center" },
  subtitle: { fontFamily: "Poppins-Regular", fontSize: 13, color: "#666680", textAlign: "center", lineHeight: 18, paddingHorizontal: 4 },
  
  sectionContainer: { marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, marginTop: 8 },
  sectionNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FBD117", justifyContent: "center", alignItems: "center", marginRight: 10 },
  sectionNumberText: { fontSize: 12, fontFamily: "Poppins-Bold", color: "#32418C" },
  sectionTitle: { fontSize: 16, fontFamily: "Poppins-SemiBold", color: "#32418C", flex: 1 },
  
  fieldContainer: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontFamily: "Poppins-Medium", color: "#666680", marginBottom: 6 },
  input: { backgroundColor: "#F8F9FF", borderWidth: 1.5, borderColor: "#E8EAFF", borderRadius: 10, padding: 14, fontSize: 15, fontFamily: "Poppins-Regular", color: "#1A1A2E" },
  inputFocused: { borderColor: "#32418C", backgroundColor: "#FFFFFF" },
  multilineInput: { minHeight: 100, textAlignVertical: 'top' },
  
  dropdownButton: { minHeight: 50, backgroundColor: "#F8F9FF", borderWidth: 1.5, borderColor: "#E8EAFF", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownButtonDisabled: { backgroundColor: "#F5F5FA", borderColor: "#E8EAFF", opacity: 0.5 },
  dropdownButtonActive: { borderColor: "#32418C", backgroundColor: "#FFFFFF" },
  dropdownText: { flex: 1, fontSize: 15, fontFamily: "Poppins-Regular", color: "#1A1A2E" },
  dropdownPlaceholder: { color: "#A0AABF" },
  
  buttonContainer: { marginTop: 8 },
  button: { backgroundColor: "#FBD117", paddingVertical: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", ...Platform.select({ ios: { shadowColor: "#FBD117", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 6 } }) },
  buttonDisabled: { backgroundColor: "#E8EAFF", shadowOpacity: 0, elevation: 0 },
  buttonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  buttonText: { fontFamily: "Poppins-Bold", color: "#32418C", fontSize: 16, marginLeft: 8 },
  buttonTextDisabled: { color: "#A0AABF" },
  footerText: { fontFamily: "Poppins-Regular", fontSize: 11, color: "#A0AABF", textAlign: "center", marginTop: 14 },
  
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.5)", justifyContent: "flex-end", height: "100%" },
  modalSafeArea: { flex: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 50, marginBottom: 0, maxHeight: "50%", ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16 }, android: { elevation: 12 } }) },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E8EAFF", alignSelf: "center", marginBottom: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Poppins-Bold", color: "#1A1A2E", flex: 1 },
  modalCloseButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F8F9FF", justifyContent: "center", alignItems: "center", marginLeft: 12 },
  optionList: { paddingBottom: 12 },
  optionRow: { paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#F0F2FF" },
  optionText: { fontSize: 15, fontFamily: "Poppins-Medium", color: "#1A1A2E" },
});

export default styles;
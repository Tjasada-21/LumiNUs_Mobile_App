import { StyleSheet, Dimensions, Platform } from "react-native";
const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  // These are the same as CompleteProfileScreen styles
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  keyboardView: {
    flex: 1,
    width: "100%",
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: width * 0.92,
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#32418C",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  cardScrollView: {
    borderRadius: 24,
  },
  cardContent: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  // Logo
  logoContainer: {
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  logo: {
    width: "85%",
    height: 45,
    alignSelf: "center",
  },
  // Header Section
  headerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF8E1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  title: {
    fontFamily: "Poppins-Bold",
    fontSize: 22,
    color: "#32418C",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: "#666680",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  // Section Headers
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  sectionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FBD117",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sectionNumberText: {
    fontSize: 12,
    fontFamily: "Poppins-Bold",
    color: "#32418C",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#32418C",
    flex: 1,
  },
  // Form Fields
  fieldContainer: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#666680",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8F9FF",
    borderWidth: 1.5,
    borderColor: "#E8EAFF",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#1A1A2E",
  },
  inputFocused: {
    borderColor: "#32418C",
    backgroundColor: "#FFFFFF",
  },
  dropdownButton: {
    minHeight: 50,
    backgroundColor: "#F8F9FF",
    borderWidth: 1.5,
    borderColor: "#E8EAFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownButtonDisabled: {
    backgroundColor: "#F5F5FA",
    borderColor: "#E8EAFF",
    opacity: 0.5,
  },
  dropdownButtonActive: {
    borderColor: "#32418C",
    backgroundColor: "#FFFFFF",
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#1A1A2E",
  },
  dropdownPlaceholder: {
    color: "#A0AABF",
  },
  // Button
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    backgroundColor: "#FBD117",
    paddingVertical: 16,
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
  buttonDisabled: {
    backgroundColor: "#E8EAFF",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontFamily: "Poppins-Bold",
    color: "#32418C",
    fontSize: 16,
    marginLeft: 8,
  },
  buttonTextDisabled: {
    color: "#A0AABF",
  },
  footerText: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: "#A0AABF",
    textAlign: "center",
    marginTop: 14,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
    // marginBottom: 50,
    height: "100%",
  },
  modalSafeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 0,
    paddingBottom: 50,
    maxHeight: "78%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  dobModalCard: {
    maxHeight: "88%",
    minHeight: "78%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E8EAFF",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1A1A2E",
    flex: 1,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F8F9FF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  searchInput: {
    backgroundColor: "#F8F9FF",
    borderWidth: 1.5,
    borderColor: "#E8EAFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1A1A2E",
    marginBottom: 16,
  },
  optionList: {
    paddingBottom: 12,
  },
  optionRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2FF",
  },
  optionText: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    color: "#1A1A2E",
  },
  optionSubtext: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#A0AABF",
  },
  // Date Picker
  datePickerWrap: {
    width: "100%",
    marginBottom: 18,
    backgroundColor: "#F8F9FF",
    borderRadius: 12,
    padding: 8,
  },
  dobSelectorsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  dobSelectorColumn: {
    flex: 1,
  },
  datePickerActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  datePickerAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerCancel: {
    backgroundColor: "#F8F9FF",
    borderWidth: 1.5,
    borderColor: "#E8EAFF",
  },
  datePickerConfirm: {
    backgroundColor: "#32418C",
  },
  datePickerCancelText: {
    color: "#666680",
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
  },
  datePickerConfirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
  },
  // States
  modalLoadingState: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#A0AABF",
  },
  emptyStateText: {
    paddingVertical: 20,
    textAlign: "center",
    color: "#A0AABF",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },

  // Map styles
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: "#E8EAFF",
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "box-none",
  },
  mapControls: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FF",
    borderWidth: 1.5,
    borderColor: "#E8EAFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  mapButtonText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: "#32418C",
    marginLeft: 8,
  },
  coordinatesText: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: "#A0AABF",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  locationLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  locationLoadingText: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: "#32418C",
    marginTop: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FF",
    borderWidth: 1.5,
    borderColor: "#E8EAFF",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    marginLeft: 15,
    paddingLeft: 15,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#1A1A2E",
  },

  // ========================================
  // ALUMNI TYPE SELECTION STYLES
  // ========================================

  alumniTypeGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  alumniTypeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E8EAFF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    position: "relative",
    minHeight: 100,
  },
  alumniTypeCardSelected: {
    borderColor: "#32418C",
    backgroundColor: "#F0F4FF",
    shadowColor: "#32418C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alumniTypeIconContainer: {
    marginBottom: 8,
  },
  alumniTypeName: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1A1A2E",
    textAlign: "center",
  },
  alumniTypeNameSelected: {
    color: "#32418C",
  },
  alumniTypeDescription: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },
  alumniTypeCheckmark: {
    position: "absolute",
    top: 8,
    right: 8,
  },

  // ========================================
  // EXISTING FIELD INDICATOR
  // ========================================

  existingFieldContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    gap: 10,
  },
  existingFieldText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#374151",
    flex: 1,
  },
  existingFieldValue: {
    fontWeight: "600",
    color: "#065F46",
  },
});

export default styles;
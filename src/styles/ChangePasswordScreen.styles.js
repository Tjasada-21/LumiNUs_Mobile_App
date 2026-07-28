import { StyleSheet, Dimensions, Platform } from "react-native";
const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 30,
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  keyboardView: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollViewContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  cardContainer: {
    width: width * 0.88,
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    // This ensures the border radius is maintained during scroll
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#32418C",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  cardScrollView: {
    borderRadius: 20, // Maintain border radius
  },
  cardContent: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
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
  formSection: {
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  labelIcon: {
    marginRight: 6,
  },
  label: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    color: "#666680",
  },
  // Minimalist input design
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderBottomWidth: 1.5,
    borderBottomColor: "#E8EAFF",
    paddingBottom: 4,
  },
  inputWrapperFocused: {
    borderBottomColor: "#32418C",
    borderBottomWidth: 2,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    color: "#1A1A2E",
    marginBottom: 10,
  },
  eyeIcon: {
    padding: 10,
    paddingRight: 4,
  },
  // Strength indicator
  strengthIndicator: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  strengthBar: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 2,
    backgroundColor: "#E8EAFF",
  },
  strengthText: {
    fontFamily: "Poppins-Regular",
    fontSize: 10,
    color: "#A0AABF",
    marginTop: 4,
    marginLeft: 2,
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 2,
  },
  matchText: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    marginLeft: 4,
  },
  requirementsContainer: {
    backgroundColor: "#FAFBFF",
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F0F2FF",
  },
  requirementsTitle: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: "#666680",
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  requirementText: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: "#A0AABF",
    marginLeft: 6,
    flex: 1,
  },
  button: {
    backgroundColor: "#FBD117",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...Platform.select({
      ios: {
        shadowColor: "#FBD117",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
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
    fontFamily: "Poppins-SemiBold",
    color: "#32418C",
    fontSize: 15,
    marginLeft: 6,
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
});

export default styles;
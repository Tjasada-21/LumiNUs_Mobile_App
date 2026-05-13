import { StyleSheet, Dimensions } from "react-native";
const { width } = Dimensions.get("window");

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
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  cardContainer: {
    width: width * 0.9,
    backgroundColor: "#31429B",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  logo: {
    width: "80%",
    height: 60,
    alignSelf: "center",
    marginBottom: 15,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 25,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#F9FAFB",
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: "#F9FAFB",
    textAlign: "center",
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F9FAFB",
    marginBottom: 8,
    marginTop: 10,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: "#333",
  },
  eyeIcon: {
    padding: 15,
  },
  button: {
    backgroundColor: "#F2C919",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: "#A0AABF",
  },
  buttonText: {
    color: "#31429B",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default styles;

//

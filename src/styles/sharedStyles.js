import { StyleSheet } from "react-native";
import { responsiveFontSize, responsiveSpacing } from "../utils/responsive";

export const colors = {
  blue: "#31429B",
  lightBlue: "#F7F9FC",
  textPrimary: "#31429B",
  textSecondary: "#4B5563",
};

export const createSharedScreenStyles = (screenWidth = 375) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.lightBlue,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: responsiveSpacing(screenWidth, 24, 16, 32),
  },
  surface: {
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5EAFB",
    shadowColor: "#1F2A64",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  title: {
    fontSize: responsiveFontSize(screenWidth, 28, 22, 34),
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: responsiveFontSize(screenWidth, 16, 14, 20),
    color: colors.textSecondary,
    textAlign: "center",
  },
});

export const sharedScreenStyles = StyleSheet.create(createSharedScreenStyles());

import { StyleSheet, Platform } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#32418C", // Matches the deep blue TopHeaderDark
  },
  container: {
    flex: 1,
    backgroundColor: "#FFD404", // Vibrant NU Yellow background
  },
  content: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // --- DEEP BLUE SECTION ---
  blueSection: {
    backgroundColor: "#32418C",
    width: "100%",
    paddingHorizontal: 20,
    // Add top padding to push content safely below the absolute TopHeaderDark
    paddingTop: Platform.OS === "ios" ? 140 : 120,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    zIndex: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    marginRight: 12,
  },
  titleText: {
    flex: 1,
    fontSize: 26,
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    lineHeight: 32,
  },
  heroImageWrap: {
    width: "100%",
    height: 320, // Large portrait height as seen in the mockup
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    flex: 1,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  heroPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#9CA3AF",
    fontFamily: "Poppins_600SemiBold",
  },

  // --- YELLOW SECTION CONTENT ---
  yellowSectionContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // --- GALLERY ---
  gallerySection: {
    marginBottom: 24,
  },
  galleryLabel: {
    fontSize: 18,
    color: "#32418C",
    fontFamily: "Poppins_700Bold",
    marginBottom: 12,
  },
  galleryScroll: {
    paddingRight: 20, // Allows the last item to scroll cleanly off-screen
  },
  galleryImageWrap: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },

  // --- DETAILS CARD ---
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  detailsTitle: {
    fontSize: 20,
    color: "#1C1C1E",
    fontFamily: "Poppins_700Bold",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: "#4A4A4A",
    fontFamily: "Poppins_400Regular",
    lineHeight: 24,
    marginBottom: 24,
  },

  // --- VALID PILL ---
  validPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#32418C",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: "flex-start", // Prevents it from stretching full width
  },
  validPillText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    marginLeft: 8,
  },
});

export default styles;
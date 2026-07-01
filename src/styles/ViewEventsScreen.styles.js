import { StyleSheet, Platform } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#31429B", 
  },
  container: {
    flex: 1,
    backgroundColor: "#FFD404", 
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // --- BLUE HERO SECTION ---
  blueHeroSection: {
    backgroundColor: "#31429B",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: Platform.OS === 'ios' ? 120 : 100, // Provides space so TopHeaderDark doesn't overlap text
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  backBtn: {
    marginTop: 2, // Aligns arrow neatly with text
  },
  pageTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 32,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    marginLeft: 12,
    flex: 1,
  },
  heroImage: {
    width: "100%",
    height: 320,
    borderRadius: 20,
    backgroundColor: "#1F2B67",
  },
  heroPlaceholder: {
    width: "100%",
    height: 320,
    borderRadius: 20,
    backgroundColor: "#1F2B67",
    alignItems: "center",
    justifyContent: "center",
  },

  // --- ATTACHMENTS SECTION ---
  attachmentsSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  attachmentsTitle: {
    color: "#31429B",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    marginBottom: 10,
  },
  galleryScroll: {
    gap: 12, // Space between images
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: "#1F2B67",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // --- EVENT DETAILS WHITE CARD ---
  detailsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  detailsTitle: {
    color: "#1C1C1E",
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    marginBottom: 10,
  },
  descriptionText: {
    color: "#4A4A4A",
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
    marginBottom: 20,
  },

  // --- DATE & LOCATION BLUE BOX ---
  dateLocationCard: {
    backgroundColor: "#31429B",
    borderRadius: 16,
    padding: 16,
  },
  dateLocationTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    marginLeft: 10,
    flexShrink: 1,
  },

  // --- ACTION BUTTON ---
  registerButtonOutline: {
    marginHorizontal: 20,
    marginTop: 24,
    height: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#31429B",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  registerButtonOutlineText: {
    color: "#31429B",
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
  },
  registerButtonDestructive: {
    borderColor: "#D92D20",
  },
  registerButtonDestructiveText: {
    color: "#D92D20",
  },

  // --- GALLERY MODAL ---
  galleryModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  galleryModalContent: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1F2937",
    overflow: "hidden",
  },
  galleryModalStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryModalScroll: {
    flex: 1,
  },
  galleryModalScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryModalCloseButton: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryModalImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#1F2937",
  },
});

export default styles;
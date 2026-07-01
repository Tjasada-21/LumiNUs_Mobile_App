import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1F2B67", // Blends with top BrandHeader
  },
  container: {
    paddingTop: 40, // Remove padding to align with BrandHeader
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  pageHeaderTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#4A4A4A", // Dark grey as shown in mockup
    marginLeft: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 10,
  },
  mainCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 24,
    padding: 16,
  },
  
  // --- EVENT IMAGE & TEXT ---
  eventBanner: {
    height: 280, // Taller image to match design
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  eventBannerImage: {
    borderRadius: 16,
  },
  eventBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(49, 66, 155, 0.05)",
  },
  eventBannerFallback: {
    height: 280,
    borderRadius: 16,
    backgroundColor: "#31429B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  eventBannerIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  eventBannerIcon: {
    width: 48,
    height: 48,
  },
  eventBannerFallbackText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#F9FAFB",
  },
  eventTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 10,
  },
  eventDescription: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
    color: "#4A4A4A",
    marginBottom: 20,
  },

  // --- DATE & LOCATION BLUE CARD ---
  dateLocationCard: {
    backgroundColor: "#384A9C",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  dateLocationTitle: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#FFFFFF",
    marginLeft: 10,
  },

  // --- OUTLINED CARDS (SECTIONS) ---
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#4A4A4A",
    marginBottom: 6,
  },
  outlinedCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#A0A0A0", // Medium grey border as seen in the mockup
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
    color: "#4A4A4A",
  },
  
  // --- CHOICES (RADIOS) ---
  choiceGroup: {
    marginTop: 16,
    gap: 16,
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  choiceText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#1C1C1E",
    marginLeft: 8,
  },

  // --- REMINDERS BLUE CARD ---
  remindersCard: {
    backgroundColor: "#31429B", // Darker blue to match mockup
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  remindersTitle: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#FFD404", // Yellow text
    marginBottom: 10,
  },
  remindersText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
    color: "#FFFFFF",
  },

  // --- SUBMIT BUTTON ---
  primaryButton: {
    backgroundColor: "#FFD404",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#31429B",
  },
});

export default styles;
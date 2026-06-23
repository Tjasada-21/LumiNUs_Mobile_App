import { StyleSheet, Platform } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1F2B67", // Matches the deep blue of TopHeaderDark
  },
  container: {
    flex: 1,
    backgroundColor: "#FFD404", // Vibrant NU Yellow background
  },
  
  // --- LIST HEADER ---
  listHeaderContainer: {
    width: "100%",
    marginBottom: 20,
  },
  blueSection: {
    backgroundColor: "#32418C", // Matches the dark blue header perfectly
    width: "100%",
    paddingHorizontal: 16,
    // Add significant top padding so the featured card clears the absolute floating header
    paddingTop: Platform.OS === "ios" ? 140 : 120, 
    paddingBottom: 24,
  },
  featuredCard: {
    width: "100%",
    height: 380, 
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  whiteSection: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 30,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroImage: {
    width: "85%",
    height: 160,
  },
  yellowHeaderContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1F2B67", 
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 28,
  },
  headingTablet: {
    fontSize: 28,
    lineHeight: 34,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 25, 
    paddingHorizontal: 16,
    height: 48,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333333",
    fontFamily: "Poppins_400Regular",
    paddingVertical: 0,
  },

  // --- GRID & CARDS ---
  gridContent: {
    paddingBottom: 40,
  },
  gridRow: {
    paddingHorizontal: 16, 
    gap: 12,
    justifyContent: "flex-start",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden", 
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    flexDirection: "column",
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  cardImageWrap: {
    width: "100%",
    height: 150,
    backgroundColor: "#F1F5F9",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    marginTop: 6,
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Poppins_600SemiBold",
  },
  cardTextContent: {
    flex: 1, 
    padding: 12, 
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#333333",
    fontFamily: "Poppins_700Bold",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: "#666666",
    fontFamily: "Poppins_400Regular",
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  cardFooterText: {
    marginLeft: 6,
    fontSize: 11,
    color: "#4A4A4A", 
    fontFamily: "Poppins_500Medium",
    flexShrink: 1,
  },

  // --- LOADING & EMPTY STATES ---
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#1F2B67",
    fontFamily: "Poppins_600SemiBold",
  },
  stateWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2B67",
    fontFamily: "Poppins_700Bold",
    marginBottom: 8,
  },
  stateText: {
    fontSize: 14,
    color: "#1F2B67",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Poppins_500Medium",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#1F2B67",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },
});

export default styles;
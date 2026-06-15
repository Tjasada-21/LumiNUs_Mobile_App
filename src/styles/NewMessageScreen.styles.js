import { StyleSheet, Platform } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 20 : 10,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    color: "#2C313A",
    fontWeight: "900",
    fontFamily: "Poppins_700Bold", 
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  toLabel: {
    fontSize: 16,
    color: "#585858",
    fontWeight: "500",
    fontFamily: "Poppins_400Regular",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#585858",
    fontFamily: "Poppins_400Regular",
    paddingVertical: 0, 
  },
  divider: {
    height: 1,
    backgroundColor: "#E8E8E8",
    marginHorizontal: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    color: "#585858",
    fontWeight: "700",
    fontFamily: "Poppins_Medium",
    marginTop: 20,
    marginBottom: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E0E0E0", 
  },
  nameText: {
    marginLeft: 16,
    fontSize: 16,
    color: "#4A4A4A",
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },
  footer: {
    backgroundColor: "#31429B", 
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 20 : 0, 
  },
  footerLogo: {
    width: 160,
    height: 50,
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  emptyText: {
    fontSize: 14,
    color: "#888888",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    marginTop: 20,
  }
});

export default styles;
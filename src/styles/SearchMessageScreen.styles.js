import { StyleSheet, Platform } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    marginTop: 25,
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
    fontFamily: "Poppins_700Bold",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F6FA",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333333",
    fontFamily: "Poppins_400Regular",
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexGrow: 1,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#32418C",
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  nameText: {
    fontSize: 16,
    color: "#4A4A4A",
    fontFamily: "Poppins_600SemiBold",
    flexShrink: 1,
  },
  adminBadge: {
    backgroundColor: "#FBD117",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
    alignSelf: "center",

  },
  adminBadgeText: {
    fontSize: 10,
    color: "#32418C",
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  roleText: {
    fontSize: 12,
    color: "#666666",
    marginTop: 2,
    fontFamily: "Poppins_400Regular",
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
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#888888",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
});

export default styles;
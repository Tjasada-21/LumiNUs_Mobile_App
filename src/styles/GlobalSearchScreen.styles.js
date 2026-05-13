import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#31429B",
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerCard: {
    marginTop: 14,
    marginBottom: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 22,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#EEF2FF",
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    color: "#31429B",
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
  },
  searchWrap: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: "#1F2937",
    fontSize: 14,
  },
  helperRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  helperText: {
    flex: 1,
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 17,
  },
  helperCount: {
    color: "#31429B",
    fontSize: 12,
    fontWeight: "800",
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#31429B",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  resultCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    backgroundColor: "#E5E7EB",
  },
  resultBody: {
    flex: 1,
    marginRight: 10,
  },
  resultName: {
    color: "#31429B",
    fontSize: 15,
    fontWeight: "800",
  },
  resultMeta: {
    marginTop: 2,
    color: "#374151",
    fontSize: 12,
    fontWeight: "700",
  },
  resultSubmeta: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 12,
  },
  actionButton: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#31429B",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonPressed: {
    opacity: 0.84,
  },
  actionButtonDisabled: {
    backgroundColor: "#E2E8F0",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  actionButtonTextDisabled: {
    color: "#64748B",
  },
});

export default styles;

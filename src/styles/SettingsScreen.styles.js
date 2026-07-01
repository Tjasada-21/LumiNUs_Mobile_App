import { StyleSheet } from "react-native";

export default StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	container: {
		flex: 1,
		backgroundColor: "#FFFFFF",
	},
	scrollContent: {
		paddingHorizontal: 24,
		paddingTop: 0,
	},
	headerCard: {
		backgroundColor: "#FFFFFF",
		borderBottomLeftRadius: 40,
		borderBottomRightRadius: 40,
		paddingHorizontal: 24,
		paddingTop: 18,
		paddingBottom: 26,
		minHeight: 120,
		flexDirection: "row",
		alignItems: "center",
		shadowColor: "#000000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.12,
		shadowRadius: 22,
		elevation: 12,
		marginBottom: 26,
	},
	backButton: {
		marginRight: 14,
		marginLeft: -4,
	},
	headerTitle: {
		fontSize: 30,
		lineHeight: 36,
		fontWeight: "800",
		color: "#333333",
		letterSpacing: -0.4,
	},
	sectionBlock: {
		marginBottom: 18,
	},
	sectionTitle: {
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "800",
		color: "#3B3B3B",
		marginBottom: 8,
	},
	menuCard: {
		backgroundColor: "#F5F5F7",
		borderRadius: 20,
		paddingHorizontal: 18,
		paddingVertical: 6,
	},
	row: {
		minHeight: 74,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	rowPressed: {
		opacity: 0.7,
	},
	rowLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		paddingRight: 10,
	},
	rowIcon: {
		width: 38,
		textAlign: "center",
		marginRight: 14,
	},
	iconSpacer: {
		width: 38,
		height: 38,
		marginRight: 14,
	},
	rowLabel: {
		fontSize: 26,
		lineHeight: 30,
		color: "#444444",
		fontWeight: "500",
		flexShrink: 1,
	},
	rowLabelWithoutIcon: {
		marginLeft: 4,
	},
	footer: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		height: 86,
		backgroundColor: "#31429B",
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000000",
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.12,
		shadowRadius: 12,
		elevation: 18,
	},
	footerLogo: {
		width: 220,
		height: 58,
	},
});

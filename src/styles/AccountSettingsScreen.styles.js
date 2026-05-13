import { Dimensions, StyleSheet } from "react-native";
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveSpacing,
  responsiveWidth,
} from "../utils/responsive";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#31429B",
  },
  bottomSafeArea: {
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    backgroundColor: "#ECECEC",
  },
  header: {
    backgroundColor: "#31429B",
    paddingHorizontal: responsiveSpacing(SCREEN_WIDTH, 20, 16, 28),
    paddingVertical: responsiveSpacing(SCREEN_HEIGHT, 14, 12, 20),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLogo: {
    width: responsiveWidth(SCREEN_WIDTH, 0.36, 132, 180),
    height: responsiveHeight(SCREEN_HEIGHT, 0.047, 34, 46),
  },
  badgeContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingVertical: responsiveSpacing(SCREEN_HEIGHT, 7, 6, 10),
    paddingHorizontal: responsiveSpacing(SCREEN_WIDTH, 12, 10, 16),
    flexDirection: "row",
    alignItems: "center",
  },
  badgeIcon: {
    width: responsiveWidth(SCREEN_WIDTH, 0.042, 16, 20),
    height: responsiveWidth(SCREEN_WIDTH, 0.042, 16, 20),
    marginRight: 6,
  },
  badgeText: {
    color: "#2D3F9E",
    fontWeight: "800",
    fontSize: responsiveFontSize(SCREEN_WIDTH, 12, 11, 14),
  },
  headerAccent: {
    height: responsiveHeight(SCREEN_HEIGHT, 0.014, 9, 14),
    backgroundColor: "#F2C919",
  },
  scrollContent: {
    paddingHorizontal: responsiveSpacing(SCREEN_WIDTH, 22, 16, 28),
    paddingBottom: responsiveSpacing(SCREEN_HEIGHT, 28, 22, 34),
  },
  navButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: responsiveSpacing(SCREEN_HEIGHT, 16, 12, 20),
    marginBottom: responsiveSpacing(SCREEN_HEIGHT, 4, 2, 8),
  },
  backButton: {
    width: responsiveWidth(SCREEN_WIDTH, 0.105, 38, 46),
    height: responsiveWidth(SCREEN_WIDTH, 0.105, 38, 46),
    borderRadius: responsiveWidth(SCREEN_WIDTH, 0.0525, 19, 23),
    backgroundColor: "#F2C919",
    alignItems: "center",
    justifyContent: "center",
  },
  homeButton: {
    width: responsiveWidth(SCREEN_WIDTH, 0.105, 38, 46),
    height: responsiveWidth(SCREEN_WIDTH, 0.105, 38, 46),
    borderRadius: responsiveWidth(SCREEN_WIDTH, 0.0525, 19, 23),
    backgroundColor: "#F2C919",
    alignItems: "center",
    justifyContent: "center",
  },
  profileWrap: {
    alignSelf: "center",
    marginTop: "1%",
    marginBottom: 16,
    position: "relative",
  },
  profileImage: {
    width: responsiveWidth(SCREEN_WIDTH, 0.315, 112, 160),
    height: responsiveWidth(SCREEN_WIDTH, 0.315, 112, 160),
    borderRadius: responsiveWidth(SCREEN_WIDTH, 0.1575, 56, 80),
    borderWidth: 2,
    borderColor: "#EEE",
  },
  editAvatarButton: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: responsiveWidth(SCREEN_WIDTH, 0.075, 26, 34),
    height: responsiveWidth(SCREEN_WIDTH, 0.075, 26, 34),
    borderRadius: responsiveWidth(SCREEN_WIDTH, 0.0375, 13, 17),
    backgroundColor: "#F2C919",
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    backgroundColor: "#E4E4E4",
    borderRadius: 16,
  },
  sectionHeading: {
    color: "#3F3F3F",
    fontSize: responsiveFontSize(SCREEN_WIDTH, 18, 16, 22),
    fontWeight: "700",
    marginBottom: 10,
  },
  sectionHeadingSpacing: {
    marginTop: 6,
  },
  inputBlock: {
    backgroundColor: "#EFEFEF",
    borderWidth: 1,
    borderColor: "#B9B9B9",
    borderRadius: 10,
    paddingHorizontal: responsiveSpacing(SCREEN_WIDTH, 12, 10, 16),
    paddingVertical: responsiveSpacing(SCREEN_HEIGHT, 9, 7, 12),
    marginBottom: 10,
  },
  inputBlockCompact: {
    backgroundColor: "#EFEFEF",
    borderWidth: 1,
    borderColor: "#B9B9B9",
    borderRadius: 8,
    paddingHorizontal: responsiveSpacing(SCREEN_WIDTH, 10, 8, 14),
    paddingVertical: responsiveSpacing(SCREEN_HEIGHT, 1, 1, 4),
    marginBottom: 8,
  },
  inputLabel: {
    color: "#5C5C5C",
    fontSize: responsiveFontSize(SCREEN_WIDTH, 10, 9, 12),
    marginBottom: 1,
  },
  inputValue: {
    color: "#333333",
    fontSize: responsiveFontSize(SCREEN_WIDTH, 14, 12, 16),
  },
  inputGrow: {
    flex: 1,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputEmailValue: {
    flex: 1,
  },
  genderSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  verifyLinkButton: {
    marginLeft: 8,
    flexShrink: 0,
  },
  verifiedText: {
    color: "#2F9B3D",
    fontSize: responsiveFontSize(SCREEN_WIDTH, 10, 9, 12),
    fontStyle: "italic",
    fontWeight: "600",
  },
  verifyLink: {
    color: "#31429B",
    fontSize: responsiveFontSize(SCREEN_WIDTH, 10, 9, 12),
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  helpText: {
    color: "#777777",
    fontSize: responsiveFontSize(SCREEN_WIDTH, 8, 8, 10),
    fontStyle: "italic",
    marginBottom: 10,
  },
  twoColRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  twoColRowStacked: {
    flexDirection: "column",
  },
  halfInput: {
    width: "48.5%",
    marginBottom: 0,
  },
  fullWidthInput: {
    width: "100%",
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  dateInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 4,
    paddingVertical: 0,
  },
  genderInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 4,
    paddingVertical: 0,
  },
  dateValue: {
    flex: 1,
    marginLeft: 10,
    fontSize: responsiveFontSize(SCREEN_WIDTH, 12, 11, 14),
    fontWeight: "600",
    lineHeight: responsiveFontSize(SCREEN_WIDTH, 14, 12, 17),
    paddingVertical: 0,
  },
  loadingWrap: {
    paddingTop: responsiveSpacing(SCREEN_HEIGHT, 16, 12, 20),
  },
  loadingText: {
    color: "#31429B",
    fontSize: responsiveFontSize(SCREEN_WIDTH, 12, 11, 14),
    fontWeight: "600",
    marginTop: 14,
    textAlign: "center",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: responsiveFontSize(SCREEN_WIDTH, 12, 11, 14),
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: "#F2C919",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: responsiveSpacing(SCREEN_HEIGHT, 13, 11, 16),
    marginTop: responsiveSpacing(SCREEN_HEIGHT, 22, 16, 28),
  },
  saveButtonText: {
    color: "#31429B",
    fontSize: responsiveFontSize(SCREEN_WIDTH, 12, 11, 14),
    fontWeight: "700",
  },
  resetButton: {
    backgroundColor: "#31429B",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: responsiveSpacing(SCREEN_HEIGHT, 13, 11, 16),
    marginTop: responsiveSpacing(SCREEN_HEIGHT, 14, 12, 20),
  },
  resetButtonText: {
    color: "#F2C919",
    fontSize: responsiveFontSize(SCREEN_WIDTH, 12, 11, 14),
    fontWeight: "700",
  },
  disableButton: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: responsiveSpacing(SCREEN_HEIGHT, 13, 11, 16),
    marginTop: responsiveSpacing(SCREEN_HEIGHT, 14, 12, 20),
  },
  disableButtonText: {
    color: "#B91C1C",
    fontSize: responsiveFontSize(SCREEN_WIDTH, 12, 11, 14),
    fontWeight: "700",
  },
  actionButtonDisabled: {
    opacity: 0.65,
  },
});

export default styles;

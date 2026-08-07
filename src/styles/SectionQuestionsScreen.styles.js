import { StyleSheet } from "react-native";

const COLORS = {
  deepSpace: '#0A0E27',
  spaceNavy: '#0F1535',
  cardBg: '#161E4A',
  
  goldStar: '#FFD404',
  starlight: '#F0F2FF',
  nebulaBlue: '#3B82F6',
  nebulaGreen: '#10B981',
  errorRed: '#EF4444',
  
  white: '#FFFFFF',
  whiteAlpha06: 'rgba(255,255,255,0.06)',
  whiteAlpha08: 'rgba(255,255,255,0.08)',
  whiteAlpha10: 'rgba(255,255,255,0.10)',
  whiteAlpha12: 'rgba(255,255,255,0.12)',
  whiteAlpha15: 'rgba(255,255,255,0.15)',
  whiteAlpha20: 'rgba(255,255,255,0.20)',
  whiteAlpha25: 'rgba(255,255,255,0.25)',
  whiteAlpha40: 'rgba(255,255,255,0.40)',
  whiteAlpha50: 'rgba(255,255,255,0.50)',
  whiteAlpha60: 'rgba(255,255,255,0.60)',
  whiteAlpha80: 'rgba(255,255,255,0.80)',
  border: 'rgba(255,255,255,0.08)',
};

const FONTS = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

const styles = StyleSheet.create({
  // ─────────────────────────────────────────────
  // LAYOUT
  // ─────────────────────────────────────────────
  safeArea: { flex: 1, backgroundColor: COLORS.deepSpace },
  scrollView: { flex: 1, backgroundColor: COLORS.deepSpace },
  scrollContent: { paddingBottom: 40 },
  starsContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.deepSpace,
  },
  loadingText: {
    marginTop: 16, color: COLORS.whiteAlpha60, fontSize: 15,
    fontFamily: FONTS.medium,
  },

  // ─────────────────────────────────────────────
  // BACK BUTTON
  // ─────────────────────────────────────────────
  backButton: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  backButtonText: {
    fontFamily: FONTS.medium, fontSize: 14,
    color: COLORS.goldStar, marginLeft: 8,
  },

  // ─────────────────────────────────────────────
  // SECTION INFO
  // ─────────────────────────────────────────────
  sectionInfo: {
    paddingHorizontal: 20, paddingBottom: 12,
  },
  sectionLabel: {
    fontFamily: FONTS.bold, fontSize: 10,
    color: COLORS.whiteAlpha40, letterSpacing: 2, marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: FONTS.bold, fontSize: 18, color: COLORS.starlight,
    lineHeight: 24,
  },

  // ─────────────────────────────────────────────
  // QUESTION PROGRESS
  // ─────────────────────────────────────────────
  questionProgressContainer: {
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: COLORS.cardBg, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  questionProgressInfo: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  questionProgressLabel: {
    fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.whiteAlpha80,
  },
  questionProgressPct: {
    fontFamily: FONTS.bold, fontSize: 14, color: COLORS.goldStar,
  },
  questionProgressBg: {
    height: 6, backgroundColor: COLORS.whiteAlpha08,
    borderRadius: 3, overflow: 'hidden',
  },
  questionProgressFill: {
    height: 6, backgroundColor: COLORS.goldStar, borderRadius: 3,
  },

  // ─────────────────────────────────────────────
  // QUESTION CARD
  // ─────────────────────────────────────────────
  questionCard: {
    marginHorizontal: 20, backgroundColor: COLORS.cardBg,
    borderRadius: 16, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  questionHeader: {
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8,
  },
  questionNumber: {
    fontFamily: FONTS.bold, fontSize: 16, color: COLORS.goldStar,
    marginRight: 8, marginTop: 1,
  },
  questionText: {
    fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.starlight,
    flex: 1, lineHeight: 21,
  },
  requiredStar: {
    fontFamily: FONTS.bold, fontSize: 16, color: COLORS.errorRed,
    marginLeft: 4,
  },
  questionDescription: {
    fontFamily: FONTS.regular, fontSize: 12,
    color: COLORS.whiteAlpha50, marginBottom: 12, marginLeft: 26,
  },

  // ─────────────────────────────────────────────
  // INPUTS
  // ─────────────────────────────────────────────
  textInput: {
    backgroundColor: COLORS.whiteAlpha06, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, marginLeft: 26,
    fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white,
    borderWidth: 1, borderColor: COLORS.whiteAlpha10,
  },
  textArea: {
    backgroundColor: COLORS.whiteAlpha06, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, marginLeft: 26,
    fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white,
    borderWidth: 1, borderColor: COLORS.whiteAlpha10,
    minHeight: 100,
  },
  textInputError: {
    borderColor: COLORS.errorRed,
  },
  errorText: {
    fontFamily: FONTS.regular, fontSize: 11, color: COLORS.errorRed,
    marginTop: 6, marginLeft: 26,
  },

  // Options
  optionsContainer: {
    marginLeft: 26, gap: 8,
  },
  optionButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.whiteAlpha06, borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: COLORS.whiteAlpha10,
  },
  optionButtonSelected: {
    borderColor: COLORS.goldStar, backgroundColor: 'rgba(255,212,4,0.08)',
  },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.whiteAlpha25,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: COLORS.goldStar,
  },
  radioInner: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.goldStar,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 2, borderColor: COLORS.whiteAlpha25,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: COLORS.goldStar, borderColor: COLORS.goldStar,
  },
  optionText: {
    fontFamily: FONTS.regular, fontSize: 14, color: COLORS.whiteAlpha80,
    flex: 1,
  },
  optionTextSelected: {
    color: COLORS.white, fontFamily: FONTS.semiBold,
  },

  // Dropdown
  dropdownButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.whiteAlpha06, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, marginLeft: 26,
    borderWidth: 1, borderColor: COLORS.whiteAlpha10,
  },
  dropdownText: {
    fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white,
  },
  dropdownPlaceholder: {
    color: COLORS.whiteAlpha25,
  },
  dropdownList: {
    marginLeft: 26, marginTop: 4,
    backgroundColor: COLORS.spaceNavy, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.whiteAlpha10, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.whiteAlpha06,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(255,212,4,0.08)',
  },
  dropdownItemText: {
    fontFamily: FONTS.regular, fontSize: 14, color: COLORS.whiteAlpha80,
  },
  dropdownItemTextSelected: {
    color: COLORS.goldStar, fontFamily: FONTS.semiBold,
  },

  // ─────────────────────────────────────────────
  // LIKERT SCALE & GRID
  // ─────────────────────────────────────────────
  likertHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  likertRowLabelPlaceholder: {
    width: 130,
  },
  likertColumnHeader: {
    width: 80,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  likertColumnText: {
    color: '#FFD404',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  likertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  likertRowLabel: {
    width: 130,
    paddingRight: 8,
  },
  likertRowText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  likertCell: {
    width: 80,
    alignItems: 'center',
    paddingVertical: 8,
  },
  likertCellSelected: {
    // Customize as needed
  },
  likertRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likertRadioSelected: {
    borderColor: '#FFD404',
  },
  likertRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD404',
  },

  // ─────────────────────────────────────────────
  // FILE UPLOAD
  // ─────────────────────────────────────────────
  fileSizeHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  
  // iOS Expo Link styles
  iosExpoContainer: {
    marginBottom: 12,
  },
  linkOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,212,4,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,212,4,0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 8,
  },
  linkOptionText: {
    color: '#FFD404',
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  linkInputContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  linkInputLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 8,
    fontFamily: FONTS.regular,
  },
  linkInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  linkActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  linkCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  linkCancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  linkSubmitButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#FFD404',
  },
  linkSubmitText: {
    color: '#1A237E',
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  fileLinkUrl: {
    color: 'rgba(255,212,4,0.7)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  uploadSubText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: FONTS.regular,
    marginLeft: 4,
  },

  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,212,4,0.3)',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    minHeight: 70,
  },
  uploadButtonText: {
    color: '#FFD404',
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,212,4,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,212,4,0.3)',
    borderRadius: 10,
    padding: 12,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  fileSize: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  removeFileButton: {
    padding: 4,
  },
  fileTypeHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    fontStyle: 'italic',
    fontFamily: FONTS.regular,
  },

  // ─────────────────────────────────────────────
  // NAVIGATION BUTTONS
  // ─────────────────────────────────────────────
  navigationButtons: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8,
  },
  navButton: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 25,
  },
  navButtonPrev: {
    backgroundColor: COLORS.whiteAlpha08,
  },
  navButtonNext: {
    backgroundColor: COLORS.goldStar,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.goldStar,
    marginLeft: 6,
  },
  navButtonTextNext: {
    color: '#1A237E', marginRight: 6, marginLeft: 0,
  },
  navButtonTextDisabled: {
    color: COLORS.whiteAlpha20,
  },

  // Question dots
  questionDots: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  questionDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.whiteAlpha08, alignItems: 'center',
    justifyContent: 'center',
  },
  questionDotCurrent: {
    backgroundColor: COLORS.goldStar + '30', borderWidth: 1.5,
    borderColor: COLORS.goldStar,
  },
  questionDotAnswered: {
    backgroundColor: COLORS.nebulaGreen + '30', borderWidth: 1,
    borderColor: COLORS.nebulaGreen,
  },
  questionDotText: {
    fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.whiteAlpha60,
  },
});

export { COLORS, FONTS };
export default styles;
import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#f7f2f0',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  scrollContentMobile: {
    padding: 12,
    justifyContent: 'flex-start',
  },
  outerCanvas: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 36,
    elevation: 10,
    width: '100%',
    maxWidth: 980,
  },
  cardTablet: {
    flexDirection: 'row',
    minHeight: 580,
  },
  cardMobile: {
    flexDirection: 'column',
    borderRadius: 24,
    maxWidth: 480,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  // ---------------- Left Pane ----------------
  leftPane: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1b0910',
  },
  leftPaneTablet: {
    width: '50%',
    minHeight: 580,
  },
  leftPaneMobile: {
    width: '100%',
    height: 180,
  },
  imageOverlayTop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 10, 16, 0.45)',
  },
  imageOverlayBottom: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(16, 5, 9, 0.65)',
  },
  leftContent: {
    flex: 1,
    padding: 38,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  leftContentMobile: {
    padding: 20,
    justifyContent: 'flex-end',
  },
  brandTitleBlock: {
    marginTop: 10,
  },
  brandTitleBlockMobile: {
    marginTop: 0,
  },
  heroTitleLine: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: '400',
    fontFamily: Platform.select({
      web: '"Raconteur NF", "Playfair Display", Georgia, serif',
      ios: 'Raconteur NF',
      default: 'Raconteur NF',
    }),
    lineHeight: 48,
    letterSpacing: 0.8,
  },
  heroTitleMobile: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '400',
    fontFamily: Platform.select({
      web: '"Raconteur NF", "Playfair Display", Georgia, serif',
      ios: 'Raconteur NF',
      default: 'Raconteur NF',
    }),
    lineHeight: 30,
    letterSpacing: 0.6,
  },
  heroAccentDash: {
    width: 44,
    height: 3.5,
    backgroundColor: '#b93a52',
    borderRadius: 2,
    marginTop: 12,
  },
  heroAccentDashMobile: {
    width: 32,
    height: 3,
    backgroundColor: '#b93a52',
    borderRadius: 2,
    marginTop: 6,
  },
  leftBottomBlock: {
    marginBottom: 6,
  },
  welcomeHeading: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
    marginBottom: 8,
  },
  welcomeDescription: {
    color: '#d4b2b9',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 16,
  },
  portalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  redStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#e11d48',
  },
  portalBadgeText: {
    color: '#b38d95',
    fontSize: 11.5,
    fontWeight: '500',
  },
  portalBadgeTextMobile: {
    color: '#f3c7d0',
    fontSize: 11,
    fontWeight: '600',
  },
  // ---------------- Right Pane ----------------
  rightPane: {
    backgroundColor: '#ffffff',
    justifyContent: 'center',
  },
  rightPaneTablet: {
    width: '50%',
    paddingVertical: 44,
    paddingHorizontal: 52,
  },
  rightPaneMobile: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  rightHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  rightHeaderMobile: {
    marginBottom: 14,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    width: '100%',
  },
  modeToggleContainerMobile: {
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  modeToggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeToggleTabMobile: {
    paddingVertical: 8,
    gap: 4,
    borderRadius: 8,
  },
  modeToggleTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modeToggleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#6b7280',
  },
  modeToggleTextMobile: {
    fontSize: 12,
    fontWeight: '700',
  },
  modeToggleTextActive: {
    color: '#641b2a',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e4e8',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    height: 52,
  },
  passwordInputWrapperMobile: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    paddingVertical: 0,
  },
  passwordInputMobile: {
    fontSize: 14,
  },
  passwordEyeButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightBrandName: {
    color: '#641b2a',
    fontSize: 22,
    fontWeight: '400',
    fontFamily: Platform.select({
      web: '"Raconteur NF", "Playfair Display", Georgia, serif',
      ios: 'Raconteur NF',
      default: 'Raconteur NF',
    }),
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  rightBrandNameMobile: {
    fontSize: 19,
    marginBottom: 6,
  },
  logoWrapper: {
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapperMobile: {
    marginBottom: 6,
  },
  officialBarLogo: {
    width: 90,
    height: 90,
  },
  officialBarLogoMobile: {
    width: 68,
    height: 68,
  },
  formTitle: {
    color: '#1a1a1e',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
  },
  formTitleMobile: {
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#be123c',
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  formBody: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputGroupMobile: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1f242e',
    marginBottom: 8,
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
  },
  inputLabelMobile: {
    fontSize: 12.5,
    marginBottom: 6,
  },
  textInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#e2e4e8',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  textInputMobile: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  clockInButtonWrapper: {
    width: '100%',
    marginTop: 8,
    marginBottom: 20,
  },
  clockInButtonWrapperMobile: {
    marginTop: 6,
    marginBottom: 16,
  },
  clockInButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#641b2a',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#641b2a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  clockInButtonMobile: {
    height: 48,
    borderRadius: 12,
  },
  clockInButtonDisabled: {
    opacity: 0.45,
    backgroundColor: '#7a3b47',
  },
  clockInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  clockInButtonTextMobile: {
    fontSize: 14.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  controlsRowMobile: {
    paddingTop: 0,
    flexWrap: 'wrap',
    gap: 8,
  },
  trainingModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trainingModeGroupMobile: {
    gap: 8,
  },
  trainingModeLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1a1a1e',
  },
  trainingModeLabelMobile: {
    fontSize: 12.5,
  },
  forgotPinPressable: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotPinText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#641b2a',
  },
  forgotPinTextMobile: {
    fontSize: 12.5,
  },
});

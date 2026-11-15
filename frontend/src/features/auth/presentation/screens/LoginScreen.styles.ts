import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#f3ece7',
    position: 'relative',
    overflow: 'hidden',
  },
  // Circular organic decorative gradients matching inspiration art
  decorCircleTopLeft: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(129, 0, 33, 0.12)',
    pointerEvents: 'none',
  },
  decorCircleBottomRight: {
    position: 'absolute',
    bottom: -140,
    right: -140,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(129, 0, 33, 0.08)',
    pointerEvents: 'none',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContentMobile: {
    padding: 16,
    justifyContent: 'center',
  },
  outerCanvas: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Floating Card inspired by modern minimal card UI
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 36,
    elevation: 10,
    width: '100%',
    maxWidth: 880,
  },
  cardTablet: {
    flexDirection: 'row',
    minHeight: 520,
  },
  cardMobile: {
    flexDirection: 'column',
    borderRadius: 20,
    maxWidth: 420,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },

  // ---------------- LEFT PANE: Clean Form ----------------
  formPane: {
    backgroundColor: '#ffffff',
    justifyContent: 'center',
  },
  formPaneTablet: {
    width: '52%',
    paddingVertical: 44,
    paddingHorizontal: 48,
  },
  formPaneMobile: {
    width: '100%',
    paddingVertical: 28,
    paddingHorizontal: 22,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  formHeaderMobile: {
    marginBottom: 16,
  },
  welcomeEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: '#810021',
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoWrapperMobile: {
    marginBottom: 8,
  },
  officialBarLogo: {
    width: 210,
    height: 60,
  },
  officialBarLogoMobile: {
    width: 175,
    height: 50,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#78716c',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 4,
    lineHeight: 18,
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
  },
  headerSubtitleMobile: {
    fontSize: 12,
  },

  // Mode Toggle Pill
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f4',
    borderRadius: 24,
    padding: 3,
    marginBottom: 20,
    width: '100%',
  },
  modeToggleContainerMobile: {
    borderRadius: 20,
    padding: 3,
    marginBottom: 16,
  },
  modeToggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeToggleTabMobile: {
    paddingVertical: 7,
    gap: 4,
    borderRadius: 18,
  },
  modeToggleTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  modeToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#78716c',
  },
  modeToggleTextMobile: {
    fontSize: 11.5,
  },
  modeToggleTextActive: {
    color: '#810021',
    fontWeight: '700',
  },

  // Form Body & Input Fields with Rounded Pill Style
  formBody: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputGroupMobile: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#57534e',
    marginBottom: 8,
    letterSpacing: 0.2,
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
  },
  inputLabelMobile: {
    fontSize: 11.5,
    marginBottom: 6,
  },
  roundedInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    borderRadius: 24,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    height: 50,
  },
  roundedInputWrapperMobile: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  roundedTextInput: {
    flex: 1,
    fontSize: 16, // Invariant: >= 16px to prevent iOS Safari auto-zoom
    fontWeight: '500',
    color: '#1c1917',
    paddingVertical: 0,
  },
  roundedTextInputMobile: {
    fontSize: 16, // Invariant: >= 16px to prevent iOS Safari auto-zoom
  },
  passwordEyeButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Primary Action Button (Rounded Pill with Soft Glow Shadow)
  submitButtonWrapper: {
    width: '100%',
    marginTop: 6,
    marginBottom: 16,
  },
  submitButtonWrapperMobile: {
    marginTop: 4,
    marginBottom: 14,
  },
  submitButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#810021',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#810021',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonMobile: {
    height: 46,
    borderRadius: 22,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#a85068',
    shadowOpacity: 0.08,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  submitButtonTextMobile: {
    fontSize: 13,
    letterSpacing: 1,
  },

  // Bottom Links & Controls
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  controlsRowMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trainingModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trainingModeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#78716c',
  },
  forgotPinPressable: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minHeight: 40,
    justifyContent: 'center',
  },
  forgotPinText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#810021',
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#be123c',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },

  // ---------------- LEFT PANE: Natural Stage Photography ----------------
  heroPane: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#171314',
  },
  heroPaneTablet: {
    width: '48%',
    minHeight: 520,
  },
  heroPaneMobile: {
    width: '100%',
    height: 140,
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Subtle central atmospheric darkening behind the white logo and badge
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
  },
  heroContent: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center', // Centered vertically and horizontally
    zIndex: 2,
  },
  heroContentMobile: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    // Zero border, pure clean floating logo with ambient depth
  },
  heroLogoBadgeMobile: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  heroBrandLockup: {
    width: 240,
    height: 72,
    marginBottom: 8,
  },
  heroBrandLockupMobile: {
    width: 170,
    height: 52,
    marginBottom: 0,
  },
  heroTagline: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
  },
});

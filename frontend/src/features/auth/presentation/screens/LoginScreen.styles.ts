import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#FAF7F2', // Elegant Warm Cream canvas behind login card, complementing #810021
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
    backgroundColor: 'rgba(129, 0, 33, 0.08)',
    pointerEvents: 'none',
  },
  decorCircleBottomRight: {
    position: 'absolute',
    bottom: -140,
    right: -140,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(129, 0, 33, 0.06)',
    pointerEvents: 'none',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContentMobile: {
    paddingHorizontal: 12,
    paddingVertical: 16,
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
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 36,
    elevation: 10,
    width: '100%',
    maxWidth: 960,
  },
  cardTablet: {
    flexDirection: 'row',
    minHeight: 580,
  },
  cardMobile: {
    flexDirection: 'column',
    borderRadius: 20,
    maxWidth: 440,
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
    paddingVertical: 48,
    paddingHorizontal: 48,
    minHeight: 580,
  },
  formPaneMobile: {
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 22,
  },
  formHeaderMobile: {
    marginBottom: 18,
  },
  welcomeEyebrow: {
    fontSize: 16,
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
    marginBottom: 12,
  },
  logoWrapperMobile: {
    marginBottom: 8,
  },
  officialBarLogo: {
    width: 230,
    height: 66,
  },
  officialBarLogoMobile: {
    width: 190,
    height: 54,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#78716c',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 4,
    lineHeight: 22,
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
  },
  headerSubtitleMobile: {
    fontSize: 16,
    lineHeight: 22,
  },

  // Mode Toggle Pill
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f4',
    borderRadius: 28,
    padding: 4,
    marginBottom: 22,
    width: '100%',
  },
  modeToggleContainerMobile: {
    borderRadius: 24,
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
    borderRadius: 24,
  },
  modeToggleTabMobile: {
    paddingVertical: 10,
    gap: 5,
    borderRadius: 20,
    minHeight: 44, // Touch target invariant
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
    fontSize: 16,
    fontWeight: '600',
    color: '#78716c',
  },
  modeToggleTextMobile: {
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 18,
  },
  inputGroupMobile: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
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
    fontSize: 16,
    marginBottom: 6,
  },
  roundedInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    borderRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    height: 54,
  },
  roundedInputWrapperMobile: {
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 16,
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
    marginTop: 8,
    marginBottom: 18,
  },
  submitButtonWrapperMobile: {
    marginTop: 6,
    marginBottom: 16,
  },
  submitButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#810021',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#810021',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonMobile: {
    height: 50,
    borderRadius: 25,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#a85068',
    shadowOpacity: 0.08,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  submitButtonTextMobile: {
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '500',
    color: '#78716c',
  },
  forgotPinPressable: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotPinText: {
    fontSize: 16,
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#be123c',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },

  // ---------------- LEFT PANE: Natural Stage Photography ----------------
  heroPane: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#171314',
  },
  heroPaneTablet: {
    width: '48%',
    minHeight: 580,
  },
  heroPaneMobile: {
    width: '100%',
    height: 120,
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFill,
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
    padding: 8,
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
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  heroBrandLockup: {
    width: 250,
    height: 76,
    marginBottom: 10,
  },
  heroBrandLockupMobile: {
    width: 190,
    height: 52,
    marginBottom: 0,
  },
  heroTagline: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
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

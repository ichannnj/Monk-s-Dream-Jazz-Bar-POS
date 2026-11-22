import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F5F2EB', // Softer warm muted linen canvas, gentle on the eyes
    position: 'relative',
    overflow: 'hidden',
  },
  // Circular organic decorative gradients (hidden for clean pure white presentation)
  decorCircleTopLeft: {
    display: 'none',
  },
  decorCircleBottomRight: {
    display: 'none',
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
    backgroundColor: '#F7F5F2',
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
    backgroundColor: '#F7F5F2',
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
    backgroundColor: '#F7F5F2',
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
    borderColor: '#E2DED6',
    borderRadius: 28,
    backgroundColor: '#F7F5F2',
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
    color: '#1A1617',
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
    color: '#F7F5F2',
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
    // Multi-layer rich atmospheric vignette and gradient for dramatic depth
    ...Platform.select({
      web: {
        backgroundImage:
          'linear-gradient(to top, rgba(14, 11, 14, 0.88) 0%, rgba(14, 11, 14, 0.45) 45%, rgba(0, 0, 0, 0.1) 75%, rgba(10, 8, 12, 0.4) 100%), radial-gradient(circle at 75% 20%, rgba(255, 30, 86, 0.12) 0%, transparent 60%)',
      },
      default: {
        backgroundColor: 'rgba(0, 0, 0, 0.42)',
      },
    }),
  },
  heroContent: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 96,
    zIndex: 2,
  },
  heroContentMobile: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  heroLogoBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  heroLogoBadgeMobile: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  heroBrandLockup: {
    width: 250,
    height: 76,
    marginBottom: 10,
    ...Platform.select({
      web: {
        filter:
          'drop-shadow(0 4px 16px rgba(0, 0, 0, 0.85)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.9))',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.85,
        shadowRadius: 10,
      },
    }),
  },
  heroBrandLockupMobile: {
    width: 190,
    height: 52,
    marginBottom: 0,
    ...Platform.select({
      web: {
        filter:
          'drop-shadow(0 3px 12px rgba(0, 0, 0, 0.85)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9))',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.85,
        shadowRadius: 8,
      },
    }),
  },
  heroTagline: {
    color: '#F7F5F2',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
    ...Platform.select({
      web: {
        textShadow: '0 2px 10px rgba(0, 0, 0, 0.85), 0 1px 3px rgba(0, 0, 0, 0.95)',
      },
    }),
    fontFamily: Platform.select({
      web: 'Plus Jakarta Sans, Inter, sans-serif',
      default: 'sans-serif',
    }),
  },
});

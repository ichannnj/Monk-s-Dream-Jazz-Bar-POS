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
    padding: 20,
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
    height: 380,
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
  brandTitleBlock: {
    marginTop: 10,
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
  heroAccentDash: {
    width: 44,
    height: 3.5,
    backgroundColor: '#b93a52',
    borderRadius: 2,
    marginTop: 12,
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
    padding: 24,
  },
  rightHeader: {
    alignItems: 'center',
    marginBottom: 20,
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
  logoWrapper: {
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  officialBarLogo: {
    width: 90,
    height: 90,
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
  clockInButtonWrapper: {
    width: '100%',
    marginTop: 8,
    marginBottom: 20,
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
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  trainingModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trainingModeLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1a1a1e',
  },
  forgotPinPressable: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  forgotPinText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#641b2a',
  },
});

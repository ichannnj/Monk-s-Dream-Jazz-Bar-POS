import { StyleSheet } from 'react-native';
import { cartSidebarStyles } from './styles/cartSidebar.styles';
import { modifierModalStyles } from './styles/modifierModal.styles';
import { catalogGridStyles } from './styles/catalogGrid.styles';

const baseStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 30, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fullscreenModal: {
    backgroundColor: '#f6f0ed',
    borderRadius: 28,
    width: '100%',
    height: '95%',
    maxWidth: 1280,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  topBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  activeDestinationBadge: {
    backgroundColor: '#641b2a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  activeDestinationText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  topBarSub: {
    fontSize: 13.5,
    color: '#6b7280',
    fontWeight: '500',
  },
  topCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainSplit: {
    flex: 1,
    flexDirection: 'row',
  },
  catalogPanel: {
    flex: 1.6,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    backgroundColor: '#fcfaf9',
  },
  catalogHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  categoryPillsScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: '#f3f4f6',
  },
  catPillActive: {
    backgroundColor: '#641b2a',
  },
  catPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563',
  },
  catPillTextActive: {
    color: '#ffffff',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16, // Invariant: Must be >= 16px to prevent iOS Safari auto-zoom
    color: '#111827',
    fontWeight: '500',
  },
});

export const styles = {
  ...baseStyles,
  ...catalogGridStyles,
  ...cartSidebarStyles,
  ...modifierModalStyles,
};

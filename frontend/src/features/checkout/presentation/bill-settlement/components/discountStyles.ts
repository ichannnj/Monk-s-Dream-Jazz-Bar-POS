import { StyleSheet } from 'react-native';

export const discountStyles = StyleSheet.create({
  discountContainer: {
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  discountTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discountTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  discountPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  discountPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    backgroundColor: '#ffffff',
    minHeight: 40,
    justifyContent: 'center',
  },
  discountPillActive: {
    borderColor: '#810021',
    backgroundColor: '#810021',
  },
  discountPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  discountPillTextActive: {
    color: '#ffffff',
  },
  seniorFieldsBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    padding: 12,
    gap: 8,
  },
  seniorInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1917',
    textTransform: 'uppercase',
  },
  seniorInput: {
    minHeight: 48,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16, // Invariant: Must be >= 16px to prevent iOS Safari auto-zoom
    fontWeight: '600',
    color: '#1C1917',
  },
  seniorItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    backgroundColor: '#FAF8F5',
  },
  seniorItemRowActive: {
    borderColor: '#810021',
    backgroundColor: '#FAF8F5',
  },
});

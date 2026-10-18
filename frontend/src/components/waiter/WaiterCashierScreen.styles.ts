import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f6f0ed',
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 18,
    gap: 18,
  },
  mainContent: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardCol: {
    minWidth: 0,
  },
});

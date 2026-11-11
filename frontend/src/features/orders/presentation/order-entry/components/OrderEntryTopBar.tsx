import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { X, ChevronLeft } from 'lucide-react-native';
import { styles } from '../OrderEntryModal.styles';

export interface OrderEntryTopBarProps {
  title: string;
  isMobile: boolean;
  isMobileCartOpen: boolean;
  onBackToMenu: () => void;
  onClose: () => void;
}

export const OrderEntryTopBar: React.FC<OrderEntryTopBarProps> = ({
  title,
  isMobile,
  isMobileCartOpen,
  onBackToMenu,
  onClose,
}) => {
  return (
    <View style={[styles.topBar, isMobile && { paddingHorizontal: 14, paddingVertical: 10 }]}>
      <View style={[styles.topBarLeft, { flex: 1 }]}>
        {isMobile && isMobileCartOpen ? (
          <Pressable
            onPress={onBackToMenu}
            style={localStyles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to menu catalog"
          >
            <ChevronLeft size={18} color="#1c1917" />
            <Text style={localStyles.backButtonText}>Menu</Text>
          </Pressable>
        ) : null}
        <View style={[styles.activeDestinationBadge, { flexShrink: 1 }]}>
          <Text style={styles.activeDestinationText} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onClose}
        style={styles.topCloseBtn}
        accessibilityRole="button"
        accessibilityLabel="Close order entry"
      >
        <X size={22} color="#4b5563" />
      </Pressable>
    </View>
  );
};

const localStyles = StyleSheet.create({
  backButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f4',
    borderWidth: 1,
    borderColor: '#e7e5e4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1917',
  },
});

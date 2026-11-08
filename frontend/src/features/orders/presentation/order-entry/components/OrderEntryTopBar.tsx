import React from 'react';
import { View, Text, Pressable } from 'react-native';
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
            className="min-h-[48px] px-3 rounded-xl bg-stone-100 border border-stone-200 flex-row items-center gap-1"
            accessibilityRole="button"
            accessibilityLabel="Back to menu catalog"
          >
            <ChevronLeft size={18} color="#1c1917" />
            <Text className="text-base font-bold text-stone-800">Menu</Text>
          </Pressable>
        ) : null}
        <View style={[styles.activeDestinationBadge, { flexShrink: 1 }]}>
          <Text style={styles.activeDestinationText} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Text style={styles.topBarSub} className="hidden md:flex">
          Monk’s Dream POS • Station Auto-Routing Active
        </Text>
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

import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { X, CheckCircle2 } from 'lucide-react-native';
import { MenuItem } from '../../../mockData';
import { styles } from './OrderEntryModal.styles';

export interface OrderModifierModalProps {
  item: MenuItem | null;
  selectedModifiers: string[];
  notes: string;
  onToggleModifier: (modName: string) => void;
  onChangeNotes: (notes: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const OrderModifierModal: React.FC<OrderModifierModalProps> = ({
  item,
  selectedModifiers,
  notes,
  onToggleModifier,
  onChangeNotes,
  onClose,
  onConfirm,
}) => {
  if (!item) return null;

  return (
    <View style={styles.customizerBackdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel="Close customizer"
      />
      <View style={styles.customizerCard}>
        <View style={styles.customizerHeader}>
          <View>
            <Text style={styles.customizerTitle}>
              Customize {item.name}
            </Text>
            <Text style={styles.customizerSub}>
              Base: ${item.price.toFixed(2)}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close customizer"
          >
            <X size={20} color="#4b5563" />
          </Pressable>
        </View>

        {/* Modifiers List */}
        <Text style={styles.customizerSectionTitle}>
          Available Recipe Modifiers:
        </Text>
        <View style={styles.modList}>
          {item.modifiers.map((mod) => {
            const isSelected = selectedModifiers.includes(mod.name);

            return (
              <Pressable
                key={mod.id}
                onPress={() => onToggleModifier(mod.name)}
                style={[
                  styles.modRow,
                  isSelected && styles.modRowSelected,
                ]}
              >
                <Text
                  style={[
                    styles.modName,
                    isSelected && styles.modNameSelected,
                  ]}
                >
                  {mod.name}
                </Text>
                <Text
                  style={[
                    styles.modPrice,
                    isSelected && styles.modPriceSelected,
                  ]}
                >
                  {mod.priceDelta > 0
                    ? `+$${mod.priceDelta.toFixed(2)}`
                    : 'Free'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Special Prep Notes */}
        <Text style={styles.customizerSectionTitle}>
          Preparation Notes:
        </Text>
        <TextInput
          style={styles.customizerInput}
          placeholder="e.g. Extra hot oat milk, no parmesan, light ice..."
          placeholderTextColor="#9ca3af"
          value={notes}
          onChangeText={onChangeNotes}
        />

        <Pressable
          onPress={onConfirm}
          style={styles.confirmCustomizeBtn}
        >
          <CheckCircle2 size={16} color="#ffffff" strokeWidth={2.4} />
          <Text style={styles.confirmCustomizeBtnText}>
            Add to Cart
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

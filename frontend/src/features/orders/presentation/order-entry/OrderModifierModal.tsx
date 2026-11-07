import React, { useMemo } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import { X, CheckCircle2, Flame, Snowflake } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { MenuItem, ProductVariant, BeverageTemperature } from '../../../../types/floor';
import { styles } from './OrderEntryModal.styles';

export interface OrderModifierModalProps {
  item: MenuItem | null;
  selectedTemperature?: BeverageTemperature;
  selectedSize?: string;
  selectedModifiers: string[];
  notes: string;
  onSelectTemperature: (temp: BeverageTemperature) => void;
  onSelectSize: (size: string) => void;
  onToggleModifier: (modName: string) => void;
  onChangeNotes: (notes: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const OrderModifierModal: React.FC<OrderModifierModalProps> = ({
  item,
  selectedTemperature = 'HOT',
  selectedSize,
  selectedModifiers,
  notes,
  onSelectTemperature,
  onSelectSize,
  onToggleModifier,
  onChangeNotes,
  onClose,
  onConfirm,
}) => {
  if (!item) return null;

  const hasVariants = Boolean(item.variants && item.variants.length > 0);

  // Determine available temperatures
  const availableTemperatures = useMemo<BeverageTemperature[]>(() => {
    if (!hasVariants || !item.variants) return [];
    const temps = new Set<BeverageTemperature>();
    item.variants.forEach((v) => {
      if (v.temperature && v.temperature !== 'NONE') {
        temps.add(v.temperature);
      }
    });
    return Array.from(temps);
  }, [hasVariants, item.variants]);

  // Determine sizes available for the currently selected temperature
  const availableSizes = useMemo<
    { sizeLabel: string; price: number; variant: ProductVariant }[]
  >(() => {
    if (!hasVariants || !item.variants) return [];
    const matches = item.variants.filter((v) => {
      if (availableTemperatures.length > 0) {
        return v.temperature === selectedTemperature;
      }
      return true;
    });

    return matches.map((v) => ({
      sizeLabel: v.sizeLabel,
      price: v.price,
      variant: v,
    }));
  }, [hasVariants, item.variants, availableTemperatures, selectedTemperature]);

  // Current active variant matched
  const currentVariant = useMemo<ProductVariant | undefined>(() => {
    if (!hasVariants || !item.variants) return undefined;
    return (
      item.variants.find((v) => {
        const tempMatch =
          availableTemperatures.length === 0 || v.temperature === selectedTemperature;
        const sizeMatch = selectedSize ? v.sizeLabel === selectedSize : true;
        return tempMatch && sizeMatch;
      }) || item.variants[0]
    );
  }, [hasVariants, item.variants, availableTemperatures, selectedTemperature, selectedSize]);

  // Base price computation: variant price or product base price
  const basePrice = currentVariant ? currentVariant.price : item.price;

  // Add-on modifiers price delta
  const modifiersDelta = useMemo(() => {
    if (!item.modifiers) return 0;
    return selectedModifiers.reduce((acc, modName) => {
      const found = item.modifiers.find((m) => m.name === modName);
      return acc + (found ? found.priceDelta : 0);
    }, 0);
  }, [item.modifiers, selectedModifiers]);

  const totalEffectivePrice = basePrice + modifiersDelta;

  return (
    <View style={styles.customizerBackdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel="Close customizer"
      />
      <View style={styles.customizerCard}>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Header */}
          <View style={styles.customizerHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.customizerTitle}>{item.name}</Text>
              <View style={styles.variantBadgeHeader}>
                <Text style={styles.customizerSub}>Base: {formatCurrency(basePrice)}</Text>
                {currentVariant && currentVariant.temperature !== 'NONE' ? (
                  <View
                    style={
                      currentVariant.temperature === 'HOT'
                        ? styles.variantBadgeHot
                        : styles.variantBadgeCold
                    }
                  >
                    <Text
                      style={
                        currentVariant.temperature === 'HOT'
                          ? styles.variantBadgeTextHot
                          : styles.variantBadgeTextCold
                      }
                    >
                      {currentVariant.temperature === 'HOT' ? '🔥 HOT' : '❄️ ICED'} ·{' '}
                      {currentVariant.sizeLabel}
                    </Text>
                  </View>
                ) : null}
              </View>
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

          {/* Temperature Selector (Hot / Cold) */}
          {availableTemperatures.length > 1 ? (
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.customizerSectionTitle}>Temperature:</Text>
              <View style={styles.tempSelectorRow}>
                {availableTemperatures.includes('HOT') ? (
                  <Pressable
                    onPress={() => onSelectTemperature('HOT')}
                    style={[
                      styles.tempButton,
                      selectedTemperature === 'HOT' && styles.tempButtonHotSelected,
                    ]}
                  >
                    <Flame
                      size={18}
                      color={selectedTemperature === 'HOT' ? '#ea580c' : '#6b7280'}
                    />
                    <Text
                      style={[
                        styles.tempButtonText,
                        selectedTemperature === 'HOT' && styles.tempButtonTextHotSelected,
                      ]}
                    >
                      Hot
                    </Text>
                  </Pressable>
                ) : null}

                {availableTemperatures.includes('COLD') ? (
                  <Pressable
                    onPress={() => onSelectTemperature('COLD')}
                    style={[
                      styles.tempButton,
                      selectedTemperature === 'COLD' && styles.tempButtonColdSelected,
                    ]}
                  >
                    <Snowflake
                      size={18}
                      color={selectedTemperature === 'COLD' ? '#0284c7' : '#6b7280'}
                    />
                    <Text
                      style={[
                        styles.tempButtonText,
                        selectedTemperature === 'COLD' && styles.tempButtonTextColdSelected,
                      ]}
                    >
                      Iced / Cold
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Size Selector */}
          {availableSizes.length > 1 ? (
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.customizerSectionTitle}>Cup Size & Volume:</Text>
              <View style={styles.sizeSelectorRow}>
                {availableSizes.map((s) => {
                  const isSelected = selectedSize === s.sizeLabel;
                  return (
                    <Pressable
                      key={s.sizeLabel}
                      onPress={() => onSelectSize(s.sizeLabel)}
                      style={[styles.sizeButton, isSelected && styles.sizeButtonSelected]}
                    >
                      <Text
                        style={[styles.sizeButtonText, isSelected && styles.sizeButtonTextSelected]}
                      >
                        {s.sizeLabel}
                      </Text>
                      <Text
                        style={[
                          styles.sizeButtonPriceText,
                          isSelected && styles.sizeButtonPriceTextSelected,
                        ]}
                      >
                        {formatCurrency(s.price)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Modifiers List (if any) */}
          {item.modifiers && item.modifiers.length > 0 ? (
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.customizerSectionTitle}>Custom Add-ons & Dairy:</Text>
              <View style={styles.modList}>
                {item.modifiers.map((mod) => {
                  const isSelected = selectedModifiers.includes(mod.name);
                  return (
                    <Pressable
                      key={mod.id}
                      onPress={() => onToggleModifier(mod.name)}
                      style={[styles.modRow, isSelected && styles.modRowSelected]}
                    >
                      <Text style={[styles.modName, isSelected && styles.modNameSelected]}>
                        {mod.name}
                      </Text>
                      <Text style={[styles.modPrice, isSelected && styles.modPriceSelected]}>
                        {mod.priceDelta > 0 ? `+${formatCurrency(mod.priceDelta)}` : 'Free'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Special Prep Notes */}
          <Text style={styles.customizerSectionTitle}>Special Instructions:</Text>
          <TextInput
            style={styles.customizerInput}
            placeholder="e.g. Extra hot oat milk, light ice, less sweet..."
            placeholderTextColor="#9ca3af"
            value={notes}
            onChangeText={onChangeNotes}
          />

          {/* Confirm Button with Dynamic Price */}
          <Pressable onPress={onConfirm} style={styles.confirmCustomizeBtn}>
            <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.4} />
            <Text style={styles.confirmCustomizeBtnText}>
              Add to Cart • {formatCurrency(totalEffectivePrice)}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
};

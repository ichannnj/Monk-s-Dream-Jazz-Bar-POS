import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { X, CheckCircle2, Flame, Snowflake, ChevronDown } from 'lucide-react-native';
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

  // Available temperatures & sizes
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

  const availableSizes = useMemo<
    { sizeLabel: string; price: number; variant: ProductVariant }[]
  >(() => {
    if (!hasVariants || !item.variants) return [];
    return item.variants
      .filter((v) => availableTemperatures.length === 0 || v.temperature === selectedTemperature)
      .map((v) => ({ sizeLabel: v.sizeLabel, price: v.price, variant: v }));
  }, [hasVariants, item.variants, availableTemperatures, selectedTemperature]);

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

  const basePrice = currentVariant ? currentVariant.price : item.price;

  const modifiersDelta = useMemo(() => {
    if (!item.modifiers) return 0;
    return selectedModifiers.reduce((acc, modName) => {
      const found = item.modifiers.find((m) => m.name === modName);
      return acc + (found ? found.priceDelta : 0);
    }, 0);
  }, [item.modifiers, selectedModifiers]);

  const totalEffectivePrice = basePrice + modifiersDelta;

  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 15;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    setCanScrollDown(!isCloseToBottom);
  };

  const handleContentSizeChange = (_contentWidth: number, contentHeight: number) => {
    // Check initial scrollability on content layout (if content > card body height ~320px)
    if (contentHeight > 340) {
      setCanScrollDown(true);
    } else {
      setCanScrollDown(false);
    }
  };

  const handleScrollDownPress = () => {
    scrollViewRef.current?.scrollTo({ y: 180, animated: true });
  };

  return (
    <View style={styles.customizerBackdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel="Close customizer"
      />
      <View style={styles.customizerCard}>
        {/* Fixed Header */}
        <View style={styles.customizerHeaderWrapper}>
          <View style={styles.customizerHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.customizerTitle}>{item.name}</Text>
              <View style={styles.variantBadgeHeader}>
                <Text style={styles.customizerSub}>Base: {formatCurrency(basePrice)}</Text>
                {modifiersDelta > 0 ? (
                  <Text style={[styles.customizerSub, { color: '#800020', fontWeight: '700' }]}>
                    • Add-ons ({selectedModifiers.length}): +{formatCurrency(modifiersDelta)}
                  </Text>
                ) : null}
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
        </View>

        {/* Scrollable Body with Scroll Indicator */}
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={true}
          bounces={true}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          scrollEventThrottle={16}
          contentContainerStyle={styles.customizerScrollContent}
        >
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
              <Text style={styles.customizerSectionTitle}>Custom Add-ons & Modifiers:</Text>
              <View style={styles.modList}>
                {item.modifiers.map((mod) => {
                  const isSelected = selectedModifiers.includes(mod.name);
                  return (
                    <Pressable
                      key={mod.id || mod.name}
                      onPress={() => onToggleModifier(mod.name)}
                      style={[styles.modRow, isSelected && styles.modRowSelected]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`${mod.name}, +${formatCurrency(mod.priceDelta)}`}
                    >
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
                      >
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            borderWidth: 1.5,
                            borderColor: isSelected ? '#15803d' : '#9ca3af',
                            backgroundColor: isSelected ? '#15803d' : '#ffffff',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && <CheckCircle2 size={14} color="#ffffff" strokeWidth={3} />}
                        </View>
                        <Text style={[styles.modName, isSelected && styles.modNameSelected]}>
                          {mod.name}
                        </Text>
                      </View>
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
        </ScrollView>

        {/* Fixed Footer with Scroll Down Affordance & Confirm Button */}
        <View style={styles.customizerFooterWrapper}>
          {canScrollDown && (
            <Pressable
              onPress={handleScrollDownPress}
              style={styles.scrollAffordanceHint}
              accessibilityRole="button"
              accessibilityLabel="Scroll down for more options"
            >
              <Text style={styles.scrollAffordanceText}>
                Scroll down for instructions & add-ons
              </Text>
              <ChevronDown size={14} color="#800020" strokeWidth={2.5} />
            </Pressable>
          )}

          <Pressable onPress={onConfirm} style={styles.confirmCustomizeBtn}>
            <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.4} />
            <Text style={styles.confirmCustomizeBtnText}>
              Add to Cart • {formatCurrency(totalEffectivePrice)}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

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
import { X, CheckCircle2, Flame, Snowflake, ChevronDown, Check } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { useVirtualKeyboard } from '../../../shared';
import {
  MenuItem,
  ProductVariant,
  BeverageTemperature,
  OrderItemVariantSelection,
} from '../../../../types/floor';
import { styles } from './OrderEntryModal.styles';

export interface OrderModifierModalProps {
  item: MenuItem | null;
  selectedTemperature?: BeverageTemperature;
  selectedSize?: string;
  selectedModifiers: string[];
  selectedVariantOptions?: Record<string, string>; // groupId -> optionId
  notes: string;
  onSelectTemperature: (temp: BeverageTemperature) => void;
  onSelectSize: (size: string) => void;
  onToggleModifier: (modName: string) => void;
  onSelectVariantOption?: (groupId: string, optionId: string) => void;
  onChangeNotes: (notes: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const OrderModifierModal: React.FC<OrderModifierModalProps> = ({
  item,
  selectedTemperature = 'HOT',
  selectedSize,
  selectedModifiers,
  selectedVariantOptions = {},
  notes,
  onSelectTemperature,
  onSelectSize,
  onToggleModifier,
  onSelectVariantOption,
  onChangeNotes,
  onClose,
  onConfirm,
}) => {
  if (!item) return null;

  const hasVariants = Boolean(item.variants && item.variants.length > 0);
  const variantGroups = item.variantGroups || [];

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

  // Options delta (Flavor, etc.)
  const optionsDelta = useMemo(() => {
    let delta = 0;
    variantGroups.forEach((grp) => {
      const selectedOptId = selectedVariantOptions[grp.id];
      if (selectedOptId) {
        const opt = grp.options.find((o) => o.id === selectedOptId);
        if (opt) delta += opt.priceDelta;
      }
    });
    return delta;
  }, [variantGroups, selectedVariantOptions]);

  const modifiersDelta = useMemo(() => {
    if (!item.modifiers) return 0;
    return selectedModifiers.reduce((acc, modName) => {
      const found = item.modifiers.find((m) => m.name === modName);
      return acc + (found ? found.priceDelta : 0);
    }, 0);
  }, [item.modifiers, selectedModifiers]);

  const totalEffectivePrice = basePrice + optionsDelta + modifiersDelta;

  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { isKeyboardOpen, keyboardHeight, viewportHeight, dismissKeyboard } = useVirtualKeyboard();

  const handleBackdropPress = () => {
    if (isKeyboardOpen) {
      dismissKeyboard();
    }
    onClose();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 15;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    setCanScrollDown(!isCloseToBottom);
  };

  const handleContentSizeChange = (_contentWidth: number, contentHeight: number) => {
    if (contentHeight > 340) {
      setCanScrollDown(true);
    } else {
      setCanScrollDown(false);
    }
  };

  const handleScrollDownPress = () => {
    scrollViewRef.current?.scrollTo({ y: 180, animated: true });
  };

  // Required group validation
  const missingRequiredGroup = useMemo(() => {
    for (const grp of variantGroups) {
      if (grp.isRequired && !selectedVariantOptions[grp.id]) {
        return grp.name;
      }
    }
    return null;
  }, [variantGroups, selectedVariantOptions]);

  return (
    <View
      style={[
        styles.customizerBackdrop,
        isKeyboardOpen && {
          justifyContent: 'flex-start',
          paddingTop: 12,
          paddingBottom: Math.min(keyboardHeight, 320) + 16,
        },
      ]}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleBackdropPress}
        accessibilityLabel="Close customizer"
      />
      <View
        style={[
          styles.customizerCard,
          isKeyboardOpen && {
            maxHeight: Math.max(260, viewportHeight - 24),
          },
        ]}
      >
        {/* Fixed Header */}
        <View style={styles.customizerHeaderWrapper}>
          <View style={styles.customizerHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.customizerTitle}>{item.name}</Text>
              <View style={styles.variantBadgeHeader}>
                <Text style={styles.customizerSub}>Base: {formatCurrency(basePrice)}</Text>
                {optionsDelta > 0 ? (
                  <Text style={[styles.customizerSub, { color: '#b45309', fontWeight: '700' }]}>
                    • Flavor: +{formatCurrency(optionsDelta)}
                  </Text>
                ) : null}
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
          contentContainerStyle={[
            styles.customizerScrollContent,
            isKeyboardOpen && { paddingBottom: 64 },
          ]}
        >
          {/* Variant Groups (e.g., Flavor - Single Select Radio) */}
          {variantGroups.map((grp) => {
            const currentSelectedOptId = selectedVariantOptions[grp.id];
            return (
              <View key={grp.id} style={{ marginBottom: 14 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <Text style={styles.customizerSectionTitle}>{grp.name}:</Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: grp.isRequired ? '#dc2626' : '#6b7280',
                      textTransform: 'uppercase',
                    }}
                  >
                    {grp.isRequired ? 'Required · Single Choice' : 'Optional · Single Choice'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {grp.options.map((opt) => {
                    const isSelected = currentSelectedOptId === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => onSelectVariantOption?.(grp.id, isSelected ? '' : opt.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#800020' : '#e5e7eb',
                          backgroundColor: isSelected ? '#fff1f2' : '#ffffff',
                          gap: 8,
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                      >
                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            borderWidth: 1.5,
                            borderColor: isSelected ? '#800020' : '#9ca3af',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSelected ? '#800020' : '#ffffff',
                          }}
                        >
                          {isSelected && (
                            <View
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: '#ffffff',
                              }}
                            />
                          )}
                        </View>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: isSelected ? '700' : '600',
                            color: isSelected ? '#800020' : '#1f2937',
                          }}
                        >
                          {opt.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: isSelected ? '#800020' : '#6b7280',
                          }}
                        >
                          {opt.priceDelta > 0 ? `+${formatCurrency(opt.priceDelta)}` : 'Standard'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}

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

          {/* Modifiers List (Multi-Select Add-ons) */}
          {item.modifiers && item.modifiers.length > 0 ? (
            <View style={{ marginBottom: 14 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <Text style={styles.customizerSectionTitle}>Custom Add-ons & Modifiers:</Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                  }}
                >
                  Multi-Select Add-ons
                </Text>
              </View>
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
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <Text style={styles.customizerSectionTitle}>Special Instructions:</Text>
            {notes.length > 0 && (
              <Pressable
                onPress={() => onChangeNotes('')}
                hitSlop={8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f3f4f6',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear special instructions"
              >
                <X size={12} color="#6b7280" />
                <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: '700', color: '#4b5563' }}>
                  Clear
                </Text>
              </Pressable>
            )}
          </View>
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

          {missingRequiredGroup ? (
            <View
              style={{ backgroundColor: '#fee2e2', padding: 8, borderRadius: 8, marginBottom: 8 }}
            >
              <Text
                style={{ color: '#991b1b', fontSize: 12, fontWeight: '700', textAlign: 'center' }}
              >
                Please select an option for {missingRequiredGroup}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={missingRequiredGroup ? undefined : onConfirm}
            style={[styles.confirmCustomizeBtn, missingRequiredGroup && { opacity: 0.5 }]}
            disabled={Boolean(missingRequiredGroup)}
          >
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

import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Sparkles, Check, CheckCircle2 } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { ProductFlavorOptionStateItem } from './menuItemModal.types';

export interface MenuItemFlavorOptionsSectionProps {
  hasFlavorGroup: boolean;
  onToggleFlavorGroup: (enabled: boolean) => void;
  flavorOptions: ProductFlavorOptionStateItem[];
  onToggleOptionAssignment: (optionId: string) => void;
  onUpdateOptionPriceDelta: (optionId: string, priceDelta: string) => void;
  onSetDefaultOption: (optionId: string) => void;
}

export const MenuItemFlavorOptionsSection: React.FC<MenuItemFlavorOptionsSectionProps> = ({
  hasFlavorGroup,
  onToggleFlavorGroup,
  flavorOptions,
  onToggleOptionAssignment,
  onUpdateOptionPriceDelta,
  onSetDefaultOption,
}) => {
  return (
    <View className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-lg bg-amber-100 items-center justify-center">
            <Sparkles size={18} color="#b45309" />
          </View>
          <View>
            <Text className="text-base font-bold text-amber-950">Flavor / Single Choice Group</Text>
            <Text className="text-xs text-amber-800">
              Mutually-exclusive single choice (e.g. Classic, Spanish, Caramel, Vanilla)
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => onToggleFlavorGroup(!hasFlavorGroup)}
          className={`min-h-[44px] px-4 rounded-xl items-center justify-center border ${
            hasFlavorGroup
              ? 'bg-amber-600 border-amber-700'
              : 'bg-white border-stone-300 active:bg-stone-50'
          }`}
          accessibilityRole="switch"
          accessibilityState={{ checked: hasFlavorGroup }}
        >
          <Text className={`text-xs font-bold ${hasFlavorGroup ? 'text-white' : 'text-stone-700'}`}>
            {hasFlavorGroup ? 'Group Enabled' : 'Enable Group'}
          </Text>
        </Pressable>
      </View>

      {hasFlavorGroup && (
        <View className="pt-2 space-y-3 border-t border-amber-200/60">
          <Text className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Available Flavor Choices & Price Deltas (₱)
          </Text>

          <View className="space-y-2">
            {flavorOptions.map((opt) => {
              const isAssigned = opt.is_assigned;
              return (
                <View
                  key={opt.id}
                  className={`flex-row items-center justify-between p-3 rounded-xl border ${
                    isAssigned
                      ? 'bg-white border-amber-300 shadow-sm'
                      : 'bg-stone-50 border-stone-200 opacity-60'
                  }`}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <Pressable
                      onPress={() => onToggleOptionAssignment(opt.id)}
                      className={`w-6 h-6 rounded-md items-center justify-center border ${
                        isAssigned ? 'bg-amber-600 border-amber-700' : 'bg-white border-stone-400'
                      }`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isAssigned }}
                    >
                      {isAssigned && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </Pressable>

                    <View>
                      <Text className="text-sm font-bold text-stone-900">{opt.name}</Text>
                      <Text className="text-[11px] text-stone-500 font-mono">code: {opt.code}</Text>
                    </View>
                  </View>

                  {isAssigned && (
                    <View className="flex-row items-center gap-3">
                      <Pressable
                        onPress={() => onSetDefaultOption(opt.id)}
                        className={`px-2.5 py-1 rounded-md border ${
                          opt.is_default
                            ? 'bg-amber-100 border-amber-400'
                            : 'bg-stone-100 border-stone-200'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            opt.is_default ? 'text-amber-900' : 'text-stone-600'
                          }`}
                        >
                          {opt.is_default ? '★ Default' : 'Make Default'}
                        </Text>
                      </Pressable>

                      <View className="flex-row items-center gap-1">
                        <Text className="text-xs font-bold text-stone-600">+₱</Text>
                        <TextInput
                          value={opt.price_delta}
                          onChangeText={(val) => onUpdateOptionPriceDelta(opt.id, val)}
                          keyboardType="numeric"
                          placeholder="0.00"
                          className="w-20 min-h-[36px] bg-stone-50 border border-stone-300 rounded-lg px-2 text-right text-xs font-bold text-stone-900"
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

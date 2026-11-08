import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check, Coffee, Flame, Snowflake, Trash2 } from 'lucide-react-native';
import { AdminInput } from '../../../components/AdminInput';
import { AdminNumberInput } from '../../../components/AdminNumberInput';
import { PRESET_SIZES, VariantMatrixRow } from './menuItemModal.types';

interface MenuItemVariantMatrixSectionProps {
  hasVariants: boolean;
  setHasVariants: (val: boolean) => void;
  supportedTemps: ('HOT' | 'COLD')[];
  onToggleTemp: (temp: 'HOT' | 'COLD') => void;
  selectedSizes: string[];
  onToggleSize: (size: string) => void;
  customSizeInput: string;
  setCustomSizeInput: (val: string) => void;
  onAddCustomSize: () => void;
  variantsMatrix: VariantMatrixRow[];
  setVariantsMatrix: React.Dispatch<React.SetStateAction<VariantMatrixRow[]>>;
  onUpdateMatrixPrice: (index: number, val: string) => void;
  onToggleMatrixRowAvailability: (index: number) => void;
  onApplyBaseToAll: () => void;
  onRegenerateMatrix: (temps: ('HOT' | 'COLD')[], sizes: string[]) => void;
}

export const MenuItemVariantMatrixSection: React.FC<MenuItemVariantMatrixSectionProps> = ({
  hasVariants,
  setHasVariants,
  supportedTemps,
  onToggleTemp,
  selectedSizes,
  onToggleSize,
  customSizeInput,
  setCustomSizeInput,
  onAddCustomSize,
  variantsMatrix,
  setVariantsMatrix,
  onUpdateMatrixPrice,
  onToggleMatrixRowAvailability,
  onApplyBaseToAll,
  onRegenerateMatrix,
}) => {
  return (
    <View className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-4">
      <Pressable
        onPress={() => {
          const next = !hasVariants;
          setHasVariants(next);
          if (next && variantsMatrix.length === 0) {
            onRegenerateMatrix(supportedTemps, selectedSizes);
          }
        }}
        className="flex-row items-center justify-between"
      >
        <View className="flex-row items-center space-x-3">
          <View className="h-10 w-10 rounded-xl bg-amber-500/10 items-center justify-center border border-amber-500/20">
            <Coffee size={20} color="#b45309" />
          </View>
          <View className="ml-2">
            <Text className="text-base font-bold text-stone-900">
              Beverage Sizes & Temperature Matrix
            </Text>
            <Text className="text-xs text-stone-500">
              Separate prices for Hot / Iced and sizes (8oz, 12oz, etc.). If disabled, uses base
              price.
            </Text>
          </View>
        </View>
        <View
          className={`h-6 w-6 rounded-md items-center justify-center border ${
            hasVariants ? 'bg-[#800020] border-[#800020]' : 'bg-white border-stone-400'
          }`}
        >
          {hasVariants && <Check size={16} color="#ffffff" />}
        </View>
      </Pressable>

      {hasVariants && (
        <View className="border-t border-stone-200 pt-4 space-y-4">
          {/* Temperature Selection */}
          <View>
            <Text className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
              1. Supported Temperatures
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => onToggleTemp('HOT')}
                className={`min-h-[44px] flex-1 flex-row items-center justify-center rounded-xl border px-3 py-2 ${
                  supportedTemps.includes('HOT')
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <Flame size={16} color={supportedTemps.includes('HOT') ? '#ea580c' : '#78716c'} />
                <Text
                  className={`ml-2 text-sm font-bold ${
                    supportedTemps.includes('HOT') ? 'text-orange-700' : 'text-stone-600'
                  }`}
                >
                  Hot Options
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onToggleTemp('COLD')}
                className={`min-h-[44px] flex-1 flex-row items-center justify-center rounded-xl border px-3 py-2 ${
                  supportedTemps.includes('COLD')
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <Snowflake
                  size={16}
                  color={supportedTemps.includes('COLD') ? '#0284c7' : '#78716c'}
                />
                <Text
                  className={`ml-2 text-sm font-bold ${
                    supportedTemps.includes('COLD') ? 'text-sky-700' : 'text-stone-600'
                  }`}
                >
                  Iced / Cold Options
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Sizes Selection */}
          <View>
            <Text className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
              2. Offered Cup Sizes & Volumes
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-2.5">
              {PRESET_SIZES.map((sz) => {
                const isSelected = selectedSizes.includes(sz);
                return (
                  <Pressable
                    key={sz}
                    onPress={() => onToggleSize(sz)}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-lg border text-xs font-bold items-center justify-center ${
                      isSelected ? 'bg-emerald-50 border-emerald-600' : 'bg-white border-stone-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-emerald-700' : 'text-stone-600'
                      }`}
                    >
                      {sz}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="flex-row gap-2">
              <View className="flex-1">
                <AdminInput
                  value={customSizeInput}
                  onChangeText={setCustomSizeInput}
                  placeholder="Add custom size (e.g. 20oz, Pitcher)..."
                />
              </View>
              <Pressable
                onPress={onAddCustomSize}
                className="min-h-[44px] px-4 rounded-xl bg-stone-800 items-center justify-center active:bg-stone-900"
              >
                <Text className="text-xs font-bold text-white">+ Add Size</Text>
              </Pressable>
            </View>
          </View>

          {/* Price Matrix Table */}
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold uppercase tracking-wider text-stone-600">
                3. Combination Price Matrix
              </Text>
              <Pressable
                onPress={onApplyBaseToAll}
                className="px-2.5 py-1 rounded-md bg-stone-200 active:bg-stone-300"
              >
                <Text className="text-xs font-bold text-stone-700">Apply Base Price to All</Text>
              </Pressable>
            </View>

            <View className="rounded-xl border border-stone-200 bg-white overflow-hidden divide-y divide-stone-100">
              {variantsMatrix.length === 0 ? (
                <View className="p-4 items-center justify-center">
                  <Text className="text-xs text-stone-400">
                    Select at least one temperature and size above to build pricing matrix.
                  </Text>
                </View>
              ) : (
                variantsMatrix.map((row, idx) => (
                  <View
                    key={`${row.temperature}-${row.size_label}-${idx}`}
                    className={`p-3 flex-row items-center justify-between gap-3 ${
                      !row.is_available ? 'opacity-40 bg-stone-50' : ''
                    }`}
                  >
                    <View className="flex-row items-center space-x-2">
                      <View
                        className={`px-2 py-1 rounded-md border ${
                          row.temperature === 'HOT'
                            ? 'bg-orange-50 border-orange-200'
                            : row.temperature === 'COLD'
                              ? 'bg-sky-50 border-sky-200'
                              : 'bg-stone-100 border-stone-200'
                        }`}
                      >
                        <Text
                          className={`text-xs font-black ${
                            row.temperature === 'HOT'
                              ? 'text-orange-700'
                              : row.temperature === 'COLD'
                                ? 'text-sky-700'
                                : 'text-stone-700'
                          }`}
                        >
                          {row.temperature === 'HOT'
                            ? 'HOT'
                            : row.temperature === 'COLD'
                              ? 'ICED'
                              : 'STD'}
                        </Text>
                      </View>
                      <Text className="text-sm font-bold text-stone-800 ml-1">
                        {row.size_label}
                      </Text>
                    </View>

                    <View className="flex-row items-center space-x-2">
                      <View className="w-28">
                        <AdminNumberInput
                          mode="currency"
                          value={row.price}
                          onChangeText={(val) => onUpdateMatrixPrice(idx, val)}
                          placeholder="0.00"
                        />
                      </View>
                      <Pressable
                        onPress={() => onToggleMatrixRowAvailability(idx)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                          row.is_available
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-stone-100 border-stone-300 text-stone-400'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            row.is_available ? 'text-emerald-700' : 'text-stone-400'
                          }`}
                        >
                          {row.is_available ? 'Offered' : 'Hidden'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          setVariantsMatrix((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md"
                      >
                        <Trash2 size={16} color="#9ca3af" />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

import React from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { Sparkles, Check, Trash2, Plus, Star } from 'lucide-react-native';
import { AdminInput } from '../../../components/AdminInput';
import { AdminNumberInput } from '../../../components/AdminNumberInput';
import { ProductFlavorOptionStateItem } from './menuItemModal.types';

export interface MenuItemFlavorOptionsSectionProps {
  hasFlavorGroup: boolean;
  onToggleFlavorGroup: (enabled: boolean) => void;
  flavorGroupName: string;
  onChangeFlavorGroupName: (name: string) => void;
  flavorGroupRequired: boolean;
  onToggleFlavorGroupRequired: (required: boolean) => void;
  flavorOptions: ProductFlavorOptionStateItem[];
  catalogFlavorPool?: ProductFlavorOptionStateItem[];
  onToggleOptionAssignment: (optionId: string) => void;
  onUpdateOptionPriceDelta: (optionId: string, priceDelta: string) => void;
  onUpdateOptionName: (optionId: string, name: string) => void;
  onSetDefaultOption: (optionId: string) => void;
  onRemoveOption: (optionId: string) => void;
  customFlavorName: string;
  onChangeCustomFlavorName: (name: string) => void;
  customFlavorPrice: string;
  onChangeCustomFlavorPrice: (price: string) => void;
  onAddCustomFlavor: () => void;
}

export const MenuItemFlavorOptionsSection: React.FC<MenuItemFlavorOptionsSectionProps> = ({
  hasFlavorGroup,
  onToggleFlavorGroup,
  flavorGroupName,
  onChangeFlavorGroupName,
  flavorGroupRequired,
  onToggleFlavorGroupRequired,
  flavorOptions,
  catalogFlavorPool = [],
  onToggleOptionAssignment,
  onUpdateOptionPriceDelta,
  onUpdateOptionName,
  onSetDefaultOption,
  onRemoveOption,
  customFlavorName,
  onChangeCustomFlavorName,
  customFlavorPrice,
  onChangeCustomFlavorPrice,
  onAddCustomFlavor,
}) => {
  const assignedOptions = flavorOptions.filter((o) => o.is_assigned);

  // Suggestions from catalog that are not yet assigned to this product
  const assignedNames = new Set(assignedOptions.map((o) => o.name.toLowerCase()));
  const unassignedSuggestions = catalogFlavorPool.filter(
    (c) => !assignedNames.has(c.name.toLowerCase())
  );

  return (
    <View className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-4">
      {/* Top Header & Group Enable Toggle */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-amber-100 items-center justify-center border border-amber-200">
            <Sparkles size={20} color="#b45309" />
          </View>
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-amber-950">
                {hasFlavorGroup && flavorGroupName ? flavorGroupName : 'Flavor & Single Choice'}
              </Text>
              {hasFlavorGroup && (
                <View className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5">
                  <Text className="text-xs font-bold text-amber-900">
                    {assignedOptions.length} Active
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-xs text-amber-800">
              Mutually-exclusive choice (e.g. Classic vs Spanish, Passionfruit vs Strawberry)
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
        <View className="space-y-4 border-t border-amber-200/60 pt-3">
          {/* Group Config: Title & Required Switch */}
          <View className="flex-col sm:flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1">
                Group Display Title
              </Text>
              <TextInput
                value={flavorGroupName}
                onChangeText={onChangeFlavorGroupName}
                placeholder="e.g. Flavor, Mocktail Flavor, Syrup Choice..."
                className="w-full min-h-[44px] bg-white border border-amber-200 rounded-xl px-3 text-sm font-semibold text-stone-900"
              />
            </View>

            <View className="sm:w-52">
              <Text className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1">
                Selection Rule
              </Text>
              <Pressable
                onPress={() => onToggleFlavorGroupRequired(!flavorGroupRequired)}
                className={`min-h-[44px] px-3 rounded-xl border flex-row items-center justify-between ${
                  flavorGroupRequired
                    ? 'bg-amber-100 border-amber-400'
                    : 'bg-white border-stone-200 active:bg-stone-50'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${flavorGroupRequired ? 'text-amber-950' : 'text-stone-600'}`}
                >
                  {flavorGroupRequired ? 'Mandatory (1-of-N)' : 'Optional (Can skip)'}
                </Text>
                <View
                  className={`w-5 h-5 rounded-md items-center justify-center border ${
                    flavorGroupRequired
                      ? 'bg-amber-600 border-amber-700'
                      : 'bg-white border-stone-300'
                  }`}
                >
                  {flavorGroupRequired && <Check size={12} color="#F7F5F2" strokeWidth={3} />}
                </View>
              </Pressable>
            </View>
          </View>

          {/* Catalog Quick-Pick Suggestions */}
          {unassignedSuggestions.length > 0 && (
            <View className="space-y-1.5 bg-amber-100/40 p-2.5 rounded-xl border border-amber-200/50">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                + Quick Pick From Catalog Choices
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {unassignedSuggestions.map((sug) => (
                  <Pressable
                    key={sug.id}
                    onPress={() => onToggleOptionAssignment(sug.id)}
                    className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white border border-amber-300 active:bg-amber-50 flex-row items-center gap-1.5 shadow-2xs"
                  >
                    <Plus size={13} color="#b45309" strokeWidth={2.5} />
                    <Text className="text-xs font-semibold text-stone-800">{sug.name}</Text>
                    {parseFloat(sug.price_delta) > 0 && (
                      <Text className="text-[11px] font-bold text-amber-900">
                        +₱{parseFloat(sug.price_delta).toFixed(2)}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Active Assigned Flavors List */}
          <View className="space-y-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Active Choices for this Item & Price Deltas (+₱)
            </Text>

            {assignedOptions.length === 0 ? (
              <View className="p-4 rounded-xl border border-dashed border-amber-300 bg-white items-center justify-center">
                <Text className="text-xs text-amber-800">
                  No flavor choices currently assigned. Use the bar below or click a catalog preset
                  above.
                </Text>
              </View>
            ) : (
              <View className="space-y-2">
                {assignedOptions.map((opt) => (
                  <View
                    key={opt.id}
                    className="flex-row items-center justify-between p-2.5 sm:p-3 rounded-xl border bg-white border-amber-300 shadow-2xs gap-2"
                  >
                    {/* Editable Option Name */}
                    <View className="flex-1 min-w-0">
                      <TextInput
                        value={opt.name}
                        onChangeText={(val) => onUpdateOptionName(opt.id, val)}
                        placeholder="Flavor Name"
                        className="min-h-[40px] px-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm font-bold text-stone-900"
                      />
                    </View>

                    {/* Actions: Make Default, Price Delta, Remove */}
                    <View className="flex-row items-center gap-2 flex-shrink-0">
                      <Pressable
                        onPress={() => onSetDefaultOption(opt.id)}
                        className={`min-h-[40px] px-2.5 rounded-lg border flex-row items-center gap-1 ${
                          opt.is_default
                            ? 'bg-amber-100 border-amber-400'
                            : 'bg-stone-50 border-stone-200 active:bg-stone-100'
                        }`}
                      >
                        <Star
                          size={13}
                          color={opt.is_default ? '#b45309' : '#78716c'}
                          fill={opt.is_default ? '#b45309' : 'transparent'}
                        />
                        <Text
                          className={`text-xs font-bold ${
                            opt.is_default ? 'text-amber-900' : 'text-stone-600'
                          }`}
                        >
                          {opt.is_default ? 'Default' : 'Set Default'}
                        </Text>
                      </Pressable>

                      <View className="flex-row items-center gap-1">
                        <Text className="text-xs font-bold text-stone-500">+₱</Text>
                        <TextInput
                          value={opt.price_delta}
                          onChangeText={(val) => onUpdateOptionPriceDelta(opt.id, val)}
                          keyboardType="numeric"
                          placeholder="0.00"
                          className="w-20 min-h-[40px] bg-stone-50 border border-stone-300 rounded-lg px-2 text-right text-xs font-bold text-stone-900"
                        />
                      </View>

                      <Pressable
                        onPress={() => onRemoveOption(opt.id)}
                        className="min-h-[40px] min-w-[40px] items-center justify-center rounded-lg bg-stone-50 border border-stone-200 active:bg-rose-50 active:border-rose-300"
                        accessibilityLabel={`Remove ${opt.name}`}
                      >
                        <Trash2 size={16} color="#e11d48" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Quick Custom Flavor Input Bar (Matching Modifiers/Add-ons) */}
          <View className="space-y-1.5 border-t border-amber-200/60 pt-3">
            <Text className="text-xs font-bold uppercase tracking-wider text-amber-900">
              + Add Custom Flavor Choice
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <AdminInput
                  value={customFlavorName}
                  onChangeText={onChangeCustomFlavorName}
                  placeholder="e.g. Passionfruit, Wild Strawberry, Smoked Peach..."
                />
              </View>
              <View className="w-28">
                <AdminNumberInput
                  mode="currency"
                  value={customFlavorPrice}
                  onChangeText={onChangeCustomFlavorPrice}
                  placeholder="0.00"
                />
              </View>
              <Pressable
                onPress={onAddCustomFlavor}
                className="min-h-[44px] px-4 rounded-xl bg-amber-700 items-center justify-center active:bg-amber-800"
              >
                <Text className="text-xs font-bold text-white">+ Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

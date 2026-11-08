import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sliders, Edit, Trash2 } from 'lucide-react-native';
import type { ModifierGroupAdmin } from '../../../data/admin.api';

interface ModifierGroupListTabProps {
  modifierGroups: ModifierGroupAdmin[];
  onEditGroup: (group: ModifierGroupAdmin) => void;
  onDeleteGroup: (group: ModifierGroupAdmin) => void;
}

export const ModifierGroupListTab: React.FC<ModifierGroupListTabProps> = ({
  modifierGroups,
  onEditGroup,
  onDeleteGroup,
}) => {
  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
      <View className="space-y-4">
        {modifierGroups.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <Sliders size={40} color="#a8a29e" />
            <Text className="mt-2 text-base text-stone-500">
              No modifier groups configured. Tap "New Modifier Group" to add.
            </Text>
          </View>
        ) : (
          modifierGroups.map((group) => (
            <View key={group.id} className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <View className="flex-row items-center space-x-2">
                    <Text className="text-lg font-bold text-stone-900">{group.name}</Text>
                    {group.is_required && (
                      <View className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5">
                        <Text className="text-base font-bold text-amber-900">Required</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-base text-stone-500 mt-0.5">
                    Rules: Min {group.min_selections} • Max {group.max_selections} choices
                  </Text>
                </View>
                <View className="flex-row items-center space-x-2">
                  <Pressable
                    onPress={() => onEditGroup(group)}
                    className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-white border border-stone-300 active:bg-stone-100"
                  >
                    <Edit size={18} color="#44403c" />
                  </Pressable>
                  <Pressable
                    onPress={() => onDeleteGroup(group)}
                    className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-rose-50 border border-rose-200 active:bg-rose-100"
                  >
                    <Trash2 size={18} color="#e11d48" />
                  </Pressable>
                </View>
              </View>

              <View className="mt-3 border-t border-stone-200 pt-3">
                <Text className="text-base font-semibold text-stone-600 mb-2">Options:</Text>
                <View className="flex-row flex-wrap gap-2">
                  {group.options && group.options.length > 0 ? (
                    group.options.map((opt) => (
                      <View
                        key={opt.id}
                        className="rounded-lg bg-white border border-stone-300 px-3 py-1.5"
                      >
                        <Text className="text-base text-stone-800">
                          {opt.name}{' '}
                          <Text className="font-bold text-[#800020]">
                            {Number(opt.price_delta || 0) > 0
                              ? `(+₱${Number(opt.price_delta || 0).toFixed(2)})`
                              : '(+₱0.00)'}
                          </Text>
                          {opt.inventory_item && (
                            <Text className="text-base text-stone-500">
                              {' '}
                              • -{opt.amount_delta} {opt.unit}
                            </Text>
                          )}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text className="text-base text-stone-400">No options defined</Text>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

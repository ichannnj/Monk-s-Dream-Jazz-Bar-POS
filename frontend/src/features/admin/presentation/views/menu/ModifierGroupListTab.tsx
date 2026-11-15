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
    <View className="rounded-2xl border border-stone-200/80 bg-white p-3.5 sm:p-5 lg:p-6 shadow-xs">
      <View className="space-y-3.5">
        {modifierGroups.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <Sliders size={36} color="#a8a29e" />
            <Text className="mt-2 text-base text-stone-500">
              No modifier groups configured. Tap "+ Add Group" to add.
            </Text>
          </View>
        ) : (
          modifierGroups.map((group) => (
            <View
              key={group.id}
              className="rounded-xl border border-stone-200/90 bg-stone-50/50 p-3.5 sm:p-4"
            >
              <View className="flex-row items-start sm:items-center justify-between gap-3">
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                      {group.name}
                    </Text>
                    {group.is_required && (
                      <View className="rounded-md bg-stone-100 border border-stone-300 px-2 py-0.5">
                        <Text className="text-xs font-bold text-stone-700">Required</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-stone-500 font-medium mt-0.5">
                    Select {group.min_selections}–{group.max_selections} choices
                  </Text>
                </View>

                <View className="flex-row items-center gap-2 flex-shrink-0">
                  <Pressable
                    onPress={() => onEditGroup(group)}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] items-center justify-center rounded-xl bg-white border border-stone-200 active:bg-stone-50"
                    accessibilityLabel={`Edit ${group.name}`}
                  >
                    <Edit size={17} color="#1c1917" />
                  </Pressable>
                  <Pressable
                    onPress={() => onDeleteGroup(group)}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] items-center justify-center rounded-xl bg-white border border-stone-200 active:bg-stone-50"
                    accessibilityLabel={`Delete ${group.name}`}
                  >
                    <Trash2 size={17} color="#800020" />
                  </Pressable>
                </View>
              </View>

              {/* Options pill chips */}
              <View className="mt-3 border-t border-stone-200/70 pt-2.5">
                <View className="flex-row flex-wrap gap-1.5">
                  {group.options && group.options.length > 0 ? (
                    group.options.map((opt) => (
                      <View
                        key={opt.id}
                        className="rounded-lg bg-white border border-stone-200 px-2.5 py-1"
                      >
                        <Text className="text-xs text-stone-800 font-medium">
                          {opt.name}{' '}
                          <Text className="font-bold text-[#800020]">
                            {Number(opt.price_delta || 0) > 0
                              ? `(+₱${Number(opt.price_delta || 0).toFixed(2)})`
                              : '(+₱0.00)'}
                          </Text>
                          {opt.inventory_item && (
                            <Text className="text-stone-400">
                              {' '}
                              · {opt.amount_delta} {opt.unit}
                            </Text>
                          )}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text className="text-xs text-stone-400 font-medium">No options defined</Text>
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

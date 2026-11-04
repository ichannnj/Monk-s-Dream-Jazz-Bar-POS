import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { ChevronDown, Check, X, ShieldAlert, Leaf } from 'lucide-react-native';

export interface MultiSelectTagOption {
  value: string;
  label: string;
  badge?: string;
}

export interface PosMultiSelectDropdownProps {
  label: string;
  options: MultiSelectTagOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  sheetTitle?: string;
  variant?: 'danger' | 'success' | 'default';
  icon?: React.ComponentType<{ size?: number; color?: string }>;
}

export const PosMultiSelectDropdown: React.FC<PosMultiSelectDropdownProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'None selected',
  sheetTitle,
  variant = 'default',
  icon: IconComponent,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          tagBg: 'bg-rose-50 border-rose-300',
          tagText: 'text-rose-800',
          accent: '#e11d48',
          iconColor: '#b45309',
        };
      case 'success':
        return {
          tagBg: 'bg-emerald-50 border-emerald-300',
          tagText: 'text-emerald-800',
          accent: '#059669',
          iconColor: '#059669',
        };
      default:
        return {
          tagBg: 'bg-stone-100 border-stone-300',
          tagText: 'text-stone-800',
          accent: '#800020',
          iconColor: '#78716c',
        };
    }
  };

  const currentStyles = getVariantStyles();

  return (
    <View className="space-y-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-stone-800">{label}</Text>
        {selectedValues.length > 0 && (
          <Pressable
            onPress={() => onChange([])}
            className="px-2 py-0.5 rounded active:bg-stone-100"
          >
            <Text className="text-xs font-semibold text-stone-500">Clear all</Text>
          </Pressable>
        )}
      </View>

      {/* Trigger Button */}
      <Pressable
        onPress={() => setIsOpen(true)}
        className="min-h-[48px] flex-row items-center justify-between rounded-xl border border-stone-300 bg-white px-3.5 py-2 shadow-xs active:bg-stone-50"
      >
        <View className="flex-1 flex-row items-center flex-wrap gap-1.5 mr-2">
          {IconComponent && (
            <View className="mr-1">
              <IconComponent size={18} color={currentStyles.iconColor} />
            </View>
          )}

          {selectedValues.length === 0 ? (
            <Text className="text-base text-stone-400 font-medium">{placeholder}</Text>
          ) : (
            selectedValues.map((val) => {
              const opt = options.find((o) => o.value === val);
              const displayLabel = opt ? opt.label : val;
              return (
                <View
                  key={val}
                  className={`flex-row items-center rounded-lg border px-2 py-0.5 ${currentStyles.tagBg}`}
                >
                  <Text className={`text-xs font-bold mr-1 ${currentStyles.tagText}`}>
                    {displayLabel}
                  </Text>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      toggleOption(val);
                    }}
                    hitSlop={8}
                  >
                    <X size={12} color={currentStyles.accent} />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        <View className="flex-row items-center space-x-2">
          {selectedValues.length > 0 && (
            <View className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5">
              <Text className="text-xs font-black text-stone-700">{selectedValues.length}</Text>
            </View>
          )}
          <ChevronDown size={18} color="#78716c" />
        </View>
      </Pressable>

      {/* Multi-Select Modal Sheet */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <Pressable className="absolute inset-0" onPress={() => setIsOpen(false)} />

          <View className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-stone-200">
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-stone-200 px-5 py-4 bg-stone-50">
              <View className="flex-row items-center space-x-2">
                {IconComponent && <IconComponent size={20} color={currentStyles.accent} />}
                <Text className="text-lg font-bold text-stone-900 ml-2">{sheetTitle || label}</Text>
              </View>
              <Pressable
                onPress={() => setIsOpen(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-stone-200/70 active:bg-stone-300"
              >
                <X size={16} color="#57534e" />
              </Pressable>
            </View>

            {/* Options List */}
            <ScrollView className="max-h-80 p-3 space-y-1" showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => toggleOption(option.value)}
                    className={`min-h-[48px] flex-row items-center justify-between rounded-xl px-4 py-2.5 transition-all ${
                      isSelected ? `${currentStyles.tagBg} border` : 'bg-white active:bg-stone-100'
                    }`}
                  >
                    <View className="flex-row items-center space-x-2">
                      <Text
                        className={`text-base font-semibold ${
                          isSelected ? currentStyles.tagText : 'text-stone-800'
                        }`}
                      >
                        {option.label}
                      </Text>
                    </View>

                    <View
                      className={`h-6 w-6 rounded-md items-center justify-center border ${
                        isSelected
                          ? `bg-[${currentStyles.accent}] border-[${currentStyles.accent}]`
                          : 'bg-white border-stone-300'
                      }`}
                      style={{
                        backgroundColor: isSelected ? currentStyles.accent : '#ffffff',
                        borderColor: isSelected ? currentStyles.accent : '#d6d3d1',
                      }}
                    >
                      {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Footer */}
            <View className="border-t border-stone-200 p-4 bg-stone-50 flex-row items-center justify-between">
              <Text className="text-xs text-stone-500 font-medium">
                {selectedValues.length} of {options.length} selected
              </Text>
              <Pressable
                onPress={() => setIsOpen(false)}
                className="min-h-[42px] px-6 items-center justify-center rounded-xl bg-[#800020] active:opacity-90"
              >
                <Text className="text-sm font-bold text-white">Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

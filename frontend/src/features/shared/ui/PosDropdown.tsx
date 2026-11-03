import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { ChevronDown, Check, X } from 'lucide-react-native';

export interface PosDropdownOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  badge?: number | string;
  hasDot?: boolean;
  dotColor?: string;
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  variant?: 'default' | 'danger' | 'success' | 'warning' | 'wine';
}

export interface PosDropdownProps<T extends string = string> {
  options: PosDropdownOption<T>[];
  value?: T;
  onChange: (value: T) => void;
  mode?: 'select' | 'action';
  triggerLabel?: string;
  triggerIcon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  triggerBadge?: number | string;
  prefixLabel?: string;
  sheetTitle?: string;
  variant?: 'white' | 'wine' | 'dark' | 'burgundy-nav' | 'emerald' | 'amber';
  className?: string;
  accessibilityLabel?: string;
}

export function PosDropdown<T extends string = string>({
  options,
  value,
  onChange,
  mode = 'select',
  triggerLabel,
  triggerIcon: TriggerIcon,
  triggerBadge,
  prefixLabel,
  sheetTitle,
  variant = 'white',
  className = '',
  accessibilityLabel,
}: PosDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption =
    mode === 'select' ? options.find((opt) => opt.value === value) || options[0] : undefined;

  const ActiveIcon = mode === 'action' ? TriggerIcon : selectedOption?.icon || TriggerIcon;
  const displayLabel =
    mode === 'action'
      ? triggerLabel || 'Actions'
      : selectedOption?.label || triggerLabel || 'Select';
  const displayBadge = mode === 'action' ? triggerBadge : (selectedOption?.badge ?? triggerBadge);

  const isSolidVariant =
    variant === 'wine' ||
    variant === 'dark' ||
    variant === 'burgundy-nav' ||
    variant === 'emerald' ||
    variant === 'amber';

  const getButtonContainerClass = () => {
    switch (variant) {
      case 'wine':
        return 'bg-[#800020] border-[#800020] active:opacity-90';
      case 'dark':
        return 'bg-stone-900 border-stone-900 active:opacity-90';
      case 'burgundy-nav':
        return 'bg-[#5c202f] border-[#783042] active:opacity-90';
      case 'emerald':
        return 'bg-emerald-700 border-emerald-700 active:opacity-90';
      case 'amber':
        return 'bg-amber-600 border-amber-600 active:opacity-90';
      case 'white':
      default:
        return 'bg-white border-stone-300 active:bg-stone-50';
    }
  };

  const iconColor = isSolidVariant ? '#ffffff' : '#800020';
  const chevronColor = isSolidVariant ? '#f5d0fe' : '#57534e';

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        className={`min-h-[48px] flex-row items-center justify-between rounded-xl border px-3.5 py-2 shadow-xs ${getButtonContainerClass()} ${className}`}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || `${prefixLabel || ''} ${displayLabel}`.trim()}
      >
        <View className="flex-row items-center flex-shrink mr-2">
          {ActiveIcon ? (
            <View className="mr-2">
              <ActiveIcon size={18} color={iconColor} strokeWidth={2.2} />
            </View>
          ) : selectedOption?.dotColor ? (
            <View
              className="w-2.5 h-2.5 rounded-full mr-2"
              style={{ backgroundColor: selectedOption.dotColor }}
            />
          ) : null}

          {prefixLabel ? (
            <Text
              className={`text-base font-medium mr-1.5 ${
                isSolidVariant ? 'text-rose-200' : 'text-stone-500'
              }`}
              numberOfLines={1}
            >
              {prefixLabel}
            </Text>
          ) : null}

          <Text
            className={`text-base font-bold flex-shrink ${
              isSolidVariant ? 'text-white' : 'text-stone-900'
            }`}
            numberOfLines={1}
          >
            {displayLabel}
          </Text>

          {displayBadge !== undefined && displayBadge !== null && displayBadge !== '' ? (
            <View
              className={`ml-2 rounded-lg px-2 py-0.5 ${
                isSolidVariant ? 'bg-white/20' : 'bg-stone-100 border border-stone-200'
              }`}
            >
              <Text
                className={`text-base font-extrabold ${
                  isSolidVariant ? 'text-white' : 'text-stone-700'
                }`}
              >
                {displayBadge}
              </Text>
            </View>
          ) : selectedOption?.hasDot ? (
            <View className="ml-2 w-2.5 h-2.5 rounded-full bg-amber-400" />
          ) : null}
        </View>

        <ChevronDown size={18} color={chevronColor} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          onPress={() => setIsOpen(false)}
          className="flex-1 bg-black/50 items-center justify-end sm:justify-center p-0 sm:p-4"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-stone-200 shadow-2xl overflow-hidden max-h-[82%]"
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/70">
              <Text className="text-lg font-extrabold text-stone-900">
                {sheetTitle || prefixLabel?.replace(':', '') || triggerLabel || 'Select Option'}
              </Text>
              <Pressable
                onPress={() => setIsOpen(false)}
                className="min-h-[48px] min-w-[48px] -mr-2 items-center justify-center rounded-xl active:bg-stone-200/60"
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              >
                <X size={20} color="#57534e" />
              </Pressable>
            </View>

            {/* Options List */}
            <ScrollView className="p-3" showsVerticalScrollIndicator={false}>
              <View className="gap-1.5 pb-4">
                {options.map((option) => {
                  const isSelected = mode === 'select' && option.value === value;
                  const OptionIcon = option.icon;

                  const optionIconColor = isSelected
                    ? '#800020'
                    : option.variant === 'danger'
                      ? '#be123c'
                      : option.variant === 'success'
                        ? '#047857'
                        : option.variant === 'warning'
                          ? '#b45309'
                          : '#57534e';

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        setIsOpen(false);
                        onChange(option.value);
                      }}
                      className={`min-h-[52px] flex-row items-center justify-between rounded-2xl px-4 py-3 border ${
                        isSelected
                          ? 'bg-[#800020]/10 border-[#800020]/30'
                          : 'bg-white border-transparent active:bg-stone-100'
                      }`}
                      accessibilityRole="menuitem"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View className="flex-row items-center flex-1 mr-3">
                        {OptionIcon ? (
                          <View
                            className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                              isSelected ? 'bg-[#800020]/15' : 'bg-stone-100'
                            }`}
                          >
                            <OptionIcon size={20} color={optionIconColor} strokeWidth={2.2} />
                          </View>
                        ) : option.dotColor ? (
                          <View
                            className="w-3.5 h-3.5 rounded-full mr-3"
                            style={{ backgroundColor: option.dotColor }}
                          />
                        ) : null}

                        <View className="flex-1">
                          <View className="flex-row items-center flex-wrap gap-2">
                            <Text
                              className={`text-base ${
                                isSelected
                                  ? 'font-extrabold text-[#800020]'
                                  : option.variant === 'danger'
                                    ? 'font-bold text-rose-700'
                                    : 'font-bold text-stone-900'
                              }`}
                            >
                              {option.label}
                            </Text>
                            {option.badge !== undefined && option.badge !== null ? (
                              <View
                                className={`rounded-lg px-2 py-0.5 ${
                                  isSelected
                                    ? 'bg-[#800020]'
                                    : 'bg-stone-100 border border-stone-200'
                                }`}
                              >
                                <Text
                                  className={`text-base font-bold ${
                                    isSelected ? 'text-white' : 'text-stone-700'
                                  }`}
                                >
                                  {option.badge}
                                </Text>
                              </View>
                            ) : option.hasDot ? (
                              <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            ) : null}
                          </View>

                          {option.description ? (
                            <Text className="text-base text-stone-500 mt-0.5">
                              {option.description}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {isSelected ? <Check size={20} color="#800020" strokeWidth={2.6} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

import React, { useState } from 'react';
import { View, Text, TextInput, type TextInputProps, Platform } from 'react-native';

export interface AdminInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerClassName?: string;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
}

export const AdminInput: React.FC<AdminInputProps> = ({
  label,
  error,
  helperText,
  required = false,
  containerClassName = '',
  rightElement,
  leftElement,
  style,
  onFocus,
  onBlur,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getBorderAndRingClass = () => {
    if (error) {
      return 'border-rose-500 bg-white ring-2 ring-rose-500/20';
    }
    if (isFocused) {
      return 'border-[#800020] bg-white ring-2 ring-[#800020]/20';
    }
    return 'border-stone-300 bg-white';
  };

  return (
    <View className={`w-full ${containerClassName}`}>
      {label && (
        <View className="mb-1.5 flex-row items-center justify-between">
          <Text className="text-base font-semibold text-stone-800">
            {label} {required && <Text className="text-rose-600 font-bold">*</Text>}
          </Text>
        </View>
      )}

      <View
        className={`min-h-[48px] flex-row items-center rounded-xl border px-3.5 transition-all ${getBorderAndRingClass()}`}
        style={Platform.OS === 'web' ? ({ outline: 'none' } as any) : undefined}
      >
        {leftElement && <View className="mr-2.5 items-center justify-center">{leftElement}</View>}

        <TextInput
          placeholderTextColor="#a8a29e"
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            Platform.OS === 'web' ? ({ outline: 'none', boxShadow: 'none' } as any) : undefined,
            style,
          ]}
          className={`min-h-[46px] flex-1 text-base text-stone-900 ${className}`}
          {...props}
        />

        {rightElement && <View className="ml-2.5 items-center justify-center">{rightElement}</View>}
      </View>

      {error ? (
        <Text className="mt-1 text-sm font-semibold text-rose-600">{error}</Text>
      ) : helperText ? (
        <Text className="mt-1 text-sm text-stone-500">{helperText}</Text>
      ) : null}
    </View>
  );
};

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  type TextInputProps,
  Pressable,
  Platform,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { X } from 'lucide-react-native';

export interface TouchTextInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerClassName?: string;
  containerStyle?: ViewStyle;
  style?: TextStyle;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  className?: string;
}

export const TouchTextInput: React.FC<TouchTextInputProps> = ({
  label,
  error,
  helperText,
  required = false,
  containerClassName = '',
  containerStyle,
  style,
  leftElement,
  rightElement,
  clearable = true,
  onClear,
  value,
  onChangeText,
  multiline = false,
  onFocus,
  onBlur,
  className = '',
  placeholderTextColor = '#9ca3af',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleClear = () => {
    if (onChangeText) {
      onChangeText('');
    }
    onClear?.();
    inputRef.current?.focus();
  };

  const hasValue = typeof value === 'string' && value.length > 0;
  const showClearButton = clearable && hasValue;

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
    <View className={`w-full ${containerClassName}`} style={containerStyle}>
      {/* Label and multi-line top-right clear badge */}
      {(label || (multiline && showClearButton)) && (
        <View className="mb-1.5 flex-row items-center justify-between">
          {label ? (
            <Text className="text-base font-semibold text-stone-800">
              {label} {required && <Text className="text-rose-600 font-bold">*</Text>}
            </Text>
          ) : (
            <View />
          )}

          {multiline && showClearButton && (
            <Pressable
              onPress={handleClear}
              hitSlop={8}
              className="flex-row items-center rounded-md bg-stone-100 px-2 py-0.5 active:bg-stone-200"
              accessibilityRole="button"
              accessibilityLabel="Clear text"
            >
              <X size={13} color="#78716c" />
              <Text className="ml-1 text-xs font-semibold text-stone-600">Clear</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Input Container */}
      <View
        className={`relative flex-row rounded-xl border transition-all ${
          multiline ? 'p-3 min-h-[72px] items-start' : 'px-3.5 min-h-[48px] items-center'
        } ${getBorderAndRingClass()}`}
        style={Platform.OS === 'web' ? ({ outline: 'none' } as any) : undefined}
      >
        {leftElement && (
          <View className={`items-center justify-center ${multiline ? 'mt-1 mr-2' : 'mr-2.5'}`}>
            {leftElement}
          </View>
        )}

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          placeholderTextColor={placeholderTextColor}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.baseInput,
            multiline && styles.multilineInput,
            Platform.OS === 'web' ? ({ outline: 'none', boxShadow: 'none' } as any) : undefined,
            style,
          ]}
          className={`flex-1 text-base text-stone-900 ${className}`}
          {...props}
        />

        {/* Single-line 1-tap clear button */}
        {!multiline && showClearButton && (
          <Pressable
            onPress={handleClear}
            hitSlop={10}
            className="h-8 w-8 items-center justify-center rounded-full active:bg-stone-100"
            accessibilityRole="button"
            accessibilityLabel="Clear text"
          >
            <X size={16} color="#78716c" />
          </Pressable>
        )}

        {rightElement && (
          <View className={`items-center justify-center ${multiline ? 'mt-1 ml-2' : 'ml-2.5'}`}>
            {rightElement}
          </View>
        )}
      </View>

      {error ? (
        <Text className="mt-1 text-sm font-semibold text-rose-600">{error}</Text>
      ) : helperText ? (
        <Text className="mt-1 text-sm text-stone-500">{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  baseInput: {
    fontSize: 16, // Invariant: Must be >= 16px to prevent mobile browser auto-zoom
    minHeight: 46,
    color: '#1c1917',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
});

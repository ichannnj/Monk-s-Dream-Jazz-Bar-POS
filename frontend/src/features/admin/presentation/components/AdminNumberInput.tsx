import React from 'react';
import { View, Text } from 'react-native';
import { AdminInput, type AdminInputProps } from './AdminInput';

export type NumberInputMode = 'currency' | 'decimal' | 'integer';

export interface AdminNumberInputProps extends Omit<
  AdminInputProps,
  'value' | 'onChangeText' | 'keyboardType' | 'inputMode'
> {
  value: string | number;
  onChangeValue?: (numericValue: number, textValue: string) => void;
  onChangeText?: (text: string) => void;
  mode?: NumberInputMode;
  min?: number;
  max?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  allowNegative?: boolean;
}

export const AdminNumberInput: React.FC<AdminNumberInputProps> = ({
  value,
  onChangeValue,
  onChangeText,
  mode = 'decimal',
  min,
  max,
  decimals = mode === 'currency' ? 2 : 3,
  suffix,
  prefix,
  allowNegative = false,
  className = '',
  ...props
}) => {
  const displayValue = value === null || value === undefined ? '' : String(value);

  const sanitizeInput = (text: string): string => {
    if (!text) return '';

    // If integer, strip everything except digits (and optional leading minus)
    if (mode === 'integer') {
      let cleaned = text.replace(/[^0-9-]/g, '');
      if (!allowNegative) {
        cleaned = cleaned.replace(/-/g, '');
      } else {
        // Only allow leading minus
        cleaned = cleaned.replace(/(?!^)-/g, '');
      }
      return cleaned;
    }

    // Decimal or Currency: allow digits, at most one decimal point, and optional leading minus
    let cleaned = text.replace(/[^0-9.-]/g, '');
    if (!allowNegative) {
      cleaned = cleaned.replace(/-/g, '');
    } else {
      cleaned = cleaned.replace(/(?!^)-/g, '');
    }

    // Ensure only one dot
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = `${parts[0]}.${parts.slice(1).join('')}`;
    }

    // Limit decimal places if specified
    if (parts.length === 2 && parts[1].length > decimals) {
      cleaned = `${parts[0]}.${parts[1].slice(0, decimals)}`;
    }

    return cleaned;
  };

  const handleChangeText = (text: string) => {
    const sanitized = sanitizeInput(text);

    // Call raw string handler if supplied
    onChangeText?.(sanitized);

    // Call numeric value handler if supplied
    if (onChangeValue) {
      const parsed = parseFloat(sanitized);
      const numVal = isNaN(parsed) ? 0 : parsed;
      onChangeValue(numVal, sanitized);
    }
  };

  const effectivePrefix = prefix !== undefined ? prefix : mode === 'currency' ? '₱' : undefined;

  return (
    <AdminInput
      value={displayValue}
      onChangeText={handleChangeText}
      keyboardType={mode === 'integer' ? 'number-pad' : 'decimal-pad'}
      inputMode={mode === 'integer' ? 'numeric' : 'decimal'}
      leftElement={
        effectivePrefix ? (
          <View className="rounded-md bg-stone-100 px-2 py-0.5 border border-stone-200">
            <Text className="text-base font-bold text-stone-700">{effectivePrefix}</Text>
          </View>
        ) : undefined
      }
      rightElement={
        suffix ? (
          <View className="rounded-md bg-stone-100 px-2 py-0.5 border border-stone-200">
            <Text className="text-base font-semibold text-stone-600">{suffix}</Text>
          </View>
        ) : undefined
      }
      className={`font-semibold ${className}`}
      {...props}
    />
  );
};

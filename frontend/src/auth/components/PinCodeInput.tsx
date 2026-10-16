import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

interface PinCodeInputProps {
  value: string;
  length?: number;
  onChange: (pin: string) => void;
  onComplete?: (pin: string) => void;
  isError?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const PinCodeInput: React.FC<PinCodeInputProps> = ({
  value,
  length = 6,
  onChange,
  onComplete,
  isError = false,
  disabled = false,
  autoFocus = false,
}) => {
  const inputRef = useRef<TextInput>(null);
  const shakeOffset = useSharedValue(0);

  // Trigger GPU-accelerated shake animation on error
  useEffect(() => {
    if (isError) {
      shakeOffset.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [isError, shakeOffset]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
    onChange(cleaned);
    if (cleaned.length === length && onComplete) {
      onComplete(cleaned);
    }
  };

  const handleCellPress = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const cells = Array.from({ length }, (_, i) => i);

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {/* Invisible Native Input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        textContentType="oneTimeCode"
        style={styles.hiddenInput}
        caretHidden
      />

      {/* 6 Discrete Visual Cells */}
      <Pressable onPress={handleCellPress} style={styles.cellsRow}>
        {cells.map((index) => {
          const isFilled = index < value.length;
          const isCurrent = index === value.length;
          const cellBorderColor = isError
            ? '#e11d48'
            : isCurrent
            ? '#641b2a'
            : isFilled
            ? '#4a121e'
            : '#e2e4e8';

          return (
            <PinCell
              key={index}
              isFilled={isFilled}
              isCurrent={isCurrent}
              borderColor={cellBorderColor}
              isError={isError}
            />
          );
        })}
      </Pressable>
    </Animated.View>
  );
};

interface PinCellProps {
  isFilled: boolean;
  isCurrent: boolean;
  borderColor: string;
  isError: boolean;
}

const PinCell: React.FC<PinCellProps> = React.memo(({ isFilled, isCurrent, borderColor, isError }) => {
  const dotScale = useSharedValue(isFilled ? 1 : 0);

  useEffect(() => {
    if (isFilled) {
      dotScale.value = withSpring(1, { damping: 12, stiffness: 220 });
    } else {
      dotScale.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.ease) });
    }
  }, [isFilled, dotScale]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotScale.value,
  }));

  return (
    <View
      style={[
        styles.cell,
        {
          borderColor,
          backgroundColor: isCurrent ? '#fdf8f9' : '#ffffff',
          shadowColor: isCurrent ? '#641b2a' : 'transparent',
          shadowOpacity: isCurrent ? 0.08 : 0,
          shadowRadius: 4,
          elevation: isCurrent ? 2 : 0,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: isError ? '#e11d48' : '#220810' },
          dotAnimatedStyle,
        ]}
      />
    </View>
  );
});

PinCell.displayName = 'PinCell';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    zIndex: 1,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  cellsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cell: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});

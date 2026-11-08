import React from 'react';
import { View, Text } from 'react-native';
import { PinCodeInput } from './PinCodeInput';
import { styles } from '../screens/LoginScreen.styles';

interface StaffPinLoginFormProps {
  pin: string;
  setPin: (val: string) => void;
  isError: boolean;
  onClearErrors: () => void;
  onComplete: (completedPin: string) => void;
  isTablet?: boolean;
}

export const StaffPinLoginForm: React.FC<StaffPinLoginFormProps> = ({
  pin,
  setPin,
  isError,
  onClearErrors,
  onComplete,
  isTablet = true,
}) => {
  return (
    <View style={[styles.inputGroup, !isTablet && styles.inputGroupMobile]}>
      <Text style={[styles.inputLabel, !isTablet && styles.inputLabelMobile]}>
        4-Digit Staff PIN
      </Text>
      <PinCodeInput
        value={pin}
        length={4}
        onChange={(val) => {
          setPin(val);
          onClearErrors();
        }}
        onComplete={onComplete}
        isError={isError}
      />
    </View>
  );
};

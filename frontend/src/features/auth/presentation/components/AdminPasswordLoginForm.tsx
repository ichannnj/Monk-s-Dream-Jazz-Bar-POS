import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { styles } from '../screens/LoginScreen.styles';

interface AdminPasswordLoginFormProps {
  adminPassword: string;
  setAdminPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  onClearErrors: () => void;
  onSubmit: () => void;
  isTablet?: boolean;
}

export const AdminPasswordLoginForm: React.FC<AdminPasswordLoginFormProps> = ({
  adminPassword,
  setAdminPassword,
  showPassword,
  setShowPassword,
  onClearErrors,
  onSubmit,
  isTablet = true,
}) => {
  return (
    <View style={[styles.inputGroup, !isTablet && styles.inputGroupMobile]}>
      <View style={[styles.roundedInputWrapper, !isTablet && styles.roundedInputWrapperMobile]}>
        <Lock size={18} color="#a8a29e" style={styles.inputIcon} />
        <TextInput
          value={adminPassword}
          onChangeText={(val) => {
            setAdminPassword(val);
            onClearErrors();
          }}
          placeholder="Password"
          placeholderTextColor="#a8a29e"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="current-password"
          accessibilityLabel="Password"
          onSubmitEditing={onSubmit}
          style={[styles.roundedTextInput, !isTablet && styles.roundedTextInputMobile]}
        />
        <Pressable
          onPress={() => setShowPassword(!showPassword)}
          style={styles.passwordEyeButton}
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} color="#810021" /> : <Eye size={18} color="#a8a29e" />}
        </Pressable>
      </View>
    </View>
  );
};

import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { styles } from '../screens/LoginScreen.styles';

interface AdminPasswordLoginFormProps {
  adminPassword: string;
  setAdminPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  onClearErrors: () => void;
  onSubmit: () => void;
}

export const AdminPasswordLoginForm: React.FC<AdminPasswordLoginFormProps> = ({
  adminPassword,
  setAdminPassword,
  showPassword,
  setShowPassword,
  onClearErrors,
  onSubmit,
}) => {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Admin Password</Text>
      <View style={styles.passwordInputWrapper}>
        <TextInput
          value={adminPassword}
          onChangeText={(val) => {
            setAdminPassword(val);
            onClearErrors();
          }}
          placeholder="Enter admin password"
          placeholderTextColor="#9ca3af"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={onSubmit}
          style={styles.passwordInput}
        />
        <Pressable
          onPress={() => setShowPassword(!showPassword)}
          style={styles.passwordEyeButton}
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} color="#641b2a" /> : <Eye size={18} color="#9ca3af" />}
        </Pressable>
      </View>
    </View>
  );
};

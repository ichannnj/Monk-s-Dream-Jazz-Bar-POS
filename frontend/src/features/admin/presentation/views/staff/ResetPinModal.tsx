import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { KeyRound } from 'lucide-react-native';
import { toast } from '@/features/shared/toast/useToastStore';
import { adminApi, type StaffMemberAdmin } from '../../../data/admin.api';
import { AdminModal } from '../../components/AdminModal';
import { AdminInput } from '../../components/AdminInput';

interface ResetPinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staff: StaffMemberAdmin | null;
}

export const ResetPinModal: React.FC<ResetPinModalProps> = ({
  visible,
  onClose,
  onSuccess,
  staff,
}) => {
  const [newPin, setNewPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setNewPin('');
    }
  }, [visible]);

  const handlePinChange = (val: string) => {
    setNewPin(val.replace(/\D/g, '').slice(0, 4));
  };

  const handleSave = async () => {
    if (!staff) return;
    if (!/^\d{4}$/.test(newPin.trim())) {
      toast.error('Please enter an exact 4-digit numeric PIN', { title: 'Invalid PIN' });
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.resetStaffPin(staff.id, newPin.trim());
      toast.success(`PIN updated for ${staff.display_name} (@${staff.username})`, {
        title: 'Security PIN Reset',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset security PIN', { title: 'Reset Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!staff) return null;

  return (
    <AdminModal
      visible={visible}
      onClose={onClose}
      title={`Reset Security PIN: ${staff.display_name}`}
      subtitle={`Login ID: @${staff.username}`}
      icon={<KeyRound size={20} color="#800020" />}
      size="sm"
      footer={
        <>
          <Pressable
            onPress={onClose}
            disabled={isSubmitting}
            className="min-h-[48px] px-5 items-center justify-center rounded-xl border border-stone-200 bg-white active:bg-stone-50"
          >
            <Text className="text-base font-bold text-stone-600">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={isSubmitting || newPin.length !== 4}
            className={`min-h-[48px] px-6 items-center justify-center rounded-xl bg-[#800020] active:opacity-90 ${
              isSubmitting || newPin.length !== 4 ? 'opacity-50' : ''
            }`}
          >
            <Text className="text-base font-bold text-white">
              {isSubmitting ? 'Updating...' : 'Save New PIN'}
            </Text>
          </Pressable>
        </>
      }
    >
      <View className="space-y-4">
        <AdminInput
          label="New 4-Digit Security PIN"
          required
          keyboardType="number-pad"
          maxLength={4}
          placeholder="Enter 4 digits (e.g. 5678)"
          value={newPin}
          onChangeText={handlePinChange}
          leftElement={<KeyRound size={16} color="#800020" />}
          helperText={`${newPin.length}/4 numeric digits`}
        />
      </View>
    </AdminModal>
  );
};

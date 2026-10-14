import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Delete, Lock, X } from 'lucide-react-native';

interface PinPadModalProps {
  visible: boolean;
  title?: string;
  userName?: string;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
}

export const PinPadModal: React.FC<PinPadModalProps> = ({
  visible,
  title = 'Enter Staff PIN',
  userName,
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState('');

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        setTimeout(() => {
          onSuccess(nextPin);
          setPin('');
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClose = () => {
    setPin('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/80 items-center justify-center p-4">
        <View className="w-80 bg-jazz-900 border border-jazz-800 rounded-3xl p-6 items-center">
          {/* Header */}
          <View className="w-full flex-row items-center justify-between mb-4">
            <View className="flex-row items-center space-x-2">
              <Lock size={16} color="#f59e0b" />
              <Text className="text-white font-extrabold text-sm">{title}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} className="p-1">
              <X size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {userName && (
            <Text className="text-jazz-gold font-bold text-xs mb-3">
              Logging in as {userName}
            </Text>
          )}

          {/* 4-digit indicators */}
          <View className="flex-row space-x-3 mb-6">
            {[0, 1, 2, 3].map((idx) => (
              <View
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border ${
                  pin.length > idx
                    ? 'bg-jazz-gold border-jazz-gold'
                    : 'bg-jazz-950 border-jazz-700'
                }`}
              />
            ))}
          </View>

          {/* Keypad */}
          <View className="w-full flex-row flex-wrap justify-between gap-y-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(
              (key, idx) => {
                if (key === '') {
                  return <View key={idx} className="w-20 h-14" />;
                }
                if (key === 'del') {
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={handleDelete}
                      className="w-20 h-14 rounded-2xl bg-jazz-850 border border-jazz-750 items-center justify-center"
                    >
                      <Delete size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleDigit(key)}
                    className="w-20 h-14 rounded-2xl bg-jazz-850 border border-jazz-750 items-center justify-center active:bg-jazz-gold/20"
                  >
                    <Text className="text-white text-lg font-black">{key}</Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

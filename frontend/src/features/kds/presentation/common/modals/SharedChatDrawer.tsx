import React from 'react';
import { View, Modal, Pressable } from 'react-native';
import { SharedChatView } from '../../../../chat/presentation/SharedChatView';

interface SharedChatDrawerProps {
  visible: boolean;
  onClose: () => void;
  staffName?: string;
  staffRole?: string;
  defaultChannel?: 'all' | 'bar' | 'kitchen';
}

export const SharedChatDrawer: React.FC<SharedChatDrawerProps> = ({
  visible,
  onClose,
  staffName = 'Station Staff',
  staffRole = 'KDS Operator',
  defaultChannel = 'all',
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-center items-center p-0 sm:p-4 md:p-6">
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityLabel="Close chat" />
        <View className="w-full max-w-5xl h-full sm:h-[94%] bg-[#f6f0ed] rounded-none sm:rounded-3xl overflow-hidden shadow-2xl">
          <SharedChatView
            senderName={staffName}
            senderRole={staffRole}
            defaultChannel={defaultChannel}
            onBack={onClose}
            backLabel="Close Chat"
          />
        </View>
      </View>
    </Modal>
  );
};

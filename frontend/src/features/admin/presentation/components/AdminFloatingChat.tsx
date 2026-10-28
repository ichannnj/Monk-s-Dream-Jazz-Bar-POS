import React, { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { MessageSquare, X } from 'lucide-react-native';
import { SharedChatView } from '@/features/chat/presentation/SharedChatView';

interface AdminFloatingChatProps {
  unreadCount?: number;
}

export const AdminFloatingChat: React.FC<AdminFloatingChatProps> = ({ unreadCount = 3 }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Trigger Button (Fixed Bottom-Right) */}
      <View className="absolute bottom-6 right-6 z-40">
        <Pressable
          onPress={() => setIsOpen(true)}
          className="relative h-14 w-14 items-center justify-center rounded-full bg-[#800020] shadow-2xl active:opacity-90"
        >
          <MessageSquare size={26} color="#ffffff" />
          {unreadCount > 0 && (
            <View className="absolute -top-1 -right-1 h-6 w-6 items-center justify-center rounded-full bg-rose-600 border-2 border-white shadow-sm">
              <Text className="text-xs font-bold text-white">{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Slide-over Drawer / Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="h-[85%] w-full rounded-t-3xl bg-white shadow-2xl overflow-hidden md:ml-auto md:h-full md:w-[480px] md:rounded-l-3xl md:rounded-t-none">
            {/* Drawer Header */}
            <View className="flex-row items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
              <View className="flex-row items-center space-x-2">
                <View className="rounded-lg bg-[#800020] p-1.5">
                  <MessageSquare size={18} color="#ffffff" />
                </View>
                <View className="ml-2">
                  <Text className="text-base font-bold text-stone-900">Live Team Chat</Text>
                  <Text className="text-xs text-stone-500">
                    Floor, Bar, Kitchen & Expediter Line
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setIsOpen(false)}
                className="rounded-full bg-stone-200/80 p-2 active:bg-stone-300"
              >
                <X size={18} color="#44403c" />
              </Pressable>
            </View>

            {/* Embedded SharedChatView */}
            <View className="flex-1">
              <SharedChatView
                senderRole="Manager"
                senderName="Dana Cruz"
                onBack={() => setIsOpen(false)}
                backLabel="Close Chat"
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

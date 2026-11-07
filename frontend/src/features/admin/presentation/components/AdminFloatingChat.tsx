import React, { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { MessageSquare, X } from 'lucide-react-native';
import { SharedChatView } from '@/features/chat/presentation/SharedChatView';
import { useResponsive } from '@/features/shared/hooks/useResponsive';

interface AdminFloatingChatProps {
  unreadCount?: number;
}

export const AdminFloatingChat: React.FC<AdminFloatingChatProps> = ({ unreadCount = 3 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isDesktop } = useResponsive();

  // Responsive guard: Floating icon toggle is strictly desktop-only.
  // On mobile & tablet (< 1024px), team chat is accessible via the bottom nav & drawer.
  if (!isDesktop) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Trigger Button (Desktop only; Hidden when drawer is open) */}
      {!isOpen && (
        <View className="absolute bottom-6 right-6 z-40">
          <Pressable
            onPress={() => setIsOpen(true)}
            className="group relative h-14 w-14 items-center justify-center rounded-full bg-[#800020] shadow-2xl active:opacity-90 transition-all hover:scale-105 active:scale-95 border-2 border-white/20"
            accessibilityRole="button"
            accessibilityLabel="Open live team chat"
          >
            <MessageSquare size={24} color="#ffffff" strokeWidth={2.2} />
            {unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-rose-600 border-2 border-white shadow-sm">
                <Text className="text-[11px] font-bold text-white leading-none">{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {/* Slide-over Drawer / Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          {/* Backdrop Click Dismiss */}
          <Pressable
            className="absolute inset-0"
            onPress={() => setIsOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close team chat drawer"
          />

          <View className="h-full w-full max-w-lg lg:max-w-xl ml-auto bg-white shadow-2xl overflow-hidden rounded-l-3xl z-50 flex-col">
            {/* Drawer Header */}
            <View className="flex-row items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
              <View className="flex-row items-center flex-1 mr-2 min-w-0">
                <View className="rounded-xl bg-[#800020] p-2 mr-3 shadow-xs shrink-0">
                  <MessageSquare size={18} color="#ffffff" strokeWidth={2.2} />
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center">
                    <Text
                      className="text-base font-bold text-stone-900 mr-2 shrink min-w-0"
                      numberOfLines={1}
                    >
                      Live Team Chat
                    </Text>
                    <View className="flex-row items-center bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                      <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                      <Text className="text-[11px] font-semibold text-emerald-800">Live</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-stone-500 mt-0.5 shrink min-w-0" numberOfLines={1}>
                    Floor, Bar, Kitchen & Staff Channels
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setIsOpen(false)}
                className="h-9 w-9 rounded-full bg-stone-100 items-center justify-center active:bg-stone-200 shrink-0"
                accessibilityRole="button"
                accessibilityLabel="Close team chat drawer"
              >
                <X size={18} color="#44403c" strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Embedded SharedChatView with compact and hideHeader */}
            <View className="flex-1 bg-[#FAF5F5]">
              <SharedChatView senderRole="Manager" hideHeader={true} compact={true} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

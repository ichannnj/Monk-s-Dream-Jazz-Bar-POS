import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { ChatConversation } from '../../domain/chat.types';
import { StaffChatUser } from '../../data/chat.api';

export interface ChatThreadHeaderProps {
  isCompact: boolean;
  activeConversation: ChatConversation;
  activeStaffRoster: StaffChatUser[];
  onlineUserIds: string[];
  currentUserId?: string;
  onBackToList: () => void;
  onBack?: () => void;
  backLabel?: string;
}

export const ChatThreadHeader: React.FC<ChatThreadHeaderProps> = ({
  isCompact,
  activeConversation,
  activeStaffRoster,
  onlineUserIds,
  currentUserId,
  onBackToList,
  onBack,
  backLabel = 'Back',
}) => {
  const isDm = activeConversation.type === 'dm';
  const counterpartId =
    activeConversation.counterpartId ||
    activeStaffRoster.find(
      (u) =>
        u.id !== currentUserId &&
        (u.displayName.toLowerCase() === activeConversation.title.toLowerCase() ||
          activeConversation.title.toLowerCase().includes(u.displayName.toLowerCase()))
    )?.id;
  const isOnlineNow = counterpartId ? onlineUserIds.includes(counterpartId) : false;

  return (
    <View className="px-4 sm:px-5 py-3 border-b border-stone-200/80 flex-row items-center justify-between bg-white min-h-[52px]">
      <View className="flex-row items-center flex-1 min-w-0 mr-2">
        {isCompact && (
          <Pressable
            onPress={onBackToList}
            className="flex-row items-center mr-2 px-3.5 py-2 -ml-1 rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] active:opacity-80 min-h-[48px] justify-center shrink-0"
            accessibilityRole="button"
            accessibilityLabel="Back to conversations list"
          >
            <ArrowLeft size={18} color="#1C1917" />
            <Text className="ml-1.5 text-base font-semibold text-[#1C1917]">Chats</Text>
          </Pressable>
        )}

        <View className="flex-row items-center flex-1 min-w-0">
          <Text
            className="text-base sm:text-lg font-bold text-stone-900 tracking-tight truncate"
            numberOfLines={1}
          >
            {activeConversation.title}
          </Text>

          {isDm && (
            <View
              className={`w-2 h-2 rounded-full ml-2 shrink-0 ${
                isOnlineNow ? 'bg-[#10b981]' : 'bg-stone-300'
              }`}
              accessibilityLabel={isOnlineNow ? 'Online' : 'Offline'}
            />
          )}
        </View>
      </View>

      {/* Optional top-level back/dismiss when opened inside a drawer or modal on desktop */}
      {!isCompact && onBack && (
        <Pressable
          onPress={onBack}
          className="flex-row items-center px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] active:opacity-80 min-h-[48px] shrink-0"
          accessibilityRole="button"
          accessibilityLabel={backLabel}
        >
          <ArrowLeft size={18} color="#1C1917" />
          <Text className="ml-1.5 text-base font-semibold text-[#1C1917]">{backLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};

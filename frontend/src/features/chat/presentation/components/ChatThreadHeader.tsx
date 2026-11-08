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
}

export const ChatThreadHeader: React.FC<ChatThreadHeaderProps> = ({
  isCompact,
  activeConversation,
  activeStaffRoster,
  onlineUserIds,
  currentUserId,
  onBackToList,
}) => {
  return (
    <View className="px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-100 flex-row items-center justify-between">
      <View className="flex-row items-center flex-1 min-w-0 mr-2">
        {isCompact && (
          <Pressable
            onPress={onBackToList}
            className="flex-row items-center mr-2.5 px-2.5 py-1.5 -ml-1 rounded-xl bg-neutral-100 active:bg-neutral-200 min-h-[40px] justify-center shrink-0"
            accessibilityRole="button"
            accessibilityLabel="Back to conversations list"
          >
            <ArrowLeft size={18} color="#431621" />
            <Text className="ml-1 text-sm sm:text-base font-bold text-[#431621]">Chats</Text>
          </Pressable>
        )}
        <View className="flex-1 min-w-0">
          <Text
            className="text-lg sm:text-2xl font-bold text-neutral-900 tracking-tight shrink min-w-0"
            numberOfLines={1}
          >
            {activeConversation.title}
          </Text>
          <View className="flex-row items-center mt-0.5">
            {activeConversation.type === 'dm' &&
              (() => {
                const counterpartId =
                  activeConversation.counterpartId ||
                  activeStaffRoster.find(
                    (u) =>
                      u.id !== currentUserId &&
                      (u.displayName.toLowerCase() === activeConversation.title.toLowerCase() ||
                        activeConversation.title
                          .toLowerCase()
                          .includes(u.displayName.toLowerCase()))
                  )?.id;
                const isOnlineNow = counterpartId ? onlineUserIds.includes(counterpartId) : false;

                return (
                  <View className="flex-row items-center mr-2">
                    <View
                      className={`w-2.5 h-2.5 rounded-full mr-1.5 ${
                        isOnlineNow ? 'bg-emerald-500' : 'bg-neutral-300'
                      }`}
                    />
                    <Text
                      className={`text-sm font-semibold ${
                        isOnlineNow ? 'text-emerald-700' : 'text-neutral-500'
                      }`}
                    >
                      {isOnlineNow ? 'Active now' : 'Offline'}
                    </Text>
                    <Text className="text-neutral-300 mx-1.5">·</Text>
                  </View>
                );
              })()}
            <Text
              className="text-xs sm:text-base font-medium text-neutral-500 shrink min-w-0"
              numberOfLines={1}
            >
              {activeConversation.subtitle ||
                (activeConversation.type === 'channel'
                  ? `${activeConversation.title} · Staff Channel`
                  : 'Direct conversation')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

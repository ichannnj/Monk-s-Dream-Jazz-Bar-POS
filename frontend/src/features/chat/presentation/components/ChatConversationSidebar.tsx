import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { ChatConversation } from '../../domain/chat.types';
import { StaffChatUser, formatRelativeElapsed } from '../../data/chat.api';

export interface ChatConversationSidebarProps {
  isCompact: boolean;
  channels: ChatConversation[];
  directMessages: ChatConversation[];
  availableColleagues: StaffChatUser[];
  activeConversationId: string;
  onlineUserIds: string[];
  activeStaffRoster: StaffChatUser[];
  currentUserId?: string;
  onSelectConversation: (id: string) => void;
  onStartDmWithColleague: (colleague: StaffChatUser) => void;
}

export const ChatConversationSidebar: React.FC<ChatConversationSidebarProps> = ({
  isCompact,
  channels,
  directMessages,
  availableColleagues,
  activeConversationId,
  onlineUserIds,
  activeStaffRoster,
  currentUserId,
  onSelectConversation,
  onStartDmWithColleague,
}) => {
  return (
    <View
      className={`${
        isCompact ? 'w-full flex-1' : 'w-72 lg:w-80'
      } bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm border border-neutral-100 flex-col`}
    >
      <Text className="text-xl font-bold text-neutral-900 mb-3 px-2">Conversations</Text>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* CHANNELS Section */}
        <Text className="text-sm font-bold tracking-wider text-neutral-400 uppercase mb-2 px-2">
          Channels
        </Text>
        {channels.map((chan) => {
          const isActive = chan.id === activeConversationId;
          const elapsedLabel = formatRelativeElapsed(chan.lastActivityAt);
          return (
            <Pressable
              key={chan.id}
              onPress={() => onSelectConversation(chan.id)}
              className={`flex-row items-center p-3 mb-1.5 rounded-2xl transition-all min-h-[56px] ${
                isActive
                  ? 'bg-[#FBF0F3] border border-[#F5D9E0]'
                  : 'bg-transparent border border-transparent active:bg-neutral-50'
              }`}
            >
              <View className="w-11 h-11 rounded-full bg-[#4A1521] items-center justify-center mr-3">
                <Text className="text-base font-bold text-white">{chan.avatarText}</Text>
              </View>

              <View className="flex-1 mr-2">
                <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
                  {chan.title}
                </Text>
                <Text className="text-base text-neutral-500" numberOfLines={1}>
                  {chan.lastMessage || chan.subtitle}
                </Text>
              </View>

              <View className="items-end justify-center">
                {elapsedLabel && (
                  <Text className="text-sm font-medium text-neutral-400 mb-0.5">
                    {elapsedLabel}
                  </Text>
                )}
                {chan.unreadCount > 0 && (
                  <View className="w-6 h-6 rounded-full bg-[#6B1D2F] items-center justify-center">
                    <Text className="text-xs font-bold text-white">{chan.unreadCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        {/* DIRECT MESSAGES Section */}
        <Text className="text-sm font-bold tracking-wider text-neutral-400 uppercase mt-4 mb-2 px-2">
          Direct Messages
        </Text>

        {/* 1. Active Direct Message Conversations */}
        {directMessages.map((dm) => {
          const isActive = dm.id === activeConversationId;
          const elapsedLabel = formatRelativeElapsed(dm.lastActivityAt);
          const counterpartId =
            dm.counterpartId ||
            activeStaffRoster.find(
              (u) =>
                u.id !== currentUserId &&
                (u.displayName.toLowerCase() === dm.title.toLowerCase() ||
                  dm.title.toLowerCase().includes(u.displayName.toLowerCase()))
            )?.id;
          const isColleagueOnline = counterpartId ? onlineUserIds.includes(counterpartId) : false;

          return (
            <Pressable
              key={dm.id}
              onPress={() => onSelectConversation(dm.id)}
              className={`flex-row items-center p-3 mb-1.5 rounded-2xl transition-all min-h-[56px] ${
                isActive
                  ? 'bg-[#FBF0F3] border border-[#F5D9E0]'
                  : 'bg-transparent border border-transparent active:bg-neutral-50'
              }`}
            >
              <View className="relative mr-3">
                <View className="w-11 h-11 rounded-full bg-[#800020] items-center justify-center">
                  <Text className="text-base font-bold text-white">{dm.avatarText}</Text>
                </View>
                {isColleagueOnline && (
                  <View className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                )}
              </View>

              <View className="flex-1 mr-2">
                <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
                  {dm.title}
                </Text>
                <Text className="text-base text-neutral-500" numberOfLines={1}>
                  {dm.lastMessage || (dm.isDraft ? 'Draft message' : 'No messages yet')}
                </Text>
              </View>

              <View className="items-end justify-center">
                {elapsedLabel && (
                  <Text className="text-sm font-medium text-neutral-400 mb-0.5">
                    {elapsedLabel}
                  </Text>
                )}
                {dm.unreadCount > 0 && (
                  <View className="w-6 h-6 rounded-full bg-[#6B1D2F] items-center justify-center">
                    <Text className="text-xs font-bold text-white">{dm.unreadCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        {/* 2. Available Venue Staff */}
        {availableColleagues.map((colleague) => {
          const isColleagueOnline = onlineUserIds.includes(colleague.id);
          return (
            <Pressable
              key={colleague.id}
              onPress={() => onStartDmWithColleague(colleague)}
              className="flex-row items-center p-3 mb-1.5 rounded-2xl bg-transparent border border-transparent active:bg-neutral-50 min-h-[56px]"
            >
              <View className="relative mr-3">
                <View className="w-11 h-11 rounded-full bg-neutral-200 items-center justify-center">
                  <Text className="text-sm font-bold text-neutral-700">
                    {colleague.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>
                {isColleagueOnline && (
                  <View className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                )}
              </View>
              <View className="flex-1 mr-2">
                <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
                  {colleague.displayName}
                </Text>
                <Text className="text-sm text-neutral-400 capitalize">
                  {isColleagueOnline ? (
                    <Text className="text-emerald-600 font-semibold">Online · </Text>
                  ) : null}
                  {colleague.role.replace('_', ' ')} · Tap to chat
                </Text>
              </View>
              <MessageSquare size={18} color="#800020" />
            </Pressable>
          );
        })}

        {directMessages.length === 0 && availableColleagues.length === 0 && (
          <View className="px-2 py-3 bg-neutral-50 rounded-xl mb-2">
            <Text className="text-sm text-neutral-500">No other active staff found.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

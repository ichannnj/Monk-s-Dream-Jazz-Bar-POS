import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
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
  onBack?: () => void;
  backLabel?: string;
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
  onBack,
  backLabel = 'Back',
}) => {
  return (
    <View
      className={`${
        isCompact ? 'w-full flex-1' : 'w-72 lg:w-80'
      } bg-white rounded-2xl p-3 sm:p-4 shadow-xs border border-stone-200/80 flex-col`}
    >
      {onBack && (
        <View className="mb-2 pb-2 border-b border-stone-100 flex-row items-center">
          <Pressable
            onPress={onBack}
            className="flex-row items-center px-2.5 py-1.5 rounded-lg bg-stone-100 active:bg-stone-200 min-h-[36px]"
            accessibilityRole="button"
            accessibilityLabel={backLabel}
          >
            <ArrowLeft size={16} color="#1c1917" />
            <Text className="ml-1.5 text-xs font-bold text-stone-900">{backLabel}</Text>
          </Pressable>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* CHANNELS Section */}
        <Text className="text-[11px] font-bold tracking-wider text-stone-400 uppercase mb-1.5 px-2">
          Channels
        </Text>
        {channels.map((chan) => {
          const isActive = chan.id === activeConversationId;
          const elapsedLabel = formatRelativeElapsed(chan.lastActivityAt);
          return (
            <Pressable
              key={chan.id}
              onPress={() => onSelectConversation(chan.id)}
              className={`flex-row items-center p-2.5 mb-1 rounded-xl min-h-[48px] ${
                isActive
                  ? 'bg-[#FAF8F5] border border-stone-200/90'
                  : 'bg-transparent border border-transparent active:bg-stone-50'
              }`}
            >
              <View
                className={`w-9 h-9 rounded-full items-center justify-center mr-2.5 shrink-0 ${
                  isActive ? 'bg-[#810021]' : 'bg-stone-100 border border-stone-200'
                }`}
              >
                <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-stone-700'}`}>
                  {chan.avatarText}
                </Text>
              </View>

              <View className="flex-1 min-w-0 mr-2">
                <Text className="text-sm font-bold text-stone-900 truncate" numberOfLines={1}>
                  {chan.title}
                </Text>
                {chan.lastMessage ? (
                  <Text className="text-xs text-stone-500 truncate" numberOfLines={1}>
                    {chan.lastMessage}
                  </Text>
                ) : null}
              </View>

              <View className="items-end justify-center shrink-0">
                {elapsedLabel && (
                  <Text className="text-[11px] font-medium text-stone-400 mb-0.5 tabular-nums">
                    {elapsedLabel}
                  </Text>
                )}
                {chan.unreadCount > 0 && (
                  <View className="w-5 h-5 rounded-full bg-[#810021] items-center justify-center">
                    <Text className="text-[10px] font-bold text-white tabular-nums">
                      {chan.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        {/* DIRECT Section */}
        <Text className="text-[11px] font-bold tracking-wider text-stone-400 uppercase mt-3 mb-1.5 px-2">
          Direct
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
              className={`flex-row items-center p-2.5 mb-1 rounded-xl min-h-[48px] ${
                isActive
                  ? 'bg-[#FAF8F5] border border-stone-200/90'
                  : 'bg-transparent border border-transparent active:bg-stone-50'
              }`}
            >
              <View className="relative mr-2.5 shrink-0">
                <View
                  className={`w-9 h-9 rounded-full items-center justify-center ${
                    isActive ? 'bg-[#810021]' : 'bg-stone-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${isActive ? 'text-white' : 'text-stone-700'}`}
                  >
                    {dm.avatarText}
                  </Text>
                </View>
                {isColleagueOnline && (
                  <View className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#10b981] border-2 border-white" />
                )}
              </View>

              <View className="flex-1 min-w-0 mr-2">
                <Text className="text-sm font-bold text-stone-900 truncate" numberOfLines={1}>
                  {dm.title}
                </Text>
                {dm.lastMessage ? (
                  <Text className="text-xs text-stone-500 truncate" numberOfLines={1}>
                    {dm.lastMessage}
                  </Text>
                ) : null}
              </View>

              <View className="items-end justify-center shrink-0">
                {elapsedLabel && (
                  <Text className="text-[11px] font-medium text-stone-400 mb-0.5 tabular-nums">
                    {elapsedLabel}
                  </Text>
                )}
                {dm.unreadCount > 0 && (
                  <View className="w-5 h-5 rounded-full bg-[#810021] items-center justify-center">
                    <Text className="text-[10px] font-bold text-white tabular-nums">
                      {dm.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        {/* 2. Available Venue Staff */}
        {availableColleagues.map((colleague) => {
          const isColleagueOnline = onlineUserIds.includes(colleague.id);
          const colleagueRole = colleague.role.replace('_', ' ');

          return (
            <Pressable
              key={colleague.id}
              onPress={() => onStartDmWithColleague(colleague)}
              className="flex-row items-center p-2.5 mb-1 rounded-xl bg-transparent border border-transparent active:bg-stone-50 min-h-[48px]"
            >
              <View className="relative mr-2.5 shrink-0">
                <View className="w-9 h-9 rounded-full bg-stone-100 border border-stone-200 items-center justify-center">
                  <Text className="text-xs font-bold text-stone-600">
                    {colleague.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>
                {isColleagueOnline && (
                  <View className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#10b981] border-2 border-white" />
                )}
              </View>

              <View className="flex-1 min-w-0 mr-2">
                <Text className="text-sm font-bold text-stone-900 truncate" numberOfLines={1}>
                  {colleague.displayName}
                </Text>
                <Text className="text-xs text-stone-400 capitalize truncate" numberOfLines={1}>
                  {colleagueRole}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {directMessages.length === 0 && availableColleagues.length === 0 && (
          <View className="px-2 py-3 bg-stone-50 rounded-xl mb-2">
            <Text className="text-xs text-stone-400">No other active staff.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

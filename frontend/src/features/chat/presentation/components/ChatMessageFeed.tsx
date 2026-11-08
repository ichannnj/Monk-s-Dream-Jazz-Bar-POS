import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Pin, X, Check, CheckCheck, Clock, AlertCircle, MessageSquare } from 'lucide-react-native';
import { ChatConversation, ChatMessage } from '../../domain/chat.types';
import { StaffChatUser, formatRelativeElapsed } from '../../data/chat.api';

export interface ChatMessageFeedProps {
  scrollViewRef: React.RefObject<ScrollView | null>;
  activeConversation: ChatConversation;
  currentMessages: ChatMessage[];
  currentSenderName: string;
  currentUserId?: string;
  onlineUserIds: string[];
  activeStaffRoster: StaffChatUser[];
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onSend: (text: string) => void;
  onUnpinAnnouncement: (conversationId: string) => void;
}

export const ChatMessageFeed: React.FC<ChatMessageFeedProps> = ({
  scrollViewRef,
  activeConversation,
  currentMessages,
  currentSenderName,
  currentUserId,
  onlineUserIds,
  activeStaffRoster,
  onScroll,
  onSend,
  onUnpinAnnouncement,
}) => {
  return (
    <View className="flex-1 flex-col">
      {/* Dynamic Pinned Announcement Banner */}
      {activeConversation.pinnedMessage && (
        <View className="mx-6 mt-4 p-4 rounded-2xl bg-[#FFF9E6] border border-[#FEE8A2] flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
              <Pin size={14} color="#B45309" />
              <Text className="ml-1.5 text-sm font-bold tracking-wider text-amber-800 uppercase">
                PINNED · {activeConversation.pinnedMessage.author}
              </Text>
            </View>
            <Text className="text-base font-medium text-neutral-800 leading-snug">
              {activeConversation.pinnedMessage.text}
            </Text>
          </View>

          <Pressable
            onPress={() => onUnpinAnnouncement(activeConversation.id)}
            className="p-1 rounded-full active:bg-amber-100"
            accessibilityLabel="Dismiss pinned message"
          >
            <X size={16} color="#B45309" />
          </Pressable>
        </View>
      )}

      {/* Conversation Feed */}
      <ScrollView
        ref={scrollViewRef}
        onScroll={onScroll}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
        className="flex-1 px-5 py-4"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="items-center my-3">
          <View className="bg-neutral-200/60 px-3.5 py-1 rounded-full">
            <Text className="text-xs font-semibold text-neutral-500">Service Thread</Text>
          </View>
        </View>

        {currentMessages.length === 0 ? (
          activeConversation.type === 'dm' ? (
            (() => {
              const counterpartId =
                activeConversation.counterpartId ||
                activeStaffRoster.find(
                  (u) =>
                    u.id !== currentUserId &&
                    (u.displayName.toLowerCase() === activeConversation.title.toLowerCase() ||
                      activeConversation.title.toLowerCase().includes(u.displayName.toLowerCase()))
                )?.id;
              const matchedColleague = activeStaffRoster.find((u) => u.id === counterpartId);
              const isOnlineNow = counterpartId ? onlineUserIds.includes(counterpartId) : false;

              return (
                <View className="items-center justify-center py-10 px-6">
                  <View className="relative mb-4">
                    <View className="w-20 h-20 rounded-full bg-[#800020] items-center justify-center shadow-md">
                      <Text className="text-2xl font-bold text-white">
                        {activeConversation.avatarText || 'DM'}
                      </Text>
                    </View>
                    <View
                      className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white ${
                        isOnlineNow ? 'bg-emerald-500' : 'bg-neutral-300'
                      }`}
                    />
                  </View>

                  <Text className="text-2xl font-bold text-neutral-900 mb-1 text-center">
                    {activeConversation.title}
                  </Text>
                  <Text className="text-base font-medium text-neutral-500 mb-2 capitalize text-center">
                    {matchedColleague?.role
                      ? `Monk's Dream · ${matchedColleague.role.replace('_', ' ')}`
                      : activeConversation.subtitle || 'Direct Message'}
                  </Text>

                  <View
                    className={`flex-row items-center px-3 py-1 rounded-full mb-6 ${
                      isOnlineNow
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-neutral-100 border border-neutral-200'
                    }`}
                  >
                    <View
                      className={`w-2 h-2 rounded-full mr-2 ${
                        isOnlineNow ? 'bg-emerald-500' : 'bg-neutral-400'
                      }`}
                    />
                    <Text
                      className={`text-sm font-semibold ${
                        isOnlineNow ? 'text-emerald-800' : 'text-neutral-500'
                      }`}
                    >
                      {isOnlineNow ? 'Active now on POS' : 'Offline · Messages delivered on return'}
                    </Text>
                  </View>

                  <Text className="text-base text-neutral-500 text-center max-w-sm mb-6">
                    You're connected on Monk's Dream POS. Say hello to start the conversation!
                  </Text>

                  <Pressable
                    onPress={() => onSend('👋')}
                    className="flex-row items-center bg-[#FBF0F3] border border-[#F5D9E0] px-6 py-3 rounded-full active:opacity-75 min-h-[48px]"
                  >
                    <Text className="text-xl mr-2">👋</Text>
                    <Text className="text-base font-bold text-[#800020]">
                      Wave to {activeConversation.title.split(' ')[0]}
                    </Text>
                  </Pressable>
                </View>
              );
            })()
          ) : (
            <View className="items-center justify-center py-16 px-4">
              <View className="w-16 h-16 rounded-full bg-[#FAF5F5] items-center justify-center mb-3">
                <MessageSquare size={28} color="#800020" />
              </View>
              <Text className="text-lg font-bold text-neutral-800 mb-1">
                No messages yet in #{activeConversation.title}
              </Text>
              <Text className="text-base text-neutral-400 text-center max-w-md">
                Send a message to update your station team in real time!
              </Text>
            </View>
          )
        ) : (
          currentMessages.map((msg) => {
            if (msg.isSystem) {
              return (
                <View key={msg.id} className="self-center max-w-[88%] my-2">
                  <View className="bg-[#FEF2F2] border border-[#FECDD3] rounded-2xl px-4 py-2.5 shadow-sm">
                    <Text className="text-xs font-bold text-red-600 mb-0.5 text-center">
                      System Notice · {msg.timestamp}
                    </Text>
                    <Text className="text-sm font-semibold text-[#991B1B] text-center leading-relaxed">
                      {msg.message}
                    </Text>
                  </View>
                </View>
              );
            }

            const isMe =
              msg.senderName.trim().toLowerCase() === 'you' ||
              msg.senderName.trim().toLowerCase() === currentSenderName.trim().toLowerCase() ||
              (currentUserId && msg.senderId === currentUserId);

            const messageElapsed = msg.createdAt
              ? formatRelativeElapsed(msg.createdAt)
              : msg.timestamp;

            if (isMe) {
              return (
                <View key={msg.id} className="self-end max-w-[75%] mb-3 items-end">
                  <View className="bg-[#581827] rounded-3xl rounded-br-md px-4 py-3 shadow-sm">
                    <Text className="text-base font-normal text-white leading-relaxed">
                      {msg.message}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-1 mr-1">
                    <Text className="text-xs font-medium text-neutral-400 mr-1.5">
                      {messageElapsed}
                    </Text>
                    {msg.deliveryStatus === 'sending' && <Clock size={13} color="#9CA3AF" />}
                    {msg.deliveryStatus === 'sent' && (
                      <Check size={13} color="#9CA3AF" strokeWidth={2.4} />
                    )}
                    {msg.deliveryStatus === 'delivered' && (
                      <CheckCheck size={14} color="#9CA3AF" strokeWidth={2.4} />
                    )}
                    {msg.deliveryStatus === 'seen' && (
                      <CheckCheck size={14} color="#0284C7" strokeWidth={2.4} />
                    )}
                    {msg.deliveryStatus === 'error' && <AlertCircle size={13} color="#EF4444" />}
                  </View>
                </View>
              );
            }

            return (
              <View key={msg.id} className="self-start max-w-[75%] mb-3 items-start">
                <Text className="text-xs font-semibold text-neutral-500 mb-1 ml-1.5">
                  {msg.senderName} · {msg.senderRole}
                </Text>
                <View className="bg-[#F0F2F5] rounded-3xl rounded-bl-md px-4 py-3 border border-neutral-100">
                  <Text className="text-base font-normal text-neutral-900 leading-relaxed">
                    {msg.message}
                  </Text>
                </View>
                <Text className="text-xs font-medium text-neutral-400 mt-1 ml-1.5">
                  {messageElapsed}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

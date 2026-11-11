import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Pin, X, Check, CheckCheck, Clock, AlertCircle } from 'lucide-react-native';
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
  onScroll,
  onSend,
  onUnpinAnnouncement,
}) => {
  return (
    <View className="flex-1 flex-col">
      {/* Pinned Announcement Banner (3-Color Styled) */}
      {activeConversation.pinnedMessage && (
        <View className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-[#FAF8F5] border border-stone-200/90 flex-row items-start justify-between">
          <View className="flex-1 mr-2">
            <View className="flex-row items-center mb-0.5">
              <Pin size={12} color="#810021" />
              <Text className="ml-1 text-[11px] font-bold tracking-wider text-[#810021] uppercase">
                Pinned · {activeConversation.pinnedMessage.author}
              </Text>
            </View>
            <Text className="text-xs font-medium text-stone-800 leading-snug">
              {activeConversation.pinnedMessage.text}
            </Text>
          </View>

          <Pressable
            onPress={() => onUnpinAnnouncement(activeConversation.id)}
            className="p-1 rounded-full active:bg-stone-200"
            accessibilityLabel="Dismiss pinned message"
          >
            <X size={14} color="#78716c" />
          </Pressable>
        </View>
      )}

      {/* Conversation Feed */}
      <ScrollView
        ref={scrollViewRef}
        onScroll={onScroll}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4 sm:px-5 py-3"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {currentMessages.length === 0 ? (
          <View className="items-center justify-center py-16 px-4">
            <View className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-stone-200 items-center justify-center mb-2.5">
              <Text className="text-sm font-bold text-stone-600">
                {activeConversation.avatarText || 'MD'}
              </Text>
            </View>
            <Text className="text-sm font-bold text-stone-800 mb-1">No messages yet</Text>
            {activeConversation.type === 'dm' && (
              <Pressable
                onPress={() => onSend('👋')}
                className="mt-3 flex-row items-center bg-[#FAF8F5] border border-stone-200 px-4 py-2 rounded-full active:bg-stone-100 min-h-[40px]"
                accessibilityRole="button"
                accessibilityLabel="Wave to colleague"
              >
                <Text className="text-sm mr-1.5">👋</Text>
                <Text className="text-xs font-bold text-[#810021]">Say hello</Text>
              </Pressable>
            )}
          </View>
        ) : (
          currentMessages.map((msg) => {
            if (msg.isSystem) {
              return (
                <View key={msg.id} className="self-center max-w-[85%] my-2">
                  <View className="bg-[#FAF8F5] border border-stone-200/90 rounded-xl px-3 py-1.5">
                    <Text className="text-[11px] font-bold text-[#810021] text-center mb-0.5">
                      Notice · {msg.timestamp}
                    </Text>
                    <Text className="text-xs text-stone-700 text-center leading-relaxed">
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
                <View key={msg.id} className="self-end max-w-[78%] mb-2.5 items-end">
                  <View className="bg-[#810021] rounded-2xl rounded-br-xs px-3.5 py-2.5 shadow-xs">
                    <Text className="text-sm font-normal text-white leading-relaxed">
                      {msg.message}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-1 mr-1">
                    <Text className="text-[11px] font-medium text-stone-400 mr-1 tabular-nums">
                      {messageElapsed}
                    </Text>
                    {msg.deliveryStatus === 'sending' && <Clock size={12} color="#a8a29e" />}
                    {msg.deliveryStatus === 'sent' && (
                      <Check size={12} color="#a8a29e" strokeWidth={2.4} />
                    )}
                    {msg.deliveryStatus === 'delivered' && (
                      <CheckCheck size={13} color="#a8a29e" strokeWidth={2.4} />
                    )}
                    {msg.deliveryStatus === 'seen' && (
                      <CheckCheck size={13} color="#810021" strokeWidth={2.4} />
                    )}
                    {msg.deliveryStatus === 'error' && <AlertCircle size={12} color="#810021" />}
                  </View>
                </View>
              );
            }

            return (
              <View key={msg.id} className="self-start max-w-[78%] mb-2.5 items-start">
                <Text className="text-[11px] font-semibold text-stone-500 mb-0.5 ml-1">
                  {msg.senderName}
                </Text>
                <View className="bg-[#FAF8F5] rounded-2xl rounded-bl-xs px-3.5 py-2.5 border border-stone-200/80">
                  <Text className="text-sm font-normal text-stone-900 leading-relaxed">
                    {msg.message}
                  </Text>
                </View>
                <Text className="text-[11px] font-medium text-stone-400 mt-1 ml-1 tabular-nums">
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

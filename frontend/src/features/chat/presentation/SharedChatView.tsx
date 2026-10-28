import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { SendHorizontal, Pin, X, ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { toast } from '../../shared/toast/useToastStore';
import { useChatStore } from '../application/useChatStore';

export interface SharedChatViewProps {
  senderName?: string;
  senderRole?: string;
  defaultChannel?: string;
  title?: string;
  onBack?: () => void;
  backLabel?: string;
}

export const SharedChatView: React.FC<SharedChatViewProps> = ({
  senderName: propSenderName,
  senderRole: propSenderRole,
  defaultChannel,
  title = 'Team Chats',
  onBack,
  backLabel = 'Back',
}) => {
  const { currentUser } = useAuthStore();
  const conversations = useChatStore((s) => s.conversations);
  const messages = useChatStore((s) => s.messages);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const unpinAnnouncement = useChatStore((s) => s.unpinAnnouncement);

  const [inputText, setInputText] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');

  // Set default channel if provided on mount or when defaultChannel prop changes
  useEffect(() => {
    if (defaultChannel) {
      const targetId = defaultChannel === 'all' ? 'foh' : defaultChannel;
      if (useChatStore.getState().activeConversationId !== targetId) {
        setActiveConversation(targetId);
      }
    }
  }, [defaultChannel, setActiveConversation]);

  // Live time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const timePart = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      setCurrentDateTime(`${datePart} · ${timePart}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Determine current user display name
  const currentSenderName = useMemo(() => {
    if (propSenderName) return propSenderName;
    if (currentUser?.displayName) return currentUser.displayName;
    return 'Jess Santos';
  }, [propSenderName, currentUser]);

  // Determine current user role label
  const currentSenderRole = useMemo(() => {
    if (propSenderRole) return propSenderRole;
    if (!currentUser) return 'Waiter / Cashier';
    switch (currentUser.role) {
      case 'barista':
        return 'Barista';
      case 'bartender':
        return 'Bartender';
      case 'kitchen':
      case 'station_food':
        return 'Kitchen Chef';
      case 'foh_runner':
        return 'FOH Runner';
      case 'waiter':
        return 'Waiter';
      case 'cashier':
        return 'Cashier';
      case 'admin':
        return 'Manager';
      default:
        return 'Waiter / Cashier';
    }
  }, [propSenderRole, currentUser]);

  // Initials for avatar badge
  const userInitials = useMemo(() => {
    const parts = currentSenderName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return currentSenderName.slice(0, 2).toUpperCase();
  }, [currentSenderName]);

  // Active conversation object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || conversations[0];
  }, [conversations, activeConversationId]);

  // Messages for active conversation
  const currentMessages = useMemo(() => {
    return messages[activeConversation?.id] || [];
  }, [messages, activeConversation]);

  // Separate channels vs direct messages
  const channels = useMemo(
    () => conversations.filter((c) => c.type === 'channel'),
    [conversations]
  );
  const directMessages = useMemo(
    () => conversations.filter((c) => c.type === 'dm'),
    [conversations]
  );

  // Role-specific quick tap suggestions
  const quickPresets = useMemo(() => {
    if (currentSenderRole.includes('Bar')) {
      return [
        'Out of lime juice until 3 PM',
        'Running low on clean pint glasses',
        'Craft IPA keg tapped and ready',
        'Espresso bar orders expedited',
      ];
    }
    if (currentSenderRole.includes('Chef') || currentSenderRole.includes('Kitchen')) {
      return [
        'Kitchen ticket delayed 10 min',
        'Small plates line clear',
        'Allergy confirmed: Gluten-free prep',
        'Order up at pass counter!',
      ];
    }
    return [
      'Table A2 has a nut allergy. Please flag it to the kitchen.',
      'Reminder: Mid shift briefing at 2 PM by the host stand.',
      'Flat whites for Table B1 are up at the cafe pass.',
      'Need water carafes refilled on Floor A.',
    ];
  }, [currentSenderRole]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text) {
      toast.warning('Please enter a message before sending.', {
        title: 'Empty Message',
      });
      return;
    }

    sendMessage(activeConversation.id, text, currentSenderName, currentSenderRole);
    setInputText('');
  };

  return (
    <View className="flex-1 bg-[#FAF5F5] p-4 lg:p-6">
      {/* 1. Top Header Bar Card */}
      <View className="flex-row items-center justify-between bg-white rounded-2xl px-6 py-3.5 mb-4 shadow-sm border border-neutral-100">
        <View className="flex-row items-center">
          {onBack && (
            <Pressable
              onPress={onBack}
              className="flex-row items-center mr-4 px-3 py-2 rounded-xl bg-neutral-100 active:opacity-80 min-h-[48px]"
            >
              <ArrowLeft size={18} color="#431621" />
              <Text className="ml-1.5 text-base font-bold text-[#431621]">{backLabel}</Text>
            </Pressable>
          )}

          <Text className="text-2xl font-bold text-neutral-900 tracking-tight">{title}</Text>

          <View className="flex-row items-center bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full ml-4">
            <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
            <Text className="text-base font-semibold text-emerald-800">Online</Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <Text className="text-base font-medium text-neutral-500 mr-5">
            {currentDateTime || 'Live Service'}
          </Text>

          <View className="flex-row items-center pl-4 border-l border-neutral-200">
            <View className="w-11 h-11 rounded-full bg-[#FCE4EC] items-center justify-center border border-[#F8BBD0] mr-3">
              <Text className="text-base font-bold text-[#800020]">{userInitials}</Text>
            </View>
            <View>
              <Text className="text-base font-bold text-neutral-900 leading-tight">
                {currentSenderName}
              </Text>
              <Text className="text-base font-medium text-neutral-500 leading-tight">
                {currentSenderRole}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. Main Two-Column Tablet Layout */}
      <View className="flex-1 flex-row gap-4">
        {/* Left Column: Messages List (Channels & Direct Messages) */}
        <View className="w-80 bg-white rounded-3xl p-4 shadow-sm border border-neutral-100 flex-col">
          <Text className="text-xl font-bold text-neutral-900 mb-3 px-2">Messages</Text>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {/* CHANNELS Section */}
            <Text className="text-sm font-bold tracking-wider text-neutral-400 uppercase mb-2 px-2">
              Channels
            </Text>
            {channels.map((chan) => {
              const isActive = chan.id === activeConversation.id;
              return (
                <Pressable
                  key={chan.id}
                  onPress={() => setActiveConversation(chan.id)}
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
                    {chan.lastTimestamp && (
                      <Text className="text-sm font-medium text-neutral-400 mb-0.5">
                        {chan.lastTimestamp}
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
            {directMessages.map((dm) => {
              const isActive = dm.id === activeConversation.id;
              return (
                <Pressable
                  key={dm.id}
                  onPress={() => setActiveConversation(dm.id)}
                  className={`flex-row items-center p-3 mb-1.5 rounded-2xl transition-all min-h-[56px] ${
                    isActive
                      ? 'bg-[#FBF0F3] border border-[#F5D9E0]'
                      : 'bg-transparent border border-transparent active:bg-neutral-50'
                  }`}
                >
                  <View className="w-11 h-11 rounded-full bg-[#4A1521] items-center justify-center mr-3">
                    <Text className="text-base font-bold text-white">{dm.avatarText}</Text>
                  </View>

                  <View className="flex-1 mr-2">
                    <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
                      {dm.title}
                    </Text>
                    <Text className="text-base text-neutral-500" numberOfLines={1}>
                      {dm.lastMessage || 'Direct message'}
                    </Text>
                  </View>

                  <View className="items-end justify-center">
                    {dm.lastTimestamp && (
                      <Text className="text-sm font-medium text-neutral-400 mb-0.5">
                        {dm.lastTimestamp}
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
          </ScrollView>
        </View>

        {/* Right Column: Active Conversation Thread */}
        <View className="flex-1 bg-white rounded-3xl shadow-sm border border-neutral-100 flex-col overflow-hidden">
          {/* Thread Header */}
          <View className="px-6 py-4 border-b border-neutral-100">
            <Text className="text-2xl font-bold text-neutral-900 tracking-tight">
              {activeConversation.title}
            </Text>
            <Text className="text-base font-medium text-neutral-500 mt-0.5">
              {activeConversation.subtitle ||
                (activeConversation.memberCount
                  ? `${activeConversation.title} · ${activeConversation.memberCount} members`
                  : 'Direct conversation')}
            </Text>
          </View>

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
                onPress={() => unpinAnnouncement(activeConversation.id)}
                className="p-1 rounded-full active:bg-amber-100"
                accessibilityLabel="Dismiss pinned message"
              >
                <X size={16} color="#B45309" />
              </Pressable>
            </View>
          )}

          {/* Conversation Feed */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="flex-1 px-5 py-4"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Centered Date Separator */}
            <View className="items-center my-3">
              <View className="bg-neutral-200/60 px-3.5 py-1 rounded-full">
                <Text className="text-xs font-semibold text-neutral-500">Today</Text>
              </View>
            </View>

            {currentMessages.map((msg) => {
              // 1. System Alert Card
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

              // 2. Outbound Message (You / Current User)
              const isMe =
                msg.senderName.trim().toLowerCase() === 'you' ||
                msg.senderName.trim().toLowerCase() === currentSenderName.trim().toLowerCase();

              if (isMe) {
                return (
                  <View key={msg.id} className="self-end max-w-[75%] mb-3 items-end">
                    <View className="bg-[#581827] rounded-3xl rounded-br-md px-4 py-3 shadow-sm">
                      <Text className="text-base font-normal text-white leading-relaxed">
                        {msg.message}
                      </Text>
                    </View>
                    <Text className="text-xs font-medium text-neutral-400 mt-1 mr-1">
                      {msg.timestamp}
                    </Text>
                  </View>
                );
              }

              // 3. Inbound Message from Colleague
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
                    {msg.timestamp}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Quick-tap Presets for Fast Tablet Operation */}
          <View className="border-t border-neutral-100 px-5 py-2.5 bg-neutral-50/70">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row items-center gap-2">
                {quickPresets.map((preset, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleSend(preset)}
                    className="bg-white border border-neutral-200/80 px-3.5 py-2 rounded-full active:bg-neutral-100 min-h-[44px] justify-center shadow-xs"
                  >
                    <Text className="text-sm font-medium text-neutral-700">{preset}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Bottom Message Input Bar - Clean messenger style with no black outline */}
          <View className="flex-row items-center px-5 py-3 border-t border-neutral-100 gap-2.5 bg-white">
            <View className="flex-1 min-h-[48px] bg-neutral-100/90 rounded-full px-4 py-2.5 justify-center border border-neutral-200/50">
              <TextInput
                className="text-base text-neutral-900 w-full"
                placeholder={`Message ${activeConversation.title}...`}
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
                style={
                  {
                    outlineStyle: 'none',
                    outlineWidth: 0,
                    outlineColor: 'transparent',
                  } as any
                }
              />
            </View>

            <Pressable
              onPress={() => handleSend()}
              className="w-12 h-12 rounded-full bg-[#581827] items-center justify-center active:opacity-90 shadow-sm"
              accessibilityLabel="Send message"
            >
              <SendHorizontal size={20} color="#FFFFFF" strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

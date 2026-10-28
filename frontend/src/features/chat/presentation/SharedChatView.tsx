import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  SendHorizontal,
  Pin,
  X,
  ArrowLeft,
  ChevronDown,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  MessageSquare,
} from 'lucide-react-native';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { toast } from '../../shared/toast/useToastStore';
import { useChatStore } from '../application/useChatStore';
import { StaffChatUser } from '../data/chat.api';

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
  const activeStaffRoster = useChatStore((s) => s.activeStaffRoster);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const unpinAnnouncement = useChatStore((s) => s.unpinAnnouncement);
  const loadInitialData = useChatStore((s) => s.loadInitialData);
  const setChatViewActive = useChatStore((s) => s.setChatViewActive);
  const openDirectMessageWithColleague = useChatStore((s) => s.openDirectMessageWithColleague);

  const [inputText, setInputText] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [showScrollBottomPill, setShowScrollBottomPill] = useState(false);
  const [unseenMessagesCount, setUnseenMessagesCount] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const isNearBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const defaultChannelSetRef = useRef<string | null>(null);

  // Track chat view active state for live read receipts
  useEffect(() => {
    setChatViewActive(true);
    return () => {
      setChatViewActive(false);
    };
  }, [setChatViewActive]);

  // Auto-focus input on mount and channel switch
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [activeConversationId]);

  // Load initial data from Supabase DB on mount or user change
  useEffect(() => {
    loadInitialData(currentUser?.id);
  }, [currentUser?.id, loadInitialData]);

  // Set default channel once when available without resetting upon new incoming messages
  useEffect(() => {
    if (
      defaultChannel &&
      conversations.length > 0 &&
      defaultChannelSetRef.current !== defaultChannel
    ) {
      defaultChannelSetRef.current = defaultChannel;
      const targetSlug = defaultChannel === 'all' ? 'foh' : defaultChannel;
      const matched = conversations.find((c) => c.slug === targetSlug || c.id === targetSlug);
      if (matched && activeConversationId !== matched.id) {
        setActiveConversation(matched.id, currentUser?.id);
      }
    }
  }, [defaultChannel, conversations, activeConversationId, setActiveConversation, currentUser?.id]);

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
    return 'Staff';
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
    return (
      conversations.find((c) => c.id === activeConversationId) ||
      conversations[0] || {
        id: '',
        title: 'Team Chat',
        type: 'channel' as const,
        avatarText: 'TC',
        unreadCount: 0,
      }
    );
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

  // Available staff colleagues for initiating 1-on-1 DMs
  const availableColleagues = useMemo(() => {
    return activeStaffRoster.filter((u) => u.id !== currentUser?.id);
  }, [activeStaffRoster, currentUser?.id]);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((animated: boolean = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
      setShowScrollBottomPill(false);
      setUnseenMessagesCount(0);
      isNearBottomRef.current = true;
    }, 50);
  }, []);

  // When active conversation switches, instantly snap to bottom
  useEffect(() => {
    if (activeConversationId) {
      scrollToBottom(false);
      prevMessagesLengthRef.current = currentMessages.length;
    }
  }, [activeConversationId, scrollToBottom, currentMessages.length]);

  // Handle Messenger-style auto-scroll when message list updates
  useEffect(() => {
    const prevCount = prevMessagesLengthRef.current;
    const currentCount = currentMessages.length;
    prevMessagesLengthRef.current = currentCount;

    if (currentCount > prevCount) {
      const latestMsg = currentMessages[currentCount - 1];
      const isSentByMe =
        latestMsg.senderName.trim().toLowerCase() === 'you' ||
        latestMsg.senderName.trim().toLowerCase() === currentSenderName.trim().toLowerCase();

      // If user sent it OR user was already at the bottom, auto-scroll smoothly!
      if (isSentByMe || isNearBottomRef.current) {
        scrollToBottom(true);
      } else {
        // User is scrolled up reading history -> Show "New message ↓" pill
        setShowScrollBottomPill(true);
        setUnseenMessagesCount((prev) => prev + (currentCount - prevCount));
      }
    }
  }, [currentMessages, currentSenderName, scrollToBottom]);

  // Track scroll position to know if user is reading past history
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 80;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    isNearBottomRef.current = isAtBottom;
    if (isAtBottom && showScrollBottomPill) {
      setShowScrollBottomPill(false);
      setUnseenMessagesCount(0);
    }
  };

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

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text) {
      toast.warning('Please enter a message before sending.', {
        title: 'Empty Message',
      });
      return;
    }

    if (!activeConversation.id) {
      toast.error('No active conversation selected.', { title: 'Cannot Send' });
      return;
    }

    setInputText('');
    await sendMessage(
      activeConversation.id,
      text,
      currentSenderName,
      currentSenderRole,
      currentUser?.id
    );
    scrollToBottom(true);
    // Keep cursor active in typing input automatically without requiring re-click
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleStartDmWithColleague = async (colleague: StaffChatUser) => {
    if (!currentUser?.id) {
      toast.info('Please log in with staff PIN to start direct messages.', {
        title: 'Staff Identity Required',
      });
      return;
    }
    await openDirectMessageWithColleague(currentUser.id, colleague);
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
            <Text className="text-base font-semibold text-emerald-800">Online · Live DB</Text>
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
          <Text className="text-xl font-bold text-neutral-900 mb-3 px-2">Conversations</Text>

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
                  onPress={() => setActiveConversation(chan.id, currentUser?.id)}
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
            {directMessages.length > 0 ? (
              directMessages.map((dm) => {
                const isActive = dm.id === activeConversation.id;
                return (
                  <Pressable
                    key={dm.id}
                    onPress={() => setActiveConversation(dm.id, currentUser?.id)}
                    className={`flex-row items-center p-3 mb-1.5 rounded-2xl transition-all min-h-[56px] ${
                      isActive
                        ? 'bg-[#FBF0F3] border border-[#F5D9E0]'
                        : 'bg-transparent border border-transparent active:bg-neutral-50'
                    }`}
                  >
                    <View className="w-11 h-11 rounded-full bg-[#800020] items-center justify-center mr-3">
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
              })
            ) : (
              <View className="px-2 py-3 bg-neutral-50 rounded-xl mb-2">
                <Text className="text-sm text-neutral-500">
                  No active DMs yet. Tap a colleague below to start chatting.
                </Text>
              </View>
            )}

            {/* STAFF ROSTER TO START NEW DM */}
            {availableColleagues.length > 0 && (
              <>
                <Text className="text-sm font-bold tracking-wider text-neutral-400 uppercase mt-3 mb-2 px-2">
                  Staff Colleagues
                </Text>
                {availableColleagues.map((colleague) => (
                  <Pressable
                    key={colleague.id}
                    onPress={() => handleStartDmWithColleague(colleague)}
                    className="flex-row items-center p-2.5 mb-1 rounded-xl active:bg-neutral-100 min-h-[48px]"
                  >
                    <View className="w-8 h-8 rounded-full bg-neutral-200 items-center justify-center mr-2.5">
                      <Text className="text-xs font-bold text-neutral-700">
                        {colleague.displayName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-neutral-800" numberOfLines={1}>
                        {colleague.displayName}
                      </Text>
                      <Text className="text-xs text-neutral-400">{colleague.role}</Text>
                    </View>
                    <MessageSquare size={16} color="#800020" />
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>
        </View>

        {/* Right Column: Active Conversation Thread */}
        <View className="flex-1 bg-white rounded-3xl shadow-sm border border-neutral-100 flex-col overflow-hidden relative">
          {/* Thread Header */}
          <View className="px-6 py-4 border-b border-neutral-100 flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-neutral-900 tracking-tight">
                {activeConversation.title}
              </Text>
              <Text className="text-base font-medium text-neutral-500 mt-0.5">
                {activeConversation.subtitle ||
                  (activeConversation.type === 'channel'
                    ? `${activeConversation.title} · Staff Channel`
                    : 'Direct conversation')}
              </Text>
            </View>
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

          {/* Conversation Feed with Auto-Scroll & Messenger UX */}
          <ScrollView
            ref={scrollViewRef}
            onScroll={handleScroll}
            scrollEventThrottle={32}
            showsVerticalScrollIndicator={false}
            className="flex-1 px-5 py-4"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Centered Date Separator */}
            <View className="items-center my-3">
              <View className="bg-neutral-200/60 px-3.5 py-1 rounded-full">
                <Text className="text-xs font-semibold text-neutral-500">Service Thread</Text>
              </View>
            </View>

            {currentMessages.length === 0 ? (
              <View className="items-center justify-center py-12">
                <Text className="text-base text-neutral-400">
                  No messages yet. Send a message to start the conversation!
                </Text>
              </View>
            ) : (
              currentMessages.map((msg) => {
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
                  msg.senderName.trim().toLowerCase() === currentSenderName.trim().toLowerCase() ||
                  (currentUser?.id && msg.senderId === currentUser.id);

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
                          {msg.timestamp}
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
                        {msg.deliveryStatus === 'error' && (
                          <AlertCircle size={13} color="#EF4444" />
                        )}
                      </View>
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
              })
            )}
          </ScrollView>

          {/* Floating Messenger "New message ↓" Jump Pill */}
          {showScrollBottomPill && (
            <Pressable
              onPress={() => scrollToBottom(true)}
              className="absolute bottom-28 self-center flex-row items-center bg-[#581827] px-4 py-2 rounded-full shadow-lg active:opacity-90 z-20"
            >
              <ChevronDown size={18} color="#FFFFFF" />
              <Text className="ml-1.5 text-base font-bold text-white">
                {unseenMessagesCount > 1
                  ? `${unseenMessagesCount} new messages ↓`
                  : 'New message ↓'}
              </Text>
            </Pressable>
          )}

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

          {/* Bottom Message Input Bar - Clean messenger style */}
          <View className="flex-row items-center px-5 py-3 border-t border-neutral-100 gap-2.5 bg-white">
            <View className="flex-1 min-h-[48px] bg-neutral-100/90 rounded-full px-4 py-2.5 justify-center border border-neutral-200/50">
              <TextInput
                ref={inputRef}
                autoFocus
                blurOnSubmit={false}
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

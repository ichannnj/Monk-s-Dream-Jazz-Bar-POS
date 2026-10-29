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
import { StaffChatUser, formatRelativeElapsed } from '../data/chat.api';

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
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const unpinAnnouncement = useChatStore((s) => s.unpinAnnouncement);
  const loadInitialData = useChatStore((s) => s.loadInitialData);
  const setChatViewActive = useChatStore((s) => s.setChatViewActive);
  const openDirectMessageWithColleague = useChatStore((s) => s.openDirectMessageWithColleague);
  const trackCurrentPresence = useChatStore((s) => s.trackCurrentPresence);

  const [inputText, setInputText] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [showScrollBottomPill, setShowScrollBottomPill] = useState(false);
  const [unseenMessagesCount, setUnseenMessagesCount] = useState(0);
  const [, setElapsedTicker] = useState<number>(Date.now());

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

  // Determine user's assigned station channel slug
  // If an explicit defaultChannel is passed from terminal station (e.g. 'bar', 'kitchen', 'foh'),
  // that terminal station takes absolute precedence so only that station channel appears.
  const userStationChannelSlug = useMemo(() => {
    // 1. Explicit defaultChannel passed as prop has strict precedence on terminal screens
    if (defaultChannel && defaultChannel !== 'all') {
      return defaultChannel;
    }
    // 2. Role-based fallback
    const role = currentUser?.role;
    switch (role) {
      case 'barista':
      case 'station_cafe':
        return 'cafe';
      case 'bartender':
      case 'station_bar':
        return 'bar';
      case 'kitchen':
      case 'station_food':
        return 'kitchen';
      case 'foh_runner':
      case 'waiter':
      case 'cashier':
        return 'foh';
      case 'admin':
        return null; // Admin screen (with no defaultChannel) sees all channels
      default:
        return 'foh';
    }
  }, [defaultChannel, currentUser?.role]);

  // Load initial data from Supabase DB on mount or user change and track presence
  useEffect(() => {
    loadInitialData(currentUser?.id);
    trackCurrentPresence();
  }, [currentUser?.id, loadInitialData, trackCurrentPresence]);

  // Set default channel once when available without resetting upon new incoming messages
  useEffect(() => {
    if (conversations.length > 0) {
      const targetSlug =
        defaultChannel && defaultChannel !== 'all'
          ? defaultChannel
          : userStationChannelSlug || (defaultChannel === 'all' ? 'foh' : null);

      if (targetSlug && defaultChannelSetRef.current !== targetSlug) {
        defaultChannelSetRef.current = targetSlug;
        const matched = conversations.find((c) => c.slug === targetSlug || c.id === targetSlug);
        if (matched && activeConversationId !== matched.id) {
          setActiveConversation(matched.id, currentUser?.id);
        }
      }
    }
  }, [
    defaultChannel,
    userStationChannelSlug,
    conversations,
    activeConversationId,
    setActiveConversation,
    currentUser?.id,
  ]);

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

  // Live 5-second elapsed time ticker for fine-grained real-time message and conversation updates
  useEffect(() => {
    const ticker = setInterval(() => {
      setElapsedTicker(Date.now());
    }, 5000);
    return () => clearInterval(ticker);
  }, []);

  // Determine current user display name - Authenticated user strictly takes precedence over static props!
  const currentSenderName = useMemo(() => {
    if (currentUser?.displayName) return currentUser.displayName;
    if (propSenderName && propSenderName !== 'Dana Cruz' && propSenderName !== 'FOH Expediter') {
      return propSenderName;
    }
    return 'Miles (Manager)';
  }, [propSenderName, currentUser]);

  // Determine current user role label
  const currentSenderRole = useMemo(() => {
    const role = currentUser?.role;
    if (role) {
      switch (role) {
        case 'barista':
        case 'station_cafe':
          return 'Barista';
        case 'bartender':
        case 'station_bar':
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
          return 'Staff';
      }
    }
    if (propSenderRole) return propSenderRole;
    return 'Waiter / Cashier';
  }, [propSenderRole, currentUser]);

  // Initials for avatar badge
  const userInitials = useMemo(() => {
    const parts = currentSenderName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return currentSenderName.slice(0, 2).toUpperCase();
  }, [currentSenderName]);

  // Separate channels vs direct messages sorted by latest activity (newest at top)
  // When on a designated station (e.g. Bar KDS, Kitchen KDS, Floor), ONLY that station channel is visible.
  // Admins can only see all channels when on the Admin screen (where userStationChannelSlug is null).
  const channels = useMemo(() => {
    return conversations
      .filter((c) => {
        if (c.type !== 'channel') return false;
        // If station channel is specified (or staff role resolved), strictly lock to that station
        if (userStationChannelSlug) {
          return c.slug === userStationChannelSlug || c.id === userStationChannelSlug;
        }
        // Admin Back Office without specific station terminal sees all channels
        return currentUser?.role === 'admin';
      })
      .sort((a, b) => {
        const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [conversations, userStationChannelSlug, currentUser?.role]);

  const directMessages = useMemo(() => {
    return conversations
      .filter((c) => {
        if (c.type !== 'dm') return false;
        // Strictly filter out self-DMs
        if (c.counterpartId && currentUser?.id && c.counterpartId === currentUser.id) return false;
        return true;
      })
      .sort((a, b) => {
        const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [conversations, currentUser?.id]);

  // Colleagues without an existing DM conversation yet (strictly excluding the current user)
  const availableColleagues = useMemo(() => {
    const myId = currentUser?.id;
    const myName = currentSenderName.trim().toLowerCase();
    const myUsername = currentUser?.username?.trim().toLowerCase();
    const isAdmin = currentUser?.role === 'admin' || currentSenderRole === 'Manager';

    const colleagues = activeStaffRoster.filter((u) => {
      if (myId && u.id === myId) return false;
      if (u.displayName.trim().toLowerCase() === myName) return false;
      if (myUsername && u.username.trim().toLowerCase() === myUsername) return false;
      // Extra guard: If logged in as Admin, never show Miles in the colleague list
      if (
        isAdmin &&
        (u.displayName.toLowerCase().includes('miles') || u.username === 'miles_manager')
      ) {
        return false;
      }
      return true;
    });

    return colleagues.filter((colleague) => {
      // Check if already represented in directMessages
      return !directMessages.some(
        (dm) =>
          dm.counterpartId === colleague.id ||
          dm.title.toLowerCase().includes(colleague.displayName.toLowerCase()) ||
          colleague.displayName.toLowerCase().includes(dm.title.toLowerCase())
      );
    });
  }, [activeStaffRoster, currentUser, currentSenderName, currentSenderRole, directMessages]);

  // Active conversation object (scoped to visible conversations)
  const visibleConversations = useMemo(() => {
    return [...channels, ...directMessages];
  }, [channels, directMessages]);

  const activeConversation = useMemo(() => {
    return (
      visibleConversations.find((c) => c.id === activeConversationId) ||
      visibleConversations[0] || {
        id: '',
        title: 'Team Chat',
        type: 'channel' as const,
        avatarText: 'TC',
        unreadCount: 0,
      }
    );
  }, [visibleConversations, activeConversationId]);

  // Messages for active conversation
  const currentMessages = useMemo(() => {
    return messages[activeConversation?.id] || [];
  }, [messages, activeConversation]);

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
    const isAdmin = currentUser?.role === 'admin' || currentSenderRole === 'Manager';
    if (
      colleague.id === currentUser?.id ||
      colleague.displayName.trim().toLowerCase() === currentSenderName.trim().toLowerCase() ||
      (isAdmin &&
        (colleague.displayName.toLowerCase().includes('miles') ||
          colleague.username === 'miles_manager'))
    ) {
      toast.warning('You cannot message yourself.', { title: 'Self Messaging' });
      return;
    }

    // If no currentUser ID (e.g. anonymous or terminal mode), fall back to active staff or default caller
    const effectiveUserId =
      currentUser?.id ||
      activeStaffRoster.find((u) => u.displayName === currentSenderName)?.id ||
      '11111111-1111-1111-1111-111111111111'; // Miles (Manager) default fallback

    await openDirectMessageWithColleague(effectiveUserId, colleague);
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
              const elapsedLabel = formatRelativeElapsed(chan.lastActivityAt);
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

            {/* DIRECT MESSAGES Section (All Venue Staff: Active Threads + Available Colleagues) */}
            <Text className="text-sm font-bold tracking-wider text-neutral-400 uppercase mt-4 mb-2 px-2">
              Direct Messages
            </Text>

            {/* 1. Active Direct Message Conversations */}
            {directMessages.map((dm) => {
              const isActive = dm.id === activeConversation.id;
              const elapsedLabel = formatRelativeElapsed(dm.lastActivityAt);
              // Resolve counterpart colleague (strictly excluding current user)
              const counterpartId =
                dm.counterpartId ||
                activeStaffRoster.find(
                  (u) =>
                    u.id !== currentUser?.id &&
                    (u.displayName.toLowerCase() === dm.title.toLowerCase() ||
                      dm.title.toLowerCase().includes(u.displayName.toLowerCase()))
                )?.id;
              const isColleagueOnline = counterpartId
                ? onlineUserIds.includes(counterpartId)
                : false;

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

            {/* 2. All Remaining Venue Staff (Floor, KDS, Admin) ready for 1-on-1 DM */}
            {availableColleagues.map((colleague) => {
              const isColleagueOnline = onlineUserIds.includes(colleague.id);
              return (
                <Pressable
                  key={colleague.id}
                  onPress={() => handleStartDmWithColleague(colleague)}
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

        {/* Right Column: Active Conversation Thread */}
        <View className="flex-1 bg-white rounded-3xl shadow-sm border border-neutral-100 flex-col overflow-hidden relative">
          {/* Thread Header */}
          <View className="px-6 py-4 border-b border-neutral-100 flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-neutral-900 tracking-tight">
                {activeConversation.title}
              </Text>
              <View className="flex-row items-center mt-0.5">
                {activeConversation.type === 'dm' &&
                  (() => {
                    const counterpartId =
                      activeConversation.counterpartId ||
                      activeStaffRoster.find(
                        (u) =>
                          u.id !== currentUser?.id &&
                          (u.displayName.toLowerCase() === activeConversation.title.toLowerCase() ||
                            activeConversation.title
                              .toLowerCase()
                              .includes(u.displayName.toLowerCase()))
                      )?.id;
                    const isOnlineNow = counterpartId
                      ? onlineUserIds.includes(counterpartId)
                      : false;

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
                <Text className="text-base font-medium text-neutral-500">
                  {activeConversation.subtitle ||
                    (activeConversation.type === 'channel'
                      ? `${activeConversation.title} · Staff Channel`
                      : 'Direct conversation')}
                </Text>
              </View>
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
              activeConversation.type === 'dm' ? (
                (() => {
                  const counterpartId =
                    activeConversation.counterpartId ||
                    activeStaffRoster.find(
                      (u) =>
                        u.id !== currentUser?.id &&
                        (u.displayName.toLowerCase() === activeConversation.title.toLowerCase() ||
                          activeConversation.title
                            .toLowerCase()
                            .includes(u.displayName.toLowerCase()))
                    )?.id;
                  const matchedColleague = activeStaffRoster.find((u) => u.id === counterpartId);
                  const isOnlineNow = counterpartId ? onlineUserIds.includes(counterpartId) : false;

                  return (
                    <View className="items-center justify-center py-10 px-6">
                      {/* Large Messenger Profile Avatar */}
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

                      {/* Colleague Identity & Role */}
                      <Text className="text-2xl font-bold text-neutral-900 mb-1 text-center">
                        {activeConversation.title}
                      </Text>
                      <Text className="text-base font-medium text-neutral-500 mb-2 capitalize text-center">
                        {matchedColleague?.role
                          ? `Monk's Dream · ${matchedColleague.role.replace('_', ' ')}`
                          : activeConversation.subtitle || 'Direct Message'}
                      </Text>

                      {/* Online Status Badge */}
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
                          {isOnlineNow
                            ? 'Active now on POS'
                            : 'Offline · Messages delivered on return'}
                        </Text>
                      </View>

                      {/* Messenger Encouragement Text */}
                      <Text className="text-base text-neutral-500 text-center max-w-sm mb-6">
                        You're connected on Monk's Dream POS. Say hello to start the conversation!
                      </Text>

                      {/* Facebook Messenger Wave Quick-Action Button */}
                      <Pressable
                        onPress={() => handleSend('👋')}
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
                      {messageElapsed}
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

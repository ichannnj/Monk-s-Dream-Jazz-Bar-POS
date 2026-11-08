import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ScrollView, TextInput, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useAuthStore } from '../../../auth/application/useAuthStore';
import { toast } from '../../../shared/toast/useToastStore';
import { useResponsive } from '../../../shared/hooks/useResponsive';
import { useChatStore } from '../../application/useChatStore';
import { StaffChatUser } from '../../data/chat.api';
import { ChatConversation } from '../../domain/chat.types';
import {
  resolveUserStationChannelSlug,
  filterStationChannels,
  filterDirectMessages,
  filterAvailableColleagues,
} from './chatViewFilters';
import {
  resolveSenderName,
  resolveSenderRole,
  resolveUserInitials,
  getQuickPresets,
} from './chatUserResolvers';

export interface UseSharedChatControllerProps {
  senderName?: string;
  senderRole?: string;
  defaultChannel?: string;
  compact?: boolean;
}

export function useSharedChatController({
  senderName: propSenderName,
  senderRole: propSenderRole,
  defaultChannel,
  compact = false,
}: UseSharedChatControllerProps) {
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

  const { isMobile } = useResponsive();
  const isCompact = isMobile || compact;
  const [mobileView, setMobileView] = useState<'list' | 'thread'>(() => {
    return defaultChannel && defaultChannel !== 'all' ? 'thread' : 'list';
  });

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

  useEffect(() => {
    setChatViewActive(true);
    return () => setChatViewActive(false);
  }, [setChatViewActive]);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [activeConversationId]);

  const userStationChannelSlug = useMemo(() => {
    return resolveUserStationChannelSlug(defaultChannel, currentUser?.role);
  }, [defaultChannel, currentUser?.role]);

  useEffect(() => {
    loadInitialData(currentUser?.id);
    trackCurrentPresence();
  }, [currentUser?.id, loadInitialData, trackCurrentPresence]);

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

  useEffect(() => {
    const ticker = setInterval(() => setElapsedTicker(Date.now()), 5000);
    return () => clearInterval(ticker);
  }, []);

  const currentSenderName = useMemo(() => {
    return resolveSenderName(propSenderName, currentUser?.displayName);
  }, [propSenderName, currentUser?.displayName]);

  const currentSenderRole = useMemo(() => {
    return resolveSenderRole(propSenderRole, currentUser?.role);
  }, [propSenderRole, currentUser?.role]);

  const userInitials = useMemo(() => {
    return resolveUserInitials(currentSenderName);
  }, [currentSenderName]);

  const channels = useMemo(() => {
    return filterStationChannels(conversations, userStationChannelSlug, currentUser?.role);
  }, [conversations, userStationChannelSlug, currentUser?.role]);

  const directMessages = useMemo(() => {
    return filterDirectMessages(conversations, currentUser?.id);
  }, [conversations, currentUser?.id]);

  const availableColleagues = useMemo(() => {
    const isAdmin = currentUser?.role === 'admin' || currentSenderRole === 'Manager';
    return filterAvailableColleagues(
      activeStaffRoster,
      directMessages,
      currentUser?.id,
      currentSenderName,
      currentUser?.username,
      isAdmin
    );
  }, [
    activeStaffRoster,
    directMessages,
    currentUser?.id,
    currentSenderName,
    currentUser?.username,
    currentSenderRole,
    currentUser?.role,
  ]);

  const visibleConversations = useMemo(() => {
    return [...channels, ...directMessages];
  }, [channels, directMessages]);

  const activeConversation: ChatConversation = useMemo(() => {
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

  const currentMessages = useMemo(() => {
    return messages[activeConversation?.id] || [];
  }, [messages, activeConversation]);

  const scrollToBottom = useCallback((animated: boolean = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
      setShowScrollBottomPill(false);
      setUnseenMessagesCount(0);
      isNearBottomRef.current = true;
    }, 50);
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      scrollToBottom(false);
      prevMessagesLengthRef.current = currentMessages.length;
    }
  }, [activeConversationId, scrollToBottom, currentMessages.length]);

  useEffect(() => {
    const prevCount = prevMessagesLengthRef.current;
    const currentCount = currentMessages.length;
    prevMessagesLengthRef.current = currentCount;

    if (currentCount > prevCount) {
      const latestMsg = currentMessages[currentCount - 1];
      const isSentByMe =
        latestMsg.senderName.trim().toLowerCase() === 'you' ||
        latestMsg.senderName.trim().toLowerCase() === currentSenderName.trim().toLowerCase();

      if (isSentByMe || isNearBottomRef.current) {
        scrollToBottom(true);
      } else {
        setShowScrollBottomPill(true);
        setUnseenMessagesCount((prev) => prev + (currentCount - prevCount));
      }
    }
  }, [currentMessages, currentSenderName, scrollToBottom]);

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

  const quickPresets = useMemo(() => {
    return getQuickPresets(currentSenderRole);
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

    const effectiveUserId =
      currentUser?.id ||
      activeStaffRoster.find((u) => u.displayName === currentSenderName)?.id ||
      '11111111-1111-1111-1111-111111111111';

    await openDirectMessageWithColleague(effectiveUserId, colleague);
    if (isCompact) {
      setMobileView('thread');
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id, currentUser?.id);
    if (isCompact) {
      setMobileView('thread');
    }
  };

  return {
    currentUser,
    isMobile,
    isCompact,
    mobileView,
    setMobileView,
    inputText,
    setInputText,
    currentDateTime,
    showScrollBottomPill,
    unseenMessagesCount,
    currentSenderName,
    currentSenderRole,
    userInitials,
    channels,
    directMessages,
    availableColleagues,
    activeConversation,
    currentMessages,
    quickPresets,
    onlineUserIds,
    activeStaffRoster,
    scrollViewRef,
    inputRef,
    scrollToBottom,
    handleScroll,
    handleSend,
    handleStartDmWithColleague,
    handleSelectConversation,
    unpinAnnouncement,
  };
}

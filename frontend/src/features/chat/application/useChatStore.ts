import { create } from 'zustand';
import { PinnedAnnouncement } from '../domain/chat.types';
import { chatApi, StaffChatUser } from '../data/chat.api';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';
import { toast } from '@/features/shared/toast/useToastStore';
import { useAuthStore } from '@/features/auth';
import { ChatStoreState } from './chatStore.types';
import {
  filterCleanConversations,
  resolveDefaultActiveConversationId,
  createDraftConversation,
} from './chatChannelHelpers';
import { handleIncomingRealtimeMessage } from './chatRealtimeActions';
import { executeSendMessage, executeSendSystemMessage } from './chatSenderService';

let realtimeUnsub: (() => void) | null = null;
let presenceHeartbeat: any = null;

export const useChatStore = create<ChatStoreState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversationId: '',
  activeStaffRoster: [],
  onlineUserIds: [],
  isLoading: false,
  isRealtimeConnected: false,
  isChatViewActive: false,

  getTotalUnreadCount: () => {
    return get().conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  },

  setChatViewActive: (active: boolean) => {
    set({ isChatViewActive: active });
    if (active) {
      const activeId = get().activeConversationId;
      if (activeId) {
        const authUser = useAuthStore.getState().currentUser;
        chatApi.markMessagesAsRead(activeId, authUser?.id);
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === activeId && c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c
          ),
        }));
      }
    }
  },

  trackCurrentPresence: async () => {
    const authUser = useAuthStore.getState().currentUser;
    if (authUser?.id) {
      await realtimeGateway.trackChatPresence({
        id: authUser.id,
        displayName: authUser.displayName,
        role: authUser.role,
      });
      set((state) => ({
        onlineUserIds: Array.from(new Set([...state.onlineUserIds, authUser.id])),
      }));
    }
  },

  loadInitialData: async (currentUserId?: string) => {
    set({ isLoading: true });
    try {
      const [roster, convs] = await Promise.all([
        chatApi.getActiveStaffRoster(),
        chatApi.fetchConversations(currentUserId),
      ]);

      const cleanConvs = filterCleanConversations(convs, currentUserId);
      const activeId = resolveDefaultActiveConversationId(cleanConvs, get().activeConversationId);

      set({
        activeStaffRoster: roster,
        conversations: cleanConvs,
        activeConversationId: activeId,
        isLoading: false,
      });

      if (activeId) {
        await get().fetchMessagesForConversation(activeId);
      }
      if (!get().isRealtimeConnected) {
        get().setupRealtimeSubscription();
      }
      if (currentUserId || useAuthStore.getState().currentUser?.id) {
        get().trackCurrentPresence();
      }
    } catch (err) {
      console.warn('loadInitialData error:', err);
      set({ isLoading: false });
    }
  },

  setActiveConversation: (idOrSlug: string, currentUserId?: string) => {
    const { conversations, fetchMessagesForConversation } = get();
    const target =
      conversations.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ||
      conversations.find((c) => c.id === idOrSlug);
    const resolvedId = target ? target.id : idOrSlug;

    set((state) => ({
      activeConversationId: resolvedId,
      conversations: state.conversations.map((c) =>
        c.id === resolvedId && c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c
      ),
    }));

    if (resolvedId && !resolvedId.startsWith('draft-')) {
      fetchMessagesForConversation(resolvedId);
      chatApi.markMessagesAsRead(resolvedId, currentUserId);
    }
  },

  openDirectMessageWithColleague: async (currentUserId: string, colleague: StaffChatUser) => {
    try {
      if (!colleague || colleague.id === currentUserId) {
        toast.warning('You cannot direct message yourself.', { title: 'Self Messaging' });
        return;
      }

      const existing = get().conversations.find(
        (c) =>
          c.type === 'dm' &&
          (c.counterpartId === colleague.id ||
            c.title.trim().toLowerCase() === colleague.displayName.trim().toLowerCase())
      );

      if (existing) {
        get().setActiveConversation(existing.id, currentUserId);
        return;
      }

      const draftConv = createDraftConversation(colleague);
      const draftId = draftConv.id;

      set((state) => {
        const hasDraft = state.conversations.some((c) => c.id === draftId);
        return {
          conversations: hasDraft ? state.conversations : [...state.conversations, draftConv],
          activeConversationId: draftId,
          messages: {
            ...state.messages,
            [draftId]: state.messages[draftId] || [],
          },
        };
      });
    } catch (err) {
      console.warn('openDirectMessageWithColleague exception:', err);
    }
  },

  fetchMessagesForConversation: async (conversationId: string) => {
    if (conversationId.startsWith('draft-')) return;
    try {
      const msgs = await chatApi.fetchMessages(conversationId);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: msgs,
        },
      }));
    } catch (err) {
      console.warn('fetchMessagesForConversation error:', err);
    }
  },

  sendMessage: async (
    conversationId: string,
    message: string,
    senderName: string,
    senderRole: string,
    senderId?: string
  ) => {
    return executeSendMessage({
      conversationId,
      message,
      senderName,
      senderRole,
      senderId,
      conversations: get().conversations,
      activeStaffRoster: get().activeStaffRoster,
      messages: get().messages,
      set,
    });
  },

  sendSystemMessage: async (conversationId: string, message: string) => {
    return executeSendSystemMessage({ conversationId, message, set });
  },

  pinAnnouncement: async (conversationId: string, announcement: PinnedAnnouncement) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, pinnedMessage: announcement } : c
      ),
    }));
    await chatApi.pinAnnouncement(conversationId, announcement.author, announcement.text);
  },

  unpinAnnouncement: async (conversationId: string) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, pinnedMessage: undefined } : c
      ),
    }));
    await chatApi.unpinAnnouncement(conversationId);
  },

  markConversationRead: (conversationId: string) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    }));
  },

  setupRealtimeSubscription: () => {
    if (realtimeUnsub) {
      realtimeUnsub();
      realtimeUnsub = null;
    }

    const unsub = realtimeGateway.subscribeChatMessages({
      onInsert: (newDbMsg: any) => {
        handleIncomingRealtimeMessage({ newDbMsg, state: get(), set });
      },
      onUpdate: (updatedDbMsg: any) => {
        if (!updatedDbMsg || !updatedDbMsg.conversation_id) return;
        const convId = updatedDbMsg.conversation_id;
        const state = get();
        const existingList = state.messages[convId] || [];
        set({
          messages: {
            ...state.messages,
            [convId]: existingList.map((m) =>
              m.id === updatedDbMsg.id
                ? {
                    ...m,
                    isRead: !!updatedDbMsg.is_read,
                    readAt: updatedDbMsg.read_at || m.readAt,
                    deliveryStatus: updatedDbMsg.is_read ? 'seen' : m.deliveryStatus,
                  }
                : m
            ),
          },
        });
      },
      onConversationUpdate: (updatedConv: any) => {
        if (!updatedConv) return;
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === updatedConv.id
              ? {
                  ...c,
                  title: updatedConv.title,
                  subtitle: updatedConv.subtitle || c.subtitle,
                  pinnedMessage:
                    updatedConv.pinned_text && updatedConv.pinned_author
                      ? { author: updatedConv.pinned_author, text: updatedConv.pinned_text }
                      : undefined,
                }
              : c
          ),
        }));
      },
      onParticipantInsert: async (participant: any) => {
        const authUser = useAuthStore.getState().currentUser;
        if (participant?.user_id && participant.user_id === authUser?.id) {
          const updatedConvs = await chatApi.fetchConversations(authUser?.id);
          const cleanFresh = filterCleanConversations(updatedConvs, authUser?.id);
          set({ conversations: cleanFresh });
        }
      },
      onUserUpdate: async () => {
        const roster = await chatApi.getActiveStaffRoster();
        set({ activeStaffRoster: roster });
      },
      onPresenceSync: (onlineIds: string[]) => {
        const authUser = useAuthStore.getState().currentUser;
        const combined = authUser?.id
          ? Array.from(new Set([...onlineIds, authUser.id]))
          : onlineIds;
        set({ onlineUserIds: combined });
      },
      onStatusChange: (status) => {
        const connected = status === 'SUBSCRIBED';
        set({ isRealtimeConnected: connected });
        if (connected) get().trackCurrentPresence();
      },
    });

    realtimeUnsub = unsub;
    set({ isRealtimeConnected: true });

    if (presenceHeartbeat) clearInterval(presenceHeartbeat);
    presenceHeartbeat = setInterval(() => {
      get().trackCurrentPresence();
    }, 30000);

    return () => {
      if (presenceHeartbeat) {
        clearInterval(presenceHeartbeat);
        presenceHeartbeat = null;
      }
      if (realtimeUnsub) {
        realtimeUnsub();
        realtimeUnsub = null;
      }
      set({ isRealtimeConnected: false });
    };
  },
}));

import { create } from 'zustand';
import { ChatConversation, ChatMessage, PinnedAnnouncement } from '../domain/chat.types';
import { chatApi, StaffChatUser } from '../data/chat.api';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';
import { toast } from '@/features/shared/toast/useToastStore';
import { useAuthStore } from '@/features/auth';

interface ChatStoreState {
  conversations: ChatConversation[];
  messages: Record<string, ChatMessage[]>;
  activeConversationId: string;
  activeStaffRoster: StaffChatUser[];
  isLoading: boolean;
  isRealtimeConnected: boolean;
  isChatViewActive: boolean;

  // Actions
  loadInitialData: (currentUserId?: string) => Promise<void>;
  setActiveConversation: (id: string, currentUserId?: string) => void;
  setChatViewActive: (active: boolean) => void;
  getTotalUnreadCount: () => number;
  openDirectMessageWithColleague: (
    currentUserId: string,
    colleague: StaffChatUser
  ) => Promise<void>;
  fetchMessagesForConversation: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    message: string,
    senderName: string,
    senderRole: string,
    senderId?: string
  ) => Promise<void>;
  sendSystemMessage: (conversationId: string, message: string) => Promise<void>;
  pinAnnouncement: (conversationId: string, announcement: PinnedAnnouncement) => Promise<void>;
  unpinAnnouncement: (conversationId: string) => Promise<void>;
  markConversationRead: (conversationId: string) => void;
  setupRealtimeSubscription: () => () => void;
}

let realtimeUnsub: (() => void) | null = null;

export const useChatStore = create<ChatStoreState>((set, get) => ({
  conversations: [],
  messages: {},
  activeConversationId: '',
  activeStaffRoster: [],
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

  loadInitialData: async (currentUserId?: string) => {
    set({ isLoading: true });
    try {
      const [roster, convs] = await Promise.all([
        chatApi.getActiveStaffRoster(),
        chatApi.fetchConversations(currentUserId),
      ]);

      let activeId = get().activeConversationId;
      if (!activeId || !convs.some((c) => c.id === activeId || c.slug === activeId)) {
        const defaultChan = convs.find((c) => c.slug === 'foh') || convs[0];
        activeId = defaultChan ? defaultChan.id : '';
      }

      set({
        activeStaffRoster: roster,
        conversations: convs,
        activeConversationId: activeId,
        isLoading: false,
      });

      if (activeId) {
        await get().fetchMessagesForConversation(activeId);
      }

      // Automatically setup realtime subscription if not connected
      if (!get().isRealtimeConnected) {
        get().setupRealtimeSubscription();
      }
    } catch (err) {
      console.warn('loadInitialData error:', err);
      set({ isLoading: false });
    }
  },

  setActiveConversation: (idOrSlug: string, currentUserId?: string) => {
    const { conversations, messages, fetchMessagesForConversation } = get();
    // Resolve if passed a slug like 'foh' or direct ID
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

    if (resolvedId) {
      fetchMessagesForConversation(resolvedId);
      chatApi.markMessagesAsRead(resolvedId, currentUserId);
    }
  },

  openDirectMessageWithColleague: async (currentUserId: string, colleague: StaffChatUser) => {
    try {
      const dmConv = await chatApi.getOrCreateDirectConversation(currentUserId, colleague);
      if (!dmConv) return;

      set((state) => {
        const exists = state.conversations.some((c) => c.id === dmConv.id);
        const nextConvs = exists
          ? state.conversations.map((c) => (c.id === dmConv.id ? { ...c, ...dmConv } : c))
          : [...state.conversations, dmConv];
        return {
          conversations: nextConvs,
          activeConversationId: dmConv.id,
        };
      });

      await get().fetchMessagesForConversation(dmConv.id);
      chatApi.markMessagesAsRead(dmConv.id, currentUserId);
    } catch (err) {
      console.warn('openDirectMessageWithColleague exception:', err);
    }
  },

  fetchMessagesForConversation: async (conversationId: string) => {
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
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timeStr = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    // 1. Optimistic append
    const optimisticMsg: ChatMessage = {
      id: tempId,
      clientTempId: tempId,
      conversationId,
      senderId,
      senderName,
      senderRole,
      message,
      timestamp: timeStr,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sending',
    };

    set((state) => {
      const currentList = state.messages[conversationId] || [];
      const updatedConvs = state.conversations
        .map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessage: `${senderName}: ${message}`,
                lastTimestamp: 'Just now',
                lastActivityAt: new Date().toISOString(),
              }
            : c
        )
        .sort((a, b) => {
          const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
          const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
          return timeB - timeA;
        });

      return {
        messages: {
          ...state.messages,
          [conversationId]: [...currentList, optimisticMsg],
        },
        conversations: updatedConvs,
      };
    });

    // 2. Persist to Supabase Database
    try {
      const persisted = await chatApi.insertChatMessage({
        conversationId,
        senderId,
        senderName,
        senderRole,
        message,
        isSystem: false,
      });

      if (persisted) {
        set((state) => {
          const list = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: list.map((m) =>
                m.id === tempId
                  ? { ...persisted, clientTempId: tempId, deliveryStatus: 'delivered' }
                  : m
              ),
            },
          };
        });
      } else {
        // Mark error
        set((state) => {
          const list = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: list.map((m) =>
                m.id === tempId ? { ...m, deliveryStatus: 'error' } : m
              ),
            },
          };
        });
        toast.error('Failed to send message. Please retry.', { title: 'Network Error' });
      }
    } catch {
      set((state) => {
        const list = state.messages[conversationId] || [];
        return {
          messages: {
            ...state.messages,
            [conversationId]: list.map((m) =>
              m.id === tempId ? { ...m, deliveryStatus: 'error' } : m
            ),
          },
        };
      });
    }
  },

  sendSystemMessage: async (conversationId: string, message: string) => {
    const tempId = `sys-temp-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    const optimisticMsg: ChatMessage = {
      id: tempId,
      clientTempId: tempId,
      conversationId,
      senderName: 'System',
      senderRole: 'POS Dispatcher',
      message,
      timestamp: timeStr,
      createdAt: new Date().toISOString(),
      isSystem: true,
      deliveryStatus: 'sending',
    };

    set((state) => {
      const currentList = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...currentList, optimisticMsg],
        },
      };
    });

    const persisted = await chatApi.insertChatMessage({
      conversationId,
      senderName: 'System',
      senderRole: 'POS Dispatcher',
      message,
      isSystem: true,
    });

    if (persisted) {
      set((state) => {
        const list = state.messages[conversationId] || [];
        return {
          messages: {
            ...state.messages,
            [conversationId]: list.map((m) =>
              m.id === tempId ? { ...persisted, deliveryStatus: 'sent' } : m
            ),
          },
        };
      });
    }
  },

  pinAnnouncement: async (conversationId: string, announcement: PinnedAnnouncement) => {
    // Optimistic
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
        if (!newDbMsg || !newDbMsg.conversation_id) return;
        const convId = newDbMsg.conversation_id;

        const authUser = useAuthStore.getState().currentUser;
        const isFromMe =
          (authUser?.id && newDbMsg.sender_id === authUser.id) ||
          (authUser?.displayName &&
            newDbMsg.sender_name?.trim().toLowerCase() ===
              authUser.displayName.trim().toLowerCase());

        const state = get();
        const isActivelyViewing = state.isChatViewActive && state.activeConversationId === convId;

        const timeStr = new Date(newDbMsg.created_at || Date.now()).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        });

        if (isFromMe) {
          // Outbound message sent by this user: match and update optimistic message
          const formattedMsg: ChatMessage = {
            id: newDbMsg.id,
            conversationId: convId,
            senderId: newDbMsg.sender_id || undefined,
            senderName: newDbMsg.sender_name,
            senderRole: newDbMsg.sender_role,
            message: newDbMsg.message,
            timestamp: timeStr,
            createdAt: newDbMsg.created_at,
            isSystem: newDbMsg.is_system,
            isRead: !!newDbMsg.is_read,
            readAt: newDbMsg.read_at,
            deliveryStatus: newDbMsg.is_read ? 'seen' : 'delivered',
          };

          const existingList = state.messages[convId] || [];
          const matchedIndex = existingList.findIndex(
            (m) =>
              m.id === formattedMsg.id ||
              (m.deliveryStatus === 'sending' &&
                m.message === formattedMsg.message &&
                m.senderName === formattedMsg.senderName)
          );

          let nextList: ChatMessage[];
          if (matchedIndex >= 0) {
            nextList = existingList.map((m, idx) =>
              idx === matchedIndex
                ? {
                    ...formattedMsg,
                    clientTempId: m.clientTempId || m.id,
                  }
                : m
            );
          } else {
            nextList = [...existingList, formattedMsg];
          }

          set({
            messages: {
              ...state.messages,
              [convId]: nextList,
            },
            conversations: state.conversations
              .map((c) =>
                c.id === convId
                  ? {
                      ...c,
                      lastMessage: `${formattedMsg.senderName}: ${formattedMsg.message}`,
                      lastTimestamp: 'Just now',
                      lastActivityAt: formattedMsg.createdAt || new Date().toISOString(),
                    }
                  : c
              )
              .sort((a, b) => {
                const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
                const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
                return timeB - timeA;
              }),
          });
        } else {
          // Inbound message from colleague
          if (isActivelyViewing) {
            // Recipient is actively viewing this conversation right now -> mark read in DB!
            chatApi.markMessagesAsRead(convId, authUser?.id);
          } else {
            // Recipient is on another screen/tab -> show subtle toast notification!
            toast.info(newDbMsg.message, {
              title: `💬 ${newDbMsg.sender_name} (${newDbMsg.sender_role})`,
            });
          }

          const isReadState = isActivelyViewing;
          const formattedMsg: ChatMessage = {
            id: newDbMsg.id,
            conversationId: convId,
            senderId: newDbMsg.sender_id || undefined,
            senderName: newDbMsg.sender_name,
            senderRole: newDbMsg.sender_role,
            message: newDbMsg.message,
            timestamp: timeStr,
            createdAt: newDbMsg.created_at,
            isSystem: newDbMsg.is_system,
            isRead: isReadState,
            readAt: isReadState ? new Date().toISOString() : undefined,
            deliveryStatus: isReadState ? 'seen' : 'delivered',
          };

          const existingList = state.messages[convId] || [];
          const alreadyExists = existingList.some((m) => m.id === formattedMsg.id);
          const nextList = alreadyExists ? existingList : [...existingList, formattedMsg];

          set({
            messages: {
              ...state.messages,
              [convId]: nextList,
            },
            conversations: state.conversations
              .map((c) =>
                c.id === convId
                  ? {
                      ...c,
                      lastMessage: `${formattedMsg.senderName}: ${formattedMsg.message}`,
                      lastTimestamp: 'Just now',
                      lastActivityAt: formattedMsg.createdAt || new Date().toISOString(),
                      unreadCount: isActivelyViewing ? 0 : c.unreadCount + 1,
                    }
                  : c
              )
              .sort((a, b) => {
                const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
                const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
                return timeB - timeA;
              }),
          });
        }
      },

      onUpdate: (updatedDbMsg: any) => {
        if (!updatedDbMsg || !updatedDbMsg.conversation_id) return;
        const convId = updatedDbMsg.conversation_id;

        const state = get();
        const existingList = state.messages[convId] || [];

        const updatedList = existingList.map((m) =>
          m.id === updatedDbMsg.id
            ? {
                ...m,
                isRead: !!updatedDbMsg.is_read,
                readAt: updatedDbMsg.read_at || m.readAt,
                deliveryStatus: updatedDbMsg.is_read ? 'seen' : m.deliveryStatus,
              }
            : m
        );

        set({
          messages: {
            ...state.messages,
            [convId]: updatedList,
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
                      ? {
                          author: updatedConv.pinned_author,
                          text: updatedConv.pinned_text,
                        }
                      : undefined,
                }
              : c
          ),
        }));
      },

      onStatusChange: (status) => {
        const connected = status === 'SUBSCRIBED';
        set({ isRealtimeConnected: connected });
      },
    });

    realtimeUnsub = unsub;
    set({ isRealtimeConnected: true });

    return () => {
      if (realtimeUnsub) {
        realtimeUnsub();
        realtimeUnsub = null;
      }
      set({ isRealtimeConnected: false });
    };
  },
}));

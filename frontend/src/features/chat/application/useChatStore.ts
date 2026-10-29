import { create } from 'zustand';
import { supabase } from '@/features/shared/infrastructure/supabase';
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
  onlineUserIds: string[];
  isLoading: boolean;
  isRealtimeConnected: boolean;
  isChatViewActive: boolean;

  // Actions
  loadInitialData: (currentUserId?: string) => Promise<void>;
  setActiveConversation: (id: string, currentUserId?: string) => void;
  setChatViewActive: (active: boolean) => void;
  trackCurrentPresence: () => Promise<void>;
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

      // Filter out any self-DMs if any exist from past corrupted sessions
      const cleanConvs = convs.filter((c) => {
        if (c.type === 'dm' && currentUserId && c.counterpartId === currentUserId) {
          return false;
        }
        return true;
      });

      let activeId = get().activeConversationId;
      if (!activeId || !cleanConvs.some((c) => c.id === activeId || c.slug === activeId)) {
        const defaultChan = cleanConvs.find((c) => c.slug === 'foh') || cleanConvs[0];
        activeId = defaultChan ? defaultChan.id : '';
      }

      set({
        activeStaffRoster: roster,
        conversations: cleanConvs,
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

      // Track presence immediately for the logged-in user
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

      // Check if conversation already exists in memory with this colleague
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

      // Check if conversation already exists in Supabase DB between these two users
      if (currentUserId && colleague.id) {
        const { data: myParticipations } = await supabase
          .from('chat_participants')
          .select('conversation_id')
          .eq('user_id', currentUserId);

        if (myParticipations && myParticipations.length > 0) {
          const myConvIds = myParticipations.map((p: any) => p.conversation_id);
          const { data: shared } = await supabase
            .from('chat_participants')
            .select('conversation_id, chat_conversations(*)')
            .in('conversation_id', myConvIds)
            .eq('user_id', colleague.id);

          if (shared && shared.length > 0 && shared[0].chat_conversations) {
            const raw = shared[0].chat_conversations as any;
            const initials = colleague.displayName
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            const resolvedConv: ChatConversation = {
              id: raw.id,
              title: colleague.displayName,
              subtitle: `Direct Message · ${colleague.role.replace('_', ' ')}`,
              type: 'dm',
              avatarText: initials || raw.avatar_text || 'DM',
              counterpartId: colleague.id,
              unreadCount: 0,
              memberCount: 2,
              lastActivityAt: raw.updated_at || new Date().toISOString(),
            };

            set((s) => ({
              conversations: [resolvedConv, ...s.conversations.filter((c) => c.id !== raw.id)],
              activeConversationId: raw.id,
            }));

            get().fetchMessagesForConversation(raw.id);
            chatApi.markMessagesAsRead(raw.id, currentUserId);
            return;
          }
        }
      }

      // Messenger Draft Pattern: Do not write empty conversation to database yet.
      // Instead, set up an in-memory draft conversation for composition.
      const draftId = `draft-${colleague.id}`;
      const initials = colleague.displayName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const draftConv: ChatConversation = {
        id: draftId,
        title: colleague.displayName,
        subtitle: `Direct Message · ${colleague.role.replace('_', ' ')}`,
        type: 'dm',
        avatarText: initials || 'DM',
        unreadCount: 0,
        memberCount: 2,
        counterpartId: colleague.id,
        isDraft: true,
      };

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
    let targetConversationId = conversationId;
    const targetConv = get().conversations.find((c) => c.id === conversationId);

    // If sending in a draft conversation, persist conversation first in Supabase
    if (targetConv?.isDraft || conversationId.startsWith('draft-')) {
      const counterpartId = targetConv?.counterpartId || conversationId.replace('draft-', '');
      const colleague = get().activeStaffRoster.find((u) => u.id === counterpartId) || {
        id: counterpartId,
        username: counterpartId,
        displayName: targetConv?.title || 'Staff',
        role: 'staff',
        isActive: true,
      };

      const effectiveSenderId =
        senderId ||
        useAuthStore.getState().currentUser?.id ||
        '11111111-1111-1111-1111-111111111111';

      const realConv = await chatApi.getOrCreateDirectConversation(effectiveSenderId, colleague);
      if (realConv) {
        targetConversationId = realConv.id;
        // Replace draft with real conversation
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...realConv, isDraft: false } : c
          ),
          activeConversationId: targetConversationId,
          messages: {
            ...state.messages,
            [targetConversationId]: state.messages[conversationId] || [],
          },
        }));
      } else {
        toast.error('Failed to initiate conversation with colleague.', { title: 'Chat Error' });
        return;
      }
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timeStr = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    // 1. Optimistic append
    const optimisticMsg: ChatMessage = {
      id: tempId,
      clientTempId: tempId,
      conversationId: targetConversationId,
      senderId,
      senderName,
      senderRole,
      message,
      timestamp: timeStr,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sending',
    };

    set((state) => {
      const currentList = state.messages[targetConversationId] || [];
      const updatedConvs = state.conversations
        .map((c) =>
          c.id === targetConversationId
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
          [targetConversationId]: [...currentList, optimisticMsg],
        },
        conversations: updatedConvs,
      };
    });

    // 2. Persist to Supabase Database
    try {
      const persisted = await chatApi.insertChatMessage({
        conversationId: targetConversationId,
        senderId,
        senderName,
        senderRole,
        message,
        isSystem: false,
      });

      if (persisted) {
        set((state) => {
          const list = state.messages[targetConversationId] || [];
          return {
            messages: {
              ...state.messages,
              [targetConversationId]: list.map((m) =>
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
          const list = state.messages[targetConversationId] || [];
          return {
            messages: {
              ...state.messages,
              [targetConversationId]: list.map((m) =>
                m.id === tempId ? { ...m, deliveryStatus: 'error' } : m
              ),
            },
          };
        });
        toast.error('Failed to send message. Please retry.', { title: 'Network Error' });
      }
    } catch {
      set((state) => {
        const list = state.messages[targetConversationId] || [];
        return {
          messages: {
            ...state.messages,
            [targetConversationId]: list.map((m) =>
              m.id === tempId ? { ...m, deliveryStatus: 'error' } : m
            ),
          },
        };
      });
      toast.error('Failed to send message. Please retry.', { title: 'Network Error' });
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
      onInsert: async (newDbMsg: any) => {
        if (!newDbMsg || !newDbMsg.conversation_id) return;
        const convId = newDbMsg.conversation_id;

        const authUser = useAuthStore.getState().currentUser;
        const isFromMe =
          (authUser?.id && newDbMsg.sender_id === authUser.id) ||
          (authUser?.displayName &&
            newDbMsg.sender_name?.trim().toLowerCase() ===
              authUser.displayName.trim().toLowerCase());

        const state = get();

        // 1. Check if user is actively viewing a draft with this sender
        const isViewingDraftWithSender =
          !isFromMe &&
          !!newDbMsg.sender_id &&
          (state.activeConversationId === `draft-${newDbMsg.sender_id}` ||
            state.conversations.find((c) => c.id === state.activeConversationId)?.counterpartId ===
              newDbMsg.sender_id);

        const isActivelyViewing =
          state.isChatViewActive &&
          (state.activeConversationId === convId || isViewingDraftWithSender);

        // 2. Dynamic Conversation Hydration: If this conversation is not yet in user's conversations list,
        // synthesize it immediately in real-time so it renders in the sidebar at 0ms!
        let currentConvs = [...state.conversations];
        let convFound = currentConvs.find((c) => c.id === convId);

        if (!convFound) {
          const initials = (newDbMsg.sender_name || 'Staff')
            .split(' ')
            .map((p: string) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          convFound = {
            id: convId,
            title: newDbMsg.sender_name || 'Staff Member',
            subtitle: `Direct Message · ${(newDbMsg.sender_role || 'Staff').replace('_', ' ')}`,
            type: 'dm',
            avatarText: initials || 'DM',
            counterpartId: newDbMsg.sender_id || undefined,
            unreadCount: isActivelyViewing ? 0 : 1,
            memberCount: 2,
            lastMessage: `${newDbMsg.sender_name}: ${newDbMsg.message}`,
            lastTimestamp: 'Just now',
            lastActivityAt: newDbMsg.created_at || new Date().toISOString(),
          };
          currentConvs.unshift(convFound);

          // Asynchronously sync with Supabase in background to maintain database consistency
          chatApi
            .fetchConversations(authUser?.id)
            .then((fresh) => {
              if (fresh && fresh.length > 0) {
                const cleanFresh = fresh.filter(
                  (c) => !(c.type === 'dm' && authUser?.id && c.counterpartId === authUser.id)
                );
                set((s) => ({
                  conversations: cleanFresh.map((fc) => {
                    const existingInStore = s.conversations.find((ec) => ec.id === fc.id);
                    return existingInStore
                      ? { ...fc, unreadCount: existingInStore.unreadCount }
                      : fc;
                  }),
                }));
              }
            })
            .catch(() => {});
        }

        // 3. Draft-to-Live DM Migration: If recipient was in draft mode, migrate active conversation to real DB convId
        if (isViewingDraftWithSender) {
          currentConvs = currentConvs.filter((c) => c.id !== `draft-${newDbMsg.sender_id}`);
        }

        const timeStr = new Date(newDbMsg.created_at || Date.now()).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        });

        // 4. Inbound actions (read receipts & alerts)
        if (!isFromMe) {
          if (isActivelyViewing) {
            chatApi.markMessagesAsRead(convId, authUser?.id);
          } else {
            toast.info(newDbMsg.message, {
              title: `💬 ${newDbMsg.sender_name} (${newDbMsg.sender_role})`,
            });
          }
        }

        // 5. Build formatted message
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
          isRead: isActivelyViewing,
          readAt: isActivelyViewing ? new Date().toISOString() : undefined,
          deliveryStatus: isActivelyViewing ? 'seen' : isFromMe ? 'delivered' : 'delivered',
        };

        const draftMsgs = isViewingDraftWithSender
          ? state.messages[`draft-${newDbMsg.sender_id}`] || []
          : [];
        const existingList = [...(state.messages[convId] || []), ...draftMsgs];
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

        // 6. Update store state with updated conversation preview and new message atomically
        set((s) => ({
          activeConversationId: isViewingDraftWithSender ? convId : s.activeConversationId,
          messages: {
            ...s.messages,
            [convId]: nextList,
            ...(isViewingDraftWithSender ? { [`draft-${newDbMsg.sender_id}`]: [] } : {}),
          },
          conversations: currentConvs
            .map((c) =>
              c.id === convId
                ? {
                    ...c,
                    lastMessage: `${formattedMsg.senderName}: ${formattedMsg.message}`,
                    lastTimestamp: 'Just now',
                    lastActivityAt: formattedMsg.createdAt || new Date().toISOString(),
                    unreadCount: isActivelyViewing ? 0 : (c.unreadCount || 0) + (isFromMe ? 0 : 1),
                    isDraft: false,
                  }
                : c
            )
            .sort((a, b) => {
              const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
              const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
              return timeB - timeA;
            }),
        }));
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

      onParticipantInsert: async (participant: any) => {
        const authUser = useAuthStore.getState().currentUser;
        if (participant?.user_id && participant.user_id === authUser?.id) {
          // Current user was added to a new conversation (DM)
          const updatedConvs = await chatApi.fetchConversations(authUser?.id);
          const cleanFresh = updatedConvs.filter(
            (c) => !(c.type === 'dm' && authUser?.id && c.counterpartId === authUser.id)
          );
          set({ conversations: cleanFresh });
        }
      },

      onUserUpdate: async () => {
        // Staff member updated or clocked in/out
        const roster = await chatApi.getActiveStaffRoster();
        set({ activeStaffRoster: roster });
      },

      onPresenceSync: (onlineIds: string[]) => {
        const authUser = useAuthStore.getState().currentUser;
        // Merge with current logged-in user so current user is always online
        const combined = authUser?.id
          ? Array.from(new Set([...onlineIds, authUser.id]))
          : onlineIds;
        set({ onlineUserIds: combined });
      },

      onStatusChange: (status) => {
        const connected = status === 'SUBSCRIBED';
        set({ isRealtimeConnected: connected });
        if (connected) {
          get().trackCurrentPresence();
        }
      },
    });

    realtimeUnsub = unsub;
    set({ isRealtimeConnected: true });

    // Setup periodic presence heartbeat every 30 seconds
    if (presenceHeartbeat) {
      clearInterval(presenceHeartbeat);
    }
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

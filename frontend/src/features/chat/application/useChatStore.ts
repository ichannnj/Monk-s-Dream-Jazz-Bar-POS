import { create } from 'zustand';
import { ChatConversation, ChatMessage, PinnedAnnouncement } from '../domain/chat.types';
import { SEED_CONVERSATIONS, SEED_MESSAGES } from '../data/chat.mock';

interface ChatStoreState {
  conversations: ChatConversation[];
  messages: Record<string, ChatMessage[]>;
  activeConversationId: string;

  setActiveConversation: (id: string) => void;
  sendMessage: (
    conversationId: string,
    message: string,
    senderName: string,
    senderRole: string
  ) => void;
  sendSystemMessage: (conversationId: string, message: string) => void;
  pinAnnouncement: (conversationId: string, announcement: PinnedAnnouncement) => void;
  unpinAnnouncement: (conversationId: string) => void;
  markConversationRead: (conversationId: string) => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  conversations: SEED_CONVERSATIONS,
  messages: SEED_MESSAGES,
  activeConversationId: 'foh',

  setActiveConversation: (id: string) => {
    set((state) => {
      if (state.activeConversationId === id) {
        const target = state.conversations.find((c) => c.id === id);
        if (!target || target.unreadCount === 0) return state;
      }
      const target = state.conversations.find((c) => c.id === id);
      if (!target) return state;
      const updatedConversations = state.conversations.map((c) =>
        c.id === id && c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c
      );
      return {
        activeConversationId: id,
        conversations: updatedConversations,
      };
    });
  },

  sendMessage: (
    conversationId: string,
    message: string,
    senderName: string,
    senderRole: string
  ) => {
    const timeStr = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderName,
      senderRole,
      message,
      timestamp: timeStr,
    };

    set((state) => {
      const currentMsgs = state.messages[conversationId] || [];
      const updatedConversations = state.conversations.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: `${senderName}: ${message}`,
            lastTimestamp: 'Just now',
          };
        }
        return c;
      });

      return {
        messages: {
          ...state.messages,
          [conversationId]: [...currentMsgs, newMsg],
        },
        conversations: updatedConversations,
      };
    });
  },

  sendSystemMessage: (conversationId: string, message: string) => {
    const timeStr = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    const newMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      conversationId,
      senderName: 'System',
      senderRole: 'POS Dispatcher',
      message,
      timestamp: timeStr,
      isSystem: true,
    };

    set((state) => {
      const currentMsgs = state.messages[conversationId] || [];
      const updatedConversations = state.conversations.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: `System: ${message}`,
            lastTimestamp: 'Just now',
          };
        }
        return c;
      });

      return {
        messages: {
          ...state.messages,
          [conversationId]: [...currentMsgs, newMsg],
        },
        conversations: updatedConversations,
      };
    });
  },

  pinAnnouncement: (conversationId: string, announcement: PinnedAnnouncement) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, pinnedMessage: announcement } : c
      ),
    }));
  },

  unpinAnnouncement: (conversationId: string) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, pinnedMessage: undefined } : c
      ),
    }));
  },

  markConversationRead: (conversationId: string) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    }));
  },
}));

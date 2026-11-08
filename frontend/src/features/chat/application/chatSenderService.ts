import { ChatConversation, ChatMessage } from '../domain/chat.types';
import { chatApi, StaffChatUser } from '../data/chat.api';
import { toast } from '@/features/shared/toast/useToastStore';
import { useAuthStore } from '@/features/auth';
import { sortConversationsByActivity } from './chatChannelHelpers';

export async function executeSendMessage({
  conversationId,
  message,
  senderName,
  senderRole,
  senderId,
  conversations,
  activeStaffRoster,
  messages,
  set,
}: {
  conversationId: string;
  message: string;
  senderName: string;
  senderRole: string;
  senderId?: string;
  conversations: ChatConversation[];
  activeStaffRoster: StaffChatUser[];
  messages: Record<string, ChatMessage[]>;
  set: (updater: (s: any) => any) => void;
}) {
  let targetConversationId = conversationId;
  const targetConv = conversations.find((c) => c.id === conversationId);

  if (targetConv?.isDraft || conversationId.startsWith('draft-')) {
    const counterpartId = targetConv?.counterpartId || conversationId.replace('draft-', '');
    const colleague = activeStaffRoster.find((u) => u.id === counterpartId) || {
      id: counterpartId,
      username: counterpartId,
      displayName: targetConv?.title || 'Staff',
      role: 'staff',
      isActive: true,
    };

    const effectiveSenderId =
      senderId || useAuthStore.getState().currentUser?.id || '11111111-1111-1111-1111-111111111111';

    const realConv = await chatApi.getOrCreateDirectConversation(effectiveSenderId, colleague);
    if (realConv) {
      targetConversationId = realConv.id;
      set((state: any) => ({
        conversations: state.conversations.map((c: any) =>
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
  const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

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

  set((state: any) => {
    const currentList = state.messages[targetConversationId] || [];
    const updatedConvs = sortConversationsByActivity(
      state.conversations.map((c: any) =>
        c.id === targetConversationId
          ? {
              ...c,
              lastMessage: `${senderName}: ${message}`,
              lastTimestamp: 'Just now',
              lastActivityAt: new Date().toISOString(),
            }
          : c
      )
    );

    return {
      messages: {
        ...state.messages,
        [targetConversationId]: [...currentList, optimisticMsg],
      },
      conversations: updatedConvs,
    };
  });

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
      set((state: any) => {
        const list = state.messages[targetConversationId] || [];
        return {
          messages: {
            ...state.messages,
            [targetConversationId]: list.map((m: any) =>
              m.id === tempId
                ? { ...persisted, clientTempId: tempId, deliveryStatus: 'delivered' }
                : m
            ),
          },
        };
      });
    }
  } catch {
    set((state: any) => {
      const list = state.messages[targetConversationId] || [];
      return {
        messages: {
          ...state.messages,
          [targetConversationId]: list.map((m: any) =>
            m.id === tempId ? { ...m, deliveryStatus: 'error' } : m
          ),
        },
      };
    });
    toast.error('Failed to send message. Please retry.', { title: 'Network Error' });
  }
}

export async function executeSendSystemMessage({
  conversationId,
  message,
  set,
}: {
  conversationId: string;
  message: string;
  set: (updater: (s: any) => any) => void;
}) {
  const tempId = `sys-temp-${Date.now()}`;
  const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

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

  set((state: any) => ({
    messages: {
      ...state.messages,
      [conversationId]: [...(state.messages[conversationId] || []), optimisticMsg],
    },
  }));

  const persisted = await chatApi.insertChatMessage({
    conversationId,
    senderName: 'System',
    senderRole: 'POS Dispatcher',
    message,
    isSystem: true,
  });

  if (persisted) {
    set((state: any) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m: any) =>
          m.id === tempId ? { ...persisted, deliveryStatus: 'sent' } : m
        ),
      },
    }));
  }
}

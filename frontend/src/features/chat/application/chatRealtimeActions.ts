import { ChatConversation, ChatMessage } from '../domain/chat.types';
import { chatApi } from '../data/chat.api';
import { toast } from '@/features/shared/toast/useToastStore';
import { useAuthStore } from '@/features/auth';

export function handleIncomingRealtimeMessage({
  newDbMsg,
  state,
  set,
}: {
  newDbMsg: any;
  state: any;
  set: (updater: (s: any) => any) => void;
}) {
  if (!newDbMsg || !newDbMsg.conversation_id) return;
  const convId = newDbMsg.conversation_id;

  const authUser = useAuthStore.getState().currentUser;
  const isFromMe =
    (authUser?.id && newDbMsg.sender_id === authUser.id) ||
    (authUser?.displayName &&
      newDbMsg.sender_name?.trim().toLowerCase() === authUser.displayName.trim().toLowerCase());

  const isViewingDraftWithSender =
    !isFromMe &&
    !!newDbMsg.sender_id &&
    (state.activeConversationId === `draft-${newDbMsg.sender_id}` ||
      state.conversations.find((c: any) => c.id === state.activeConversationId)?.counterpartId ===
        newDbMsg.sender_id);

  const isActivelyViewing =
    state.isChatViewActive && (state.activeConversationId === convId || isViewingDraftWithSender);

  let currentConvs = [...state.conversations];
  let convFound = currentConvs.find((c: any) => c.id === convId);

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

    chatApi
      .fetchConversations(authUser?.id)
      .then((fresh) => {
        if (fresh && fresh.length > 0) {
          const cleanFresh = fresh.filter(
            (c) => !(c.type === 'dm' && authUser?.id && c.counterpartId === authUser.id)
          );
          set((s) => ({
            conversations: cleanFresh.map((fc) => {
              const existingInStore = s.conversations.find((ec: any) => ec.id === fc.id);
              return existingInStore ? { ...fc, unreadCount: existingInStore.unreadCount } : fc;
            }),
          }));
        }
      })
      .catch(() => {});
  }

  if (isViewingDraftWithSender) {
    currentConvs = currentConvs.filter((c: any) => c.id !== `draft-${newDbMsg.sender_id}`);
  }

  const timeStr = new Date(newDbMsg.created_at || Date.now()).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (!isFromMe) {
    if (isActivelyViewing) {
      chatApi.markMessagesAsRead(convId, authUser?.id);
    } else {
      toast.info(newDbMsg.message, {
        title: `💬 ${newDbMsg.sender_name} (${newDbMsg.sender_role})`,
      });
    }
  }

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
    deliveryStatus: isFromMe ? 'sent' : 'delivered',
  };

  const existingList = state.messages[convId] || [];
  const optimisticMatchIdx = existingList.findIndex(
    (m: any) =>
      m.id.startsWith('temp-') &&
      m.message === formattedMsg.message &&
      (m.senderName === formattedMsg.senderName || m.senderId === formattedMsg.senderId)
  );

  let nextList: ChatMessage[];
  if (optimisticMatchIdx !== -1) {
    nextList = existingList.map((m: any, idx: number) =>
      idx === optimisticMatchIdx
        ? {
            ...formattedMsg,
            clientTempId: m.clientTempId || m.id,
          }
        : m
    );
  } else {
    nextList = [...existingList, formattedMsg];
  }

  set((s: any) => ({
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
}

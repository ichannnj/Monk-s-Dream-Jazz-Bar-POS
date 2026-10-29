export type ChatConversationType = 'channel' | 'dm';
export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'seen' | 'error';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId?: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
  createdAt?: string;
  isSystem?: boolean;
  isPinned?: boolean;
  isRead?: boolean;
  readAt?: string;
  deliveryStatus?: MessageDeliveryStatus;
  clientTempId?: string;
}

export interface PinnedAnnouncement {
  author: string;
  text: string;
  timestamp?: string;
}

export interface ChatConversation {
  id: string;
  slug?: string;
  title: string;
  subtitle?: string;
  type: ChatConversationType;
  avatarText: string;
  unreadCount: number;
  lastMessage?: string;
  lastTimestamp?: string;
  lastActivityAt?: string;
  memberCount?: number;
  pinnedMessage?: PinnedAnnouncement;
  participantIds?: string[];
  counterpartId?: string;
  isDraft?: boolean;
}

export type ChatConversationType = 'channel' | 'dm';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId?: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
  isPinned?: boolean;
}

export interface PinnedAnnouncement {
  author: string;
  text: string;
  timestamp?: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  subtitle?: string;
  type: ChatConversationType;
  avatarText: string;
  unreadCount: number;
  lastMessage?: string;
  lastTimestamp?: string;
  memberCount?: number;
  pinnedMessage?: PinnedAnnouncement;
}

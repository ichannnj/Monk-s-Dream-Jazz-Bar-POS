import { ChatConversation, ChatMessage, PinnedAnnouncement } from '../domain/chat.types';
import { StaffChatUser } from '../data/chat.api';

export interface ChatStoreState {
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

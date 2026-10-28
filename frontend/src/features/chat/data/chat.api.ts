import { supabase } from '@/features/shared/infrastructure/supabase';
import { ChatConversation, ChatMessage } from '../domain/chat.types';

export interface StaffChatUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
  isActive: boolean;
}

const formatFriendlyTimestamp = (dateInput: string | Date): string => {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Just now';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Just now';
  }
};

export const chatApi = {
  /**
   * Fetches the active venue staff roster from Supabase for Team Chat DMs and presence.
   */
  async getActiveStaffRoster(): Promise<StaffChatUser[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, role, avatar_url, is_active')
        .eq('is_active', true)
        .order('display_name', { ascending: true });

      if (error) {
        console.warn('Failed to fetch staff roster from Supabase:', error);
        return [];
      }

      return ((data as any[]) || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        role: u.role,
        avatarUrl: u.avatar_url,
        isActive: u.is_active,
      }));
    } catch (err) {
      console.warn('chatApi.getActiveStaffRoster exception:', err);
      return [];
    }
  },

  /**
   * Fetches all visible conversations (preset channels + DMs user participates in)
   */
  async fetchConversations(currentUserId?: string): Promise<ChatConversation[]> {
    try {
      // 1. Fetch channels
      const { data: channelsData, error: channelsError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('type', 'channel')
        .order('created_at', { ascending: true });

      if (channelsError) {
        console.warn('Error fetching chat channels:', channelsError);
      }

      // 2. Fetch DMs for current user if user ID is known
      let dmsData: any[] = [];
      if (currentUserId) {
        const { data: userDms, error: dmsError } = await supabase
          .from('chat_participants')
          .select('conversation_id, chat_conversations(*)')
          .eq('user_id', currentUserId);

        if (!dmsError && userDms) {
          dmsData = userDms
            .map((item: any) => item.chat_conversations)
            .filter((c: any) => c && c.type === 'dm');
        }
      }

      const allRaw = [...((channelsData as any[]) || []), ...dmsData];

      // 3. For each conversation, query the latest message to show last message and timestamp
      const conversations: ChatConversation[] = await Promise.all(
        allRaw.map(async (raw: any) => {
          let unreadQuery = supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', raw.id)
            .eq('is_read', false);

          if (currentUserId) {
            unreadQuery = unreadQuery.neq('sender_id', currentUserId);
          }

          const [{ data: latestMsgs }, { count: unreadCountResult }] = await Promise.all([
            supabase
              .from('chat_messages')
              .select('message, sender_name, created_at')
              .eq('conversation_id', raw.id)
              .order('created_at', { ascending: false })
              .limit(1),
            unreadQuery,
          ]);

          const latest = latestMsgs && latestMsgs.length > 0 ? latestMsgs[0] : null;

          return {
            id: raw.id,
            slug: raw.slug || undefined,
            title: raw.title,
            subtitle: raw.subtitle || undefined,
            type: raw.type as 'channel' | 'dm',
            avatarText: raw.avatar_text,
            unreadCount: unreadCountResult || 0,
            lastMessage: latest ? `${latest.sender_name}: ${latest.message}` : undefined,
            lastTimestamp: latest ? formatFriendlyTimestamp(latest.created_at) : undefined,
            lastActivityAt: latest?.created_at || raw.created_at || undefined,
            memberCount: raw.type === 'channel' ? 6 : 2,
            pinnedMessage:
              raw.pinned_text && raw.pinned_author
                ? {
                    author: raw.pinned_author,
                    text: raw.pinned_text,
                    timestamp: raw.pinned_at ? formatFriendlyTimestamp(raw.pinned_at) : undefined,
                  }
                : undefined,
          };
        })
      );

      // Sort conversations so that the ones with the latest activity appear at the top
      conversations.sort((a, b) => {
        const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return timeB - timeA;
      });

      return conversations;
    } catch (err) {
      console.warn('chatApi.fetchConversations exception:', err);
      return [];
    }
  },

  /**
   * Fetches messages for a given conversation ordered chronologically (oldest to newest)
   */
  async fetchMessages(conversationId: string, limit: number = 100): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.warn('chatApi.fetchMessages error:', error);
        return [];
      }

      return ((data as any[]) || []).map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id || undefined,
        senderName: m.sender_name,
        senderRole: m.sender_role,
        message: m.message,
        timestamp: formatFriendlyTimestamp(m.created_at),
        createdAt: m.created_at,
        isSystem: m.is_system,
        isRead: !!m.is_read,
        readAt: m.read_at || undefined,
        deliveryStatus: m.is_read ? 'seen' : 'delivered',
      }));
    } catch (err) {
      console.warn('chatApi.fetchMessages exception:', err);
      return [];
    }
  },

  /**
   * Marks unread messages in a conversation as read by the receiver
   */
  async markMessagesAsRead(conversationId: string, currentUserId?: string): Promise<void> {
    try {
      let query = supabase
        .from('chat_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('conversation_id', conversationId)
        .eq('is_read', false);

      if (currentUserId) {
        // Only mark messages sent by others as read
        query = query.neq('sender_id', currentUserId);
      }

      await query;
    } catch (err) {
      console.warn('chatApi.markMessagesAsRead exception:', err);
    }
  },

  /**
   * Inserts a new chat message into PostgreSQL and updates conversation timestamp
   */
  async insertChatMessage(payload: {
    conversationId: string;
    senderId?: string;
    senderName: string;
    senderRole: string;
    message: string;
    isSystem?: boolean;
  }): Promise<ChatMessage | null> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: payload.conversationId,
          sender_id: payload.senderId || null,
          sender_name: payload.senderName,
          sender_role: payload.senderRole,
          message: payload.message,
          is_system: !!payload.isSystem,
        })
        .select()
        .single();

      if (error) {
        console.warn('chatApi.insertChatMessage error:', error);
        return null;
      }

      // Update conversation updated_at
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', payload.conversationId);

      return {
        id: (data as any).id,
        conversationId: (data as any).conversation_id,
        senderId: (data as any).sender_id || undefined,
        senderName: (data as any).sender_name,
        senderRole: (data as any).sender_role,
        message: (data as any).message,
        timestamp: formatFriendlyTimestamp((data as any).created_at),
        createdAt: (data as any).created_at,
        isSystem: (data as any).is_system,
        deliveryStatus: 'sent',
      };
    } catch (err) {
      console.warn('chatApi.insertChatMessage exception:', err);
      return null;
    }
  },

  /**
   * Finds or creates a 1-on-1 direct message conversation between two staff members
   */
  async getOrCreateDirectConversation(
    currentUserId: string,
    colleague: StaffChatUser
  ): Promise<ChatConversation | null> {
    try {
      // Find existing DM with both participants
      const { data: myParticipations } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId);

      if (myParticipations && myParticipations.length > 0) {
        const convIds = myParticipations.map((p: any) => p.conversation_id);
        const { data: shared } = await supabase
          .from('chat_participants')
          .select('conversation_id, chat_conversations(*)')
          .in('conversation_id', convIds)
          .eq('user_id', colleague.id);

        if (shared && shared.length > 0 && shared[0].chat_conversations) {
          const raw = shared[0].chat_conversations as any;
          return {
            id: raw.id,
            slug: raw.slug || undefined,
            title: raw.title,
            subtitle: raw.subtitle || undefined,
            type: 'dm',
            avatarText: raw.avatar_text,
            unreadCount: 0,
            memberCount: 2,
          };
        }
      }

      // If none found, create a new DM conversation
      const initials = colleague.displayName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const { data: newConv, error: createError } = await supabase
        .from('chat_conversations')
        .insert({
          title: colleague.displayName,
          subtitle: `Direct Message · ${colleague.role}`,
          type: 'dm',
          avatar_text: initials || 'DM',
        })
        .select()
        .single();

      if (createError || !newConv) {
        console.warn('Failed to create new DM conversation:', createError);
        return null;
      }

      // Add both participants
      await supabase.from('chat_participants').insert([
        { conversation_id: (newConv as any).id, user_id: currentUserId },
        { conversation_id: (newConv as any).id, user_id: colleague.id },
      ]);

      return {
        id: (newConv as any).id,
        title: (newConv as any).title,
        subtitle: (newConv as any).subtitle || undefined,
        type: 'dm',
        avatarText: (newConv as any).avatar_text,
        unreadCount: 0,
        memberCount: 2,
      };
    } catch (err) {
      console.warn('chatApi.getOrCreateDirectConversation exception:', err);
      return null;
    }
  },

  /**
   * Pins an announcement to a conversation in Supabase
   */
  async pinAnnouncement(conversationId: string, author: string, text: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({
          pinned_author: author,
          pinned_text: text,
          pinned_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      return !error;
    } catch (err) {
      console.warn('chatApi.pinAnnouncement exception:', err);
      return false;
    }
  },

  /**
   * Unpins an announcement from a conversation in Supabase
   */
  async unpinAnnouncement(conversationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({
          pinned_author: null,
          pinned_text: null,
          pinned_at: null,
        })
        .eq('id', conversationId);

      return !error;
    } catch (err) {
      console.warn('chatApi.unpinAnnouncement exception:', err);
      return false;
    }
  },
};

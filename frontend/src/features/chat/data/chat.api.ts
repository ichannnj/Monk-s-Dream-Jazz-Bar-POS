import { supabase } from '@/features/shared/infrastructure/supabase';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';
import { ChatConversation, ChatMessage } from '../domain/chat.types';

export interface StaffChatUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
  isActive: boolean;
}

export const formatRelativeElapsed = (dateInput?: string | Date | null): string => {
  if (!dateInput) return 'Just now';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Just now';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return 'Just now';
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;

    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Just now';
  }
};

export const formatFriendlyTimestamp = formatRelativeElapsed;

const CANONICAL_VENUE_STAFF: StaffChatUser[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'miles_manager',
    displayName: 'Miles (Manager)',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    isActive: true,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'coltrane_cashier',
    displayName: 'Coltrane (Cashier)',
    role: 'cashier',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    isActive: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'ella_waiter',
    displayName: 'Ella (Floor Waiter)',
    role: 'waiter',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    isActive: true,
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    username: 'monk_bar',
    displayName: 'Thelonious (Bartender)',
    role: 'station_bar',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    isActive: true,
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    username: 'bill_cafe',
    displayName: 'Bill (Barista)',
    role: 'station_cafe',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
    isActive: true,
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    username: 'chet_kitchen',
    displayName: 'Chet (Head Chef)',
    role: 'station_food',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    isActive: true,
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    username: 'max_runner',
    displayName: 'Max (FOH Runner)',
    role: 'foh_runner',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    isActive: true,
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    username: 'rosa_dish',
    displayName: 'Rosa (Dishwasher)',
    role: 'waiter',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    isActive: false,
  },
  {
    id: '99999999-9999-9999-9999-999999999999',
    username: 'marcus_sound',
    displayName: 'Marcus (Sound Tech)',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    isActive: false,
  },
];

export const chatApi = {
  /**
   * Fetches all venue staff (active and inactive) from Supabase for Team Chat DMs and presence,
   * with fallback to canonical jazz bar staff if offline.
   */
  async getActiveStaffRoster(): Promise<StaffChatUser[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, role, avatar_url, is_active')
        .order('display_name', { ascending: true });

      if (error || !data || data.length === 0) {
        if (error)
          console.warn('Failed to fetch staff roster from Supabase, using fallback:', error);
        return CANONICAL_VENUE_STAFF;
      }

      return ((data as any[]) || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        role: u.role,
        avatarUrl: u.avatar_url,
        isActive: !!u.is_active,
      }));
    } catch (err) {
      console.warn('chatApi.getActiveStaffRoster exception, using fallback:', err);
      return CANONICAL_VENUE_STAFF;
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

      // 3. For each DM, resolve counterpart participant so the title is always the other user
      const dmCounterparts = new Map<
        string,
        { id: string; displayName: string; role: string; avatarUrl?: string }
      >();
      if (dmsData.length > 0 && currentUserId) {
        const dmIds = dmsData.map((d: any) => d.id);
        const { data: participantsData } = await supabase
          .from('chat_participants')
          .select('conversation_id, user_id, users(id, display_name, role, avatar_url)')
          .in('conversation_id', dmIds)
          .neq('user_id', currentUserId);

        if (participantsData) {
          participantsData.forEach((p: any) => {
            if (p.users) {
              dmCounterparts.set(p.conversation_id, {
                id: p.users.id,
                displayName: p.users.display_name,
                role: p.users.role,
                avatarUrl: p.users.avatar_url,
              });
            }
          });
        }
      }

      const allRaw = [...((channelsData as any[]) || []), ...dmsData];

      // 4. For each conversation, query the latest message to show last message and timestamp
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

          let title = raw.title;
          let subtitle = raw.subtitle || undefined;
          let avatarText = raw.avatar_text;
          const counterpart = raw.type === 'dm' ? dmCounterparts.get(raw.id) : undefined;

          if (counterpart) {
            title = counterpart.displayName;
            subtitle = `Direct Message · ${counterpart.role.replace('_', ' ')}`;
            const initials = counterpart.displayName
              .split(' ')
              .map((p: string) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            avatarText = initials || 'DM';
          }

          return {
            id: raw.id,
            slug: raw.slug || undefined,
            title,
            subtitle,
            type: raw.type as 'channel' | 'dm',
            avatarText,
            counterpartId: counterpart?.id,
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

      // Broadcast immediately across all tablets on pos_chat_sync for zero-latency delivery
      try {
        await realtimeGateway.broadcastChatMessage(data);
      } catch (broadcastErr) {
        console.warn('broadcastChatMessage error:', broadcastErr);
      }

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
      if (!currentUserId || !colleague?.id || currentUserId === colleague.id) {
        console.warn('Cannot create DM conversation with oneself or missing user IDs');
        return null;
      }

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
          const initials = colleague.displayName
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return {
            id: raw.id,
            slug: raw.slug || undefined,
            title: colleague.displayName,
            subtitle: `Direct Message · ${colleague.role.replace('_', ' ')}`,
            type: 'dm',
            avatarText: initials || raw.avatar_text || 'DM',
            counterpartId: colleague.id,
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
        title: colleague.displayName,
        subtitle: `Direct Message · ${colleague.role.replace('_', ' ')}`,
        type: 'dm',
        avatarText: initials || 'DM',
        counterpartId: colleague.id,
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

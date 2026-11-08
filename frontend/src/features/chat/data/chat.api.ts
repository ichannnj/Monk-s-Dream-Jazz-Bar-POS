import { supabase } from '@/features/shared/infrastructure/supabase';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';
import { ChatConversation, ChatMessage } from '../domain/chat.types';
import { StaffChatUser, formatRelativeElapsed, formatFriendlyTimestamp } from './chatFormatters';
import { chatDmAndRosterApi } from './chatDmAndRoster.api';

export { StaffChatUser, formatRelativeElapsed, formatFriendlyTimestamp };

export const chatApi = {
  ...chatDmAndRosterApi,

  async fetchConversations(currentUserId?: string): Promise<ChatConversation[]> {
    try {
      const { data: channelsData, error: channelsError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('type', 'channel')
        .order('created_at', { ascending: true });

      if (channelsError) console.warn('Error fetching chat channels:', channelsError);

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

      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', payload.conversationId);

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
};

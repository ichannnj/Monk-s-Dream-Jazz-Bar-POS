import { supabase } from '@/features/shared/infrastructure/supabase';
import { ChatConversation } from '../domain/chat.types';
import { StaffChatUser, CANONICAL_VENUE_STAFF } from './chatFormatters';

export const chatDmAndRosterApi = {
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
        query = query.neq('sender_id', currentUserId);
      }

      await query;
    } catch (err) {
      console.warn('chatApi.markMessagesAsRead exception:', err);
    }
  },

  async getOrCreateDirectConversation(
    currentUserId: string,
    colleague: StaffChatUser
  ): Promise<ChatConversation | null> {
    try {
      if (!currentUserId || !colleague?.id || currentUserId === colleague.id) {
        console.warn('Cannot create DM conversation with oneself or missing user IDs');
        return null;
      }

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

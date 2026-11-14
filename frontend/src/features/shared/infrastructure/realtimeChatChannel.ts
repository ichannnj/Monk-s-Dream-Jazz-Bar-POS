import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { ChatRealtimeCallbacks } from './realtime.types';

export const subscribeChatMessagesChannel = (
  channels: Map<string, RealtimeChannel>,
  callbacks: ChatRealtimeCallbacks
): (() => void) => {
  const channelName = 'pos_chat_sync';
  const existing = channels.get(channelName);
  if (existing) {
    existing.unsubscribe();
    supabase.removeChannel(existing);
    channels.delete(channelName);
  }

  const matched = supabase
    .getChannels()
    .find((c) => c.topic === `realtime:${channelName}` || c.topic === channelName);
  if (matched) {
    matched.unsubscribe();
    supabase.removeChannel(matched);
  }

  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'chat:new_message' }, (event) => {
      if (event.payload) {
        callbacks.onInsert(event.payload);
      }
    })
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      },
      (payload) => {
        callbacks.onInsert(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
      },
      (payload) => {
        callbacks.onUpdate(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_conversations',
      },
      (payload) => {
        callbacks.onConversationUpdate?.(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_participants',
      },
      (payload) => {
        callbacks.onParticipantInsert?.(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users',
      },
      (payload) => {
        callbacks.onUserUpdate?.(payload.new);
      }
    )
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const ids: string[] = [];
      Object.values(state).forEach((presences: any) => {
        if (Array.isArray(presences)) {
          presences.forEach((p) => {
            if (p?.user_id) ids.push(p.user_id);
          });
        }
      });
      callbacks.onPresenceSync?.(Array.from(new Set(ids)));
    })
    .subscribe((status, err) => {
      if (err) {
        console.warn('[RealtimeGateway] pos_chat_sync error:', err);
      }
      callbacks.onStatusChange?.(status);
    });

  channels.set(channelName, channel);

  return () => {
    channel.unsubscribe();
    supabase.removeChannel(channel);
    channels.delete(channelName);
  };
};

export const trackChatPresenceOnChannel = async (
  channels: Map<string, RealtimeChannel>,
  user: { id: string; displayName?: string; role?: string }
): Promise<void> => {
  const channelName = 'pos_chat_sync';
  const channel = channels.get(channelName);
  if (channel && user?.id) {
    try {
      await channel.track({
        user_id: user.id,
        display_name: user.displayName || 'Staff',
        role: user.role || 'Staff',
        online_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[RealtimeGateway] trackChatPresence exception:', err);
    }
  }
};

export const broadcastChatMessageOnChannel = async (
  channels: Map<string, RealtimeChannel>,
  safeSend: (channel: RealtimeChannel, msg: any) => Promise<any>,
  payload: any
): Promise<void> => {
  const channelName = 'pos_chat_sync';
  let channel = channels.get(channelName);
  if (!channel) {
    channel = supabase.channel(channelName);
    channels.set(channelName, channel);
  }
  await safeSend(channel, {
    type: 'broadcast',
    event: 'chat:new_message',
    payload,
  });
};

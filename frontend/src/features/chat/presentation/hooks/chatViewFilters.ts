import { StaffChatUser } from '../../data/chat.api';
import { ChatConversation } from '../../domain/chat.types';

export function resolveUserStationChannelSlug(
  defaultChannel: string | undefined,
  role: string | undefined
): string | null {
  if (defaultChannel && defaultChannel !== 'all') {
    return defaultChannel;
  }
  switch (role) {
    case 'barista':
    case 'station_cafe':
      return 'cafe';
    case 'bartender':
    case 'station_bar':
      return 'bar';
    case 'kitchen':
    case 'station_food':
      return 'kitchen';
    case 'foh_runner':
    case 'waiter':
    case 'cashier':
      return 'foh';
    case 'admin':
      return null;
    default:
      return 'foh';
  }
}

export function filterStationChannels(
  conversations: ChatConversation[],
  userStationChannelSlug: string | null,
  role: string | undefined
): ChatConversation[] {
  return conversations
    .filter((c) => {
      if (c.type !== 'channel') return false;
      if (userStationChannelSlug) {
        return c.slug === userStationChannelSlug || c.id === userStationChannelSlug;
      }
      return role === 'admin';
    })
    .sort((a, b) => {
      const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return timeB - timeA;
    });
}

export function filterDirectMessages(
  conversations: ChatConversation[],
  currentUserId?: string
): ChatConversation[] {
  return conversations
    .filter((c) => {
      if (c.type !== 'dm') return false;
      if (c.counterpartId && currentUserId && c.counterpartId === currentUserId) return false;
      return true;
    })
    .sort((a, b) => {
      const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return timeB - timeA;
    });
}

export function filterAvailableColleagues(
  activeStaffRoster: StaffChatUser[],
  directMessages: ChatConversation[],
  currentUserId: string | undefined,
  currentSenderName: string,
  username: string | undefined,
  isAdmin: boolean
): StaffChatUser[] {
  const myId = currentUserId;
  const myName = currentSenderName.trim().toLowerCase();
  const myUsername = username?.trim().toLowerCase();

  const colleagues = activeStaffRoster.filter((u) => {
    if (myId && u.id === myId) return false;
    if (u.displayName.trim().toLowerCase() === myName) return false;
    if (myUsername && u.username.trim().toLowerCase() === myUsername) return false;
    if (
      isAdmin &&
      (u.displayName.toLowerCase().includes('miles') || u.username === 'miles_manager')
    ) {
      return false;
    }
    return true;
  });

  return colleagues.filter((colleague) => {
    return !directMessages.some(
      (dm) =>
        dm.counterpartId === colleague.id ||
        dm.title.toLowerCase().includes(colleague.displayName.toLowerCase()) ||
        colleague.displayName.toLowerCase().includes(dm.title.toLowerCase())
    );
  });
}

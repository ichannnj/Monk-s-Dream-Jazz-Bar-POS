import { ChatConversation } from '../domain/chat.types';
import { StaffChatUser } from '../data/chat.api';

export function filterCleanConversations(
  convs: ChatConversation[],
  currentUserId?: string
): ChatConversation[] {
  return convs.filter((c) => {
    if (c.type === 'dm' && currentUserId && c.counterpartId === currentUserId) {
      return false;
    }
    return true;
  });
}

export function resolveDefaultActiveConversationId(
  cleanConvs: ChatConversation[],
  existingActiveId?: string
): string {
  if (
    !existingActiveId ||
    !cleanConvs.some((c) => c.id === existingActiveId || c.slug === existingActiveId)
  ) {
    const defaultChan = cleanConvs.find((c) => c.slug === 'foh') || cleanConvs[0];
    return defaultChan ? defaultChan.id : '';
  }
  return existingActiveId;
}

export function createDraftConversation(colleague: StaffChatUser): ChatConversation {
  const initials = colleague.displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return {
    id: `draft-${colleague.id}`,
    title: colleague.displayName,
    subtitle: `Direct Message · ${colleague.role.replace('_', ' ')}`,
    type: 'dm',
    avatarText: initials || 'DM',
    unreadCount: 0,
    memberCount: 2,
    counterpartId: colleague.id,
    isDraft: true,
  };
}

export function sortConversationsByActivity(convs: ChatConversation[]): ChatConversation[] {
  return [...convs].sort((a, b) => {
    const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
    return timeB - timeA;
  });
}

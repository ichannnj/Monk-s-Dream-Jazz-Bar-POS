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

export const CANONICAL_VENUE_STAFF: StaffChatUser[] = [
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
    username: 'mingus_bartender',
    displayName: 'Mingus (Bartender)',
    role: 'bartender',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    isActive: true,
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    username: 'monk_barista',
    displayName: 'Thelonious (Barista)',
    role: 'barista',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    isActive: true,
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    username: 'charlie_chef',
    displayName: 'Charlie (Kitchen Chef)',
    role: 'chef',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    isActive: true,
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    username: 'dizzy_runner',
    displayName: 'Dizzy (FOH Runner)',
    role: 'runner',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    isActive: true,
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    username: 'stacy_admin',
    displayName: 'Stacy (Admin)',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    isActive: true,
  },
];

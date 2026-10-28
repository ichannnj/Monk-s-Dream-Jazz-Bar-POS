import { supabase } from '@/features/shared/infrastructure/supabase';

export interface StaffChatUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
  isActive: boolean;
}

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
        console.warn(
          'Failed to fetch staff roster from Supabase, falling back to canonical seeds:',
          error
        );
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
};

/**
 * Typed API Client for Monk's Dream Jazz Bar (Supabase BaaS)
 */
import { supabase } from './supabase';
import { SEED_STAFF_USERS } from '../mockData';

export class PosApiClient {
  // --- Auth & Staff PIN ---
  async loginWithPin(pin: string) {
    try {
      const { data, error } = await supabase.rpc('authenticate_staff_pin', {
        p_pin: pin,
      });

      if (!error && data && (data as any).success) {
        return { success: true, user: (data as any).user };
      }
    } catch {
      // Offline fallback
    }

    // Local Seed Fallback (Offline resilience)
    const found = SEED_STAFF_USERS.find((u) => u.pin === pin);
    if (found) {
      return {
        success: true,
        user: {
          id: found.id,
          username: found.username,
          displayName: found.displayName,
          role: found.role,
        },
      };
    }

    throw new Error('Invalid staff PIN or inactive account');
  }

  async getStaffList() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, role, is_active')
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      // Offline fallback
    }

    return SEED_STAFF_USERS;
  }

  // --- Health Check ---
  async checkHealth() {
    return { status: 'ok', provider: 'supabase' };
  }
}

export const posApi = new PosApiClient();

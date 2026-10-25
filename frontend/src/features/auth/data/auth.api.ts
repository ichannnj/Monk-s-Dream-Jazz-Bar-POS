/**
 * Auth & Staff Credentials API
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 */
import { supabase } from '../../shared/infrastructure/supabase';

export interface AuthStaffUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthStaffUser;
  error?: string;
}

export class AuthApi {
  /**
   * Authenticate staff member with strict Username and 4-digit PIN pairing.
   * Calls PostgreSQL stored procedure `authenticate_staff_credentials`.
   */
  async loginWithCredentials(username: string, pin: string): Promise<AuthResponse> {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanUsername) {
      throw new Error('Staff ID / Username is required.');
    }
    if (!cleanPin || cleanPin.length !== 4) {
      throw new Error('4-digit PIN is required.');
    }

    try {
      const { data, error } = await supabase.rpc('authenticate_staff_credentials', {
        p_username: cleanUsername,
        p_pin: cleanPin,
      });

      if (!error && data && (data as any).success) {
        return { success: true, user: (data as any).user };
      }

      if (data && !(data as any).success) {
        throw new Error((data as any).error || 'Invalid Staff ID or PIN. Access denied.');
      }

      if (error) {
        throw new Error(error.message || 'Invalid Staff ID or PIN. Access denied.');
      }
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('Invalid') ||
          err.message.includes('required') ||
          err.message.includes('denied') ||
          err.message.includes('inactive'))
      ) {
        throw err;
      }
      console.warn('Supabase offline or unreachable, checking local fallback:', err);
    }

    throw new Error('Authentication failed. Please check network connection and credentials.');
  }

  /**
   * Legacy PIN-only RPC (delegates to loginWithCredentials with empty username).
   */
  async loginWithPin(pin: string): Promise<AuthResponse> {
    return this.loginWithCredentials('', pin);
  }

  /**
   * Fetch active staff directory for administrative shift overviews.
   */
  async getStaffList() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, role, is_active')
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch staff from Supabase:', err);
    }

    return [];
  }
}

export const authApi = new AuthApi();

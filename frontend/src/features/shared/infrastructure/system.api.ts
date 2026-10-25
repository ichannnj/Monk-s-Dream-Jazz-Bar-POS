/**
 * System Diagnostics & Health Check API
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 */
import { supabase } from './supabase';

export interface SystemHealthStatus {
  status: 'ok' | 'degraded' | 'offline';
  provider: 'supabase';
  latencyMs?: number;
  timestamp: string;
}

export class SystemApi {
  /**
   * Ping Supabase to verify active cloud BaaS connection and measure roundtrip latency.
   */
  async checkHealth(): Promise<SystemHealthStatus> {
    const start = Date.now();
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      const latencyMs = Date.now() - start;

      if (error) {
        return {
          status: 'degraded',
          provider: 'supabase',
          latencyMs,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        status: 'ok',
        provider: 'supabase',
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'offline',
        provider: 'supabase',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const systemApi = new SystemApi();

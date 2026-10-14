/**
 * Typed REST API Client for Monk's Dream Jazz Bar Cloud Platform (Clean Template)
 */

export class PosApiClient {
  private baseUrl: string;

  constructor(baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`API Error [${res.status}] ${res.statusText}: ${errBody}`);
    }
    return res.json();
  }

  // --- Auth & Staff ---
  async loginWithPin(pin: string) {
    return this.request<{ success: boolean; user: any }>('/api/v1/auth/pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  }

  async getStaffList() {
    return this.request<any[]>('/api/v1/auth/users', {
      method: 'GET',
    });
  }

  // --- Health Check ---
  async checkHealth() {
    return this.request<{ status: string }>('/health/live', {
      method: 'GET',
    });
  }
}

export const posApi = new PosApiClient();

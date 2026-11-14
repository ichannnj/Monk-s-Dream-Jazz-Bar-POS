/**
 * Safe Storage Adapter with Memory Fallback
 * Monk's Dream Jazz Bar POS
 *
 * Provides a synchronous, SSR-safe, exception-proof storage interface.
 * Falls back transparently to an in-memory Map when localStorage is unavailable,
 * throws QuotaExceededError, or is disabled in private browsing modes.
 */

class SafeStorageAdapter {
  private memoryFallback: Map<string, string> = new Map();
  private hasLocalStorage: boolean;

  constructor() {
    this.hasLocalStorage = this.checkLocalStorageSupport();
  }

  private checkLocalStorageSupport(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__monks_storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  public isAvailable(): boolean {
    return this.hasLocalStorage;
  }

  public getItem<T>(key: string, fallback: T): T {
    try {
      let raw: string | null = null;
      if (this.hasLocalStorage) {
        raw = window.localStorage.getItem(key);
      }
      if (raw === null) {
        raw = this.memoryFallback.get(key) ?? null;
      }
      if (raw === null) {
        return fallback;
      }
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  public setItem<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      this.memoryFallback.set(key, serialized);
      if (this.hasLocalStorage) {
        window.localStorage.setItem(key, serialized);
      }
      return true;
    } catch (err) {
      console.warn(`safeStorage.setItem failed for key "${key}":`, err);
      return false;
    }
  }

  public setRaw(key: string, raw: string): void {
    this.memoryFallback.set(key, raw);
    if (this.hasLocalStorage) {
      try {
        window.localStorage.setItem(key, raw);
      } catch {
        // Fallback already updated
      }
    }
  }

  public removeItem(key: string): boolean {
    try {
      this.memoryFallback.delete(key);
      if (this.hasLocalStorage) {
        window.localStorage.removeItem(key);
      }
      return true;
    } catch {
      return false;
    }
  }

  public clear(): void {
    try {
      this.memoryFallback.clear();
      if (this.hasLocalStorage) {
        window.localStorage.clear();
      }
    } catch {
      // Ignored
    }
  }
}

export const safeStorage = new SafeStorageAdapter();

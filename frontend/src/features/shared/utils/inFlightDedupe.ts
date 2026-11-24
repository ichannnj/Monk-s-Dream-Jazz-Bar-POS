/**
 * Monk's Dream Jazz Bar POS - In-Flight Promise Deduplication
 * Guarantees that concurrent triggers with identical keys share a single active Promise,
 * preventing duplicate RPCs, Supabase queries, and export jobs.
 */

const inFlightMap = new Map<string, Promise<unknown>>();

/**
 * Execute a task deduplicated by key.
 * If a task with `key` is currently in-flight, returns the existing Promise.
 * When the Promise resolves or rejects, the key is automatically pruned.
 */
export async function dedupeInFlight<T>(key: string, task: () => Promise<T>): Promise<T> {
  const existing = inFlightMap.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      return await task();
    } finally {
      inFlightMap.delete(key);
    }
  })();

  inFlightMap.set(key, promise);
  return promise;
}

/** Check if a key is currently executing */
export function hasInFlightKey(key: string): boolean {
  return inFlightMap.has(key);
}

/** Manually clear a key (primarily for test cleanup) */
export function clearInFlightKey(key: string): void {
  inFlightMap.delete(key);
}

/** Manually clear all active in-flight deduplications */
export function clearAllInFlight(): void {
  inFlightMap.clear();
}

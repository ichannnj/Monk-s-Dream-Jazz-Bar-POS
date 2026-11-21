/**
 * In-flight tab write serialization tracker.
 * Prevents race conditions between fast consecutive floor actions
 * (e.g., Open Tab -> Dispatch Items -> Immediately Settle or Move Items)
 * and prevents background hydration from clobbering optimistic local items
 * while an order write is still mid-flight to Supabase.
 */

const pendingWritesByKey = new Map<string, Set<Promise<unknown>>>();

export function trackTabWrite<T>(
  keys: Array<string | undefined | null>,
  promise: Promise<T>
): Promise<T> {
  const validKeys = keys.filter((k): k is string => Boolean(k && k.trim().length > 0));
  if (validKeys.length === 0) return promise;

  for (const key of validKeys) {
    let set = pendingWritesByKey.get(key);
    if (!set) {
      set = new Set();
      pendingWritesByKey.set(key, set);
    }
    set.add(promise);
  }

  promise.finally(() => {
    for (const key of validKeys) {
      const set = pendingWritesByKey.get(key);
      if (set) {
        set.delete(promise);
        if (set.size === 0) {
          pendingWritesByKey.delete(key);
        }
      }
    }
  });

  return promise;
}

export async function awaitPendingTabWrites(keys: Array<string | undefined | null>): Promise<void> {
  const validKeys = keys.filter((k): k is string => Boolean(k && k.trim().length > 0));
  const pending: Promise<unknown>[] = [];
  for (const key of validKeys) {
    const set = pendingWritesByKey.get(key);
    if (set) {
      pending.push(...Array.from(set));
    }
  }
  if (pending.length > 0) {
    await Promise.allSettled(pending);
  }
}

export function hasPendingTabWrite(key?: string | null): boolean {
  if (!key) return false;
  const set = pendingWritesByKey.get(key);
  return Boolean(set && set.size > 0);
}

export function isLikelyNetworkError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  if (!msg) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('timeout')
  );
}

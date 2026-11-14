/**
 * Durable Offline Queue Manager
 * Monk's Dream Jazz Bar POS
 *
 * Persists pending mutations to safe client storage with deterministic UUID idempotency
 * keys, preventing transaction loss across network drops, browser refreshes, or device restarts.
 */

import { safeStorage } from '../../shared/infrastructure/storage/safeStorage';
import type { QueuedMutation } from '../domain/order.types';

export const STORAGE_KEY_OFFLINE_QUEUE = 'monks_pos_offline_queue';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Loads all durable queued mutations from client storage.
 */
export function loadDurableQueue(): QueuedMutation[] {
  const queue = safeStorage.getItem<QueuedMutation[]>(STORAGE_KEY_OFFLINE_QUEUE, []);
  if (!Array.isArray(queue)) {
    return [];
  }
  return queue;
}

/**
 * Persists the entire queue array to durable client storage.
 */
export function saveDurableQueue(queue: QueuedMutation[]): void {
  safeStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, queue);
}

/**
 * Enqueues a new mutation with a deterministic UUID idempotency key and timestamp.
 * Appends to persistent storage immediately.
 */
export function enqueueDurableMutation(
  mutation: Omit<QueuedMutation, 'id' | 'timestamp'> & { id?: string; timestamp?: number }
): QueuedMutation {
  const queue = loadDurableQueue();

  const id = mutation.id || generateUuid();
  const timestamp = mutation.timestamp || Date.now();

  const completeMutation: QueuedMutation = {
    ...mutation,
    id,
    timestamp,
    retryCount: mutation.retryCount ?? 0,
  };

  // Prevent duplicate insertion if mutation with same id already exists
  const existingIdx = queue.findIndex((m) => m.id === id);
  if (existingIdx >= 0) {
    queue[existingIdx] = completeMutation;
  } else {
    queue.push(completeMutation);
  }

  saveDurableQueue(queue);
  return completeMutation;
}

/**
 * Removes an executed mutation from durable storage by ID.
 * Returns the remaining queue.
 */
export function dequeueDurableMutation(id: string): QueuedMutation[] {
  const queue = loadDurableQueue();
  const filtered = queue.filter((item) => item.id !== id);
  saveDurableQueue(filtered);
  return filtered;
}

/**
 * Clears the entire durable offline queue from storage.
 */
export function clearDurableQueue(): void {
  safeStorage.removeItem(STORAGE_KEY_OFFLINE_QUEUE);
}

/**
 * Calculates exponential backoff delay with 0-25% random jitter.
 * delay = min(baseMs * 2^retryCount, maxMs) * (1 + jitter)
 */
export function computeBackoffDelay(retryCount: number, baseMs = 1000, maxMs = 30000): number {
  const exponential = Math.min(baseMs * Math.pow(2, retryCount), maxMs);
  const jitter = Math.random() * 0.25; // 0% to 25% jitter
  return Math.floor(exponential * (1 + jitter));
}

/**
 * Checks if a queued mutation is eligible to retry based on its last attempt and backoff window.
 */
export function isItemReadyForRetry(
  mutation: QueuedMutation,
  now: number = Date.now(),
  baseMs = 1000,
  maxMs = 30000
): boolean {
  const retryCount = mutation.retryCount || 0;
  if (retryCount === 0 || !mutation.lastAttemptAt) {
    return true;
  }
  if ((mutation as any).nextRetryAt) {
    return now >= (mutation as any).nextRetryAt;
  }
  const minRequiredDelay = Math.min(baseMs * Math.pow(2, retryCount - 1), maxMs);
  return now - mutation.lastAttemptAt >= minRequiredDelay;
}

/**
 * Records a failed execution attempt on a mutation, incrementing retryCount, applying exponential delay with jitter, and saving to durable storage.
 */
export function recordMutationFailure(
  id: string,
  error: string,
  attemptTime: number = Date.now(),
  baseMs = 1000,
  maxMs = 30000
): QueuedMutation[] {
  const queue = loadDurableQueue();
  const item = queue.find((m) => m.id === id);
  if (item) {
    const currentRetries = item.retryCount || 0;
    item.retryCount = currentRetries + 1;
    item.lastError = error;
    item.lastAttemptAt = attemptTime;
    // Calculate backoff delay with jitter for next scheduled retry window
    const delay = computeBackoffDelay(currentRetries, baseMs, maxMs);
    (item as any).nextRetryAt = attemptTime + delay;
    saveDurableQueue(queue);
  }
  return queue;
}

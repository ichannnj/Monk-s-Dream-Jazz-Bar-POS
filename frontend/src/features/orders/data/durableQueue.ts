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

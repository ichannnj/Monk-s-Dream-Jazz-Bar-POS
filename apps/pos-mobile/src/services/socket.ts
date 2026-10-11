/**
 * Backwards compatibility re-export
 * Dedicated messaging socket is in ./messagingSocket.ts
 * Operations SSE stream is in ./operationsStream.ts
 */
export * from './messagingSocket';
export { getMessagingSocket as getRealtimeSocket } from './messagingSocket';

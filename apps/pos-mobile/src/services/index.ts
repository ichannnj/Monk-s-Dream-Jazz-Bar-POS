// Unified service exports:
// 1. Server-Sent Events (SSE) for Operations (Orders, Tickets, Floor, 86 Items)
export * from './operationsStream';

// 2. WebSockets (Socket.IO) for Two-Way Staff Messaging & Chat
export * from './messagingSocket';

// 3. Typed REST Client for Commands & Hardware Writes
export * from './api';

// 4. Legacy socket alias if needed
export { getMessagingSocket as getRealtimeSocket } from './messagingSocket';

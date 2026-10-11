import { io, Socket } from 'socket.io-client';

/**
 * WebSocket (Socket.IO) Client strictly for two-way Staff Messaging & Chat
 * - Channel communication (#all, #bar, #kitchen, #cafe, #admin)
 * - Emergency 86 broadcasts
 * - Real-time staff text alerts
 */

export interface ChatMessage {
  id: string;
  channel: 'all' | 'bar' | 'cafe' | 'food' | 'admin';
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
  isUrgent: boolean;
  tableContext?: number;
}

let chatSocket: Socket | null = null;

export function getMessagingSocket(serverUrl = 'http://localhost:3000'): Socket {
  if (!chatSocket) {
    chatSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    chatSocket.on('connect', () => {
      console.log('[WebSocket Chat] Connected with ID:', chatSocket?.id);
    });

    chatSocket.on('disconnect', (reason) => {
      console.log('[WebSocket Chat] Disconnected:', reason);
    });
  }

  return chatSocket;
}

/**
 * Join a specific staff chat channel
 */
export function joinChatChannel(channel: 'all' | 'bar' | 'cafe' | 'food' | 'admin', serverUrl?: string) {
  const socket = getMessagingSocket(serverUrl);
  socket.emit('join', `chat:${channel}`);
}

/**
 * Send a chat message over WebSocket
 */
export function sendChatMessage(
  message: {
    channel: 'all' | 'bar' | 'cafe' | 'food' | 'admin';
    senderId: string;
    senderName: string;
    senderRole: string;
    content: string;
    isUrgent?: boolean;
    tableContext?: number;
  },
  serverUrl?: string
) {
  const socket = getMessagingSocket(serverUrl);
  socket.emit('chat.send', {
    ...message,
    isUrgent: message.isUrgent ?? false,
  });
}

/**
 * Subscribe to incoming chat messages
 */
export function onChatMessage(callback: (msg: ChatMessage) => void, serverUrl?: string): () => void {
  const socket = getMessagingSocket(serverUrl);
  const handler = (event: any) => {
    if (event?.payload) {
      callback(event.payload);
    }
  };

  socket.on('chat.message', handler);

  return () => {
    socket.off('chat.message', handler);
  };
}

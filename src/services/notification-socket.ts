import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL, STORAGE_KEYS } from '../config/constants';

function socketOrigin(): string {
  try {
    const u = new URL(API_BASE_URL);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:3000';
  }
}

/**
 * Connects to the Nest `/fleet` namespace for realtime notification events.
 * Push delivery remains provider-based on the server; this is in-app realtime.
 */
export function connectNotificationSocket(opts: {
  userId: string;
  companyId?: string;
  onNotification: (payload: unknown) => void;
}): () => void {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  let socket: Socket | null = io(`${socketOrigin()}/fleet`, {
    transports: ['websocket', 'polling'],
    auth: {
      token,
      userId: opts.userId,
      companyId: opts.companyId,
    },
    query: {
      userId: opts.userId,
      ...(opts.companyId ? { companyId: opts.companyId } : {}),
    },
    autoConnect: true,
    reconnection: true,
  });

  socket.on('connect', () => {
    socket?.emit('subscribe', {
      userId: opts.userId,
      companyId: opts.companyId,
    });
  });

  socket.on('notification:new', opts.onNotification);

  return () => {
    socket?.off('notification:new', opts.onNotification);
    socket?.disconnect();
    socket = null;
  };
}

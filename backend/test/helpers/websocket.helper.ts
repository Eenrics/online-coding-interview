import { io, Socket } from 'socket.io-client';

export interface ConnectOptions {
  baseUrl: string;
  sessionId: string;
  userId: string;
  userName: string;
}

export function createWebSocketClient(options: ConnectOptions): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const client = io(options.baseUrl, {
      transports: ['websocket'],
      reconnection: false,
      query: {
        sessionId: options.sessionId,
        userId: options.userId,
        userName: options.userName,
      },
    });

    const timeout = setTimeout(() => {
      client.disconnect();
      reject(new Error('Connection timeout'));
    }, 5000);

    client.on('connect', () => {
      clearTimeout(timeout);
      resolve(client);
    });

    client.on('connect_error', (error) => {
      clearTimeout(timeout);
      client.disconnect();
      reject(error);
    });
  });
}

export function waitForEvent<T = any>(
  client: Socket,
  eventName: string,
  timeout: number = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      client.off(eventName, handler);
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    const handler = (data: T) => {
      clearTimeout(timeoutId);
      client.off(eventName, handler);
      resolve(data);
    };

    client.on(eventName, handler);
  });
}


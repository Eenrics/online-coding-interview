import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { WebSocketMessage, User, Language } from '../types';
import { WS_URL, RECONNECTION_ATTEMPTS, RECONNECTION_DELAY } from '../utils/constants';

interface UseWebSocketOptions {
  sessionId: string;
  userId: string;
  userName: string;
  onCodeUpdate?: (delta: unknown, version: number) => void;
  onCursorUpdate?: (userId: string, position: { line: number; column: number }) => void;
  onUserJoined?: (user: User) => void;
  onUserLeft?: (userId: string) => void;
  onLanguageChanged?: (language: Language) => void;
  onPresenceUpdate?: (users: User[]) => void;
  onError?: (error: Error) => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef(options);

  // Keep options ref up to date
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    const opts = optionsRef.current;
    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: false, // We'll handle reconnection manually
      query: {
        sessionId: opts.sessionId,
        userId: opts.userId,
        userName: opts.userName,
      },
    });

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
      console.log('WebSocket connected');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('WebSocket disconnected:', reason);
      // Don't auto-reconnect - let the useEffect handle reconnection if needed
    });

    socket.on('connect_error', (error) => {
      setConnectionError(error);
      console.error('WebSocket connection error:', error);
    });

    socket.on('code-update', (message: WebSocketMessage) => {
      const opts = optionsRef.current;
      if (message.userId !== opts.userId && opts.onCodeUpdate) {
        const payload = message.payload as { delta: unknown; version: number };
        opts.onCodeUpdate(payload.delta, payload.version);
      }
    });

    socket.on('cursor-update', (message: WebSocketMessage) => {
      const opts = optionsRef.current;
      if (message.userId !== opts.userId && opts.onCursorUpdate) {
        const payload = message.payload as { position: { line: number; column: number } };
        opts.onCursorUpdate(message.userId, payload.position);
      }
    });

    socket.on('user-joined', (message: WebSocketMessage) => {
      const opts = optionsRef.current;
      if (opts.onUserJoined) {
        const user = message.payload as User;
        opts.onUserJoined(user);
      }
    });

    socket.on('user-left', (message: WebSocketMessage) => {
      const opts = optionsRef.current;
      if (opts.onUserLeft) {
        opts.onUserLeft(message.userId);
      }
    });

    socket.on('language-changed', (message: WebSocketMessage) => {
      const opts = optionsRef.current;
      if (opts.onLanguageChanged) {
        const language = message.payload as Language;
        opts.onLanguageChanged(language);
      }
    });

    socket.on('presence-update', (message: WebSocketMessage) => {
      const opts = optionsRef.current;
      if (opts.onPresenceUpdate) {
        const users = message.payload as User[];
        opts.onPresenceUpdate(users);
      }
    });

    socketRef.current = socket;
  }, []); // Empty deps - we use optionsRef instead

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const sendCodeUpdate = useCallback((delta: unknown, version: number) => {
    if (socketRef.current?.connected) {
      const opts = optionsRef.current;
      socketRef.current.emit('code-update', {
        type: 'code-update',
        sessionId: opts.sessionId,
        userId: opts.userId,
        payload: { delta, version },
        timestamp: Date.now(),
      });
    }
  }, []);

  const sendCursorUpdate = useCallback((position: { line: number; column: number }) => {
    if (socketRef.current?.connected) {
      const opts = optionsRef.current;
      socketRef.current.emit('cursor-update', {
        type: 'cursor-update',
        sessionId: opts.sessionId,
        userId: opts.userId,
        payload: { position },
        timestamp: Date.now(),
      });
    }
  }, []);

  const sendLanguageChange = useCallback((language: Language) => {
    if (socketRef.current?.connected) {
      const opts = optionsRef.current;
      socketRef.current.emit('language-changed', {
        type: 'language-changed',
        sessionId: opts.sessionId,
        userId: opts.userId,
        payload: language,
        timestamp: Date.now(),
      });
    }
  }, []);

  // Track what we're connected to prevent unnecessary reconnections
  const connectedToRef = useRef<{ sessionId: string; userId: string } | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const currentSessionId = options.sessionId;
    const currentUserId = options.userId;

    // Check if we need to reconnect
    const currentConnection = connectedToRef.current;
    const needsReconnect = 
      !currentConnection ||
      currentConnection.sessionId !== currentSessionId ||
      currentConnection.userId !== currentUserId;

    // Only connect if we need to and aren't already connected/connecting
    if (needsReconnect) {
      // Disconnect existing connection if it exists and is different
      if (socketRef.current && currentConnection) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // Update what we're connecting to
      connectedToRef.current = {
        sessionId: currentSessionId,
        userId: currentUserId,
      };

      // Only connect if not already connecting/connected
      if (!socketRef.current || !socketRef.current.connected) {
        connect();
      }
    } else if (!socketRef.current) {
      // Connect if no socket exists and we don't need to reconnect
      connect();
    }

    return () => {
      isMountedRef.current = false;
      // Only cleanup on unmount
      // Don't disconnect on dependency changes - let the effect above handle reconnection
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.sessionId, options.userId]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      connectedToRef.current = null;
    };
  }, []);

  return {
    isConnected,
    connectionError,
    sendCodeUpdate,
    sendCursorUpdate,
    sendLanguageChange,
    reconnect: connect,
  };
}


import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';
import { Language } from '../common/enums/language.enum';
import { WebSocketRateLimitGuard } from './websocket-rate-limit.guard';

interface WebSocketMessage {
  type: string;
  sessionId: string;
  userId: string;
  payload: any;
  timestamp: number;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class InterviewWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private readonly userSessions = new Map<string, string>(); // socketId -> sessionId
  private readonly socketUsers = new Map<string, string>(); // socketId -> userId
  private readonly cursorUpdateThrottle = new Map<string, number>(); // userId -> last update time
  private readonly codeUpdateThrottle = new Map<string, number>();
  private readonly languageChangeThrottle = new Map<string, number>();

  constructor(private readonly sessionsService: SessionsService) {}

  async handleConnection(client: Socket) {
    try {
      const { sessionId, userId, userName } = client.handshake.query;

      if (!sessionId || !userId || !userName) {
        this.logger.warn('Connection rejected: missing parameters');
        client.disconnect();
        return;
      }

      // Validate session exists
      const session = this.sessionsService.getSession(sessionId as string);
      if (!session) {
        this.logger.warn(`Connection rejected: session not found: ${sessionId}`);
        client.disconnect();
        return;
      }

      // Add user to session
      const user = this.sessionsService.addUserToSession(
        sessionId as string,
        userId as string,
        userName as string,
        client.id,
      );

      if (!user) {
        this.logger.warn(`Failed to add user to session: ${sessionId}`);
        client.disconnect();
        return;
      }

      // Store mappings
      this.userSessions.set(client.id, sessionId as string);
      this.socketUsers.set(client.id, userId as string);

      // Join room
      client.join(sessionId as string);

      // Emit connection success (using 'connected' instead of 'connect' which is reserved)
      client.emit('connected', {
        sessionId,
        userId,
        connectedAt: new Date().toISOString(),
      });

      // Broadcast user joined to others in session
      client.to(sessionId as string).emit('user-joined', {
        type: 'user-joined',
        sessionId,
        userId,
        payload: {
          id: user.id,
          name: user.name,
          color: user.color,
        },
        timestamp: Date.now(),
      });

      // Send presence update to all users in session
      this.broadcastPresenceUpdate(sessionId as string);

      this.logger.log(
        `Client connected: ${client.id} (user: ${userId}, session: ${sessionId})`,
      );
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`, error.stack);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const sessionId = this.userSessions.get(client.id);
    const userId = this.socketUsers.get(client.id);

    if (sessionId && userId) {
      // Remove user from session
      this.sessionsService.removeUserFromSession(sessionId, userId);

      // Broadcast user left
      client.to(sessionId).emit('user-left', {
        type: 'user-left',
        sessionId,
        userId,
        payload: {
          reason: 'disconnect',
        },
        timestamp: Date.now(),
      });

      // Send presence update
      this.broadcastPresenceUpdate(sessionId);

      // Clean up mappings
      this.userSessions.delete(client.id);
      this.socketUsers.delete(client.id);
      this.cursorUpdateThrottle.delete(userId);
      this.codeUpdateThrottle.delete(userId);
      this.languageChangeThrottle.delete(userId);

      this.logger.log(
        `Client disconnected: ${client.id} (user: ${userId}, session: ${sessionId})`,
      );
    }
  }

  @SubscribeMessage('code-update')
  @UseGuards(WebSocketRateLimitGuard)
  handleCodeUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: WebSocketMessage,
  ) {
    const sessionId = this.userSessions.get(client.id);
    const userId = this.socketUsers.get(client.id);

    this.logger.log(`Received code-update from user ${userId} in session ${sessionId}`);

    if (!sessionId || !userId) {
      client.emit('error', {
        type: 'error',
        sessionId: message.sessionId || '',
        userId: userId || '',
        payload: {
          error: 'USER_NOT_IN_SESSION',
          message: 'User not connected to session',
        },
        timestamp: Date.now(),
      });
      return;
    }

    // Validate session
    if (sessionId !== message.sessionId) {
      client.emit('error', {
        type: 'error',
        sessionId,
        userId,
        payload: {
          error: 'INVALID_SESSION',
          message: 'Session ID mismatch',
        },
        timestamp: Date.now(),
      });
      return;
    }

    // Rate limiting: max 50 updates per second
    const now = Date.now();
    const lastUpdate = this.codeUpdateThrottle.get(userId) || 0;
    if (now - lastUpdate < 20) {
      // 20ms = 50 per second
      this.logger.debug(`Rate limited code-update from user ${userId}`);
      return; // Silently drop if too frequent
    }
    this.codeUpdateThrottle.set(userId, now);

    // Update code version
    const version = this.sessionsService.incrementCodeVersion(sessionId);
    if (version === -1) {
      client.emit('error', {
        type: 'error',
        sessionId,
        userId,
        payload: {
          error: 'SESSION_NOT_FOUND',
          message: 'Session does not exist',
        },
        timestamp: Date.now(),
      });
      return;
    }

    // Update user last seen
    this.sessionsService.updateUserLastSeen(sessionId, userId);

    // Broadcast to other users in session
    const broadcastMessage = {
      type: 'code-update',
      sessionId,
      userId,
      payload: {
        delta: message.payload.delta,
        version,
      },
      timestamp: Date.now(),
    };

    const room = this.server.sockets.adapter.rooms.get(sessionId);
    const roomSize = room ? room.size : 0;
    this.logger.log(`Broadcasting code-update to ${roomSize} clients in session ${sessionId}`);

    client.to(sessionId).emit('code-update', broadcastMessage);
  }

  @SubscribeMessage('cursor-update')
  @UseGuards(WebSocketRateLimitGuard)
  handleCursorUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: WebSocketMessage,
  ) {
    const sessionId = this.userSessions.get(client.id);
    const userId = this.socketUsers.get(client.id);

    if (!sessionId || !userId) {
      return; // Silently ignore
    }

    if (sessionId !== message.sessionId) {
      return; // Silently ignore
    }

    // Rate limiting: max 10 updates per second
    const now = Date.now();
    const lastUpdate = this.cursorUpdateThrottle.get(userId) || 0;
    if (now - lastUpdate < 100) {
      // 100ms = 10 per second
      return; // Silently drop if too frequent
    }
    this.cursorUpdateThrottle.set(userId, now);

    // Update user last seen
    this.sessionsService.updateUserLastSeen(sessionId, userId);

    // Broadcast to other users in session
    const broadcastMessage = {
      type: 'cursor-update',
      sessionId,
      userId,
      payload: message.payload,
      timestamp: Date.now(),
    };

    client.to(sessionId).emit('cursor-update', broadcastMessage);
  }

  @SubscribeMessage('language-changed')
  @UseGuards(WebSocketRateLimitGuard)
  handleLanguageChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: WebSocketMessage,
  ) {
    const sessionId = this.userSessions.get(client.id);
    const userId = this.socketUsers.get(client.id);

    if (!sessionId || !userId) {
      client.emit('error', {
        type: 'error',
        sessionId: message.sessionId || '',
        userId: userId || '',
        payload: {
          error: 'USER_NOT_IN_SESSION',
          message: 'User not connected to session',
        },
        timestamp: Date.now(),
      });
      return;
    }

    if (sessionId !== message.sessionId) {
      client.emit('error', {
        type: 'error',
        sessionId,
        userId,
        payload: {
          error: 'INVALID_SESSION',
          message: 'Session ID mismatch',
        },
        timestamp: Date.now(),
      });
      return;
    }

    // Validate language
    const language = message.payload as Language;
    if (!Object.values(Language).includes(language)) {
      client.emit('error', {
        type: 'error',
        sessionId,
        userId,
        payload: {
          error: 'INVALID_LANGUAGE',
          message: 'Unsupported language',
        },
        timestamp: Date.now(),
      });
      return;
    }

    // Rate limiting: max 1 change per 5 seconds
    const now = Date.now();
    const lastChange = this.languageChangeThrottle.get(userId) || 0;
    if (now - lastChange < 5000) {
      client.emit('error', {
        type: 'error',
        sessionId,
        userId,
        payload: {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Language changes are limited to 1 per 5 seconds',
        },
        timestamp: Date.now(),
      });
      return;
    }
    this.languageChangeThrottle.set(userId, now);

    // Update session language
    const updated = this.sessionsService.updateSessionLanguage(
      sessionId,
      language,
    );
    if (!updated) {
      client.emit('error', {
        type: 'error',
        sessionId,
        userId,
        payload: {
          error: 'SESSION_NOT_FOUND',
          message: 'Session does not exist',
        },
        timestamp: Date.now(),
      });
      return;
    }

    // Update user last seen
    this.sessionsService.updateUserLastSeen(sessionId, userId);

    // Broadcast to all users in session (including sender)
    const broadcastMessage = {
      type: 'language-changed',
      sessionId,
      userId,
      payload: language,
      timestamp: Date.now(),
    };

    this.server.to(sessionId).emit('language-changed', broadcastMessage);
  }

  private broadcastPresenceUpdate(sessionId: string): void {
    const users = this.sessionsService.getSessionUsers(sessionId);
    const presenceMessage = {
      type: 'presence-update',
      sessionId,
      userId: 'system',
      payload: {
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          color: user.color,
          lastSeen: user.lastSeen.toISOString(),
        })),
      },
      timestamp: Date.now(),
    };

    this.server.to(sessionId).emit('presence-update', presenceMessage);
  }
}


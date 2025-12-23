import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Language } from '../common/enums/language.enum';
import {
  Session,
  SessionData,
  SessionUser,
} from '../common/interfaces/session.interface';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly sessions = new Map<string, SessionData>();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup inactive sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  createSession(language: Language): Session {
    const sessionId = uuidv4();
    const now = new Date();

    const sessionData: SessionData = {
      id: sessionId,
      createdAt: now,
      language,
      participantCount: 0,
      users: new Map(),
      codeVersion: 0,
    };

    this.sessions.set(sessionId, sessionData);
    this.logger.log(`Created session: ${sessionId}`);

    return this.toSessionResponse(sessionData);
  }

  getSession(sessionId: string): Session | null {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return null;
    }
    return this.toSessionResponse(sessionData);
  }

  getSessionData(sessionId: string): SessionData | null {
    return this.sessions.get(sessionId) || null;
  }

  listSessions(limit: number, offset: number) {
    const sessionsArray = Array.from(this.sessions.values())
      .map((session) => this.toSessionResponse(session))
      .slice(offset, offset + limit);

    return {
      sessions: sessionsArray,
      total: this.sessions.size,
      limit,
      offset,
    };
  }

  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      this.logger.log(`Deleted session: ${sessionId}`);
    }
    return deleted;
  }

  joinSession(
    sessionId: string,
    userId: string,
    userName: string,
  ): { sessionId: string; userId: string; wsUrl: string; participantCount: number } | null {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return null;
    }

    // User will be added to session when WebSocket connects
    return {
      sessionId,
      userId,
      wsUrl: process.env.WS_URL || 'ws://localhost:3001',
      participantCount: sessionData.users.size,
    };
  }

  addUserToSession(
    sessionId: string,
    userId: string,
    userName: string,
    socketId: string,
  ): SessionUser | null {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return null;
    }

    // Generate color for user
    const color = this.generateUserColor(userId);

    const user: SessionUser = {
      id: userId,
      name: userName,
      color,
      lastSeen: new Date(),
      socketId,
    };

    sessionData.users.set(userId, user);
    sessionData.participantCount = sessionData.users.size;

    this.logger.log(
      `User ${userId} (${userName}) joined session ${sessionId}`,
    );

    return user;
  }

  removeUserFromSession(sessionId: string, userId: string): boolean {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return false;
    }

    const removed = sessionData.users.delete(userId);
    if (removed) {
      sessionData.participantCount = sessionData.users.size;
      this.logger.log(`User ${userId} left session ${sessionId}`);

      // If no users left, mark session for cleanup
      if (sessionData.users.size === 0) {
        // Session will be cleaned up by cleanup interval
      }
    }

    return removed;
  }

  updateUserLastSeen(sessionId: string, userId: string): void {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return;
    }

    const user = sessionData.users.get(userId);
    if (user) {
      user.lastSeen = new Date();
    }
  }

  updateSessionLanguage(sessionId: string, language: Language): boolean {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return false;
    }

    sessionData.language = language;
    return true;
  }

  incrementCodeVersion(sessionId: string): number {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return -1;
    }

    sessionData.codeVersion++;
    return sessionData.codeVersion;
  }

  getSessionUsers(sessionId: string): SessionUser[] {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return [];
    }

    return Array.from(sessionData.users.values());
  }

  private toSessionResponse(sessionData: SessionData): Session {
    return {
      id: sessionData.id,
      createdAt: sessionData.createdAt,
      language: sessionData.language,
      participantCount: sessionData.participantCount,
    };
  }

  private generateUserColor(userId: string): string {
    // Generate a consistent color based on user ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash % 360);
    const saturation = 70;
    const lightness = 50;

    // Convert HSL to RGB to Hex
    const h = hue / 360;
    const s = saturation / 100;
    const l = lightness / 100;

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private cleanupInactiveSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, sessionData] of this.sessions.entries()) {
      const timeSinceCreation =
        now.getTime() - sessionData.createdAt.getTime();

      // Clean up if session is older than timeout and has no users
      if (
        timeSinceCreation > this.SESSION_TIMEOUT &&
        sessionData.users.size === 0
      ) {
        this.sessions.delete(sessionId);
        cleanedCount++;
        this.logger.log(`Cleaned up inactive session: ${sessionId}`);
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} inactive sessions`);
    }
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}


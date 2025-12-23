import { Language } from '../enums/language.enum';

export interface Session {
  id: string;
  createdAt: Date;
  language: Language;
  participantCount: number;
}

export interface SessionUser {
  id: string;
  name: string;
  color: string;
  lastSeen: Date;
  socketId: string;
}

export interface SessionData extends Session {
  users: Map<string, SessionUser>;
  codeVersion: number;
}


export type Language = 'javascript' | 'typescript' | 'python';

export interface Session {
  id: string;
  createdAt: string;
  language: Language;
}

export interface User {
  id: string;
  name: string;
  color: string;
}

export interface CodeExecutionResult {
  output: string;
  error?: string;
  executionTime: number;
}

export interface WebSocketMessage {
  type: 'code-update' | 'cursor-update' | 'user-joined' | 'user-left' | 'language-changed' | 'presence-update';
  payload: unknown;
  sessionId: string;
  userId: string;
  timestamp: number;
}

export interface CodeUpdatePayload {
  delta: unknown;
  version: number;
}

export interface CursorUpdatePayload {
  position: { line: number; column: number };
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
}

export interface PresenceUpdatePayload {
  users: User[];
}


# WebSocket Events Specification

This document defines the WebSocket event contract for real-time communication in the Online Coding Interview Platform.

## Connection

### Connection URL
```
ws://localhost:3001/socket.io/?sessionId={sessionId}&userId={userId}&userName={userName}
```

### Connection Parameters
- `sessionId` (required): UUID of the session to join
- `userId` (required): Unique identifier for the user
- `userName` (required): Display name for the user

### Connection Events

#### `connect`
Emitted when the WebSocket connection is established.

**Client receives:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "connectedAt": "2024-01-15T10:30:00Z"
}
```

#### `disconnect`
Emitted when the WebSocket connection is closed.

**Client receives:**
```json
{
  "reason": "io client disconnect"
}
```

#### `connect_error`
Emitted when connection fails.

**Client receives:**
```json
{
  "error": "Connection failed",
  "message": "Unable to connect to server"
}
```

---

## Client → Server Events

### `code-update`
Sent when a user makes changes to the code editor.

**Event Name:** `code-update`

**Payload:**
```typescript
{
  type: 'code-update';
  sessionId: string;        // UUID
  userId: string;           // User identifier
  payload: {
    delta: unknown;         // Yjs update delta or operational transform delta
    version: number;        // Version number for conflict resolution
  };
  timestamp: number;        // Unix timestamp in milliseconds
}
```

**Example:**
```json
{
  "type": "code-update",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "payload": {
    "delta": { "ops": [...] },
    "version": 42
  },
  "timestamp": 1705315800000
}
```

**Server Behavior:**
- Validates session exists
- Validates user is connected to session
- Broadcasts to all other users in the session
- Updates session state

**Error Responses:**
- `error: 'SESSION_NOT_FOUND'` - Session does not exist
- `error: 'USER_NOT_IN_SESSION'` - User not connected to session
- `error: 'INVALID_PAYLOAD'` - Invalid update payload

---

### `cursor-update`
Sent when a user moves their cursor or changes selection in the editor.

**Event Name:** `cursor-update`

**Payload:**
```typescript
{
  type: 'cursor-update';
  sessionId: string;
  userId: string;
  payload: {
    position: {
      line: number;        // 0-based line number
      column: number;      // 0-based column number
    };
    selection?: {
      start: {
        line: number;
        column: number;
      };
      end: {
        line: number;
        column: number;
      };
    };
  };
  timestamp: number;
}
```

**Example:**
```json
{
  "type": "cursor-update",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "payload": {
    "position": {
      "line": 5,
      "column": 12
    },
    "selection": {
      "start": { "line": 5, "column": 10 },
      "end": { "line": 5, "column": 15 }
    }
  },
  "timestamp": 1705315800000
}
```

**Server Behavior:**
- Broadcasts to all other users in the session
- Updates user's presence information
- Throttles updates (max 10 per second per user)

**Error Responses:**
- `error: 'SESSION_NOT_FOUND'`
- `error: 'USER_NOT_IN_SESSION'`
- `error: 'RATE_LIMIT_EXCEEDED'` - Too many cursor updates

---

### `language-changed`
Sent when a user changes the programming language.

**Event Name:** `language-changed`

**Payload:**
```typescript
{
  type: 'language-changed';
  sessionId: string;
  userId: string;
  payload: 'javascript' | 'typescript' | 'python';
  timestamp: number;
}
```

**Example:**
```json
{
  "type": "language-changed",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "payload": "typescript",
  "timestamp": 1705315800000
}
```

**Server Behavior:**
- Validates language is supported
- Updates session language
- Broadcasts to all users in the session

**Error Responses:**
- `error: 'INVALID_LANGUAGE'` - Language not supported
- `error: 'SESSION_NOT_FOUND'`
- `error: 'USER_NOT_IN_SESSION'`

---

## Server → Client Events

### `code-update`
Broadcasted when another user makes code changes.

**Event Name:** `code-update`

**Payload:**
```typescript
{
  type: 'code-update';
  sessionId: string;
  userId: string;           // ID of user who made the change
  payload: {
    delta: unknown;
    version: number;
  };
  timestamp: number;
}
```

**Client Behavior:**
- Apply delta to local editor state
- Update version number
- Ignore if from own userId

---

### `cursor-update`
Broadcasted when another user moves their cursor.

**Event Name:** `cursor-update`

**Payload:**
```typescript
{
  type: 'cursor-update';
  sessionId: string;
  userId: string;
  payload: {
    position: {
      line: number;
      column: number;
    };
    selection?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
  };
  timestamp: number;
}
```

**Client Behavior:**
- Display remote cursor with user's color
- Update cursor position indicator
- Show selection if present

---

### `user-joined`
Emitted when a new user joins the session.

**Event Name:** `user-joined`

**Payload:**
```typescript
{
  type: 'user-joined';
  sessionId: string;
  userId: string;
  payload: {
    id: string;
    name: string;
    color: string;          // Hex color code
  };
  timestamp: number;
}
```

**Example:**
```json
{
  "type": "user-joined",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-456",
  "payload": {
    "id": "user-456",
    "name": "Jane Doe",
    "color": "#33FF57"
  },
  "timestamp": 1705315800000
}
```

**Client Behavior:**
- Add user to presence list
- Display join notification (optional)
- Update user count

---

### `user-left`
Emitted when a user leaves the session.

**Event Name:** `user-left`

**Payload:**
```typescript
{
  type: 'user-left';
  sessionId: string;
  userId: string;           // ID of user who left
  payload: {
    reason?: 'disconnect' | 'timeout' | 'manual';
  };
  timestamp: number;
}
```

**Example:**
```json
{
  "type": "user-left",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-456",
  "payload": {
    "reason": "disconnect"
  },
  "timestamp": 1705315800000
}
```

**Client Behavior:**
- Remove user from presence list
- Remove user's cursor/selection indicators
- Update user count
- Display leave notification (optional)

---

### `language-changed`
Broadcasted when another user changes the language.

**Event Name:** `language-changed`

**Payload:**
```typescript
{
  type: 'language-changed';
  sessionId: string;
  userId: string;
  payload: 'javascript' | 'typescript' | 'python';
  timestamp: number;
}
```

**Client Behavior:**
- Update language selector
- Update editor language mode
- Show notification (optional)

---

### `presence-update`
Emitted periodically or when presence changes significantly.

**Event Name:** `presence-update`

**Payload:**
```typescript
{
  type: 'presence-update';
  sessionId: string;
  userId: string;           // Server/system user ID
  payload: {
    users: Array<{
      id: string;
      name: string;
      color: string;
      lastSeen: string;     // ISO 8601 timestamp
    }>;
  };
  timestamp: number;
}
```

**Example:**
```json
{
  "type": "presence-update",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "system",
  "payload": {
    "users": [
      {
        "id": "user-123",
        "name": "John Doe",
        "color": "#FF5733",
        "lastSeen": "2024-01-15T10:30:00Z"
      },
      {
        "id": "user-456",
        "name": "Jane Doe",
        "color": "#33FF57",
        "lastSeen": "2024-01-15T10:29:45Z"
      }
    ]
  },
  "timestamp": 1705315800000
}
```

**Client Behavior:**
- Update complete user list
- Update user count display
- Refresh presence indicators

---

### `error`
Emitted when an error occurs.

**Event Name:** `error`

**Payload:**
```typescript
{
  type: 'error';
  sessionId: string;
  userId: string;
  payload: {
    error: string;           // Error code
    message: string;         // Human-readable message
    details?: unknown;       // Additional error details
  };
  timestamp: number;
}
```

**Example:**
```json
{
  "type": "error",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "payload": {
    "error": "SESSION_NOT_FOUND",
    "message": "Session does not exist or has been deleted"
  },
  "timestamp": 1705315800000
}
```

**Error Codes:**
- `SESSION_NOT_FOUND` - Session does not exist
- `USER_NOT_IN_SESSION` - User not connected to session
- `INVALID_PAYLOAD` - Invalid event payload
- `RATE_LIMIT_EXCEEDED` - Too many events sent
- `INVALID_LANGUAGE` - Unsupported language
- `INTERNAL_SERVER_ERROR` - Server error

**Client Behavior:**
- Display error message to user
- Log error for debugging
- Handle reconnection if session-related error

---

## Error Handling

### Connection Errors
- Client should implement exponential backoff for reconnection
- Maximum reconnection attempts: 5
- Reconnection delay: 1000ms, 2000ms, 4000ms, 8000ms, 16000ms

### Event Errors
- Client should validate payloads before sending
- Server validates all incoming events
- Invalid events result in `error` event response

### Rate Limiting
- Cursor updates: Max 10 per second per user
- Code updates: Max 50 per second per user
- Language changes: Max 1 per 5 seconds per user
- Exceeding limits results in `RATE_LIMIT_EXCEEDED` error

---

## Implementation Notes

### Socket.IO Specifics
- Uses Socket.IO protocol for compatibility
- Supports automatic reconnection
- Room-based broadcasting (one room per session)
- Namespace: `/` (default)

### Yjs Integration
- Code updates use Yjs update format
- Server can optionally store Yjs document state
- Clients sync via Yjs WebSocket provider OR Socket.IO events

### Presence Management
- Server tracks user presence per session
- Presence timeout: 30 seconds (no activity)
- Automatic cleanup of stale connections

### Security Considerations
- Validate sessionId on all events
- Validate userId matches connection
- Rate limit all user events
- Sanitize user names and inputs
- No code execution on server (client-side only)


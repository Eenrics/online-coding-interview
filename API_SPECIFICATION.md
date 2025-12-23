# API Specification - Phase 2

## Overview

This document provides a complete specification for the Online Coding Interview Platform API, including REST endpoints and WebSocket events.

## Files

- **`openapi.yaml`** - Complete OpenAPI 3.0 specification for REST endpoints
- **`websocket-events.md`** - Detailed WebSocket event contract documentation

---

## REST API Endpoints

### Public Endpoints

#### `GET /api/health`
Health check endpoint to verify server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

#### `POST /api/sessions`
Create a new interview session.

**Request:**
```json
{
  "language": "javascript"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2024-01-15T10:30:00Z",
  "language": "javascript",
  "participantCount": 1
}
```

#### `GET /api/sessions/{sessionId}`
Get session information.

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2024-01-15T10:30:00Z",
  "language": "javascript",
  "participantCount": 3
}
```

#### `POST /api/sessions/{sessionId}/join`
Join an existing session.

**Request:**
```json
{
  "userId": "user-123",
  "userName": "John Doe"
}
```

**Response (200):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-123",
  "wsUrl": "ws://localhost:3001",
  "participantCount": 3
}
```

### Internal Endpoints

#### `GET /api/sessions`
List all active sessions (requires authentication in production).

**Query Parameters:**
- `limit` (optional, default: 20) - Maximum number of sessions
- `offset` (optional, default: 0) - Number of sessions to skip

**Response (200):**
```json
{
  "sessions": [...],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

#### `DELETE /api/sessions/{sessionId}`
Delete a session (requires authentication in production).

**Response (204):** No content

---

## WebSocket Events

### Connection

**URL:** `ws://localhost:3001/socket.io/?sessionId={sessionId}&userId={userId}&userName={userName}`

### Client → Server Events

1. **`code-update`** - Send code changes
2. **`cursor-update`** - Send cursor position updates
3. **`language-changed`** - Send language change

### Server → Client Events

1. **`code-update`** - Receive code changes from other users
2. **`cursor-update`** - Receive cursor updates from other users
3. **`user-joined`** - New user joined session
4. **`user-left`** - User left session
5. **`language-changed`** - Language changed by another user
6. **`presence-update`** - Updated user list
7. **`error`** - Error occurred

See `websocket-events.md` for complete event specifications.

---

## Data Models

### Session
```typescript
{
  id: string;              // UUID
  createdAt: string;        // ISO 8601 timestamp
  language: 'javascript' | 'typescript' | 'python';
  participantCount: number;
}
```

### User
```typescript
{
  id: string;
  name: string;
  color: string;            // Hex color code
}
```

### Error Response
```typescript
{
  error: string;            // Error code
  message: string;          // Human-readable message
  statusCode: number;      // HTTP status code
  details?: object;         // Additional details
}
```

---

## Error Codes

### REST API Errors
- `SESSION_NOT_FOUND` (404) - Session does not exist
- `INVALID_REQUEST` (400) - Invalid request parameters
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `INTERNAL_SERVER_ERROR` (500) - Server error

### WebSocket Errors
- `SESSION_NOT_FOUND` - Session does not exist
- `USER_NOT_IN_SESSION` - User not connected
- `INVALID_PAYLOAD` - Invalid event payload
- `RATE_LIMIT_EXCEEDED` - Too many events
- `INVALID_LANGUAGE` - Unsupported language

---

## Rate Limiting

### REST API
- Session creation: 10 requests per minute per IP
- Session join: 20 requests per minute per IP
- Other endpoints: 100 requests per minute per IP

### WebSocket Events
- Cursor updates: 10 per second per user
- Code updates: 50 per second per user
- Language changes: 1 per 5 seconds per user

---

## Security Considerations

1. **Input Validation**
   - All inputs validated against schemas
   - UUID format validation for session IDs
   - String length limits for user names

2. **Rate Limiting**
   - Per-IP rate limiting for REST endpoints
   - Per-user rate limiting for WebSocket events
   - Prevents abuse and DoS attacks

3. **Session Management**
   - Anonymous session-based authentication
   - Session cleanup for inactive sessions
   - No sensitive data in sessions

4. **WebSocket Security**
   - Session validation on connection
   - User validation on all events
   - No code execution on server

---

## Implementation Notes

### Endpoint Classification

**Public Endpoints:**
- `GET /api/health`
- `POST /api/sessions`
- `GET /api/sessions/{sessionId}`
- `POST /api/sessions/{sessionId}/join`

**Internal Endpoints:**
- `GET /api/sessions` (list all)
- `DELETE /api/sessions/{sessionId}`

Internal endpoints should be protected with authentication in production environments.

### WebSocket Implementation

- Uses Socket.IO for compatibility and features
- Room-based broadcasting (one room per session)
- Automatic reconnection support
- Presence tracking with timeout (30 seconds)

### Scalability

- In-memory session storage (can be migrated to Redis)
- Stateless REST endpoints
- WebSocket rooms for efficient broadcasting
- Rate limiting to prevent abuse

---

## Next Steps

This specification is ready for Phase 3: Backend Implementation. The backend should:

1. Implement all REST endpoints as specified
2. Implement WebSocket gateway with Socket.IO
3. Follow the event contracts exactly
4. Implement rate limiting
5. Add input validation
6. Handle errors according to specifications


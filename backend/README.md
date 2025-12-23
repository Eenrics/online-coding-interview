# Online Coding Interview Platform - Backend

## Phase 3: Backend Implementation

NestJS backend implementation following the OpenAPI specification from Phase 2.

## Architecture

- **Framework**: NestJS 10
- **WebSocket**: Socket.IO
- **Validation**: class-validator, class-transformer
- **Storage**: In-memory (ready for Redis migration)

## Project Structure

```
backend/
├── src/
│   ├── common/
│   │   ├── dto/              # Data Transfer Objects
│   │   ├── enums/            # Enumerations
│   │   ├── interfaces/       # TypeScript interfaces
│   │   └── exceptions/       # Exception filters
│   ├── health/               # Health check controller
│   ├── sessions/             # Session management
│   │   ├── sessions.controller.ts
│   │   └── sessions.service.ts
│   ├── websocket/            # WebSocket gateway
│   │   ├── websocket.gateway.ts
│   │   └── websocket-rate-limit.guard.ts
│   ├── rate-limit/           # Rate limiting
│   ├── app.module.ts
│   └── main.ts
├── package.json
└── tsconfig.json
```

## Features

### REST API Endpoints

1. **Health Check**
   - `GET /api/health` - Server health status

2. **Session Management**
   - `POST /api/sessions` - Create new session
   - `GET /api/sessions` - List all sessions (internal)
   - `GET /api/sessions/:sessionId` - Get session info
   - `DELETE /api/sessions/:sessionId` - Delete session (internal)
   - `POST /api/sessions/:sessionId/join` - Join session

### WebSocket Events

**Client → Server:**
- `code-update` - Code changes
- `cursor-update` - Cursor movements
- `language-changed` - Language selection

**Server → Client:**
- `code-update` - Remote code changes
- `cursor-update` - Remote cursor updates
- `user-joined` - User joined session
- `user-left` - User left session
- `language-changed` - Language changed
- `presence-update` - User list update
- `error` - Error occurred

### Session Management

- In-memory storage with Map
- Automatic cleanup of inactive sessions (30 min timeout)
- User presence tracking
- Code version management
- Language synchronization

### Rate Limiting

**REST API:**
- Session creation: 10 requests/minute per IP
- Session join: 20 requests/minute per IP
- Default: 100 requests/minute per IP

**WebSocket:**
- Cursor updates: 10 per second per user
- Code updates: 50 per second per user
- Language changes: 1 per 5 seconds per user

### Security

- Input validation with class-validator
- UUID format validation
- Session validation on all operations
- User authentication via WebSocket handshake
- Rate limiting to prevent abuse

## Installation

```bash
cd backend
npm install
```

## Running

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Environment Variables

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
WS_URL=ws://localhost:3001
```

## API Documentation

See `../openapi.yaml` for complete API specification.

## Scalability Notes

### Current Implementation (In-Memory)

- Sessions stored in Map
- Suitable for single-server deployments
- Limited by server memory
- No persistence across restarts

### Redis Migration (Recommended for Production)

To scale horizontally, migrate to Redis:

1. **Session Storage:**
   ```typescript
   // Replace Map with Redis
   await redis.set(`session:${sessionId}`, JSON.stringify(sessionData));
   ```

2. **Pub/Sub for WebSocket:**
   ```typescript
   // Use Redis pub/sub for cross-server broadcasting
   redis.subscribe(`session:${sessionId}`);
   ```

3. **User Presence:**
   ```typescript
   // Use Redis sorted sets for presence
   await redis.zadd(`presence:${sessionId}`, Date.now(), userId);
   ```

4. **Rate Limiting:**
   ```typescript
   // Use Redis for distributed rate limiting
   await redis.incr(`ratelimit:${key}`);
   await redis.expire(`ratelimit:${key}`, window);
   ```

### Horizontal Scaling

1. **Load Balancer:** Use sticky sessions or Redis pub/sub
2. **Session Affinity:** Not required with Redis pub/sub
3. **WebSocket Scaling:** Use Redis adapter for Socket.IO
4. **Database:** Optional for session persistence

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Error Handling

All errors follow the OpenAPI specification:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "statusCode": 400
}
```

## Logging

- Uses NestJS Logger
- Logs connection/disconnection events
- Logs session creation/deletion
- Logs cleanup operations

## Performance Considerations

1. **Memory Management:**
   - Automatic cleanup of inactive sessions
   - User presence timeout (30 seconds)
   - Throttled cursor updates

2. **WebSocket Optimization:**
   - Room-based broadcasting (Socket.IO rooms)
   - Throttled updates to prevent flooding
   - Efficient event handling

3. **Rate Limiting:**
   - In-memory rate limit store
   - Per-IP and per-user limits
   - Automatic reset windows

## Next Steps

1. Add Redis for production scaling
2. Add session persistence (optional)
3. Add metrics and monitoring
4. Add comprehensive test coverage
5. Add API documentation (Swagger)


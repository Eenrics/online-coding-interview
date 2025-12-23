# Integration Tests Documentation

## Overview

This document describes the integration test suite for the Online Coding Interview Platform. These tests verify the interaction between frontend and backend components in a production-like environment.

## Test Structure

### Backend Integration Tests

Location: `backend/test/integration/`

**Test Files:**
- `sessions.integration.spec.ts` - Session lifecycle and REST API tests
- `websocket.integration.spec.ts` - WebSocket connection and event tests
- `realtime-collaboration.integration.spec.ts` - Real-time collaboration scenarios

**Test Framework:**
- Jest
- Supertest (HTTP testing)
- socket.io-client (WebSocket testing)

### Frontend Integration Tests

Location: `tests/integration/`

**Test Files:**
- `session-lifecycle.spec.ts` - Session creation and navigation
- `realtime-collaboration.spec.ts` - Multi-user collaboration
- `code-execution.spec.ts` - Code execution in browser
- `reconnection.spec.ts` - Network interruption and reconnection

**Test Framework:**
- Playwright
- Real browser automation

## Running Tests

### Backend Integration Tests

```bash
cd backend
npm run test:integration
```

**Watch Mode:**
```bash
npm run test:integration:watch
```

### Frontend Integration Tests

```bash
npm run test:integration
```

**UI Mode (Interactive):**
```bash
npm run test:integration:ui
```

**Headed Mode (See Browser):**
```bash
npm run test:integration:headed
```

## Test Scenarios

### 1. Session Lifecycle (REST)

**Tests:**
- ✅ Create session with valid language
- ✅ Create session with invalid language (rejected)
- ✅ Retrieve existing session
- ✅ Retrieve non-existent session (404)
- ✅ Join existing session
- ✅ Join with missing parameters (rejected)
- ✅ Health check endpoint

### 2. WebSocket Connection

**Tests:**
- ✅ Connect to existing session
- ✅ Reject connection to non-existent session
- ✅ Reject connection with missing parameters
- ✅ Multiple clients join same session
- ✅ User-joined event broadcast
- ✅ User-left event on disconnect

### 3. Real-Time Code Synchronization

**Tests:**
- ✅ Code updates broadcast to all clients
- ✅ Updates not sent back to sender
- ✅ Concurrent edits from multiple clients
- ✅ Late-joining client receives current state
- ✅ Update ordering and versioning

### 4. Language Switching

**Tests:**
- ✅ Language changes broadcast to all clients
- ✅ Invalid language rejected
- ✅ Code state preserved during language change

### 5. Code Execution

**Tests:**
- ✅ Execute JavaScript code
- ✅ Display output correctly
- ✅ Handle execution errors
- ✅ Show execution time
- ✅ Disable run button during execution

### 6. Failure & Edge Cases

**Tests:**
- ✅ Client disconnection handling
- ✅ Reconnection after network interruption
- ✅ Code state preserved after reconnection
- ✅ Rate limiting enforcement
- ✅ Invalid message rejection

## Test Isolation

Each test:
- Creates fresh sessions
- Uses unique user IDs
- Cleans up after completion
- Runs in isolated environment

## CI/CD Integration

Tests are configured to run in GitHub Actions (see `.github/workflows/test.yml`):

- Backend tests run in Node.js environment
- Frontend tests run with Playwright
- Tests run sequentially to avoid port conflicts
- Failures are reported with detailed logs

## Debugging Tests

### Backend Tests

Add `console.log` statements or use debugger:
```bash
cd backend
npm run test:integration -- --verbose
```

### Frontend Tests

Use Playwright's debugging tools:
```bash
# Run with UI
npm run test:integration:ui

# Run in headed mode
npm run test:integration:headed

# Debug specific test
npx playwright test tests/integration/session-lifecycle.spec.ts --debug
```

## Test Data

Tests use:
- **Dynamic session IDs** - Generated via API
- **Unique user IDs** - Generated per test
- **No shared state** - Each test is independent
- **Cleanup** - Automatic cleanup after tests

## Best Practices

1. **Deterministic Tests**: No reliance on timing
2. **Explicit Waits**: Use proper wait conditions
3. **Error Handling**: Tests handle edge cases
4. **Isolation**: Tests don't depend on each other
5. **Cleanup**: Always clean up resources

## Troubleshooting

### Tests Timeout

- Increase timeout in test configuration
- Check if servers are starting correctly
- Verify ports are available

### WebSocket Connection Fails

- Verify backend is running
- Check CORS configuration
- Verify session exists before connecting

### Playwright Tests Fail

- Ensure browsers are installed: `npx playwright install`
- Check if frontend/backend are accessible
- Review browser console logs

## Coverage Goals

- **Backend**: 80%+ coverage of critical paths
- **Frontend**: All user workflows covered
- **Integration**: All API endpoints tested
- **WebSocket**: All events tested


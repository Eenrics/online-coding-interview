# Integration Testing Strategy

## Overview

This document outlines the integration testing strategy for the Online Coding Interview Platform. Integration tests verify the interaction between frontend and backend components, ensuring the system works as a cohesive unit.

## Testing Philosophy

1. **Real Components**: Tests use actual HTTP servers, WebSocket connections, and browser instances
2. **Deterministic**: Tests are repeatable and don't rely on timing
3. **Isolated**: Each test runs in a clean state
4. **Fast**: Tests complete in reasonable time while maintaining accuracy
5. **Production-like**: Test environment mirrors production as closely as possible

## Test Architecture

### Backend Integration Tests
- **Framework**: Jest + Supertest
- **WebSocket Testing**: socket.io-client
- **Scope**: REST API endpoints + WebSocket gateway
- **Isolation**: Each test gets a fresh NestJS application instance
- **Port**: Dynamic port allocation to avoid conflicts

### Frontend Integration Tests
- **Framework**: Playwright
- **Scope**: Full user workflows in real browser
- **Isolation**: Each test runs in a clean browser context
- **Backend**: Tests connect to test backend instance

## Test Categories

### 1. Session Lifecycle (REST)
- Session creation with valid/invalid inputs
- Session retrieval
- Session deletion
- Session listing
- Error handling and validation

### 2. WebSocket Connection
- Successful connection with valid credentials
- Connection rejection for invalid session
- Multiple clients joining same session
- Presence updates broadcast correctly

### 3. Real-Time Code Synchronization
- Code updates propagate to all clients
- Update ordering and conflict resolution
- Late-joining clients receive current state
- Concurrent edits handled correctly

### 4. Language Switching
- Language changes broadcast to all clients
- Code state preserved during language switch
- Invalid language rejected

### 5. Code Execution
- Code execution in Web Worker
- Output capture and display
- Error handling
- Timeout enforcement

### 6. Failure & Edge Cases
- Client disconnection handling
- Reconnection with state restoration
- Server cleanup of inactive sessions
- Invalid message rejection
- Rate limiting enforcement

## Test Data Management

- **Sessions**: Created fresh for each test
- **Users**: Generated UUIDs per test
- **Cleanup**: Automatic cleanup after each test
- **State**: No shared state between tests

## Test Execution

### Backend Tests
```bash
cd backend
npm run test:integration
```

### Frontend Tests
```bash
npm run test:integration
```

### All Tests
```bash
npm run test:all
```

## CI/CD Integration

Tests are designed to run in CI environments:
- No external dependencies
- Deterministic execution
- Parallel test execution support
- Clear failure reporting


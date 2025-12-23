# Online Coding Interview Platform - Frontend

## Phase 1: Frontend Implementation

This is the frontend implementation of the online coding interview platform with real-time collaborative code editing and safe in-browser code execution.

### Architecture Overview

The frontend is built with:
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Monaco Editor** for code editing with syntax highlighting
- **Yjs** with WebSocket provider for CRDT-based collaborative editing
- **Socket.IO Client** for real-time synchronization
- **Web Workers** for safe code execution (no eval on main thread)

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── CodeEditor.tsx  # Collaborative Monaco editor with Yjs
│   ├── LanguageSelector.tsx
│   └── OutputConsole.tsx
├── pages/              # Page components
│   ├── CreateSession.tsx
│   └── InterviewRoom.tsx
├── hooks/              # Custom React hooks
│   └── useWebSocket.ts # WebSocket connection management
├── services/           # Business logic services
│   └── codeExecutor.ts # Code execution service
├── workers/            # Web Workers
│   └── codeWorker.ts   # Code execution worker
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions and constants
│   └── constants.ts
├── App.tsx             # Main app component with routing
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

### Key Features

1. **Session Creation**
   - Create unique interview sessions
   - Generate shareable links
   - Fallback to client-side sessions if backend is unavailable

2. **Collaborative Code Editor**
   - Real-time collaborative editing using Yjs CRDT
   - Syntax highlighting for JavaScript, TypeScript, and Python
   - Cursor position synchronization
   - Conflict-free concurrent editing

3. **Language Support**
   - JavaScript (full execution)
   - TypeScript (full execution)
   - Python (simulated execution - requires Pyodide for full support)

4. **Code Execution**
   - Safe execution in Web Workers
   - No eval on main thread
   - Execution timeout protection
   - Error handling and output capture

5. **Real-time Synchronization**
   - WebSocket connection via Socket.IO
   - Automatic reconnection on disconnect
   - Presence awareness (user join/leave)
   - Code and cursor updates broadcast

6. **User Experience**
   - Connection status indicator
   - User count display
   - Copy session link functionality
   - Clean, modern UI with dark theme

### Security Considerations

1. **Code Execution**
   - Code runs in isolated Web Workers
   - No direct eval() on main thread
   - Execution timeout limits
   - Restricted imports for Python simulation

2. **Input Validation**
   - TypeScript types for all data structures
   - Input sanitization in Web Workers
   - Error boundaries for React components

3. **WebSocket Security**
   - Session-based authentication (anonymous)
   - User ID validation
   - Rate limiting considerations (backend)

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Configuration

The frontend expects:
- Backend API at `http://localhost:3001` (configurable via `VITE_API_BASE_URL`)
- WebSocket server at `http://localhost:3001` (configurable via `VITE_WS_URL`)

### WebSocket Events

The frontend emits and listens to the following events:

**Client → Server:**
- `code-update`: Code changes from editor
- `cursor-update`: Cursor position changes
- `language-changed`: Language selection changes

**Server → Client:**
- `code-update`: Code changes from other users
- `cursor-update`: Cursor updates from other users
- `user-joined`: New user joined session
- `user-left`: User left session
- `language-changed`: Language changed by another user
- `presence-update`: Updated list of connected users

### State Management

- **Local State**: React useState for component-level state
- **Session Storage**: User ID and name persistence
- **Yjs Document**: Shared document state for collaborative editing
- **WebSocket**: Real-time synchronization state

### Reconnection Logic

- Automatic reconnection on disconnect
- Configurable reconnection attempts (default: 5)
- Exponential backoff for reconnection delays
- Connection status UI feedback

### Next Steps

This frontend is ready for Phase 2 (OpenAPI Specification) and Phase 3 (Backend Implementation). The frontend will work with a mock backend or can be extended to work fully client-side for development purposes.


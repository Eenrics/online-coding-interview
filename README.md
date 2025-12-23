# Online Coding Interview Platform

A production-ready online coding interview platform with real-time collaborative code editing and safe in-browser code execution.

## 🎯 Project Overview

This platform enables interviewers and candidates to collaborate in real-time on coding challenges. Key features include:

- **Real-time collaborative editing** - Multiple users can edit code simultaneously
- **Multiple language support** - JavaScript, TypeScript, and Python
- **Safe code execution** - Code runs in isolated Web Workers (no server-side execution)
- **Session management** - Create shareable interview sessions
- **Live synchronization** - Changes appear instantly to all participants

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │◄───────►│   Backend   │◄───────►│   Storage   │
│  (React)    │  REST   │  (NestJS)   │          │  (Memory)  │
│             │  + WS   │             │          │             │
└─────────────┘         └─────────────┘          └─────────────┘
      │                        │
      │                        │
      ▼                        ▼
┌─────────────┐         ┌─────────────┐
│ Web Workers │         │  WebSocket  │
│ (Code Exec) │         │   Gateway   │
└─────────────┘         └─────────────┘
```

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Monaco Editor (code editor)
- Socket.IO Client (WebSocket)
- React Router (routing)

**Backend:**
- NestJS 10 + TypeScript
- Express (HTTP server)
- Socket.IO (WebSocket server)
- class-validator (validation)

**Code Execution:**
- Web Workers (isolated execution environment)
- Pyodide (Python compiled to WebAssembly/WASM)
- Browser-native JavaScript execution
- All execution happens client-side (no server-side code execution)

**Testing:**
- Jest + Supertest (backend integration)
- Playwright (frontend E2E)
- socket.io-client (WebSocket testing)

## 📋 Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher (comes with Node.js)
- **Git** (for cloning the repository)

Verify installation:
```bash
node --version  # Should be v18+
npm --version   # Should be v9+
```

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd online-coding-interview
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Install Playwright (for E2E tests)

```bash
npx playwright install chromium
```

## 🏃 Running the Application

### Development Mode (Recommended)

**Option 1: Run Both Together (Easiest)**
```bash
npm run dev:all
```

This will start both backend and frontend simultaneously. The output will be color-coded:
- **Backend** (blue) - runs on `http://localhost:3001`
- **Frontend** (green) - runs on `http://localhost:3000`

**Option 2: Run Separately**

**Terminal 1 - Backend:**
```bash
npm run dev:backend
# or
cd backend && npm run start:dev
```

The backend will start on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

**Open in Browser:**
```
http://localhost:3000
```

### Production Build

**Build Frontend:**
```bash
npm run build
```

**Build Backend:**
```bash
cd backend
npm run build
```

**Run Production:**
```bash
# Terminal 1
cd backend
npm run start:prod

# Terminal 2 (from root)
npm run preview
```

## 🧪 Running Tests

### Backend Integration Tests

```bash
cd backend
npm run test:integration
```

Run with watch mode:
```bash
npm run test:integration:watch
```

### Frontend Integration Tests (Playwright)

**Run all E2E tests:**
```bash
npm run test:integration
```

**Run with UI mode:**
```bash
npm run test:integration:ui
```

**Run in headed mode (see browser):**
```bash
npm run test:integration:headed
```

**Run specific test file:**
```bash
npx playwright test tests/integration/session-lifecycle.spec.ts
```

### All Tests

Run both backend and frontend tests:
```bash
# Backend tests
cd backend && npm run test:integration && cd ..

# Frontend tests
npm run test:integration
```

## 🔧 Environment Variables

### Backend (.env)

Create `backend/.env`:

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
WS_URL=ws://localhost:3001
NODE_ENV=development
```

### Frontend (.env)

Create `.env` (optional, defaults work):

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

### Test Environment

Tests use default ports and don't require environment variables. The test setup automatically configures isolated test servers.

## 📜 Available Scripts

### Frontend Scripts

```bash
npm run dev              # Start frontend development server only
npm run dev:backend      # Start backend development server only
npm run dev:all          # Start both frontend and backend together
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Lint code
npm run test:integration # Run E2E tests
```

### Backend Scripts

```bash
cd backend
npm run start:dev        # Start development server with watch
npm run start:prod       # Start production server
npm run build            # Build for production
npm run test             # Run unit tests
npm run test:integration # Run integration tests
npm run test:cov         # Run tests with coverage
npm run lint             # Lint code
```

## 📁 Project Structure

```
online-coding-interview/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── common/         # Shared DTOs, interfaces
│   │   ├── health/         # Health check
│   │   ├── sessions/       # Session management
│   │   ├── websocket/      # WebSocket gateway
│   │   └── rate-limit/     # Rate limiting
│   ├── test/
│   │   └── integration/     # Integration tests
│   └── package.json
├── src/                     # React frontend
│   ├── components/         # UI components
│   ├── pages/              # Page components
│   ├── hooks/              # React hooks
│   ├── services/           # Business logic
│   └── workers/            # Web Workers
├── tests/
│   └── integration/         # Playwright E2E tests
├── openapi.yaml            # API specification
├── websocket-events.md     # WebSocket events doc
└── README.md              # This file
```

## 🧪 Test Coverage

### Backend Integration Tests

- ✅ Session lifecycle (create, get, join, delete)
- ✅ WebSocket connection handling
- ✅ Code update synchronization
- ✅ Language change propagation
- ✅ Presence updates
- ✅ Disconnection handling
- ✅ Rate limiting

### Frontend Integration Tests

- ✅ Session creation and navigation
- ✅ Real-time code synchronization
- ✅ Multi-user collaboration
- ✅ Language switching
- ✅ Code execution
- ✅ Reconnection handling

## 🔌 API Endpoints

### REST API

- `GET /api/health` - Health check
- `POST /api/sessions` - Create session
- `GET /api/sessions/:sessionId` - Get session info
- `POST /api/sessions/:sessionId/join` - Join session

See `openapi.yaml` for complete API documentation.

### WebSocket Events

**Client → Server:**
- `code-update` - Send code changes
- `cursor-update` - Send cursor position
- `language-changed` - Change language

**Server → Client:**
- `code-update` - Receive code changes
- `cursor-update` - Receive cursor updates
- `user-joined` - User joined session
- `user-left` - User left session
- `language-changed` - Language changed
- `presence-update` - User list update

See `websocket-events.md` for detailed event specifications.

## 💻 Code Execution

The platform supports safe, client-side code execution using WebAssembly (WASM):

### Supported Languages

- **JavaScript**: Executed natively in Web Worker with strict mode
- **TypeScript**: Executed as JavaScript (TypeScript is a superset of JavaScript)
- **Python**: Executed using Pyodide (Python compiled to WebAssembly)

### How It Works

1. **JavaScript/TypeScript Execution**:
   - Code runs in an isolated Web Worker
   - Console output is captured and displayed
   - Strict mode enforced for security
   - 10-second timeout protection

2. **Python Execution**:
   - Uses Pyodide (Python 3.11 compiled to WASM)
   - Runs entirely in the browser (no server required)
   - Standard library support
   - stdout/stderr capture
   - 10-second timeout protection

### Security Features

- ✅ All execution in isolated Web Workers
- ✅ No access to DOM or main thread
- ✅ Timeout protection
- ✅ No server-side code execution
- ✅ Sandboxed execution environment

### Limitations

- Python execution requires Pyodide to load (~10-15MB, first load takes time)
- Some Python packages may not be available
- TypeScript is executed as JavaScript (no type checking at runtime)
- Network access is restricted in Web Workers

## 🐛 Troubleshooting

### Port Already in Use

**Backend (3001):**
```bash
lsof -ti:3001 | xargs kill -9
```

**Frontend (3000):**
```bash
lsof -ti:3000 | xargs kill -9
```

### WebSocket Connection Issues

1. Verify backend is running: `curl http://localhost:3001/api/health`
2. Check browser console for errors
3. Verify CORS settings in backend
4. Check firewall/network settings

### Tests Failing

1. Ensure both frontend and backend are built
2. Check that ports 3000 and 3001 are available
3. Run tests sequentially (not in parallel)
4. Check test logs for specific errors

### Dependencies Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## 📚 Additional Documentation

- **API Specification**: `openapi.yaml`
- **WebSocket Events**: `websocket-events.md`
- **Testing Strategy**: `TESTING_STRATEGY.md`
- **Quick Start**: `START.md`

## 🔒 Security Considerations

- **Code Execution**: All code execution happens in isolated Web Workers (client-side only)
  - JavaScript/TypeScript: Executed in sandboxed Web Worker with strict mode
  - Python: Executed using Pyodide (Python compiled to WASM) in isolated Web Worker
  - No server-side code execution - all code runs in the browser
  - Timeout protection (10-12 seconds) to prevent infinite loops
  - Isolated execution context prevents access to DOM and main thread
- Input validation on all endpoints
- Rate limiting to prevent abuse
- Session-based authentication (anonymous)
- CORS configured for development/production

## 🚀 Deployment

### Docker Deployment (Recommended)

**Build and run with Docker:**
```bash
# Build the image
docker build -t online-coding-interview .

# Run the container
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  online-coding-interview
```

**Using Docker Compose:**
```bash
docker-compose up -d
```

The application will be available at `http://localhost:3001`

**For detailed Docker instructions, see [DOCKER.md](./DOCKER.md)**

### Manual Deployment

**Frontend:**
```bash
npm run build
# Serve dist/ directory with any static file server
```

**Backend:**
```bash
cd backend
npm run build
npm run start:prod
```

### Environment Variables for Production

Set appropriate values for:
- `FRONTEND_URL` - Your frontend domain (e.g., `https://yourdomain.com`)
- `PORT` - Backend port (default: 3001)
- `NODE_ENV=production`

## 📝 License

MIT

## 🤝 Contributing

1. Create a feature branch
2. Write tests for new features
3. Ensure all tests pass
4. Submit a pull request

## 📞 Support

For issues and questions, please open an issue in the repository.

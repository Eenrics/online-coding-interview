# How to Start the Application

This guide will help you start both the frontend and backend servers.

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)

## Quick Start

### Step 1: Install Dependencies

You need to install dependencies for both frontend and backend.

#### Install Frontend Dependencies

```bash
# From the project root directory
npm install
```

#### Install Backend Dependencies

```bash
# Navigate to backend directory
cd backend
npm install
cd ..
```

### Step 2: Start the Backend Server

The backend must be started first, as the frontend depends on it.

```bash
# From the project root directory
cd backend
npm run start:dev
```

The backend will start on **http://localhost:3001**

You should see:

```
Application is running on: http://localhost:3001
```

### Step 3: Start the Frontend Server

Open a **new terminal window** (keep the backend running) and start the frontend:

```bash
# From the project root directory
npm run dev
```

The frontend will start on **http://localhost:3000**

You should see:

```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
```

### Step 4: Open the Application

Open your browser and navigate to:

```
http://localhost:3000
```

## Complete Startup Commands

### Option 1: Manual (Recommended for Development)

**Terminal 1 - Backend:**

```bash
cd backend
npm install  # Only needed first time
npm run start:dev
```

**Terminal 2 - Frontend:**

```bash
npm install  # Only needed first time
npm run dev
```

### Option 2: Using npm scripts (if you add them)

You could create a root-level script to start both, but for now, use two terminals.

## Verification

1. **Backend Health Check:**

   - Open: http://localhost:3001/api/health
   - Should return: `{"status":"ok","timestamp":"...","version":"1.0.0"}`

2. **Frontend:**
   - Open: http://localhost:3000
   - You should see the "Create New Session" page

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

**Backend (port 3001):**

```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9
```

**Frontend (port 3000):**

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9
```

Or change the ports in:

- Backend: `backend/src/main.ts` (line with `PORT`)
- Frontend: `vite.config.ts` (server.port)

### Backend Won't Start

1. Make sure you're in the `backend` directory
2. Check that all dependencies are installed: `npm install`
3. Check Node.js version: `node --version` (should be v18+)

### Frontend Can't Connect to Backend

1. Make sure backend is running on port 3001
2. Check backend health: http://localhost:3001/api/health
3. Check browser console for errors
4. Verify CORS is enabled (it should be by default)

### Dependencies Installation Issues

If `npm install` fails:

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Environment Variables (Optional)

The application works with defaults, but you can customize:

**Backend** (create `backend/.env`):

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
WS_URL=ws://localhost:3001
NODE_ENV=development
```

**Frontend** (create `.env`):

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

## Development Workflow

1. **Backend changes:** The backend will auto-reload on file changes (watch mode)
2. **Frontend changes:** Vite will hot-reload the browser automatically
3. **Both running:** Keep both terminals open during development

## Production Build

### Build Frontend

```bash
npm run build
npm run preview  # Preview production build
```

### Build Backend

```bash
cd backend
npm run build
npm run start:prod
```

## Next Steps

1. Open http://localhost:3000
2. Click "Create New Session"
3. Share the session link with others
4. Start coding collaboratively!

# Multi-stage Dockerfile for Online Coding Interview Platform
# Builds both frontend and backend in a single container

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY src ./src
COPY index.html ./

# Build frontend
RUN npm run build

# Stage 2: Build Backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/
COPY backend/tsconfig.json ./backend/
COPY backend/nest-cli.json ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm ci

# Copy backend source
COPY backend/src ./src

# Build backend
RUN npm run build

# Stage 3: Production Image
FROM node:18-alpine

WORKDIR /app

# Install production dependencies for backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules

# Copy built frontend to backend's public directory (for static file serving)
COPY --from=frontend-builder /app/dist ./public

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the backend (which serves both API and frontend)
CMD ["node", "dist/main.js"]


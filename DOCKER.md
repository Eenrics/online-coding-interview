# Docker Deployment Guide

This guide explains how to build and run the Online Coding Interview Platform using Docker.

## Quick Start

### Build the Image

```bash
docker build -t online-coding-interview .
```

### Run the Container

```bash
docker run -d \
  --name online-coding-interview \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  online-coding-interview
```

### Using Docker Compose

```bash
docker-compose up -d
```

The application will be available at `http://localhost:3001`

## Dockerfile Structure

The Dockerfile uses a multi-stage build:

1. **Stage 1: Frontend Builder**
   - Builds the React frontend using Vite
   - Output: Static files in `dist/`

2. **Stage 2: Backend Builder**
   - Builds the NestJS backend
   - Output: Compiled JavaScript in `backend/dist/`

3. **Stage 3: Production Image**
   - Combines both builds
   - Frontend static files copied to `backend/public/`
   - Backend serves both API and frontend

## Architecture

In the Docker container:
- **Backend** runs on port 3001
- **Frontend** is served as static files by the backend
- **Single process** - no need for process managers
- **SPA routing** - All non-API routes serve `index.html`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3001` | Backend port |
| `FRONTEND_URL` | `*` (in Docker) | CORS origin (not needed when serving from same origin) |

## Building

### Build with Custom Tag

```bash
docker build -t online-coding-interview:latest .
```

### Build with Build Args

```bash
docker build \
  --build-arg NODE_ENV=production \
  -t online-coding-interview .
```

## Running

### Basic Run

```bash
docker run -p 3001:3001 online-coding-interview
```

### With Environment Variables

```bash
docker run -p 3001:3001 \
  -e PORT=3001 \
  -e FRONTEND_URL=https://yourdomain.com \
  online-coding-interview
```

### With Volume Mounts (for development)

```bash
docker run -p 3001:3001 \
  -v $(pwd)/backend/public:/app/backend/public \
  online-coding-interview
```

## Docker Compose

The `docker-compose.yml` file provides a convenient way to run the application:

```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## Health Checks

The container includes a health check that verifies the API is responding:

```bash
# Check container health
docker ps

# Manual health check
curl http://localhost:3001/api/health
```

## Troubleshooting

### Container Won't Start

1. Check logs:
```bash
docker logs online-coding-interview
```

2. Verify port is available:
```bash
lsof -i :3001
```

### Frontend Not Loading

1. Verify static files are copied:
```bash
docker exec online-coding-interview ls -la /app/backend/public
```

2. Check backend logs for static file serving messages

### WebSocket Connection Issues

1. Ensure port 3001 is exposed
2. Check CORS configuration
3. Verify WebSocket gateway is running

## Production Considerations

1. **Use a reverse proxy** (nginx, Traefik) for:
   - SSL/TLS termination
   - Load balancing
   - Rate limiting

2. **Set proper CORS**:
   ```bash
   -e FRONTEND_URL=https://yourdomain.com
   ```

3. **Resource limits**:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 512M
         cpus: '0.5'
   ```

4. **Persistent storage** (if needed for sessions):
   ```bash
   -v session-data:/app/data
   ```

## Image Size Optimization

The current image uses `node:18-alpine` which is already optimized. For further optimization:

1. Use multi-stage builds (already implemented)
2. Remove dev dependencies (already done)
3. Use `.dockerignore` (already configured)

## Security

- Runs as non-root user (Node.js in Alpine)
- No unnecessary packages
- Production dependencies only
- Health checks enabled


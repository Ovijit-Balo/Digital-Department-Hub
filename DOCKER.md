# Docker Setup Guide - Digital Department Hub

This guide covers containerization of the Digital Department Hub using Docker and Docker Compose.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

Installation:
- **Windows/Mac:** [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux:** [Docker Engine](https://docs.docker.com/engine/install/)

Verify installation:
```bash
docker --version
docker-compose --version
```

---

## Project Structure

```
Digital-Department-Hub/
├── backend/
│   ├── Dockerfile              # Backend container image
│   ├── .dockerignore           # Build context exclusions
│   └── src/
│
├── frontend/
│   ├── Dockerfile              # Frontend container image
│   ├── .dockerignore           # Build context exclusions
│   ├── nginx.conf              # Nginx SPA routing config
│   └── src/
│
├── docker-compose.yml          # Development setup
├── docker-compose.prod.yml     # Production overrides
└── DOCKER.md                   # This file
```

---

## Architecture

```
┌──────────────────────────────────────┐
│  docker-compose network (ddh_network)│
├──────────────────────────────────────┤
│                                      │
│  ┌─────────────────────────────────┐ │
│  │  Frontend (Nginx)               │ │
│  │  Port: 3000 (dev) / 80 (prod)   │ │
│  │  - React + Vite build           │ │
│  │  - SPA routing                  │ │
│  │  - Proxies /api to backend      │ │
│  └──────────┬──────────────────────┘ │
│             │                        │
│  ┌──────────▼──────────────────────┐ │
│  │  Backend (Node.js)              │ │
│  │  Port: 5000                     │ │
│  │  - Express API                  │ │
│  │  - Depends: MongoDB, Redis      │ │
│  └──────────┬──────────────────────┘ │
│             │                        │
│  ┌──────────┼──────────────────────┐ │
│  │ ┌────────▼─────────────────────┐│ │
│  │ │  MongoDB                     ││ │
│  │ │  Port: 27017                 ││ │
│  │ │  - Document database         ││ │
│  │ │  - Persistent volume         ││ │
│  │ └──────────────────────────────┘│ │
│  │ ┌────────────────────────────────┐│ │
│  │ │  Redis                         ││ │
│  │ │  Port: 6379                    ││ │
│  │ │  - Cache & job queue           ││ │
│  │ │  - Persistent volume           ││ │
│  │ └────────────────────────────────┘│ │
│  │ ┌────────────────────────────────┐│ │
│  │ │  Worker (Node.js)              ││ │
│  │ │  - Background job processing   ││ │
│  │ │  - Processes Redis queue       ││ │
│  │ └────────────────────────────────┘│ │
│  └──────────────────────────────────┘ │
│                                       │
└───────────────────────────────────────┘
```

---

## Quick Start (Development)

### 1. Start All Services

```bash
cd Digital-Department-Hub

# Build and start all containers
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 2. Verify Services

```bash
# Check running containers
docker-compose ps

# Check service health
docker-compose ps --format "table {{.Service}}\t{{.Status}}"
```

Expected output:
```
SERVICE       STATUS
mongo         Up (healthy)
redis         Up (healthy)
backend       Up (healthy)
frontend      Up (healthy)
worker        Up
```

### 3. Access Services

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **MongoDB:** localhost:27017
- **Redis:** localhost:6379

### 4. Seed Demo Data (Optional)

```bash
docker-compose exec backend npm run seed:demo
```

### 5. Stop Services

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

---

## Environment Variables

Create `.env` file in project root:

```env
# Database
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=password
MONGO_PORT=27017

# Redis
REDIS_PASSWORD=redis
REDIS_PORT=6379

# Backend
NODE_ENV=development
BACKEND_PORT=5000
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug

# Frontend
VITE_API_URL=/api/v1
FRONTEND_PORT=3000

# Storage
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Optional: Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## Building Images

### Build All

```bash
docker-compose build
```

### Build Specific Service

```bash
# Backend
docker-compose build backend

# Frontend
docker-compose build frontend

# With no cache
docker-compose build --no-cache frontend
```

### View Images

```bash
docker images | grep ddh
```

---

## Common Commands

### Logs

```bash
# All services
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Follow backend only
docker-compose logs -f backend

# Filter by timestamp
docker-compose logs --timestamps
```

### Execute Commands

```bash
# Run command in backend
docker-compose exec backend npm run seed:demo

# Connect to MongoDB
docker-compose exec mongo mongosh -u admin -p password

# Connect to Redis
docker-compose exec redis redis-cli

# Access backend shell
docker-compose exec backend sh
```

### Restart

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend

# Force rebuild and restart
docker-compose up -d --build backend
```

### Clean Up

```bash
# Remove stopped containers
docker-compose rm

# Remove images
docker rmi ddh-backend ddh-frontend ddh-worker

# Complete cleanup (volumes deleted!)
docker system prune -a --volumes
```

---

## Development Workflow

### Making Code Changes

Changes are **automatically reflected** in containers:
- Backend: Uses volume mounts, hot-reload via nodemon
- Frontend: Uses volume mounts, Vite hot reload
- No rebuild needed for dev changes

### Rebuilding After package.json Changes

```bash
# Rebuild and restart
docker-compose up -d --build backend

# Or full rebuild
docker-compose down && docker-compose up -d --build
```

### Testing

```bash
# Run tests
docker-compose exec backend npm test

# Watch mode
docker-compose exec backend npm test -- --watch

# Coverage
docker-compose exec backend npm test -- --coverage
```

---

## Production Deployment

### Create docker-compose.prod.yml

```yaml
version: '3.9'

services:
  backend:
    restart: always
    environment:
      NODE_ENV: production

  frontend:
    restart: always
    ports:
      - "80:80"
      - "443:443"

  mongo:
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongo_data:/data/db:delegated

  redis:
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data:delegated
```

### Deploy

```bash
# Build with production settings
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start with production settings
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port in .env
FRONTEND_PORT=3001
BACKEND_PORT=5001
```

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Rebuild from scratch
docker-compose down && docker system prune -a && docker-compose up --build

# Check Dockerfile
docker build ./backend --progress=plain
```

### Database Connection Failed

```bash
# Wait for MongoDB to be ready
docker-compose logs mongo

# Restart database services
docker-compose restart mongo redis

# Check network connectivity
docker-compose exec backend ping mongo
```

### Volumes Not Updating

```bash
# Recreate volumes
docker-compose down -v
docker-compose up -d

# On Windows/Mac, check Docker Desktop settings
# Settings > Resources > File Sharing
```

### Memory Issues

```bash
# Check Docker resource limits
docker stats

# Increase Docker memory limit
# Docker Desktop > Settings > Resources > Memory

# Rebuild lighter images
docker-compose build --no-cache
```

---

## Image Registry (Docker Hub)

### Push Images

```bash
# Tag images
docker tag ddh-backend your-registry/ddh-backend:latest
docker tag ddh-frontend your-registry/ddh-frontend:latest

# Push
docker push your-registry/ddh-backend:latest
docker push your-registry/ddh-frontend:latest
```

### Pull and Run

```bash
docker run -p 5000:5000 your-registry/ddh-backend:latest
docker run -p 3000:80 your-registry/ddh-frontend:latest
```

---

## Health Checks

Each service has a health check endpoint:

- **Backend:** `GET /api/health`
- **Frontend:** `GET /health`
- **MongoDB:** Health check via mongosh
- **Redis:** Health check via redis-cli

View health status:
```bash
docker-compose ps --format "table {{.Service}}\t{{.Status}}"
```

---

## Performance Tips

1. **Use Alpine images** (already done) - smaller, faster
2. **Multi-stage builds** (already done) - smaller final images
3. **Exclude unnecessary files** - .dockerignore
4. **Cache layers** - order commands from stable to frequently-changing
5. **Volume mounts** - mount only what's needed
6. **Restart policies** - already configured

---

## Security Best Practices

- ✅ Non-root user (already implemented)
- ✅ Alpine base images (smaller attack surface)
- ✅ Health checks (detect failures early)
- ✅ Environment variables (secrets not in images)
- ⚠️ Use secrets management in production (Docker Secrets/Swarm)
- ⚠️ Scan images for vulnerabilities: `docker scan ddh-backend`
- ⚠️ Keep base images updated

---

## Next Steps

1. **Local Testing:** `docker-compose up` and verify all services
2. **Production Deployment:** Use docker-compose.prod.yml on server
3. **CI/CD Integration:** Build images in GitHub Actions
4. **Kubernetes:** Deploy with Helm charts for orchestration
5. **Registry:** Push images to Docker Hub/ECR for teams

---

## Support

For Docker issues:
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)

For project-specific help:
- Check logs: `docker-compose logs -f`
- Rebuild: `docker-compose down && docker-compose up --build`
- Reset: `docker-compose down -v`

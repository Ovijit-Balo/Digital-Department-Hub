#!/bin/bash

# Deployment Script for Digital Department Hub
# Runs on server to pull latest code, rebuild, and restart services
# Usage: ./deploy.sh

set -e  # Exit on error

echo "================================"
echo "Deploying Digital Department Hub"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Paths
REPO_DIR="/opt/Digital-Department-Hub"
BACKEND_DIR="$REPO_DIR/backend"
FRONTEND_DIR="$REPO_DIR/frontend"

# Check if directories exist
if [ ! -d "$REPO_DIR" ]; then
    echo -e "${RED}ERROR: Repository not found at $REPO_DIR${NC}"
    exit 1
fi

cd "$REPO_DIR"

# Step 1: Pull latest code
echo -e "\n${YELLOW}[1/5]${NC} Pulling latest code..."
git pull origin main || { echo "Git pull failed"; exit 1; }

# Step 2: Update and build backend
echo -e "\n${YELLOW}[2/5]${NC} Building backend..."
cd "$BACKEND_DIR"
npm install --production
npm run build 2>/dev/null || true  # Build fails silently if no build script
echo -e "${GREEN}Backend ready${NC}"

# Step 3: Update and build frontend
echo -e "\n${YELLOW}[3/5]${NC} Building frontend..."
cd "$FRONTEND_DIR"
npm install --production
npm run build || { echo "Frontend build failed"; exit 1; }
echo -e "${GREEN}Frontend ready${NC}"

# Step 4: Restart backend service
echo -e "\n${YELLOW}[4/5]${NC} Restarting backend service..."
pm2 restart api
sleep 2
echo -e "${GREEN}Backend restarted${NC}"

# Step 5: Reload Nginx
echo -e "\n${YELLOW}[5/5]${NC} Reloading Nginx..."
sudo systemctl reload nginx
echo -e "${GREEN}Nginx reloaded${NC}"

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}================================${NC}"

# Verify services
echo -e "\n${YELLOW}Verifying services...${NC}"
echo "Backend status:"
pm2 status api

echo -e "\nChecking API health..."
curl -s http://localhost:5000/api/health | jq . || echo "API check failed"

echo -e "\n${GREEN}Ready to access: https://csedusc-formula1.farefin.com${NC}"

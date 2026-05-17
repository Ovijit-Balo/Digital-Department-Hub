# Deployment Guide: csedusc-formula1.farefin.com

This guide covers deploying the Digital Department Hub to your Ubuntu 24.04 LTS server.

**Server Details:**
- Hostname: `ip-lab-student-02`
- Public IP: `135.171.216.245`
- OS: Ubuntu 24.04 LTS
- Size: Standard B2s (2 vCPU, 4 GiB RAM)
- Subdomain: `csedusc-formula1.farefin.com`

---

## Architecture Overview

```
csedusc-formula1.farefin.com
          ↓
    [Nginx Reverse Proxy]
          ↓
    ┌─────┴─────┐
    ↓           ↓
  Frontend   Backend API
  (Port 3000) (Port 5000)
    |           |
    ├─ Next.js  ├─ Node.js + Express
    ├─ React    ├─ MongoDB
    └─ Static   └─ Redis
```

**Frontend:** Served as static assets + Next.js/Vite dev server via Nginx proxy
**Backend:** Node.js API running on port 5000
**Database:** MongoDB (can be local or Atlas)
**Reverse Proxy:** Nginx on port 80/443

---

## Pre-Deployment Checklist

- [ ] SSH access to `azureuser@135.171.216.245`
- [ ] DNS A record pointing `csedusc-formula1.farefin.com` to `135.171.216.245`
- [ ] SSL certificate (self-signed or LetsEncrypt)
- [ ] MongoDB instance (local or Atlas)
- [ ] Node.js 20+ installed on server
- [ ] Git clone of this repo

---

## Step 1: SSH into Server

```bash
ssh azureuser@135.171.216.245
# Password: bqaIJ#1xUU+2QdChsNrA1zN^
```

---

## Step 2: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js
node --version
npm --version

# Install Nginx
sudo apt install -y nginx

# Install MongoDB (if running locally)
sudo apt install -y mongodb-org

# Install PM2 for process management
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Verify installations
nginx -v
mongod --version
pm2 --version
```

---

## Step 3: Clone Repository

```bash
cd /opt
sudo git clone https://github.com/your-org/Digital-Department-Hub.git
sudo chown -R azureuser:azureuser Digital-Department-Hub
cd Digital-Department-Hub
```

---

## Step 4: Setup Backend

### 4a. Create Backend Environment File

```bash
cd /opt/Digital-Department-Hub/backend
cp .env.example .env
```

Edit `/opt/Digital-Department-Hub/backend/.env`:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/digital_department_hub
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/digital_department_hub

JWT_SECRET=your-very-long-random-secret-key-min-16-chars-change-this
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_EXPIRES_DAYS=7
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
RUN_WORKER_WITH_API=false
ENABLE_QUEUE=true
STORAGE_PROVIDER=cloudinary
FRONTEND_URL=https://csedusc-formula1.farefin.com
LOG_LEVEL=info
EMAIL_FROM=no-reply@departmenthub.edu
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
```

### 4b. Install Backend Dependencies

```bash
cd /opt/Digital-Department-Hub/backend
npm install
npm run build  # if using TypeScript or build step
```

### 4c. Start Backend with PM2

```bash
pm2 start npm --name "api" -- start
pm2 save
pm2 startup
# Follow the instructions printed
```

Verify backend is running:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"status":"ok","service":"digital-department-hub-api"}
```

---

## Step 5: Setup Frontend

### 5a. Create Frontend Environment File

```bash
cd /opt/Digital-Department-Hub/frontend
cp .env.example .env
```

Edit `/opt/Digital-Department-Hub/frontend/.env`:

```env
VITE_API_URL=https://csedusc-formula1.farefin.com/api/v1
```

### 5b. Build Frontend

```bash
cd /opt/Digital-Department-Hub/frontend
npm install
npm run build
```

This generates a `dist/` folder with static files.

---

## Step 6: Configure Nginx

### 6a. Create Nginx Configuration

```bash
sudo tee /etc/nginx/sites-available/csedusc-formula1 > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name csedusc-formula1.farefin.com;

    # Redirect HTTP to HTTPS (uncomment after SSL setup)
    # return 301 https://$server_name$request_uri;

    # Temporary for testing (remove once HTTPS is working)
    location / {
        root /opt/Digital-Department-Hub/frontend/dist;
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTPS config (add after SSL certificate is obtained)
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name csedusc-formula1.farefin.com;
#
#     ssl_certificate /etc/letsencrypt/live/csedusc-formula1.farefin.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/csedusc-formula1.farefin.com/privkey.pem;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#
#     location / {
#         root /opt/Digital-Department-Hub/frontend/dist;
#         try_files $uri /index.html;
#     }
#
#     location /api/ {
#         proxy_pass http://localhost:5000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_cache_bypass $http_upgrade;
#     }
# }
EOF
```

### 6b. Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/csedusc-formula1 /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # Remove default site if needed

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
sudo systemctl status nginx
```

---

## Step 7: Set Up SSL (Optional but Recommended)

### Using LetsEncrypt Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d csedusc-formula1.farefin.com

# Follow the prompts and agree to terms

# Uncomment HTTPS sections in Nginx config (Step 6a)
sudo nano /etc/nginx/sites-available/csedusc-formula1

# Test and reload
sudo nginx -t
sudo systemctl reload nginx

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Step 8: Database Setup (if not using Atlas)

### Start MongoDB

```bash
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Verify
sudo systemctl status mongodb

# Connect to MongoDB
mongosh
```

### Seed Demo Data (Optional)

```bash
cd /opt/Digital-Department-Hub/backend
npm run seed:demo
```

---

## Step 9: Verify Deployment

### Check Backend Health

```bash
curl https://csedusc-formula1.farefin.com/api/health
```

Expected:
```json
{"status":"ok","service":"digital-department-hub-api"}
```

### Check Frontend

Open your browser and visit:
```
https://csedusc-formula1.farefin.com
```

You should see the Digital Department Hub homepage.

---

## Post-Deployment Tasks

### 1. Monitor Logs

Backend:
```bash
pm2 logs api
```

Nginx:
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Update Content

Log in with your admin credentials and manage:
- News and blogs
- Events
- Scholarships
- User accounts

### 3. Backup Strategy

```bash
# Backup MongoDB
mongodump --out /backups/mongodb-backup-$(date +%Y%m%d)

# Backup application files
sudo tar -czf /backups/app-backup-$(date +%Y%m%d).tar.gz /opt/Digital-Department-Hub

# Upload to cloud storage (S3, Azure Blob, etc.)
```

### 4. Set Up Automatic Restarts

```bash
sudo crontab -e

# Add:
# 0 2 * * * pm2 restart api >> /var/log/pm2-restart.log 2>&1
# 0 3 * * 0 sudo systemctl restart nginx >> /var/log/nginx-restart.log 2>&1
```

---

## Troubleshooting

### Backend won't start
```bash
# Check PM2 logs
pm2 logs api

# Check port 5000 is free
lsof -i :5000

# Check environment variables
pm2 show api
```

### Frontend not loading
```bash
# Check Nginx config
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Rebuild frontend if needed
cd /opt/Digital-Department-Hub/frontend
npm run build
```

### MongoDB connection issues
```bash
# Check MongoDB is running
sudo systemctl status mongodb

# Check connection string in backend/.env
# Verify firewall allows port 27017 (if remote)

# Test connection
mongosh mongodb://127.0.0.1:27017
```

### API calls returning 403 (CORS)
```bash
# Check FRONTEND_URL in backend/.env
# Should be: FRONTEND_URL=https://csedusc-formula1.farefin.com

# Restart backend
pm2 restart api
```

---

## Environment Variables Reference

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Set to production mode |
| `PORT` | `5000` | Backend port (Nginx proxies to this) |
| `MONGODB_URI` | Local or Atlas URI | Database connection |
| `JWT_SECRET` | Long random string | Secure token signing key |
| `FRONTEND_URL` | `https://csedusc-formula1.farefin.com` | CORS allowed origin |
| `VITE_API_URL` | `https://csedusc-formula1.farefin.com/api/v1` | Frontend API base URL |

---

## Quick Redeploy (Pull Latest Changes)

```bash
cd /opt/Digital-Department-Hub
git pull origin main

# Backend
cd backend
npm install
npm run build
pm2 restart api

# Frontend
cd ../frontend
npm install
npm run build

# Reload Nginx (if config changed)
sudo systemctl reload nginx
```

---

## Support

For issues or questions:
1. Check the logs (see Troubleshooting section)
2. Review environment variables match production values
3. Verify DNS/firewall rules
4. Contact your hosting provider for network issues

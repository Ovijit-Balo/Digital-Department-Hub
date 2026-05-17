# README: Deployment for Production

This directory contains files needed to deploy Digital Department Hub to production.

## Files Included

### 📋 Documentation
- **DEPLOYMENT.md** - Complete step-by-step deployment guide
  - Pre-requisites and checklist
  - Installation of dependencies
  - Backend and frontend setup
  - Nginx configuration
  - SSL setup with LetsEncrypt
  - Troubleshooting guide
  - Quick redeploy instructions

### 🚀 Deployment Scripts
- **deploy.sh** - Automated deployment script
  - Pulls latest code from git
  - Rebuilds frontend and backend
  - Restarts services
  - Usage: `./deploy.sh`

### ⚙️ Configuration Templates

#### Environment Files
- **backend/.env.production** - Production backend configuration
- **frontend/.env.production** - Production frontend configuration
- Update these with your actual values before deployment

#### Nginx
- **nginx.conf.example** - Complete Nginx configuration
  - SSL/TLS setup
  - Reverse proxy for API
  - Static file serving for frontend
  - Security headers
  - Gzip compression

## Quick Start (30 minutes)

```bash
# 1. SSH into server
ssh azureuser@135.171.216.245

# 2. Clone repository
cd /opt && git clone <repo-url> && cd Digital-Department-Hub

# 3. Run deployment guide
cat DEPLOYMENT.md

# 4. Setup backend
cd backend && cp .env.production .env
# Edit .env with your actual secrets
npm install && npm start

# 5. Setup frontend
cd ../frontend && cp .env.production .env
npm install && npm run build

# 6. Configure Nginx
sudo cp nginx.conf.example /etc/nginx/sites-available/csedusc-formula1
sudo ln -s /etc/nginx/sites-available/csedusc-formula1 /etc/nginx/sites-enabled/
sudo systemctl reload nginx

# 7. Setup SSL
sudo certbot certonly --nginx -d csedusc-formula1.farefin.com

# 8. Verify
curl https://csedusc-formula1.farefin.com/api/health
```

## Environment Variables

### Backend (.env)
```
MONGODB_URI          MongoDB connection string (Atlas recommended)
JWT_SECRET          Long random secret (min 32 chars, CHANGE THIS!)
FRONTEND_URL        Your frontend domain (must match exactly)
REDIS_HOST          Redis connection (localhost for local)
STORAGE_PROVIDER    cloudinary or s3
```

### Frontend (.env)
```
VITE_API_URL        API base URL (relative /api/v1 or absolute)
```

## Deployment Checklist

Before deploying:
- [ ] DNS A record points to 135.171.216.245
- [ ] MongoDB Atlas account setup + connection string
- [ ] Cloudinary (or S3) account for file uploads
- [ ] SSL certificate (LetsEncrypt)
- [ ] SSH access to server
- [ ] Latest code committed to git

## Continuous Deployment

For automatic redeploy on git push:

```bash
# Setup git webhook receiver (optional)
# Pushes to main branch → auto-deploy
# Run: ./deploy.sh
```

## Monitoring

```bash
# Backend logs
pm2 logs api

# Nginx logs
tail -f /var/log/nginx/csedusc-formula1-access.log
tail -f /var/log/nginx/csedusc-formula1-error.log

# Check service status
pm2 status
pm2 monit
systemctl status nginx
```

## Support

See DEPLOYMENT.md for:
- Detailed troubleshooting
- SSL renewal
- Backup procedures
- Performance tuning
- Security hardening

## Next Steps

1. Read **DEPLOYMENT.md** completely
2. Prepare all required secrets and API keys
3. SSH into server and follow step-by-step guide
4. Test all endpoints with provided curl commands
5. Set up monitoring and backups

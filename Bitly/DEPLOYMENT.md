# 🌐 Bitly Fullstack Production Server Deployment Guide

This guide provides end-to-end instructions for deploying the **Bitly High-Throughput URL Shortener** system to a production Linux server (Ubuntu 22.04 / 24.04 LTS, Debian, CentOS, AWS EC2, DigitalOcean Droplet, Hetzner, etc.).

---

## 🏗️ Architecture Overview

```
                      Internet Traffic
                             │
                             ▼
              ┌─────────────────────────────┐
              │  Nginx Reverse Proxy / SSL  │  (Port 80 / 443)
              │  (Rate Limiting & Gateway)  │
              └──────────────┬──────────────┘
                             │
             ┌───────────────┴───────────────┐
             │                               │
             ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │  React Frontend │             │  Node.js API    │
    │  (SPA Dashboard)│             │  (Port 3000)    │
    └─────────────────┘             └────────┬────────┘
                                             │
                             ┌───────────────┴───────────────┐
                             ▼                               ▼
                    ┌─────────────────┐             ┌─────────────────┐
                    │   Redis 7 LRU   │             │  PostgreSQL 16  │
                    │ & Counter Batch │             │  Relational DB  │
                    └─────────────────┘             └─────────────────┘
```

---

## 🚀 Deployment Option 1: Docker & Docker Compose (Recommended)

Docker Compose bundles PostgreSQL, Redis, the Node.js API, the React Frontend, and Nginx into isolated, self-healing containers with health checks.

### 1. Prerequisites on the Server
Install Docker and Docker Compose plugin:
```bash
# Update and install Docker
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 2. Clone Repository & Configure Environment
```bash
git clone https://github.com/your-username/bitly.git /var/www/bitly
cd /var/www/bitly

# Copy environment template
cp .env.example .env
nano .env
```

Ensure your `.env` has your production secrets:
```env
PORT=3000
BASE_URL=https://yourdomain.com
DATABASE_URL=postgres://postgres:StrongPassword123@postgres:5432/bitly
REDIS_URL=redis://redis:6379
COUNTER_BATCH_SIZE=1000
COUNTER_KEY=bitly:global_counter
INSTANCE_ID=write-worker-1
```

### 3. Build & Launch Containers
```bash
# Start all 5 microservices (Postgres, Redis, Node API, React Frontend, Nginx Gateway)
docker compose up -d --build
```

Verify service status:
```bash
docker compose ps
docker compose logs -f api
```

The app will now be running on port **8080** (or port **80** depending on `docker-compose.yml` port mapping).

---

## 🛠️ Deployment Option 2: Standalone Linux VPS (Nginx + PM2 / Systemd)

For native Linux performance without container virtualization overhead.

### 1. Install Node.js 22, PostgreSQL, Redis, and Nginx
```bash
# 1. Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx postgresql redis-server git

# 2. Enable & start services
sudo systemctl enable --now redis-server postgresql nginx
```

### 2. Configure Database & Schema
```bash
sudo -u postgres psql -c "CREATE USER bitly_user WITH PASSWORD 'SecurePassword123';"
sudo -u postgres psql -c "CREATE DATABASE bitly OWNER bitly_user;"
sudo -u postgres psql -d bitly -f /var/www/bitly/backend/schema.sql
```

### 3. Clone Repository & Build Application
```bash
sudo mkdir -p /var/www/bitly
sudo chown -R $USER:$USER /var/www/bitly
git clone https://github.com/your-username/bitly.git /var/www/bitly
cd /var/www/bitly

# Build both backend and frontend via root script
npm run build:all

# Or build each individually:
# cd backend && npm ci && npm run build && cd ..
# cd frontend && npm ci && npm run build && cd ..
```

The compiled React frontend is now located at `/var/www/bitly/frontend/dist`.

### 4. Configure Production Nginx
Copy the pre-configured Nginx file:
```bash
sudo cp deploy/nginx/bitly.conf /etc/nginx/sites-available/bitly
sudo sed -i 's/yourdomain.com/YOUR_ACTUAL_DOMAIN.com/g' /etc/nginx/sites-available/bitly
sudo ln -s /etc/nginx/sites-available/bitly /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Launch Backend Daemon (Choose PM2 or Systemd)

#### Option A: PM2 Process Manager (Cluster Mode)
```bash
sudo npm install -g pm2
pm2 start deploy/pm2/ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

#### Option B: Systemd Service Unit
```bash
sudo cp deploy/systemd/bitly-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bitly-api
sudo systemctl status bitly-api
```

---

## 🔒 Step-by-Step SSL / HTTPS Setup (Certbot Let's Encrypt)

Run Certbot to automatically configure SSL certificates and HTTPS redirection:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot automatically modifies `/etc/nginx/sites-available/bitly` to redirect HTTP traffic to HTTPS on port 443 with modern TLS ciphers.

---

## 🛡️ Firewall Configuration (UFW)

Protect your server by only allowing SSH, HTTP, and HTTPS:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 🔄 Automated Zero-Downtime Updates

To update your application with new code:
```bash
# Make script executable
chmod +x deploy/scripts/deploy.sh

# Run deployment script
./deploy/scripts/deploy.sh
```

---

## 📊 Telemetry & Health Verification

Once deployed, verify cluster health:
```bash
# Health check endpoint
curl -i http://localhost/api/v1/health

# Distributed counter batch reservation
curl -i http://localhost/api/v1/counter/status

# Test URL creation
curl -X POST http://localhost/api/v1/urls \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"https://news.ycombinator.com"}'
```

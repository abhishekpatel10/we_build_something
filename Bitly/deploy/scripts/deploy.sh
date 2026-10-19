#!/usr/bin/env bash
# ==============================================================================
# Automated Production Deployment Script for Bitly Fullstack App
# Usage: ./deploy/scripts/deploy.sh
# ==============================================================================

set -e

echo "🚀 Starting Bitly Production Deployment..."

PROJECT_DIR="/var/www/bitly"
cd "$PROJECT_DIR"

echo "📥 1. Pulling latest git repository changes..."
git pull origin main

echo "📦 2. Installing Backend Dependencies..."
cd "$PROJECT_DIR/backend"
npm ci --omit=dev

echo "🔨 3. Compiling TypeScript Backend..."
npm run build
cd "$PROJECT_DIR"

echo "⚛️ 4. Building React Application Frontend..."
cd "$PROJECT_DIR/frontend"
npm ci
npm run build
cd "$PROJECT_DIR"

echo "🔄 5. Reloading Services..."
if command -v pm2 &> /dev/null; then
    echo "Reloading PM2 cluster..."
    pm2 reload deploy/pm2/ecosystem.config.cjs --env production
elif systemctl is-active --quiet bitly-api; then
    echo "Restarting Systemd service bitly-api..."
    sudo systemctl restart bitly-api
else
    echo "ℹ️ Neither PM2 nor Systemd service found. Please start your backend process."
fi

echo "🌐 6. Reloading Nginx Configuration..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Bitly Deployment Completed Successfully!"

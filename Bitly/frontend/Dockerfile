# Multi-stage Dockerfile for React SPA Frontend
# Stage 1: Build the Vite React application
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies with caching
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve compiled assets with ultra-lightweight Nginx
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled React build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

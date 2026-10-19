import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.routes.js';
import { urlController } from './controllers/url.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Security and utility middlewares
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging & latency tracking middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = (Number(end - start) / 1e6).toFixed(2);
    // Don't log spam for static files
    if (!req.url.startsWith('/css') && !req.url.startsWith('/js') && !req.url.endsWith('.ico')) {
      console.log(`[HTTP] ${req.method} ${req.url} -> ${res.statusCode} (${durationMs}ms)`);
    }
  });
  next();
});

// Serve frontend static assets (prefers modern React dist if built, falls back to public)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
const publicDir = path.resolve(__dirname, '../public');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
} else if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// API v1 routes
app.use('/api/v1', apiRoutes);

// Short URL redirection route (e.g. GET /:shortCode)
// Placed after API routes so /api/... is not intercepted
app.get('/:shortCode', (req, res) => urlController.redirectUrl(req, res));

// 404 handler for unmatched routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist',
  });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error] Uncaught express error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

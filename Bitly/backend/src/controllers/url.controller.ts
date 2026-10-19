import { Request, Response } from 'express';
import crypto from 'crypto';
import { urlService } from '../services/url.service.js';
import { counterService } from '../services/counter.js';
import { cacheService } from '../cache/redis.js';
import { dbService } from '../db/index.js';

export class UrlController {
  /**
   * POST /api/v1/urls
   * Creates a shortened URL (satisfying Step 2 & 3 API design)
   */
  public async createShortUrl(req: Request, res: Response): Promise<void> {
    try {
      const { originalUrl, alias, expirationTime, userId } = req.body;

      if (!originalUrl) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Field "originalUrl" is required',
        });
        return;
      }

      const result = await urlService.createShortUrl({
        originalUrl,
        alias,
        expirationTime,
        userId,
      });

      res.status(201).json(result);
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({
        error: statusCode === 409 ? 'Conflict' : 'Bad Request',
        message: err.message || 'Internal server error',
      });
    }
  }

  /**
   * GET /api/v1/urls/:shortCode/stats
   * Retrieves analytics, clicks, and referrer breakdown
   */
  public async getUrlStats(req: Request, res: Response): Promise<void> {
    try {
      const { shortCode } = req.params;
      const stats = await urlService.getStats(shortCode);

      if (!stats.url) {
        res.status(404).json({
          error: 'Not Found',
          message: `Short code "${shortCode}" was not found`,
        });
        return;
      }

      res.status(200).json({
        shortCode: stats.url.short_code,
        originalUrl: stats.url.original_url,
        createdAt: stats.url.created_at,
        expiresAt: stats.url.expires_at,
        clickCount: stats.url.click_count,
        isCustom: stats.url.is_custom,
        referrerBreakdown: stats.referrerBreakdown,
        recentClicks: stats.recentClicks,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }

  /**
   * GET /api/v1/urls/recent
   */
  public async getRecentUrls(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt((req.query.limit as string) || '10', 10);
      const urls = await urlService.getRecentUrls(limit);
      res.status(200).json({ urls });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }

  /**
   * GET /api/v1/counter/status
   * Introspects distributed batch allocation
   */
  public async getCounterStatus(_req: Request, res: Response): Promise<void> {
    try {
      const batchInfo = counterService.getBatchInfo();
      res.status(200).json({
        ...batchInfo,
        cacheStats: cacheService.getStats(),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal server error', message: err.message });
    }
  }

  /**
   * GET /api/v1/health
   */
  public async getHealth(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      postgres: {
        connected: dbService.isPgConnected(),
        mode: dbService.isPgConnected() ? 'PostgreSQL' : 'In-Memory Fallback',
      },
      redis: {
        connected: cacheService.isConnected(),
        mode: cacheService.isConnected() ? 'Redis' : 'In-Memory Fallback',
        stats: cacheService.getStats(),
      },
    });
  }

  /**
   * GET /:shortCode
   * Redirection Flow with 302 Found & Latency Header
   */
  public async redirectUrl(req: Request, res: Response): Promise<void> {
    const { shortCode } = req.params;
    const startTime = process.hrtime.bigint();

    // Exclude static assets or dashboard paths
    if (['favicon.ico', 'dashboard', 'robots.txt'].includes(shortCode)) {
      res.status(404).end();
      return;
    }

    try {
      // Extract metadata for analytics
      const referrer = req.headers['referer'] || req.headers['referrer'] || '';
      const userAgent = req.headers['user-agent'] || '';
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const ipHash = ip ? crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16) : undefined;

      const result = await urlService.resolveShortUrl(shortCode, {
        referrer: Array.isArray(referrer) ? referrer[0] : referrer,
        userAgent,
        ipHash,
      });

      const endTime = process.hrtime.bigint();
      const latencyMs = Number(endTime - startTime) / 1e6;

      res.setHeader('X-Response-Time', `${latencyMs.toFixed(3)}ms`);
      res.setHeader('X-Cache-Status', result.fromCache ? 'HIT' : 'MISS');

      if (result.status === 'NOT_FOUND') {
        res.status(404).send(`
          <!DOCTYPE html>
          <html>
            <head><title>404 - Link Not Found</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="background:#0b0f19;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
              <div style="text-align:center;padding:2rem;background:#161f38;border:1px solid #2d3748;border-radius:12px;max-width:400px;">
                <h1 style="color:#f87171;font-size:2rem;margin-top:0;">404 Not Found</h1>
                <p>The shortened link <code>/${shortCode}</code> does not exist or has been removed.</p>
                <a href="/" style="display:inline-block;margin-top:1rem;color:#38bdf8;text-decoration:none;font-weight:600;">Go to Bitly Shortener &rarr;</a>
              </div>
            </body>
          </html>
        `);
        return;
      }

      if (result.status === 'EXPIRED') {
        res.status(410).send(`
          <!DOCTYPE html>
          <html>
            <head><title>410 - Link Expired</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="background:#0b0f19;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
              <div style="text-align:center;padding:2rem;background:#161f38;border:1px solid #2d3748;border-radius:12px;max-width:400px;">
                <h1 style="color:#fbbf24;font-size:2rem;margin-top:0;">410 Expired</h1>
                <p>The short link <code>/${shortCode}</code> has reached its expiration time.</p>
                <a href="/" style="display:inline-block;margin-top:1rem;color:#38bdf8;text-decoration:none;font-weight:600;">Create a new link &rarr;</a>
              </div>
            </body>
          </html>
        `);
        return;
      }

      // Step 3 Decision: 302 Found (Temporary Redirect) for analytics & tracking
      res.redirect(302, result.originalUrl!);
    } catch (err: any) {
      res.status(500).json({ error: 'Server error during redirect', message: err.message });
    }
  }
}

export const urlController = new UrlController();

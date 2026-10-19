import { config } from '../config/index.js';
import { dbService, UrlRecord } from '../db/index.js';
import { cacheService } from '../cache/redis.js';
import { counterService } from './counter.js';

export interface CreateUrlInput {
  originalUrl: string;
  alias?: string;
  expirationTime?: number | string | null;
  userId?: string | null;
}

export interface ShortUrlResponse {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
  isCustom: boolean;
}

export interface ResolveResult {
  status: 'FOUND' | 'NOT_FOUND' | 'EXPIRED';
  originalUrl?: string;
  fromCache?: boolean;
}

const RESERVED_PATHS = new Set([
  'api',
  'health',
  'docs',
  'dashboard',
  'admin',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'public',
  'static',
]);

export class UrlService {
  private getCacheKey(shortCode: string): string {
    return `bitly:url:${shortCode}`;
  }

  /**
   * Calculates remaining TTL in seconds for Redis caching based on expiration date.
   */
  private calculateCacheTtl(expiresAt: Date | null): number {
    if (!expiresAt) {
      return config.cache.ttlSeconds; // Default 24 hours
    }
    const remainingSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    return remainingSeconds > 0 ? Math.min(remainingSeconds, config.cache.ttlSeconds) : 0;
  }

  /**
   * Create a shortened URL
   */
  public async createShortUrl(input: CreateUrlInput): Promise<ShortUrlResponse> {
    // 1. Validate original URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(input.originalUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('URL must use http or https protocol');
      }
    } catch (err: any) {
      const error: any = new Error(err.message || 'Invalid URL format');
      error.statusCode = 400;
      throw error;
    }

    // 2. Parse expiration time
    let expiresAt: Date | null = null;
    if (input.expirationTime) {
      if (typeof input.expirationTime === 'number') {
        // Unix epoch timestamp (seconds or milliseconds)
        expiresAt = input.expirationTime > 1e11 
          ? new Date(input.expirationTime) 
          : new Date(input.expirationTime * 1000);
      } else {
        expiresAt = new Date(input.expirationTime);
      }

      if (isNaN(expiresAt.getTime())) {
        const error: any = new Error('Invalid expirationTime format');
        error.statusCode = 400;
        throw error;
      }

      if (expiresAt.getTime() <= Date.now()) {
        const error: any = new Error('expirationTime must be in the future');
        error.statusCode = 400;
        throw error;
      }
    }

    let shortCode: string;
    let isCustom = false;

    // 3. Handle custom alias or sequential counter generation
    if (input.alias && input.alias.trim()) {
      const alias = input.alias.trim();

      // Check alias characters (a-z, A-Z, 0-9, -, _)
      if (!/^[a-zA-Z0-9_-]{3,32}$/.test(alias)) {
        const error: any = new Error(
          'Custom alias must be between 3 and 32 characters and only contain alphanumeric characters, hyphens, or underscores'
        );
        error.statusCode = 400;
        throw error;
      }

      if (RESERVED_PATHS.has(alias.toLowerCase())) {
        const error: any = new Error(`Alias "${alias}" is a reserved system keyword`);
        error.statusCode = 400;
        throw error;
      }

      // Check for collision
      const existing = await dbService.getUrl(alias);
      if (existing) {
        const error: any = new Error(`Custom alias "${alias}" is already taken`);
        error.statusCode = 409;
        throw error;
      }

      shortCode = alias;
      isCustom = true;
    } else {
      // Distributed Counter -> Feistel Obfuscation -> Base62
      const generated = await counterService.generateShortCode();
      shortCode = generated.shortCode;
    }

    // 4. Persist to PostgreSQL
    const record = await dbService.createUrl({
      shortCode,
      originalUrl: input.originalUrl,
      expiresAt,
      userId: input.userId || null,
      isCustom,
    });

    // 5. Pre-warm Redis cache (Write-Through / Cache-Aside Warmup)
    const cacheTtl = this.calculateCacheTtl(expiresAt);
    if (cacheTtl > 0) {
      await cacheService.set(
        this.getCacheKey(shortCode),
        JSON.stringify({
          original_url: record.original_url,
          expires_at: record.expires_at ? record.expires_at.toISOString() : null,
        }),
        cacheTtl
      );
    }

    return {
      shortCode: record.short_code,
      shortUrl: `${config.baseUrl}/${record.short_code}`,
      originalUrl: record.original_url,
      createdAt: record.created_at.toISOString(),
      expiresAt: record.expires_at ? record.expires_at.toISOString() : null,
      isCustom: record.is_custom,
    };
  }

  /**
   * Resolves a short code to its original URL
   * Follows the Deep Dive 2 & 3 patterns: Redis LRU Read-Through -> PostgreSQL fallback -> 302 Redirect
   */
  public async resolveShortUrl(
    shortCode: string,
    meta: { referrer?: string; userAgent?: string; ipHash?: string }
  ): Promise<ResolveResult> {
    const cacheKey = this.getCacheKey(shortCode);

    // 1. Check Redis Cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.expires_at && new Date(parsed.expires_at).getTime() <= Date.now()) {
          // Expired in cache
          await cacheService.del(cacheKey);
          return { status: 'EXPIRED' };
        }

        // Asynchronously record click analytics without blocking redirect latency
        dbService.recordClick(shortCode, meta).catch((err) => {
          console.warn('[Analytics] Failed to record click:', err);
        });

        return {
          status: 'FOUND',
          originalUrl: parsed.original_url,
          fromCache: true,
        };
      } catch (err) {
        console.warn('[Cache] Error parsing cached URL JSON:', err);
      }
    }

    // 2. Cache Miss: Query PostgreSQL
    const record = await dbService.getUrl(shortCode);
    if (!record) {
      return { status: 'NOT_FOUND' };
    }

    // Check expiration
    if (record.expires_at && record.expires_at.getTime() <= Date.now()) {
      return { status: 'EXPIRED' };
    }

    // 3. Populate Redis Cache
    const cacheTtl = this.calculateCacheTtl(record.expires_at);
    if (cacheTtl > 0) {
      await cacheService.set(
        cacheKey,
        JSON.stringify({
          original_url: record.original_url,
          expires_at: record.expires_at ? record.expires_at.toISOString() : null,
        }),
        cacheTtl
      );
    }

    // 4. Asynchronously record click analytics
    dbService.recordClick(shortCode, meta).catch((err) => {
      console.warn('[Analytics] Failed to record click:', err);
    });

    return {
      status: 'FOUND',
      originalUrl: record.original_url,
      fromCache: false,
    };
  }

  /**
   * Get analytics & stats for a short code
   */
  public async getStats(shortCode: string) {
    return dbService.getStats(shortCode);
  }

  /**
   * List recent shortened URLs
   */
  public async getRecentUrls(limit = 10) {
    return dbService.listRecentUrls(limit);
  }
}

export const urlService = new UrlService();

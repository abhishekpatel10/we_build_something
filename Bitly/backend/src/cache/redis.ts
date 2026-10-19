import { Redis } from 'ioredis';
import { config } from '../config/index.js';

interface CacheEntry {
  value: string;
  expiresAt: number | null;
}

export class CacheService {
  private redis: Redis | null = null;
  private isRedisConnected = false;
  private inMemoryCache = new Map<string, CacheEntry>();
  private inMemoryCounters = new Map<string, bigint>();
  private hitCount = 0;
  private missCount = 0;

  constructor() {
    this.initRedis();
  }

  private initRedis(): void {
    try {
      this.redis = new Redis(config.redis.url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy(times: number) {
          // If in development with fallback, don't spam retries
          if (times > 3) return null;
          return Math.min(times * 200, 1000);
        },
      });

      this.redis.on('connect', () => {
        this.isRedisConnected = true;
        console.log('[Redis] Connected successfully to Redis server');
      });

      this.redis.on('error', (err: any) => {
        if (this.isRedisConnected) {
          console.warn(`[Redis] Connection warning: ${err.message}`);
        }
        this.isRedisConnected = false;
      });

      this.redis.on('close', () => {
        this.isRedisConnected = false;
      });

      // Attempt initial connection asynchronously
      this.redis.connect().catch((_err: any) => {
        console.log(`[Redis] Redis server not detected at ${config.redis.url}. Utilizing high-performance in-memory fallback.`);
        this.isRedisConnected = false;
      });
    } catch (err) {
      console.warn('[Redis] Initialization error, using in-memory cache.');
      this.isRedisConnected = false;
    }
  }

  public isConnected(): boolean {
    return this.isRedisConnected && this.redis !== null;
  }

  /**
   * Atomic increment for Distributed Global Counter (INCRBY)
   */
  public async incrBy(key: string, amount: number): Promise<bigint> {
    if (this.isConnected() && this.redis) {
      try {
        const val = await this.redis.incrby(key, amount);
        return BigInt(val);
      } catch (err) {
        console.warn('[Redis] incrby failed, falling back to local counter:', err);
      }
    }

    // In-memory atomic fallback
    const current = this.inMemoryCounters.get(key) || 1000000n; // Start at 1,000,000 for realistic codes
    const nextVal = current + BigInt(amount);
    this.inMemoryCounters.set(key, nextVal);
    return nextVal;
  }

  /**
   * Cache Get (LRU cache check)
   */
  public async get(key: string): Promise<string | null> {
    if (this.isConnected() && this.redis) {
      try {
        const val = await this.redis.get(key);
        if (val !== null) {
          this.hitCount++;
          return val;
        }
      } catch (err) {
        console.warn(`[Redis] get error for key ${key}, falling back to memory:`, err);
      }
    }

    // Check in-memory store
    const entry = this.inMemoryCache.get(key);
    if (!entry) {
      this.missCount++;
      return null;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.inMemoryCache.delete(key);
      this.missCount++;
      return null;
    }

    // Move to most recently used
    this.inMemoryCache.delete(key);
    this.inMemoryCache.set(key, entry);

    this.hitCount++;
    return entry.value;
  }

  /**
   * Cache Set with TTL
   */
  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? config.cache.ttlSeconds;

    if (this.isConnected() && this.redis) {
      try {
        if (ttl > 0) {
          await this.redis.set(key, value, 'EX', ttl);
        } else {
          await this.redis.set(key, value);
        }
        return;
      } catch (err) {
        console.warn(`[Redis] set error for key ${key}:`, err);
      }
    }

    // In-memory cache with simple LRU cap (10,000 items)
    if (this.inMemoryCache.size > 10000) {
      const oldestKey = this.inMemoryCache.keys().next().value;
      if (oldestKey) this.inMemoryCache.delete(oldestKey);
    }

    const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
    this.inMemoryCache.set(key, { value, expiresAt });
  }

  /**
   * Cache Invalidation
   */
  public async del(key: string): Promise<void> {
    if (this.isConnected() && this.redis) {
      try {
        await this.redis.del(key);
      } catch (err) {
        console.warn(`[Redis] del error for key ${key}:`, err);
      }
    }
    this.inMemoryCache.delete(key);
  }

  public getStats() {
    return {
      connectedToRedis: this.isConnected(),
      inMemoryEntries: this.inMemoryCache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRatio: this.hitCount + this.missCount > 0 
        ? ((this.hitCount / (this.hitCount + this.missCount)) * 100).toFixed(1) + '%' 
        : '0.0%',
    };
  }

  public async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => {});
    }
  }
}

export const cacheService = new CacheService();

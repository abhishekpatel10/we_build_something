import pg from 'pg';
import { config } from '../config/index.js';

export interface UrlRecord {
  short_code: string;
  original_url: string;
  created_at: Date;
  expires_at: Date | null;
  user_id: string | null;
  click_count: number;
  is_custom: boolean;
}

export interface ClickRecord {
  id?: number;
  short_code: string;
  clicked_at: Date;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string | null;
}

export class DatabaseService {
  private pool: pg.Pool | null = null;
  private isConnected = false;

  // In-memory resilient storage engine for development & fallback
  private inMemoryUrls = new Map<string, UrlRecord>();
  private inMemoryClicks: ClickRecord[] = [];
  private clickIdSequence = 1;

  constructor() {
    this.initDatabase();
  }

  private initDatabase(): void {
    const poolConfig: pg.PoolConfig = config.database.url
      ? { connectionString: config.database.url, connectionTimeoutMillis: 2000 }
      : {
          host: config.database.host,
          port: config.database.port,
          user: config.database.user,
          password: config.database.password,
          database: config.database.database,
          connectionTimeoutMillis: 2000,
        };

    try {
      this.pool = new pg.Pool(poolConfig);

      this.pool.on('error', (err) => {
        if (this.isConnected) {
          console.warn('[PostgreSQL] Database pool error:', err.message);
        }
        this.isConnected = false;
      });

      // Test connection
      this.pool
        .connect()
        .then(async (client) => {
          this.isConnected = true;
          console.log('[PostgreSQL] Connected successfully to database');
          await this.runMigrations(client);
          client.release();
        })
        .catch((err) => {
          console.log(
            `[PostgreSQL] PostgreSQL not reachable at ${config.database.host || 'localhost'}. Initializing high-speed in-memory database fallback.`
          );
          this.isConnected = false;
        });
    } catch (err) {
      console.warn('[PostgreSQL] Pool initialization failed, fallback active.');
      this.isConnected = false;
    }
  }

  private async runMigrations(client: pg.PoolClient): Promise<void> {
    const migrationSql = `
      CREATE TABLE IF NOT EXISTS urls (
        short_code VARCHAR(32) PRIMARY KEY,
        original_url TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NULL,
        user_id VARCHAR(64) NULL,
        click_count BIGINT DEFAULT 0,
        is_custom BOOLEAN DEFAULT FALSE
      );

      CREATE INDEX IF NOT EXISTS idx_urls_expires_at ON urls(expires_at) WHERE expires_at IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id) WHERE user_id IS NOT NULL;

      CREATE TABLE IF NOT EXISTS url_clicks (
        id BIGSERIAL PRIMARY KEY,
        short_code VARCHAR(32) NOT NULL REFERENCES urls(short_code) ON DELETE CASCADE,
        clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        referrer TEXT NULL,
        user_agent TEXT NULL,
        ip_hash VARCHAR(64) NULL
      );

      CREATE INDEX IF NOT EXISTS idx_clicks_short_code ON url_clicks(short_code);
      CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON url_clicks(clicked_at DESC);
    `;

    try {
      await client.query(migrationSql);
      console.log('[PostgreSQL] Database tables & B-Tree indexes initialized');
    } catch (err) {
      console.error('[PostgreSQL] Migration error:', err);
    }
  }

  public isPgConnected(): boolean {
    return this.isConnected && this.pool !== null;
  }

  /**
   * Save a new shortened URL
   */
  public async createUrl(url: {
    shortCode: string;
    originalUrl: string;
    expiresAt?: Date | null;
    userId?: string | null;
    isCustom?: boolean;
  }): Promise<UrlRecord> {
    const record: UrlRecord = {
      short_code: url.shortCode,
      original_url: url.originalUrl,
      created_at: new Date(),
      expires_at: url.expiresAt || null,
      user_id: url.userId || null,
      click_count: 0,
      is_custom: url.isCustom || false,
    };

    if (this.isPgConnected() && this.pool) {
      try {
        const query = `
          INSERT INTO urls (short_code, original_url, expires_at, user_id, is_custom)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `;
        const res = await this.pool.query(query, [
          record.short_code,
          record.original_url,
          record.expires_at,
          record.user_id,
          record.is_custom,
        ]);
        const row = res.rows[0];
        return {
          short_code: row.short_code,
          original_url: row.original_url,
          created_at: new Date(row.created_at),
          expires_at: row.expires_at ? new Date(row.expires_at) : null,
          user_id: row.user_id,
          click_count: parseInt(row.click_count || '0', 10),
          is_custom: row.is_custom,
        };
      } catch (err) {
        console.warn('[PostgreSQL] Insert failed, storing in fallback:', err);
      }
    }

    // In-memory fallback
    if (this.inMemoryUrls.has(record.short_code)) {
      const error: any = new Error('Short code already exists');
      error.code = '23505'; // PostgreSQL unique violation code
      throw error;
    }

    this.inMemoryUrls.set(record.short_code, record);
    return record;
  }

  /**
   * Look up URL by short code
   */
  public async getUrl(shortCode: string): Promise<UrlRecord | null> {
    if (this.isPgConnected() && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        return {
          short_code: row.short_code,
          original_url: row.original_url,
          created_at: new Date(row.created_at),
          expires_at: row.expires_at ? new Date(row.expires_at) : null,
          user_id: row.user_id,
          click_count: parseInt(row.click_count || '0', 10),
          is_custom: row.is_custom,
        };
      } catch (err) {
        console.warn('[PostgreSQL] Query failed, falling back to memory:', err);
      }
    }

    return this.inMemoryUrls.get(shortCode) || null;
  }

  /**
   * Asynchronously increments click count and logs analytics record
   */
  public async recordClick(shortCode: string, meta: { referrer?: string; userAgent?: string; ipHash?: string }): Promise<void> {
    const clickedAt = new Date();

    if (this.isPgConnected() && this.pool) {
      try {
        // Atomic increment of clicks counter
        await this.pool.query('UPDATE urls SET click_count = click_count + 1 WHERE short_code = $1', [shortCode]);
        // Insert analytics row
        await this.pool.query(
          'INSERT INTO url_clicks (short_code, clicked_at, referrer, user_agent, ip_hash) VALUES ($1, $2, $3, $4, $5)',
          [shortCode, clickedAt, meta.referrer || null, meta.userAgent || null, meta.ipHash || null]
        );
        return;
      } catch (err) {
        console.warn('[PostgreSQL] Failed to record click in DB:', err);
      }
    }

    // In-memory fallback
    const url = this.inMemoryUrls.get(shortCode);
    if (url) {
      url.click_count += 1;
    }

    this.inMemoryClicks.push({
      id: this.clickIdSequence++,
      short_code: shortCode,
      clicked_at: clickedAt,
      referrer: meta.referrer || null,
      user_agent: meta.userAgent || null,
      ip_hash: meta.ipHash || null,
    });
  }

  /**
   * Retrieve statistics and recent clicks for a short URL
   */
  public async getStats(shortCode: string): Promise<{
    url: UrlRecord | null;
    recentClicks: ClickRecord[];
    referrerBreakdown: { [ref: string]: number };
  }> {
    const url = await this.getUrl(shortCode);
    if (!url) {
      return { url: null, recentClicks: [], referrerBreakdown: {} };
    }

    let recentClicks: ClickRecord[] = [];

    if (this.isPgConnected() && this.pool) {
      try {
        const res = await this.pool.query(
          'SELECT id, short_code, clicked_at, referrer, user_agent, ip_hash FROM url_clicks WHERE short_code = $1 ORDER BY clicked_at DESC LIMIT 20',
          [shortCode]
        );
        recentClicks = res.rows.map((r) => ({
          id: parseInt(r.id, 10),
          short_code: r.short_code,
          clicked_at: new Date(r.clicked_at),
          referrer: r.referrer,
          user_agent: r.user_agent,
          ip_hash: r.ip_hash,
        }));
      } catch (err) {
        console.warn('[PostgreSQL] Error fetching clicks:', err);
      }
    } else {
      recentClicks = this.inMemoryClicks
        .filter((c) => c.short_code === shortCode)
        .slice(-20)
        .reverse();
    }

    const referrerBreakdown: { [ref: string]: number } = {};
    for (const c of recentClicks) {
      const ref = c.referrer || 'Direct / None';
      referrerBreakdown[ref] = (referrerBreakdown[ref] || 0) + 1;
    }

    return {
      url,
      recentClicks,
      referrerBreakdown,
    };
  }

  /**
   * List recent URLs (for UI dashboard)
   */
  public async listRecentUrls(limit = 10): Promise<UrlRecord[]> {
    if (this.isPgConnected() && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM urls ORDER BY created_at DESC LIMIT $1', [limit]);
        return res.rows.map((row) => ({
          short_code: row.short_code,
          original_url: row.original_url,
          created_at: new Date(row.created_at),
          expires_at: row.expires_at ? new Date(row.expires_at) : null,
          user_id: row.user_id,
          click_count: parseInt(row.click_count || '0', 10),
          is_custom: row.is_custom,
        }));
      } catch (err) {
        console.warn('[PostgreSQL] Query failed for listRecentUrls:', err);
      }
    }

    return Array.from(this.inMemoryUrls.values())
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, limit);
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end().catch(() => {});
    }
  }
}

export const dbService = new DatabaseService();

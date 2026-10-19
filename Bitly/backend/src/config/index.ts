import dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  port: number;
  baseUrl: string;
  nodeEnv: string;
  instanceId: string;
  database: {
    url?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
  redis: {
    url: string;
  };
  counter: {
    batchSize: number;
    key: string;
  };
  cache: {
    ttlSeconds: number;
    enableFallback: boolean;
  };
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  instanceId: process.env.INSTANCE_ID || `instance-${Math.random().toString(36).substring(2, 7)}`,
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'bitly',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  counter: {
    batchSize: parseInt(process.env.COUNTER_BATCH_SIZE || '1000', 10),
    key: process.env.COUNTER_KEY || 'bitly:global_counter',
  },
  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '86400', 10),
    enableFallback: process.env.ENABLE_IN_MEMORY_FALLBACK !== 'false',
  },
};

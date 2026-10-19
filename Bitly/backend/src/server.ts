import { app } from './app.js';
import { config } from './config/index.js';
import { dbService } from './db/index.js';
import { cacheService } from './cache/redis.js';

const server = app.listen(config.port, () => {
  console.log(`
=====================================================
🚀 Bitly System Design Service (Node.js/TypeScript)
=====================================================
📡 Listening on:         ${config.baseUrl}
📦 Port:                 ${config.port}
🏷️ Instance ID:          ${config.instanceId}
⚙️ Batch Size:           ${config.counter.batchSize}
🗄️ PostgreSQL:           ${config.database.url ? 'Configured' : `${config.database.host}:${config.database.port}`}
⚡ Redis Cache:          ${config.redis.url}
=====================================================
  `);
});

// Graceful shutdown handling
const handleShutdown = async (signal: string) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

  server.close(async () => {
    console.log('[Server] HTTP connections closed.');
    try {
      await dbService.close();
      console.log('[Server] PostgreSQL pool closed.');
    } catch (e) {
      console.error('[Server] Error closing PostgreSQL pool:', e);
    }

    try {
      await cacheService.close();
      console.log('[Server] Redis connection closed.');
    } catch (e) {
      console.error('[Server] Error closing Redis client:', e);
    }

    console.log('[Server] Graceful shutdown complete. Exiting.');
    process.exit(0);
  });

  // Force exit if hanging
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

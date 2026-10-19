// PM2 Process Manager Configuration for High-Availability Production Cluster
module.exports = {
  apps: [
    {
      name: 'bitly-api',
      cwd: './backend',
      script: './dist/server.js',
      instances: 'max', // Scale to all available CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/bitly-error.log',
      out_file: '/var/log/pm2/bitly-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};

module.exports = {
  apps: [
    {
      name: '3sc-cms',
      script: '.next/standalone/server.js',
      cwd: '/app',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      watch: false,
      max_memory_restart: '512M',
      error_file: '/app/logs/error.log',
      out_file: '/app/logs/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};

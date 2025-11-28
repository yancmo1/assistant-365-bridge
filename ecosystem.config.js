// PM2 ecosystem configuration for assistant-365-bridge
// Deploy with: pm2 start ecosystem.config.js
// View logs: pm2 logs assistant-bridge
// Monitor: pm2 monit

module.exports = {
  apps: [{
    name: 'assistant-bridge',
    script: './src/server.js',
    cwd: '/home/yancy/assistant-365-bridge', // Update this path for Ubuntu
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/assistant-bridge/error.log',
    out_file: '/var/log/assistant-bridge/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};

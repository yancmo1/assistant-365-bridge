# Quick Reference - Assistant 365 Bridge

## Local Development

### Start Server
```bash
npm start
# Server runs on http://localhost:3000
```

### Test Endpoints
```bash
./test-endpoints.sh
# or
./test-endpoints.sh https://assistant.yancmo.xyz
```

### Manual Testing
```bash
# Health check
curl http://localhost:3000/health

# Promote a task
curl -X POST http://localhost:3000/promoteTask \
  -H "Content-Type: application/json" \
  -d '{"title":"My task","importance":"high"}'
```

## PM2 Commands (Ubuntu)

```bash
pm2 start ecosystem.config.js  # Start
pm2 stop assistant-bridge      # Stop
pm2 restart assistant-bridge   # Restart
pm2 logs assistant-bridge      # View logs
pm2 monit                      # Monitor
pm2 list                       # List all apps
```

## Cloudflare Tunnel (Ubuntu)

```bash
# Manual run (testing)
cloudflared tunnel run assistant-bridge

# Service management
sudo systemctl start cloudflared
sudo systemctl stop cloudflared
sudo systemctl status cloudflared
sudo systemctl restart cloudflared

# View logs
sudo journalctl -u cloudflared -f
```

## Project Structure

```
assistant-365-bridge/
├── src/
│   ├── server.js              # Main Express server
│   └── services/
│       └── graphClient.js     # Phase 2: Microsoft Graph integration
├── .env.example               # Environment template
├── ecosystem.config.js        # PM2 configuration
├── assistant-bridge.service   # systemd service file
├── cloudflared-config.yml     # Cloudflare Tunnel config
├── test-endpoints.sh          # Automated testing script
├── DEPLOY.md                  # Full deployment guide
├── README.md                  # Project overview
└── package.json               # Dependencies
```

## API Endpoints

### GET /
Info about available endpoints

### GET /health
Server health check
```json
{"status":"ok","service":"assistant-365-bridge","version":"0.1.0"}
```

### POST /promoteTask
Promote task to Microsoft 365 (currently stubbed)

**Request:**
```json
{
  "title": "Task title",
  "notes": "Optional description",
  "importance": "low|normal|high",
  "dueDate": "YYYY-MM-DD",
  "source": "chatgpt-task-inbox",
  "externalId": "task-3"
}
```

**Response (Phase 1):**
```json
{
  "status": "stubbed",
  "message": "Task accepted but not yet sent to Microsoft 365.",
  "echo": { /* your request */ }
}
```

## Phase 2 TODO

- [ ] Install `@azure/msal-node`
- [ ] Register Azure AD app
- [ ] Implement Device Code Flow
- [ ] Complete `src/services/graphClient.js`
- [ ] Update `/promoteTask` to call Graph API
- [ ] Test real task creation

## Troubleshooting

**Port 3000 in use:**
```bash
lsof -i :3000
kill -9 <PID>
```

**View server logs (PM2):**
```bash
pm2 logs assistant-bridge --lines 100
```

**View server logs (systemd):**
```bash
sudo journalctl -u assistant-bridge -n 100 -f
```

**Restart everything (Ubuntu):**
```bash
pm2 restart assistant-bridge
sudo systemctl restart cloudflared
```

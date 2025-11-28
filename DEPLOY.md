# Ubuntu Server Deployment Guide

## Prerequisites on Ubuntu Server
- Ubuntu 20.04+ 
- Node.js 18+ installed
- Git installed
- Cloudflared installed

## Step-by-Step Deployment

### 1. Clone Repository
```bash
ssh yancy@<your-ubuntu-ip>
cd ~
git clone https://github.com/yancmo1/assistant-365-bridge.git
cd assistant-365-bridge
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Test Server Locally
```bash
npm start
# In another terminal:
curl http://localhost:3000/health
```

### 4. Set Up Cloudflare Tunnel

**Create tunnel (if not already created):**
```bash
cloudflared tunnel login
cloudflared tunnel create assistant-bridge
```

**Configure tunnel:**
```bash
sudo mkdir -p /etc/cloudflared
sudo cp cloudflared-config.yml /etc/cloudflared/config.yml
```

**Update the credentials file path** in `/etc/cloudflared/config.yml`:
- Replace `<TUNNEL-ID>` with your actual tunnel ID
- Find it with: `ls ~/.cloudflared/*.json`

**Route DNS:**
```bash
cloudflared tunnel route dns assistant-bridge assistant.yancmo.xyz
```

**Test tunnel:**
```bash
cloudflared tunnel run assistant-bridge
```

**Verify externally:**
```bash
curl https://assistant.yancmo.xyz/health
```

### 5. Set Up PM2 (Recommended)

**Install PM2 globally:**
```bash
sudo npm install -g pm2
```

**Update ecosystem.config.js** - edit the `cwd` path to match your Ubuntu path:
```bash
nano ecosystem.config.js
# Change: cwd: '/home/yancy/assistant-365-bridge'
```

**Create log directory:**
```bash
sudo mkdir -p /var/log/assistant-bridge
sudo chown -R $USER:$USER /var/log/assistant-bridge
```

**Start with PM2:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Follow the systemd command that PM2 outputs
```

**PM2 Commands:**
```bash
pm2 list                    # Show running apps
pm2 logs assistant-bridge   # View logs
pm2 restart assistant-bridge # Restart app
pm2 stop assistant-bridge   # Stop app
pm2 monit                   # Real-time monitoring
```

### 6. Set Up Cloudflared as System Service

**Install as service:**
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

**Check status:**
```bash
sudo systemctl status cloudflared
```

### 7. Verify Everything Works

**Test locally:**
```bash
curl http://localhost:3000/health
```

**Test via HTTPS:**
```bash
curl https://assistant.yancmo.xyz/health
```

**Test promoteTask:**
```bash
curl -X POST https://assistant.yancmo.xyz/promoteTask \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test from Ubuntu",
    "importance": "normal"
  }'
```

## Alternative: systemd (Instead of PM2)

If you prefer systemd over PM2:

```bash
sudo cp assistant-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable assistant-bridge
sudo systemctl start assistant-bridge
sudo systemctl status assistant-bridge
```

**View logs:**
```bash
sudo journalctl -u assistant-bridge -f
```

## Updating Code

**With PM2:**
```bash
cd ~/assistant-365-bridge
git pull
npm install
pm2 restart assistant-bridge
```

**With systemd:**
```bash
cd ~/assistant-365-bridge
git pull
npm install
sudo systemctl restart assistant-bridge
```

## Troubleshooting

**Server not starting:**
```bash
pm2 logs assistant-bridge --err
# or
sudo journalctl -u assistant-bridge -n 50
```

**Tunnel not working:**
```bash
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
```

**Port 3000 already in use:**
```bash
sudo lsof -i :3000
# Kill the process or change PORT in .env
```

**Can't access via HTTPS:**
- Check DNS: `nslookup assistant.yancmo.xyz`
- Verify tunnel: `cloudflared tunnel list`
- Check tunnel config: `sudo cat /etc/cloudflared/config.yml`

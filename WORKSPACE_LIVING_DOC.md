# 🧠 Assistant 365 Bridge — Workspace Living Document
_Authoritative, always-updated project reference_

---

## 1. Overview

**Assistant 365 Bridge** is a lightweight Node.js backend that exposes a secure HTTPS API for promoting tasks into **Microsoft 365 / Outlook / Microsoft To Do**, triggered by an AI assistant (ChatGPT, Copilot, or a future iOS app).

The service accepts task data → normalizes it → (eventually) calls Microsoft Graph to create tasks in my personal To Do list.

**Current Phase:**  
✔️ Phase 1 (Local + Ubuntu stub deployment) complete  
🟦 Preparing Cloudflare Tunnel configuration  
⬆️ Next major milestone: Phase 2 — Microsoft Graph integration

---

## 2. Current Status

### 🟢 API Status
- Express server running correctly on Ubuntu
- Endpoints:
  - `GET /` — service info
  - `GET /health` — health check (working)
  - `POST /promoteTask` — logs payload with timestamps/emojis (stubbed behavior)

### 🟢 Ubuntu Deployment Status
- Code successfully deployed to:  
  `/opt/apps/assistant-365-bridge`
- Verified with:
  - `npm start`
  - Successful `/promoteTask` log:
    - _“Test from Ubuntu — Deployed successfully”_
- Logging works as designed (timestamps + emoji sections)

### � Cloudflare Tunnel - WORKING
- ✅ Tunnel configured via Zero Trust dashboard
- ✅ Public hostname added: `assistant.yancmo.xyz` → `localhost:3000`
- ✅ HTTPS endpoint responding correctly
- ✅ DNS CNAME record: `assistant` → tunnel ID
- **Public URL:** https://assistant.yancmo.xyz

### 🟢 PM2 Process Manager - RUNNING
- ✅ PM2 running the Node.js server
- ✅ Process name: `assistant-bridge`
- ✅ Auto-restart enabled
- ⚠️ PM2 startup not yet configured (won't auto-start on server reboot)

### 🔵 Microsoft Graph Integration
- `graphClient.js` scaffolded  
- No real calls yet — will be Phase 2

---

## 3. How to Run Locally (Mac)

From the project root:

```bash
npm install
npm start
```

Health check:

```bash
curl http://localhost:3000/health
```

Promote task (stub):

```bash
curl -X POST http://localhost:3000/promoteTask \
  -H "Content-Type: application/json" \
  -d '{"title":"Local test","notes":"testing"}'
```

---

## 4. How to Run on Ubuntu Server (One-Line SSH)

**All** remote commands must follow this pattern:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && <command>"
```

### Common Commands

Check directory:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && pwd"
```

List files:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && ls"
```

Pull latest:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && git pull"
```

Install dependencies:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && npm install"
```

Start server:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && npm start"
```

Test health:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && curl http://localhost:3000/health"
```

---

## 5. Cloudflare Tunnel

### 🟦 Current Step — Configure Tunnel

Goal:  
Publicly expose the API via Cloudflare →  
**https://assistant.yancmo.xyz**

### Commands (to be run manually)

#### 1. Create tunnel:

```bash
cloudflared tunnel create assistant-bridge
```

#### 2. Route DNS:

```bash
cloudflared tunnel route dns assistant-bridge assistant.yancmo.xyz
```

#### 3. Tunnel config file:
`/etc/cloudflared/config.yml`

```yaml
tunnel: assistant-bridge
credentials-file: /root/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: assistant.yancmo.xyz
    service: http://localhost:3000
  - service: http_status:404
```

#### 4. Run tunnel for testing:

```bash
cloudflared tunnel run assistant-bridge
```

### Expected Result
- `https://assistant.yancmo.xyz/health` returns JSON
- `/promoteTask` logs show externally-requested tasks

### After Tunnel Works
- Enable systemd for auto-start  
- Configure PM2 / systemd for Node app next

---

## 6. Microsoft Graph Integration (Phase 2)

### Status
- Not yet wired  
- Needs Azure AD application + delegated auth  

### Planned Steps
1. Register Azure AD application  
2. Add delegated permissions:
   - `Tasks.ReadWrite`
   - `User.Read`
   - `offline_access`
3. Implement `msal-node` authentication  
4. Add `createTodoTask()` logic  
5. Replace `/promoteTask` stub with real Graph call  
6. Update logs and responses with actual task IDs

---

## 7. Quick Commands Reference

### SSH Pattern

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && <command>"
```

### Frequent Tasks

| Action | Command |
|--------|---------|
| Check health | `ssh ... "curl http://localhost:3000/health"` |
| Pull latest | `ssh ... "git pull"` |
| Install deps | `ssh ... "npm install"` |
| Start server | `ssh ... "npm start"` |
| Restart PM2 | `ssh ... "pm2 restart assistant-bridge"` |
| Tail logs | `ssh ... "pm2 logs assistant-bridge"` |

---

## 8. Change Log

### **2025-11-28** (Evening Update)
- ✅ **Cloudflare Tunnel fully configured and working**
- ✅ Public endpoint live: `https://assistant.yancmo.xyz`
- ✅ PM2 running server (process: `assistant-bridge`)
- ✅ All endpoints tested via public HTTPS:
  - `GET /health` → responding
  - `POST /promoteTask` → logging correctly with timestamps/emojis
- DNS CNAME added via Cloudflare dashboard
- Public hostname configured via Zero Trust dashboard
- **Phase 1 deployment: COMPLETE** 🎉
- Next: Configure PM2 startup, then Phase 2 (Graph integration)

### **2025-11-28** (Initial)
- Updated living doc to reflect true deployment state  
- Node API confirmed running on Ubuntu  
- `/promoteTask` and `/health` tested successfully  
- Current active task: **Configure Cloudflare Tunnel (assistant-bridge)**  
- PM2 planned after tunnel verification

### **2025-11-27**
- Completed Phase 1 local development  
- Initial commit pushed to GitHub  
- Deployment guides and instructions created  
- Graph client scaffold prepared  

---

*End of file — this document must always reflect reality and stay updated*
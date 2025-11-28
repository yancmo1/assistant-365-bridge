# 🧠 Assistant 365 Bridge — Workspace Living Document
_Authoritative, always-updated project reference_

---

## 1. Overview

**Assistant 365 Bridge** is a lightweight Node.js backend that exposes a secure HTTPS API for promoting tasks into **Microsoft 365 / Outlook / Microsoft To Do**, triggered by an AI assistant (ChatGPT, Copilot, or a future iOS app).

The service accepts task data → normalizes it → (eventually) calls Microsoft Graph to create tasks in my personal To Do list.

**Current Phase:**  
✔️ Phase 1 (Local + Ubuntu stub deployment) complete  
✔️ Phase 2 (Microsoft Graph integration) complete  
✔️ Phase 3 (Hardening & Safety) complete  
✔️ Phase 4 (Assistant-Level Features) **COMPLETE AND LIVE**  
⬆️ Next: ChatGPT Actions integration

---

## 2. Current Status

### 🟢 API Status
- Express server running on Ubuntu with PM2 (**v0.3.0**)
- Endpoints:
  - `GET /` — service info (public)
  - `GET /health` — health check with uptime & Graph status (public)
  - `GET /status` — Graph connectivity test (🔒 requires API key)
  - `POST /promoteTask` — creates Microsoft To Do tasks (🔒 requires API key)
  - `GET /tasks` — list tasks with filters (🔒 requires API key)
  - `POST /completeTask` — mark task completed (🔒 requires API key)
- **LIVE at:** https://assistant.yancmo.xyz
- **API Key Header:** `X-Assistant-Key`

### 🟢 Ubuntu Deployment Status
- Code deployed to: `/opt/apps/assistant-365-bridge`
- Running via PM2 process manager
- Process name: `assistant-bridge`
- Auto-restart on crashes: enabled
- Auto-start on boot: enabled (systemd integration)
- Logging: `/var/log/assistant-bridge/`

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
- ✅ **PM2 startup configured** (auto-starts on server reboot via systemd)
- ✅ Environment variables loaded from `ecosystem.config.cjs`

### � Microsoft Graph Integration - **LIVE**
- ✅ Azure AD app registered
- ✅ Client ID: `e83ffde7-fd3b-4a68-9640-5145a6cfe199`
- ✅ Tenant ID: `423b97b0-60e3-4a54-8b10-793db504ecb3`
- ✅ Permissions configured: `Tasks.ReadWrite`, `User.Read`, `offline_access`
- ✅ Authentication: Device Code Flow (delegated)
- ✅ Refresh token stored securely in `/opt/apps/assistant-365-bridge/data/tokens.json`
- ✅ **Category routing:** `work` → Work list, `personal` → Tasks list
- ✅ **Creating real tasks in Microsoft To Do**
- ✅ Signed in as: `yshepherd@gamingcapitalgroup.com`

### 🟢 Phase 3 Security — IMPLEMENTED
- ✅ API key middleware for protected endpoints
- ✅ Input validation with structured error responses
- ✅ Structured logging utility (`src/utils/logger.js`)
- ✅ Enhanced `/health` with uptime and Graph status
- ✅ `/status` endpoint for Graph connectivity testing

### 🟢 Phase 4 Features — IMPLEMENTED
- ✅ Category support (`work` / `personal`)
- ✅ `GET /tasks` with filtering (category, top, includeCompleted)
- ✅ `POST /completeTask` to mark tasks done
- ✅ Improved `/promoteTask` response with category info

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

Promote task (creates real Microsoft To Do task):

```bash
curl -X POST http://localhost:3000/promoteTask \
  -H "Content-Type: application/json" \
  -d '{"title":"Local test","notes":"testing","importance":"high","dueDate":"2025-12-10"}'
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

## 5. Production API Usage

### Public Endpoint
**Base URL:** `https://assistant.yancmo.xyz`  
**API Key Header:** `X-Assistant-Key: <your-api-key>`

### Endpoints Summary

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /` | Public | Service info |
| `GET /health` | Public | Health + uptime + graphStatus |
| `GET /status` | 🔒 API Key | Graph connectivity test |
| `POST /promoteTask` | 🔒 API Key | Create task (supports category) |
| `GET /tasks` | 🔒 API Key | List tasks with filters |
| `POST /completeTask` | 🔒 API Key | Mark task completed |

### Create Task in Microsoft To Do

```bash
curl -X POST https://assistant.yancmo.xyz/promoteTask \
  -H "Content-Type: application/json" \
  -H "X-Assistant-Key: YOUR_API_KEY" \
  -d '{
    "title": "Task from AI Assistant",
    "notes": "Task details and context",
    "importance": "high",
    "dueDate": "2025-12-10",
    "category": "work",
    "source": "chatgpt-task-inbox",
    "externalId": "task-123"
  }'
```

### Response (Success)

```json
{
  "status": "created",
  "microsoftTaskId": "AAMkAGQ3N2FkNmQxLTE5ZDAtNDlmYS1hMzhmLThhZTlhMWVkN2JmNQBG...",
  "listDisplayName": "Work",
  "category": "work",
  "title": "Task from AI Assistant",
  "importance": "high",
  "createdDateTime": "2025-11-28T13:58:27.4540135Z"
}
```

### List Tasks

```bash
curl -X GET "https://assistant.yancmo.xyz/tasks?category=work&top=10" \
  -H "X-Assistant-Key: YOUR_API_KEY"
```

### Complete a Task

```bash
curl -X POST https://assistant.yancmo.xyz/completeTask \
  -H "Content-Type: application/json" \
  -H "X-Assistant-Key: YOUR_API_KEY" \
  -d '{"taskId": "MICROSOFT_TASK_ID", "category": "work"}'
```

Tasks appear immediately in **Microsoft To Do** (Work or Tasks list based on category).

---

## 6. Cloudflare Tunnel

### � Tunnel Status — LIVE

✅ **Fully configured and operational**

- Public hostname: `https://assistant.yancmo.xyz`
- Backend: `localhost:3000`
- DNS: CNAME record configured via Cloudflare dashboard
- Zero Trust: Public hostname added via dashboard
- Status: Production-ready

### Commands (reference)

These commands were used during setup and are here for reference:

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
✅ **ACHIEVED**
- `https://assistant.yancmo.xyz/health` returns JSON
- `/promoteTask` creates real Microsoft To Do tasks
- All endpoints accessible via HTTPS

---

## 7. Microsoft Graph Integration (Phase 2) — **COMPLETE**

### Status
✅ **Fully implemented and operational**

### Implementation Details
1. ✅ Azure AD application registered
   - Client ID: `e83ffde7-fd3b-4a68-9640-5145a6cfe199`
   - Tenant ID: `423b97b0-60e3-4a54-8b10-793db504ecb3`
2. ✅ Delegated permissions configured:
   - `Tasks.ReadWrite`
   - `User.Read`
   - `offline_access`
3. ✅ Implemented `@azure/msal-node` authentication with Device Code Flow
4. ✅ Complete `graphClient.js` with:
   - Token refresh and caching
   - Task list discovery
   - Task creation with all fields
5. ✅ `/promoteTask` endpoint wired to real Graph API
6. ✅ Authentication script: `src/auth-setup.js`
7. ✅ Secure token storage: `./data/tokens.json` (0600 permissions)

### Files
- `/src/server.js` — Express server with all endpoints and middleware
- `/src/services/graphClient.js` — Microsoft Graph client with category routing
- `/src/utils/logger.js` — Structured logging utility
- `/src/auth-setup.js` — One-time authentication setup
- `/data/tokens.json` — Refresh token (not in Git)
- `ecosystem.config.cjs` — PM2 config with Azure env vars and API_SECRET
- `AZURE-SETUP.md` — Complete setup guide (in .gitignore)

### Re-authentication (if needed)

If tokens expire or need refresh:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && node src/auth-setup.js"
```

Follow the Device Code Flow instructions, then restart PM2:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && pm2 restart assistant-bridge"
```

---

## 8. Quick Commands Reference

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

| Action | Command |
|--------|---------|
| Check health | `ssh ... "curl http://localhost:3000/health"` |
| Pull latest | `ssh ... "git pull"` |
| Install deps | `ssh ... "npm install"` |
| Start server | `ssh ... "npm start"` |
| Start with PM2 | `ssh ... "pm2 start ecosystem.config.cjs"` |
| Restart PM2 | `ssh ... "pm2 restart assistant-bridge"` |
| Tail logs | `ssh ... "pm2 logs assistant-bridge --lines 50"` |
| Re-authenticate | `ssh ... "node src/auth-setup.js"` |
| Test public API | `curl https://assistant.yancmo.xyz/health` |
| Test protected API | `curl -H "X-Assistant-Key: KEY" https://assistant.yancmo.xyz/status` |

---

## 9. Change Log

### **2025-11-28** (Phase 3 & 4 Complete - Evening)
- 🎉 **Phase 3 Hardening & Safety: COMPLETE**
  - ✅ API key middleware (`X-Assistant-Key` header)
  - ✅ Enhanced `/health` with uptime and Graph connectivity status
  - ✅ New `/status` endpoint for Graph connectivity testing
  - ✅ Input validation with structured error messages
  - ✅ Structured logging utility (`src/utils/logger.js`)
- 🎉 **Phase 4 Assistant-Level Features: COMPLETE**
  - ✅ Category support: `work` → Work list, `personal` → Tasks list
  - ✅ `GET /tasks` — list tasks with filtering (category, top, includeCompleted)
  - ✅ `POST /completeTask` — mark tasks as completed
  - ✅ Improved `/promoteTask` response with category info
  - ✅ Work list auto-created on first work task
- ✅ All endpoints smoke tested via production HTTPS
- ✅ Version bumped to 0.3.0
- ✅ Pushed to GitHub (excluding AZURE-SETUP.md with secrets)
- **API Key configured in ecosystem.config.cjs on server**

### **2025-11-28** (Phase 2 Complete - Evening)
- 🎉 **Phase 2 Microsoft Graph Integration: COMPLETE AND LIVE**
- ✅ Fixed auth-setup.js to properly extract refresh token from MSAL cache
- ✅ Re-authenticated and saved refresh token to data/tokens.json
- ✅ Updated ecosystem.config.cjs with explicit Azure environment variables
- ✅ **First real task created:** "🚀 Phase 2 Live Test"
  - Microsoft Task ID: `AAMkAGQ3N2FkNmQxLTE5ZDAtNDlmYS1hMzhmLThhZTlhMWVkN2JmNQ...`
  - Created in Microsoft To Do → Tasks list
  - Timestamp: 2025-11-28T13:58:27Z
- ✅ API now creates real Microsoft To Do tasks instead of stubbed responses
- ✅ Authenticated as: yshepherd@gamingcapitalgroup.com
- ✅ Token refresh working automatically
- **Production ready:** https://assistant.yancmo.xyz/promoteTask fully operational

### **2025-11-28** (Phase 2 Implementation)
- ✅ PM2 startup configured with systemd for auto-restart on reboot
- ✅ Implemented complete Microsoft Graph integration:
  - @azure/msal-node authentication
  - Device Code Flow for delegated permissions
  - Token storage and refresh logic
  - graphClient.js with all Graph API functions
- ✅ Created AZURE-SETUP.md comprehensive guide
- ✅ Created auth-setup.js authentication script
- ✅ Azure AD app registered with proper permissions
- ✅ Environment variables configured in ecosystem.config.cjs
- ✅ Deployed Phase 2 code to Ubuntu server

### **2025-11-28** (Phase 1 Complete - Morning)
- ✅ **Cloudflare Tunnel fully configured and working**
- ✅ Public endpoint live: `https://assistant.yancmo.xyz`
- ✅ PM2 running server (process: `assistant-bridge`)
- ✅ All endpoints tested via public HTTPS:
  - `GET /health` → responding
  - `POST /promoteTask` → logging correctly with timestamps/emojis (stub)
- DNS CNAME added via Cloudflare dashboard
- Public hostname configured via Zero Trust dashboard
- **Phase 1 deployment: COMPLETE** 🎉

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
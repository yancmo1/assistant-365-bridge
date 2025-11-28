# Assistant 365 Bridge — Phase 3 & 4 Product Requirements Document (PRD)

## Document Purpose
This PRD defines the next two phases of development for the Assistant 365 Bridge backend after achieving successful Microsoft To Do task creation via Graph API. This document establishes goals, requirements, architecture changes, API additions, and acceptance criteria.

---

# 1. Overview

Assistant 365 Bridge is now able to:
- Accept incoming task promotion requests  
- Authenticate with Microsoft Graph using Device Code  
- Create tasks in Microsoft To Do ("Tasks" list)

The next phases focus on:
- Reliability & security  
- Expanding the API  
- Enabling richer assistant interaction  
- Preparing for ChatGPT tool integration  
- Supporting future iOS/Shortcut workflows  

---

# 2. Goals (Phase 3 – Hardening & Safety)

### 2.1 Improve Reliability
- Strengthen `/promoteTask` with:
  - Input validation  
  - Normalization  
  - Error mapping  
  - Consistent structured JSON responses  
- Add better logging (structured + timestamp + status codes)

### 2.2 Add Basic Security
- Add requirement for a secret API key header:
  - `X-Assistant-Key: <long-random-secret>`
- Reject all requests missing or mismatched

### 2.3 Improve Health & Observability
- Enhance `/health` to include:
  - `version`, `uptimeSeconds`, `graphStatus`
- Add optional `/status` for debugging:
  - Attempts a simple Graph `/me` call
  - Returns `'ok' | 'authRequired' | 'error'`

### 2.4 Server Stability
- PM2 or systemd process supervision  
- Logs rotation recommendations  
- Confirm Cloudflare Tunnel auto-start on boot  

---

# 3. Goals (Phase 4 – Assistant-Level Features)

### 3.1 Add Support for Task Categories / Multiple Lists
**New field:** `category` → `"work" | "personal"`

Mapping:
- `work` → “Work” list (or creates if missing)
- `personal` → default “Tasks” list

### 3.2 Add `/listTasks` Endpoint
`GET /tasks?category=work&top=10`

Returns:
- `title`
- `createdDateTime`
- `dueDate`
- `importance`
- `status`
- `listDisplayName`
- `microsoftTaskId`

Supports daily summary routines.

### 3.3 Add `/completeTask` Endpoint
`POST /completeTask`

Body:
```json
{
  "microsoftTaskId": "<id>",
  "category": "work"
}
```

Marks a task complete.

### 3.4 Improved `/promoteTask` Response
Now returns:
```json
{
  "status": "created",
  "title": "...",
  "microsoftTaskId": "abc123",
  "list": "Work",
  "dueDate": "2025-12-01"
}
```

---

# 4. API Additions & Requirements

## 4.1 Header Authentication (Required)
All endpoints require:

```
X-Assistant-Key: <from .env>
```

Configurable via `.env`:
```
API_SECRET=<random-long-secret-here>
```

## 4.2 New Endpoints

### `/tasks`
- Method: `GET`
- Query params:
  - `category` (optional)
  - `top` (default 10)
- Returns list of tasks

### `/completeTask`
- Method: `POST`
- Body: `microsoftTaskId`, `category`
- Marks the task as completed in the selected list

---

# 5. Code Changes Requirement Summary

### Server (Express)
- Add API key middleware
- Add new routes `/tasks` + `/completeTask`
- Improve `/promoteTask`
- Update `/health`

### Services
- Update `graphClient.js`:
  - `getListIdByCategory()`
  - `listTasks()`
  - `completeTask()`

### Auth
- No major changes; device code cache persists tokens.

---

# 6. Acceptance Criteria

### Phase 3
- Server requires API key for all calls
- `/promoteTask` handles invalid input gracefully
- `/health` shows Graph status and uptime
- PM2/systemd configured (auto restart)
- Cloudflare Tunnel persistent after reboot

### Phase 4
- `/tasks` returns valid list from Graph
- `/completeTask` marks tasks complete
- `/promoteTask` routes tasks by category
- ChatGPT tool schema draft completed
- Server logs success/error for all task operations

---

# 7. Out-of-Scope (Future Phases)
- Full iOS app  
- WatchOS complication routing  
- Per-user multi-tenant authentication  
- Web dashboard UI  

---

# 8. Next Actions Checklist

### Developer Tasks
- [ ] Implement API key middleware  
- [ ] Add category → list routing  
- [ ] Add `/tasks` endpoint  
- [ ] Add `/completeTask` endpoint  
- [ ] Improve `/promoteTask` error handling  
- [ ] Update `WORKSPACE_LIVING_DOC.md` after each milestone  

### Ops Tasks
- [ ] Configure PM2 auto-start  
- [ ] Configure Cloudflare Tunnel auto-start  
- [ ] Test full reboot scenario  

### ChatGPT Integration Tasks
- [ ] Create action schema for `/promoteTask`  
- [ ] Validate error responses  
- [ ] Add daily 8am review command flow  

---

# 9. Version

**PRD Version:** 0.1  
**Date:** {{today}}  
**Author:** Yancy Shepherd & Assistant 365 Bridge  
**Status:** Approved for development (Phase 3/4)

---

*End of PRD*
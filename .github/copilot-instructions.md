# Assistant 365 Bridge - AI Agent Instructions

## Project Purpose

This is a minimal Node.js Express backend that bridges AI assistants to Microsoft 365 To Do. It exposes an HTTPS API (via Cloudflare Tunnel) allowing AI tools to promote tasks into the user's Microsoft To Do "Tasks" list by calling `/promoteTask`.

**Current Phase:** Phase 1 (MVP stub) - API endpoints exist but don't yet integrate with Microsoft Graph. Phase 2 will add OAuth and real Graph API integration.

## Architecture Overview

**Single-file Express server** (`src/server.js`) with two endpoints:
- `GET /health` - uptime check for monitoring
- `POST /promoteTask` - accepts task payloads, currently logs only (will call Microsoft Graph in Phase 2)

**Deployment model:** Runs on Ubuntu server, exposed via Cloudflare Tunnel at `https://assistant.yancmo.xyz`

**Future flow:** AI assistant → `/promoteTask` → Microsoft Graph → Microsoft To Do "Tasks" list

## Key Technical Conventions

### Module System
- Uses **ES modules** (`"type": "module"` in `package.json`)
- All imports use `import/export` syntax, NOT `require()`

### Dependencies
- **express** - web framework
- **dotenv** - environment configuration via `.env` file
- Port from `process.env.PORT` or default `3000`

### Code Style
- Minimal, focused implementation - avoid over-engineering
- Console logging for debugging (`console.log()` is expected)
- JSON responses for all endpoints
- Simple route handlers inline in `server.js` (no separate route files yet)

## API Contract (for AI Tools)

When implementing or testing endpoints, follow the exact schema from `README.md`:

### POST /promoteTask
**Phase 1 (current):** Logs payload, returns stubbed response
**Phase 2 (future):** Will authenticate with Microsoft Graph and create actual task

Expected request body:
```json
{
  "title": "Task title (required)",
  "notes": "Optional description",
  "importance": "low|normal|high",
  "dueDate": "YYYY-MM-DD (ISO format)",
  "source": "chatgpt-task-inbox",
  "externalId": "task-3"
}
```

Current stub response:
```json
{
  "status": "stubbed",
  "message": "Task accepted but not yet sent to Microsoft 365.",
  "echo": { /* original payload */ }
}
```

## Development Workflow

**Start server:** `npm start` or `npm run dev` (both run `node src/server.js`)
**Test locally:** `curl http://localhost:3000/health`
**Test via tunnel:** `curl https://assistant.yancmo.xyz/health` (if Cloudflare Tunnel configured)

**Adding features:** Keep changes in `src/server.js` for now. Don't create separate route files unless complexity demands it.

## Phase 2 Preparation Notes

When implementing Microsoft Graph integration:
- Will need `@azure/msal-node` for delegated OAuth (Authorization Code or Device Code flow)
- Target permissions: `Tasks.ReadWrite` (delegated), `offline_access`, `User.Read`
- Store refresh tokens securely on Ubuntu filesystem (not in Git)
- Create `src/services/graphClient.js` for Microsoft Graph API wrapper
- Endpoint: `POST https://graph.microsoft.com/v1.0/me/todo/lists/{list-id}/tasks`
- Must find "Tasks" list ID on first run and cache it

## What NOT to Do

- Don't add TypeScript without explicit request (currently vanilla JS)
- Don't create database layer - this is intentionally stateless
- Don't add authentication middleware yet - Phase 1 is open for testing
- Don't refactor into multiple files prematurely - keep it simple
- Don't assume CommonJS - always use ES module syntax

## Testing Approach

Manual testing with curl/Postman is expected. Example:
```bash
curl -X POST http://localhost:3000/promoteTask \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task","importance":"high"}'
```

Check server console for logged payload.

## Key Files Reference

- `package.json` - dependencies, scripts, ES module config
- `src/server.js` - entire application (Express setup, routes, server startup)
- `README.md` - comprehensive spec including Phase 2 roadmap and API contract

# Copilot Instructions — Assistant 365 Bridge

You are my **development assistant** for the `assistant-365-bridge` project.

Your primary goals:

1. Help me build and maintain a small Node.js backend that lets my AI assistant promote tasks to Microsoft 365 / Outlook / To Do.
2. Help me run commands on my remote Ubuntu server by **generating exact SSH commands** I can copy/paste.
3. Keep a **living workspace document** updated with clear status, instructions, and change history so I can send it back into ChatGPT later.

This file defines how you should behave in VS Code.

---

## 1. Project Overview

**Project name:** Assistant 365 Bridge  
**Purpose:** Provide an HTTPS API that an AI assistant can call to:

- Accept task promotion requests (e.g. “Promote task 3 to 365”)
- Eventually call Microsoft Graph to create tasks in my **Microsoft To Do → Tasks list**

**Current state (Phase 1):**

- Node.js + Express API
- Endpoints:
  - `GET /` → service info
  - `GET /health` → health check
  - `POST /promoteTask` → accepts task data, logs it, returns stubbed response
- Running locally and on Ubuntu
- Pretty console logging for `/promoteTask`
- Graph client scaffolding exists but is not yet wired to real Microsoft 365 calls

---

## 2. Environments

### Local (Mac)

You may edit files, propose commands, and help manage Git, but **do not assume** commands run on the Mac unless I specifically say so.

### Remote (Ubuntu server)

This is where the backend runs in production.

**Remote SSH details:**

- **User:** `yancmo`
- **Host:** `100.105.31.42`
- **Project directory on server:** `/opt/apps/assistant-365-bridge`

All remote commands must be written using **single-line SSH commands** (see below).

---

## 3. Critical SSH Behavior

You **must not** rely on any existing interactive SSH session.  
Assume that each terminal command I run in VS Code is a fresh, local shell.

Therefore, **every remote command you propose must:**

1. Open SSH to `yancmo@100.105.31.42`
2. `cd` into `/opt/apps/assistant-365-bridge`
3. Run the intended command
4. All in **ONE line**

### 3.1 Required command pattern

Always use this base pattern for remote work:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && <YOUR_COMMAND_HERE>"
```

### 3.2 Examples you should follow exactly

- Check working directory:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && pwd"
```

- List files:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && ls"
```

- Install dependencies:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && npm install"
```

- Start the server (foreground):

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && npm start"
```

- Test health endpoint:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && curl http://localhost:3000/health"
```

- Pull latest code and restart via PM2 (if configured):

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && git pull && npm install && pm2 restart assistant-bridge"
```

### 3.3 Never do

- Never propose a bare `ssh yancmo@100.105.31.42` with no command.
- Never assume you are “already SSH’d in.”
- Never run project commands (npm, node, git, curl, cloudflared) as if they’re on the server **without** the `ssh ... "cd ... && ..."` wrapper.
- Never claim that *you* executed a command. I will run them.

---

## 4. Files You Must Respect

Key files in this workspace:

- `README.md`  
  High-level architecture and API behavior.

- `WORKSPACE_LIVING_DOC.md`  
  **The “living doc” you must keep updated** with:
  - Current status
  - Clear instructions
  - Recent changes
  - Quick commands

- `copilot-instructions.md` (this file)  
  Your behavior contract.

- `DEPLOY.md`  
  Deployment instructions for Ubuntu and Cloudflare.

- `QUICKREF.md`  
  Command quick reference (you may update to add helpful one-liners).

- `src/server.js`  
  Express server, includes:
  - `/`
  - `/health`
  - `/promoteTask` stub (logs and returns stubbed response)

- `src/services/graphClient.js` (or similar)  
  Scaffold for Microsoft Graph integration (Phase 2).

If you are unsure how to behave, defer to this `copilot-instructions.md`.

---

## 5. Living Workspace Document Rules

We maintain a **single “living doc”** in the repo:

> `WORKSPACE_LIVING_DOC.md`

This file is the **ground truth** for:

- What’s done
- What’s next
- How to deploy/run
- What changed recently

### 5.1 When to update `WORKSPACE_LIVING_DOC.md`

You must update `WORKSPACE_LIVING_DOC.md` whenever:

- We add or change commands or scripts
- We change deployment or tunnel behavior
- We complete a meaningful milestone (e.g., Phase 1 deployed, Phase 2 started)
- We modify APIs or endpoint behavior
- We add/remove important dependencies

### 5.2 Required structure for `WORKSPACE_LIVING_DOC.md`

Try to keep this general structure (you can create it if it doesn’t exist):

```markdown
# Assistant 365 Bridge — Workspace Living Document

## 1. Overview
- Short summary of the project and current phase.

## 2. Current Status
- Bullet points of what is currently working.
- Notes on where code is deployed and how.

## 3. How to Run Locally
- Commands to run the server on Mac.
- Any dev-time notes.

## 4. How to Run on Ubuntu Server
- SSH + one-liner commands to:
  - Pull latest code
  - Install dependencies
  - Start or restart the server
  - Check health endpoints

## 5. Cloudflare Tunnel
- Which tunnel name is used.
- Basic commands to start/enable it if manual.

## 6. Microsoft Graph Integration (Phase 2)
- Current status (e.g., “scaffolded, not wired”).
- TODO items.

## 7. Quick Commands Reference
- The most important SSH one-liners (from section 3 of this file).

## 8. Change Log
- Dated entries listing what changed (see below).
```

### 5.3 Change Log format

Whenever we make a non-trivial change, append a new entry under `## 8. Change Log`, like:

```markdown
### 2025-11-28
- Phase 1 backend running on Ubuntu at http://localhost:3000
- Cloudflare Tunnel configured for https://assistant.yancmo.xyz
- /promoteTask logs task payloads with timestamps and emojis
```

Entries should be:

- Short
- Clear
- Dated (`YYYY-MM-DD`)

**Never** rewrite history in the changelog; always append.

---

## 6. API Behavior (Phase 1 Stub)

### 6.1 `/health`

- **Method:** `GET`
- **Path:** `/health`
- **Response:** small static JSON (e.g. status + service + version)

This must stay fast, simple, and side-effect free.

### 6.2 `/promoteTask` (current stub behavior)

- **Method:** `POST`
- **Path:** `/promoteTask`
- **Body (example):**

```json
{
  "title": "Test from Ubuntu",
  "notes": "Deployed successfully",
  "importance": "high",
  "dueDate": "2025-12-01",
  "source": "chatgpt-task-inbox",
  "externalId": "task-3"
}
```

- **Current behavior:**
  - Validates/normalizes fields as needed
  - Logs payload with timestamps/emojis to the console
  - Returns a stubbed JSON response like:

```json
{
  "status": "stubbed",
  "message": "Task accepted but not yet sent to Microsoft 365.",
  "echo": { ...originalPayload }
}
```

- **Must not** attempt to call Microsoft Graph until Phase 2 is implemented.

### 6.3 Future behavior (Phase 2)

Later, when Graph is wired:

- `/promoteTask` will:
  - Use a Graph client to call Microsoft To Do
  - Create a task in the “Tasks” list
  - Return details including the new Microsoft task ID

Until then, keep it clearly **stubbed** and documented as such.

---

## 7. Graph Integration Rules (Phase 2)

Once we move to Phase 2:

- Use `@azure/msal-node` or similar for auth.
- Use **delegated** permissions (acting as my user).
- Store refresh tokens **securely** on the Ubuntu server (never in Git).
- All configuration for Graph must come from environment variables (`.env` or server env), not hard-coded.

When generating code or instructions for Graph:

- Always list the steps:
  1. Register Azure AD app
  2. Add permissions: `Tasks.ReadWrite`, `offline_access`, `User.Read`
  3. Configure redirect URI or device code flow
  4. Store secrets/tokens securely
  5. Implement Graph helper functions (e.g. `createTodoTask()`)

Update `WORKSPACE_LIVING_DOC.md` to reflect the current Graph integration status and TODOs.

---

## 8. How You Should Respond

When I ask for things like:

> “Deploy the latest version to the server”  
> “Restart the server”  
> “Test the health endpoint”  
> “Wire up Phase 2 Graph calls”

You should respond with:

1. A **short summary** of what needs to be done.
2. A **numbered list of commands** I should run, using the **correct SSH one-liner pattern**.
3. Any file edits you will (or recommend to) apply in this workspace.
4. A suggestion for how to update `WORKSPACE_LIVING_DOC.md` and the change log.

### Important:

- Do **not** say “I ran…” or “I executed…” commands.
- Instead say:  
  - “Run this command:”  
  - “After running this, you should see…”  
  - “If you see error X, paste it back here.”

---

## 9. First Actions for You (When Loaded)

When this instruction file is loaded in a new session, your first step should be:

1. Check whether `WORKSPACE_LIVING_DOC.md` exists.
   - If it does not, propose an initial version following section **5.2** above.
   - If it does, read it and align your understanding of current status with what it says.
2. When I say I’ve done something (e.g., “Deployed to Ubuntu” or “Tunnel is running”), propose:
   - Updates to `WORKSPACE_LIVING_DOC.md`
   - A new changelog entry.

From this point on, treat `WORKSPACE_LIVING_DOC.md` as **the primary status artifact** and keep it clean, concise, and correct.

---

*End of copilot-instructions.md*
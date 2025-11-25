# Assistant 365 Bridge

A tiny always-on backend that lets an AI assistant (like ChatGPT with tools) **promote tasks into Microsoft 365 / Outlook / To Do** with a simple command, e.g.:

> “Promote task 3 to 365.”

The backend exposes a small HTTPS API (on your Ubuntu server, via Cloudflare Tunnel) that:

1. Accepts a task payload from the assistant (`/promoteTask`)
2. Calls **Microsoft Graph** to create a task in **Microsoft To Do → “Tasks” list**
3. Returns a simple JSON confirmation

This repo is designed to be:
- **Minimal** (no DB required at first)
- **Free to run** (Ubuntu + Cloudflare Tunnel)
- **AI-friendly** (clean API for tools / agents)
- **Extendable** later (list tasks, sync status, etc.)

---

## High-Level Architecture

Components:

1. **Ubuntu Server (Your Box)**  
   - Runs a small Node.js (or Python/.NET) web server
   - Listens only on localhost or private network
   - Exposed to the internet via **Cloudflare Tunnel**

2. **Cloudflare Tunnel**  
   - Maps something like `https://assistant.yancmo.xyz` → your local server  
   - Provides valid HTTPS, no port-forwarding needed  

3. **Assistant 365 Bridge Backend** (this project)  
   - HTTP API with endpoints like:
     - `GET /health` – for monitoring
     - `POST /promoteTask` – create an Outlook/To Do task
   - Uses Microsoft Graph to talk to Microsoft 365

4. **Microsoft Graph (cloud)**  
   - Receives authenticated calls from your backend
   - Creates tasks in your Microsoft To Do “Tasks” list

5. **AI Assistant (ChatGPT with tools / future custom app)**  
   - Calls `/promoteTask` as a tool/action
   - You say “Promote task 3 to 365”
   - Assistant sends JSON to the backend
   - Backend creates the task in 365

---

## Phase 1 Goals (MVP)

1. **Run a web server on Ubuntu** (Node.js assumed for now)
2. **Expose it via Cloudflare Tunnel**
3. Implement:
   - `GET /health`  
   - `POST /promoteTask` (stubbed, logs payload for now)
4. Confirm:
   - You can hit `/health` from the internet
   - You can send test `POST /promoteTask` JSON and see it in logs

No 365 integration yet in Phase 1. Just plumbing.

---

## Phase 2 Goals (Microsoft 365 Integration)

1. Register an app in **Azure AD / Entra ID** for **delegated Microsoft Graph access**  
   - We want to act as *your user* to create **your** To Do tasks  
2. Implement an **OAuth flow** (authorization code or device code) to get:
   - Access token
   - Refresh token (stored securely on Ubuntu)
3. Use the token to:
   - Find the list ID of the “Tasks” list
   - Create tasks via Graph:
     - `POST /me/todo/lists/{list-id}/tasks`

Once Phase 2 is done, `/promoteTask` becomes “real” and actually writes to Outlook/To Do.

---

## API Design (for the Assistant)

This is the contract the AI / tool will call. Even in stub mode, keep this solid.

### `GET /health`

**Purpose:** Basic uptime check for monitoring and for tools to confirm connectivity.

- **Method:** `GET`
- **Path:** `/health`
- **Request body:** _none_
- **Response (200):**
  ```json
  {
    "status": "ok",
    "service": "assistant-365-bridge",
    "version": "0.1.0"
  }
  ```

---

### `POST /promoteTask`

**Purpose:** Create a new task in the user’s Microsoft To Do “Tasks” list.  
For now (Phase 1) this can just log the payload. In Phase 2, it will call Microsoft Graph.

- **Method:** `POST`
- **Path:** `/promoteTask`
- **Headers:**
  - `Content-Type: application/json`
  - (Optional) `X-Client` or some shared secret later for basic auth

- **Request Body (from assistant/tool):**
  ```json
  {
    "title": "Look into Campaign Monitor as a Constant Contact replacement",
    "notes": "Compare templates, poll options, pricing, and migration effort.",
    "importance": "high",        // "low" | "normal" | "high"
    "dueDate": "2025-01-15",     // Optional, ISO date string
    "source": "chatgpt-task-inbox",  // Optional metadata
    "externalId": "task-3"       // ID from the assistant's internal task list, optional
  }
  ```

- **Response (Phase 1 stub, 200):**
  ```json
  {
    "status": "stubbed",
    "message": "Task accepted but not yet sent to Microsoft 365.",
    "echo": { ... original payload ... }
  }
  ```

- **Response (Phase 2 real, 200):**
  ```json
  {
    "status": "created",
    "microsoftTaskId": "AAMkAGI2...",
    "listDisplayName": "Tasks",
    "title": "Look into Campaign Monitor as a Constant Contact replacement"
  }
  ```

If something fails (auth, Graph, etc.), return 4xx/5xx with a clear error.

---

## Suggested Tech Stack

We’ll pick one primary implementation language.  
**Proposal: Node.js + Express** (easy HTTP, good MS Graph support, you’re comfortable with JS via VS Code).

- Runtime: Node.js 20+  
- Web framework: `express`  
- HTTP client: `axios` or native `fetch` (Node 18+ has built-in `fetch`)  
- Auth: `@azure/msal-node` for delegated auth (Phase 2)  

Final choice of language can change; this spec is language-agnostic enough that Copilot can scaffold whatever we choose.

---

## Suggested File Structure

Once you are at your computer, Copilot can build something like:

```text
assistant-365-bridge/
  ├─ src/
  │   ├─ server.ts             # or server.js
  │   ├─ routes/
  │   │   ├─ health.ts
  │   │   └─ promoteTask.ts
  │   ├─ services/
  │   │   ├─ graphClient.ts    # wraps Graph calls (Phase 2)
  │   │   └─ taskService.ts    # business logic for promoting tasks
  │   └─ config/
  │       └─ env.ts
  ├─ package.json
  ├─ tsconfig.json             # if using TypeScript
  ├─ .env.example
  └─ README.md  (this file)
```

For now, all we care about is:

- `server.(js|ts)`  
- `health` route  
- `promoteTask` route (logs only)

---

## Phase 1 — TODO Checklist

You can copy this into a GitHub Issue later.

- [ ] Create GitHub repo: `assistant-365-bridge`
- [ ] Add this README as `README.md`
- [ ] On Ubuntu:
  - [ ] Install Node.js 20+ (`nvm` recommended)
  - [ ] Clone repo to Ubuntu
  - [ ] Run `npm init -y`
  - [ ] Install dependencies:
    - `express`
    - `dotenv`
- [ ] Implement `src/server.js` with:
  - [ ] `GET /health` returning static JSON
  - [ ] `POST /promoteTask` that:
    - [ ] Parses JSON body
    - [ ] Logs payload to console
    - [ ] Returns stubbed response JSON
- [ ] Test locally with `curl` or Postman
- [ ] Set up Cloudflare Tunnel:
  - [ ] Create a tunnel for local port (e.g., 3000)
  - [ ] Map hostname `assistant.yancmo.xyz` to that tunnel
- [ ] Test `GET https://assistant.yancmo.xyz/health` from your phone

Once all of the above works, we move to Phase 2.

---

## Phase 2 — Microsoft Graph Integration (Outline)

> **Note:** Do not try to fully wire this up from your phone.  
> We’ll do this carefully at your computer.

### 1. Register an App in Azure AD / Entra ID

- Go to Azure Portal → App registrations
- Create a new app, e.g. **Assistant365Bridge**
- Type: “Web app” or “Public client / native” depending on chosen flow
- Configure redirect URI (for OAuth callback) if using auth code flow

We want **delegated permissions**, not just app-only, so the app can access **your** To Do tasks.

**Permissions to request** (delegated):

- `Tasks.ReadWrite`  
- Possibly: `offline_access` (for refresh tokens)  
- Possibly: `User.Read` (basic profile)

### 2. Choose an Auth Flow

We have two realistic options:

#### Option A: Authorization Code Flow (More “Web App” style)
- You visit a login URL once (hosted by your backend)
- Sign in with your Microsoft 365 account
- Backend receives an authorization code → exchanges it for tokens
- Backend stores:
  - Access token (short-lived)
  - Refresh token (long-lived) in a secure file or store on Ubuntu

**Pros:** Standard, works well, good for one user (you)  
**Cons:** Slightly more setup (callback endpoint)

#### Option B: Device Code Flow (More “CLI” style)
- From Ubuntu or your machine, you run a script:
  - It prints a code and a URL (e.g., `https://microsoft.com/devicelogin`)
  - You go there on any device, enter the code, log in
- Script gets tokens and stores them on disk

**Pros:** Easier to do as a one-time setup  
**Cons:** Slightly less “web app” like, but perfectly fine for personal use

Either way, once we have a refresh token, the backend can silently refresh tokens and call Microsoft Graph whenever `/promoteTask` is hit.

### 3. Implement Graph Helper

Pseudocode sketch (not final code):

```ts
// src/services/graphClient.ts

// TODO: implement real token management with MSAL and stored refresh token

export async function createTodoTask(input: {
  title: string;
  notes?: string;
  importance?: "low" | "normal" | "high";
  dueDate?: string; // ISO date
}) {
  const accessToken = await getAccessTokenForUser(); // via MSAL + refresh token

  // 1. Get list ID for "Tasks" list (once; cache in memory)
  const listId = await getTasksListId(accessToken);

  // 2. Build request body
  const body = {
    title: input.title,
    importance: input.importance ?? "normal",
    body: input.notes
      ? {
          content: input.notes,
          contentType: "text"
        }
      : undefined,
    dueDateTime: input.dueDate
      ? {
          dateTime: input.dueDate + "T17:00:00",
          timeZone: "America/Chicago" // adjust as needed
        }
      : undefined
  };

  // 3. POST to Graph
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/todo/lists/${listId}/tasks`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Graph error: ${response.status} ${text}`);
  }

  return await response.json();
}
```

The actual implementation will depend on how we set up MSAL, but this shows the shape.

---

## Assistant Interaction Examples (Future)

Once this is running and connected to ChatGPT tools, your natural language flow will be:

> **You:**  
> “Add to my task inbox: Look into Campaign Monitor as a Constant Contact replacement.”

> **You (later):**  
> “Promote task 1 to 365 and set due date for next Friday.”

> **Assistant:**  
> - Resolves “task 1” to:
>   - Title + notes + importance + due date  
> - Calls `/promoteTask` with that JSON  
> - Backend calls Microsoft Graph  
> - Task appears in your To Do “Tasks” list  
> - Assistant replies:
>   ```json
>   {
>     "status": "created",
>     "microsoftTaskId": "...",
>     "title": "Look into Campaign Monitor as a Constant Contact replacement"
>   }
>   ```

You never copy/paste anything. Your Ubuntu box + Cloudflare + this bridge do all the heavy lifting.

---

## How to Use This README Right Now (From Your Phone)

1. Open GitHub (mobile app or web)
2. Create a repo: `assistant-365-bridge`
3. Add a new file named `README.md`
4. Paste this entire file into it
5. Commit

Later, on your computer:

- Clone the repo to your Ubuntu box or dev machine
- Ask GitHub Copilot / ChatGPT:
  - “Generate `src/server.js` based on the API described in README”
  - “Add `GET /health` and `POST /promoteTask` routes”
- Work through the Phase 1 checklist  
- Then we’ll come back and do Phase 2 (Graph auth) step-by-step.

---

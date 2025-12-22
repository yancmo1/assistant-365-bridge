# PRD — Personal Task Sync Bridge (Microsoft To Do → Apple Calendar)

This document tracks the implementation plan and wiring details for syncing **Microsoft To Do “Personal”** tasks into **Apple Calendar** as events.

## Summary

- Source of truth for tasks: **Microsoft To Do** (created by Assistant 365 Bridge)
- Primary pain: iPhone Exchange calendar often lags / misses To Do task items
- Solution: **supplemental push** into Apple ecosystem (iCloud Calendar / Apple Calendar) so due dates show up reliably on macOS + iOS.

## Chosen Implementation (Phase 1 of this PRD)

We’ll use:

1. **Power Automate** to detect To Do tasks (category = Personal)
2. Power Automate will POST a JSON payload to this service:
   - `POST /webhooks/powerAutomate/todo`
3. This service will normalize the payload, add a trace tag, dedupe retries, and forward it to an Apple-side automation runner via webhook.

> Why not “Power Automate → iPhone Shortcut webhook” directly?
>
> iOS Shortcuts doesn’t provide a built-in always-on public webhook receiver. In practice you need a receiver/runner (commonly **Pushcut Automation Server** on iOS) or a Mac-based runner.

## Data Contract

### Inbound (from Power Automate)

This backend accepts several field name variants. The simplest recommended shape is:

```json
{
  "id": "<microsoftTaskId>",
  "title": "Print pictures of the boys – test sync.",
  "notes": "Optional notes",
  "categories": ["Personal"],
  "status": "notStarted",
  "lastModifiedDateTime": "2025-12-14T18:22:00Z",
  "dueDate": "2025-12-15"
}
```

You can also send `dueDateTime` instead of `dueDate`:

```json
{
  "id": "<microsoftTaskId>",
  "title": "Example",
  "categories": ["Personal"],
  "dueDateTime": {
    "dateTime": "2025-12-15T08:00:00",
    "timeZone": "America/Chicago"
  }
}
```

### Outbound (to Apple automation runner)

This service forwards:

```json
{
  "action": "upsert",
  "calendarName": "Personal",
  "title": "…",
  "notes": "…\n\n[msTodoTaskId:<id>]",
  "startDateTime": "2025-12-15T08:00:00",
  "durationMinutes": 30,
  "timeZone": "America/Chicago",
  "microsoftTaskId": "…"
}
```

The trace tag in notes is the main de-duplication / update key for the Shortcut.

## Apple Shortcut (logic)

The Shortcut should:

1. Receive JSON (dictionary)
2. Extract:
   - `action`, `title`, `notes`, `startDateTime`, `durationMinutes`, `calendarName`
3. Find existing calendar events in `calendarName` where Notes contains `[msTodoTaskId:<id>]`
4. If found:
   - update title/notes/start/duration
5. If not found:
   - create event
6. If `action == complete`:
   - either delete the event or prepend `✅` to the title (your preference)

## Power Automate Flow (high level)

- Trigger: **When a new task is created** (Microsoft To Do)
- Condition: Category equals `Personal`
- Action: HTTP POST to `https://assistant.yancmo.xyz/webhooks/powerAutomate/todo`
  - Headers:
    - `Content-Type: application/json`
    - `X-Assistant-Key: <API_SECRET>`

## Backend Configuration

Add to `.env` / server environment:

- `APPLE_EVENT_WEBHOOK_URL` — where to forward the normalized event payload
- `APPLE_EVENT_WEBHOOK_AUTHORIZATION` — optional (e.g. `Bearer …`)
- `APPLE_EVENT_WEBHOOK_SECRET` — optional (sent as `x-webhook-secret`)
- `APPLE_CALENDAR_NAME` — default `Personal`
- `DEFAULT_EVENT_START_TIME` — default `08:00`
- `DEFAULT_EVENT_DURATION_MINUTES` — default `30`

## Next Enhancements

- Handle updates (not just create) by including lastModifiedDateTime in idempotency key
- Handle completion via a second flow + `status: completed`
- Optional: direct iCloud CalDAV event creation (no Shortcut runner required)

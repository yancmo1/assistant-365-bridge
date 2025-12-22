/**
 * Personal Task Sync (Microsoft To Do -> Apple Calendar)
 *
 * This module normalizes the inbound payload (typically from Power Automate)
 * and relays a JSON request to an Apple-side automation receiver (e.g. Pushcut).
 */

import crypto from 'crypto';

function asNonEmptyString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function asStringArray(value) {
  if (Array.isArray(value)) {
    return value.map(v => (typeof v === 'string' ? v : null)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}

function pickFirst(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null) return v;
  }
  return null;
}

function normalizeDue(raw) {
  // Supported shapes:
  // - dueDate: 'YYYY-MM-DD'
  // - dueDateTime: 'YYYY-MM-DDTHH:mm:ssZ' (string)
  // - dueDateTime: { dateTime: '...', timeZone: '...' }
  const dueDate = asNonEmptyString(raw?.dueDate);

  const dueDateTimeObj = raw?.dueDateTime && typeof raw.dueDateTime === 'object' ? raw.dueDateTime : null;
  const dueDateTimeStr = asNonEmptyString(raw?.dueDateTime);

  const dateTime = asNonEmptyString(dueDateTimeObj?.dateTime) || dueDateTimeStr;
  const timeZone = asNonEmptyString(dueDateTimeObj?.timeZone) || asNonEmptyString(raw?.timeZone);

  return {
    dueDate,
    dueDateTime: dateTime,
    timeZone
  };
}

function getDefaultStartTime() {
  const t = asNonEmptyString(process.env.DEFAULT_EVENT_START_TIME) || '08:00';
  // Very small sanity check
  if (!/^\d{2}:\d{2}$/.test(t)) return '08:00';
  return t;
}

function getDefaultDurationMinutes() {
  const v = Number(process.env.DEFAULT_EVENT_DURATION_MINUTES || 30);
  if (!Number.isFinite(v) || v <= 0) return 30;
  return Math.round(v);
}

function buildStartDateTime({ dueDate, dueDateTime }) {
  if (dueDateTime) return dueDateTime;
  if (!dueDate) return null;
  const startTime = getDefaultStartTime();
  return `${dueDate}T${startTime}:00`;
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Normalize inbound payload from Power Automate / Graph connector.
 * We intentionally accept a few field name variants to make flows easier.
 */
export function normalizePersonalTodoTask(raw = {}) {
  const microsoftTaskId = asNonEmptyString(pickFirst(raw.microsoftTaskId, raw.taskId, raw.id, raw.Id));
  const title = asNonEmptyString(pickFirst(raw.title, raw.Title, raw.subject, raw.Subject));

  // Notes/body variants (Graph: body.content)
  const notes = asNonEmptyString(
    pickFirst(
      raw.notes,
      raw.Notes,
      raw.body?.content,
      raw.body?.Content,
      raw.Body,
      raw.body,
      raw.description,
      raw.Description
    )
  );

  const categories = asStringArray(pickFirst(raw.categories, raw.Categories, raw.category, raw.Category));
  const status = asNonEmptyString(pickFirst(raw.status, raw.Status));
  const lastModifiedDateTime = asNonEmptyString(pickFirst(raw.lastModifiedDateTime, raw.LastModifiedDateTime));

  const due = normalizeDue(raw);

  return {
    microsoftTaskId,
    title,
    notes,
    categories,
    status,
    lastModifiedDateTime,
    due
  };
}

export function isPersonalCategory(normalized) {
  // We accept either explicit 'Personal' label from MS To Do or 'personal'
  const cats = (normalized.categories || []).map(c => c.toLowerCase());
  return cats.includes('personal') || cats.includes('category:personal') || cats.includes('personal category');
}

export function buildAppleEventPayload(normalized) {
  const durationMinutes = getDefaultDurationMinutes();
  const calendarName = asNonEmptyString(process.env.APPLE_CALENDAR_NAME) || 'Personal';

  const action = (normalized.status || '').toLowerCase() === 'completed' ? 'complete' : 'upsert';

  const traceTag = normalized.microsoftTaskId ? `[msTodoTaskId:${normalized.microsoftTaskId}]` : '[msTodoTaskId:unknown]';
  const notesWithTrace = [normalized.notes, traceTag].filter(Boolean).join('\n\n');

  const startDateTime = buildStartDateTime({
    dueDate: normalized.due.dueDate,
    dueDateTime: normalized.due.dueDateTime
  });

  return {
    action,
    calendarName,
    title: normalized.title,
    notes: notesWithTrace,
    startDateTime,
    durationMinutes,
    timeZone:
      normalized.due.timeZone ||
      asNonEmptyString(process.env.DEFAULT_TIME_ZONE) ||
      asNonEmptyString(process.env.TIMEZONE) ||
      null,
    microsoftTaskId: normalized.microsoftTaskId
  };
}

export function buildIdempotencyKey(normalized, applePayload) {
  // Best-effort: task ID + lastModified OR due/start + action.
  // If MS task ID missing, fall back to hash of title+start.
  const base = {
    microsoftTaskId: normalized.microsoftTaskId || null,
    title: normalized.title || null,
    action: applePayload.action,
    startDateTime: applePayload.startDateTime || null,
    lastModifiedDateTime: normalized.lastModifiedDateTime || null
  };

  return sha256Hex(JSON.stringify(base));
}

/**
 * Send a webhook to the Apple-side runner.
 *
 * The receiver can be:
 * - Pushcut Automation Server (recommended for iOS)
 * - Any HTTPS endpoint that then runs a Shortcut on your Mac/iPhone
 */
export async function relayToApple({ url, authorization, secret, payload }) {
  if (!url) {
    return {
      sent: false,
      status: 'not_configured'
    };
  }

  const headers = {
    'Content-Type': 'application/json'
  };

  if (authorization) {
    headers['Authorization'] = authorization;
  }

  if (secret) {
    headers['x-webhook-secret'] = secret;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const responseText = await response.text().catch(() => '');

  if (!response.ok) {
    return {
      sent: false,
      status: 'error',
      httpStatus: response.status,
      responseText
    };
  }

  return {
    sent: true,
    status: 'ok',
    httpStatus: response.status,
    responseText
  };
}

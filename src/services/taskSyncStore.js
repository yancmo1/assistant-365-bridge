/**
 * File-backed idempotency store for inbound webhooks.
 *
 * Goal: prevent duplicate downstream Apple Calendar event creation when
 * Power Automate retries or triggers multiple times.
 */

import { promises as fs } from 'fs';
import path from 'path';

const DEFAULT_STORE_PATH = './data/task-sync/processed.json';

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function atomicWriteJson(filePath, data) {
  await ensureDirExists(filePath);
  const tmpPath = `${filePath}.tmp`;
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(tmpPath, json, { mode: 0o600 });
  await fs.rename(tmpPath, filePath);
}

async function loadStore(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = safeJsonParse(raw, null);

    if (!parsed || typeof parsed !== 'object') {
      return { version: 1, processed: {} };
    }

    if (!parsed.processed || typeof parsed.processed !== 'object') {
      parsed.processed = {};
    }

    if (!parsed.version) {
      parsed.version = 1;
    }

    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { version: 1, processed: {} };
    }
    throw error;
  }
}

/**
 * @param {object} options
 * @param {string} [options.storePath]
 * @param {number} [options.maxEntries] - simple cap to keep file from growing forever
 */
export function createTaskSyncStore(options = {}) {
  const storePath = options.storePath || process.env.TASK_SYNC_STORE_PATH || DEFAULT_STORE_PATH;
  const maxEntries = Number(options.maxEntries || process.env.TASK_SYNC_STORE_MAX_ENTRIES || 5000);

  async function has(key) {
    const store = await loadStore(storePath);
    return Boolean(store.processed[key]);
  }

  async function mark(key, meta = {}) {
    const store = await loadStore(storePath);

    store.processed[key] = {
      firstSeenAt: store.processed[key]?.firstSeenAt || nowIso(),
      lastSeenAt: nowIso(),
      meta
    };

    // crude cap: drop oldest by lastSeenAt
    const keys = Object.keys(store.processed);
    if (keys.length > maxEntries) {
      const sorted = keys
        .map(k => ({ k, t: store.processed[k]?.lastSeenAt || store.processed[k]?.firstSeenAt || '' }))
        .sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));

      const toRemoveCount = keys.length - maxEntries;
      for (let i = 0; i < toRemoveCount; i++) {
        delete store.processed[sorted[i].k];
      }
    }

    await atomicWriteJson(storePath, store);
  }

  return {
    storePath,
    has,
    mark
  };
}

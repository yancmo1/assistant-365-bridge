/**
 * Persistent Microsoft Graph Authentication (MSAL)
 *
 * Goal:
 * - Persist delegated auth tokens to disk so Graph calls (create/list/complete tasks)
 *   do NOT require re-approval on every server restart.
 *
 * Approach:
 * - Use @azure/msal-node's token cache + a simple file-based cache plugin.
 * - Attempt acquireTokenSilent first (uses cached account + refresh tokens).
 * - Fallback to Device Code Flow only when required.
 * - Optional one-time migration path from the legacy refresh-token file (TOKEN_FILE_PATH).
 *
 * Security note:
 * - The MSAL cache file contains sensitive tokens. Keep it out of version control and
 *   ensure the file is readable only by the service user (we chmod 0600).
 */

import * as msal from '@azure/msal-node';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.AZURE_CLIENT_ID || process.env.CLIENT_ID;
const TENANT_ID = process.env.AZURE_TENANT_ID || process.env.TENANT_ID;
const AUTHORITY_BASE = process.env.AZURE_AUTHORITY || process.env.AUTHORITY || 'https://login.microsoftonline.com/';

// New, preferred cache file for MSAL tokens
const MSAL_CACHE_PATH = process.env.MSAL_CACHE_PATH || './data/msal-cache.json';

// Legacy refresh-token file used in earlier versions (optional migration).
const LEGACY_TOKEN_FILE_PATH = process.env.TOKEN_FILE_PATH || './data/tokens.json';

// Default scopes for To Do operations.
export const DEFAULT_GRAPH_SCOPES = ['Tasks.ReadWrite', 'User.Read', 'offline_access'];

function resolvePath(p) {
  // Relative paths should be treated as relative to the repo root (process.cwd()).
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

const cacheFilePath = resolvePath(MSAL_CACHE_PATH);
const legacyTokenFilePath = resolvePath(LEGACY_TOKEN_FILE_PATH);

// Basic env validation (only when we need to actually authenticate).
function assertAuthEnvConfigured() {
  if (!CLIENT_ID || !TENANT_ID) {
    throw new Error(
      'Missing required Azure auth environment variables. Set AZURE_CLIENT_ID and AZURE_TENANT_ID (or CLIENT_ID/TENANT_ID).'
    );
  }
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirForFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function chmod0600Safe(filePath) {
  try {
    await fs.chmod(filePath, 0o600);
  } catch {
    // Best-effort: chmod can fail on some platforms/filesystems.
  }
}

// Simple in-process mutex to avoid concurrent cache writes.
let cacheWriteChain = Promise.resolve();
function withCacheWriteLock(fn) {
  cacheWriteChain = cacheWriteChain.then(fn, fn);
  return cacheWriteChain;
}

async function readTextFileIfExists(p) {
  try {
    return await fs.readFile(p, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeTextFileAtomic(p, content) {
  await ensureDirForFile(p);
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, content, { mode: 0o600 });
  await fs.rename(tmp, p);
  await chmod0600Safe(p);
}

const cachePlugin = {
  beforeCacheAccess: async (cacheContext) => {
    const data = await readTextFileIfExists(cacheFilePath);
    if (data) {
      cacheContext.tokenCache.deserialize(data);
    }
  },
  afterCacheAccess: async (cacheContext) => {
    if (!cacheContext.cacheHasChanged) return;
    const data = cacheContext.tokenCache.serialize();
    await withCacheWriteLock(() => writeTextFileAtomic(cacheFilePath, data));
  }
};

function createPublicClientApp() {
  assertAuthEnvConfigured();

  const authority = `${AUTHORITY_BASE}${TENANT_ID}`;

  return new msal.PublicClientApplication({
    auth: {
      clientId: CLIENT_ID,
      authority
    },
    cache: {
      cachePlugin
    }
  });
}

// Lazily created singleton.
let pca = null;
function getPca() {
  if (!pca) {
    pca = createPublicClientApp();
  }
  return pca;
}

function chooseAccount(accounts) {
  if (!accounts?.length) return null;

  // Optional hint: bind to a specific username if provided.
  const preferred = process.env.AZURE_USERNAME || process.env.MSAL_USERNAME;
  if (preferred) {
    const match = accounts.find(a => (a.username || '').toLowerCase() === preferred.toLowerCase());
    if (match) return match;
  }

  // Default: first account.
  return accounts[0];
}

async function tryAcquireTokenSilent(scopes = DEFAULT_GRAPH_SCOPES) {
  const app = getPca();
  const accounts = await app.getTokenCache().getAllAccounts();
  const account = chooseAccount(accounts);
  if (!account) return null;

  try {
    return await app.acquireTokenSilent({
      account,
      scopes
    });
  } catch (error) {
    // If silent acquisition fails, caller can fall back to interactive.
    // Typical reasons: first run, token expired and refresh token invalid, consent needed.
    return null;
  }
}

async function tryAcquireTokenByLegacyRefreshToken(scopes = DEFAULT_GRAPH_SCOPES) {
  // Migration path from older implementation that stored a refresh token JSON.
  // Only attempt if the legacy file exists and the MSAL cache has no accounts.
  const app = getPca();
  const accounts = await app.getTokenCache().getAllAccounts();
  if (accounts.length > 0) return null;

  const raw = await readTextFileIfExists(legacyTokenFilePath);
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const refreshToken = parsed?.refreshToken;
  if (!refreshToken || typeof refreshToken !== 'string') return null;

  try {
    // This will populate the MSAL cache via the cache plugin.
    return await app.acquireTokenByRefreshToken({
      refreshToken,
      scopes
    });
  } catch {
    return null;
  }
}

export async function acquireTokenInteractive(scopes = DEFAULT_GRAPH_SCOPES) {
  const app = getPca();

  const deviceCodeRequest = {
    scopes,
    deviceCodeCallback: (response) => {
      console.log('\n' + '='.repeat(60));
      console.log('🔐 MICROSOFT AUTHENTICATION REQUIRED');
      console.log('='.repeat(60));
      console.log('To authorize this application:');
      console.log(`  1) Open: ${response.verificationUri}`);
      console.log(`  2) Enter code: ${response.userCode}`);
      console.log('Waiting for authentication...');
      console.log('='.repeat(60) + '\n');
    }
  };

  return await app.acquireTokenByDeviceCode(deviceCodeRequest);
}

// Prevent stampeding interactive prompts on concurrent API calls.
let inFlightTokenPromise = null;

/**
 * Get an access token for Microsoft Graph.
 *
 * 1) try acquireTokenSilent
 * 2) try legacy refresh token migration (if present)
 * 3) fallback to device-code interactive login
 */
export async function getAccessToken(scopes = DEFAULT_GRAPH_SCOPES) {
  if (inFlightTokenPromise) {
    const result = await inFlightTokenPromise;
    if (result?.accessToken) return result.accessToken;
  }

  inFlightTokenPromise = (async () => {
    // silent first
    const silent = await tryAcquireTokenSilent(scopes);
    if (silent?.accessToken) return silent;

    // legacy migration
    const migrated = await tryAcquireTokenByLegacyRefreshToken(scopes);
    if (migrated?.accessToken) return migrated;

    // interactive
    return await acquireTokenInteractive(scopes);
  })();

  try {
    const result = await inFlightTokenPromise;
    if (!result?.accessToken) {
      throw new Error('Token acquisition failed (no accessToken in response)');
    }
    return result.accessToken;
  } finally {
    inFlightTokenPromise = null;
  }
}

/**
 * Fast check: do we appear configured to call Graph without forcing login?
 *
 * - Returns true if:
 *   - MSAL cache contains at least one account, OR
 *   - legacy refresh-token file exists (migration possible)
 */
export async function isAuthenticated() {
  try {
    if (!CLIENT_ID || !TENANT_ID) return false;
    const app = getPca();
    const accounts = await app.getTokenCache().getAllAccounts();
    if (accounts.length > 0) return true;
    return await fileExists(legacyTokenFilePath);
  } catch {
    return false;
  }
}

export function getCacheFilePath() {
  return cacheFilePath;
}

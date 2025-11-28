/**
 * Microsoft Graph API Client
 * 
 * Phase 2 implementation for Microsoft To Do integration
 * Uses MSAL for authentication with refresh token persistence
 */

import * as msal from '@azure/msal-node';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_AUTHORITY = process.env.AZURE_AUTHORITY || 'https://login.microsoftonline.com/';
const TOKEN_FILE_PATH = process.env.TOKEN_FILE_PATH || './data/tokens.json';
const GRAPH_API_ENDPOINT = process.env.GRAPH_API_ENDPOINT || 'https://graph.microsoft.com/v1.0';

// MSAL Configuration
const msalConfig = {
  auth: {
    clientId: AZURE_CLIENT_ID,
    authority: `${AZURE_AUTHORITY}${AZURE_TENANT_ID}`,
  }
};

const pca = new msal.PublicClientApplication(msalConfig);

// Token cache (in-memory)
let cachedTokenResponse = null;
let tasksListIdCache = null;

/**
 * Load refresh token from file
 * @returns {Promise<string|null>} Refresh token or null if not found
 */
async function loadRefreshToken() {
  try {
    const tokenData = await fs.readFile(TOKEN_FILE_PATH, 'utf8');
    const tokens = JSON.parse(tokenData);
    return tokens.refreshToken || null;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error loading refresh token:', error.message);
    }
    return null;
  }
}

/**
 * Save refresh token to file
 * @param {string} refreshToken 
 */
async function saveRefreshToken(refreshToken) {
  try {
    const dir = path.dirname(TOKEN_FILE_PATH);
    await fs.mkdir(dir, { recursive: true });
    
    const tokenData = {
      refreshToken,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(TOKEN_FILE_PATH, JSON.stringify(tokenData, null, 2), { mode: 0o600 });
    console.log('✅ Refresh token saved');
  } catch (error) {
    console.error('❌ Error saving refresh token:', error.message);
    throw error;
  }
}

/**
 * Get or refresh access token for Microsoft Graph
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
  // Check if we have a valid cached token
  if (cachedTokenResponse && cachedTokenResponse.expiresOn > new Date()) {
    return cachedTokenResponse.accessToken;
  }

  // Try to use refresh token
  const refreshToken = await loadRefreshToken();
  
  if (!refreshToken) {
    throw new Error(
      'No refresh token found. Please run the initial authentication setup first. ' +
      'Run: node src/auth-setup.js'
    );
  }

  try {
    const refreshTokenRequest = {
      refreshToken: refreshToken,
      scopes: ['Tasks.ReadWrite', 'User.Read', 'offline_access'],
    };

    const response = await pca.acquireTokenByRefreshToken(refreshTokenRequest);
    
    // Cache the new token
    cachedTokenResponse = response;
    
    // Save new refresh token if it was rotated
    if (response.refreshToken && response.refreshToken !== refreshToken) {
      await saveRefreshToken(response.refreshToken);
    }
    
    return response.accessToken;
  } catch (error) {
    console.error('❌ Error refreshing token:', error.message);
    throw new Error(
      'Failed to refresh access token. You may need to re-authenticate. ' +
      'Run: node src/auth-setup.js'
    );
  }
}

/**
 * Get the list ID for the "Tasks" list in Microsoft To Do
 * @param {string} accessToken 
 * @returns {Promise<string>} List ID
 */
async function getTasksListId(accessToken) {
  // Return cached value if available
  if (tasksListIdCache) {
    return tasksListIdCache;
  }

  try {
    const response = await fetch(`${GRAPH_API_ENDPOINT}/me/todo/lists`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const lists = data.value || [];
    
    // Find the "Tasks" list
    const tasksList = lists.find(list => 
      list.displayName === 'Tasks' || 
      list.wellknownListName === 'defaultList'
    );

    if (!tasksList) {
      throw new Error(
        'Could not find "Tasks" list in Microsoft To Do. ' +
        'Available lists: ' + lists.map(l => l.displayName).join(', ')
      );
    }

    // Cache the list ID
    tasksListIdCache = tasksList.id;
    console.log(`✅ Found Tasks list: ${tasksList.displayName} (${tasksList.id})`);
    
    return tasksList.id;
  } catch (error) {
    console.error('❌ Error getting Tasks list ID:', error.message);
    throw error;
  }
}

/**
 * Create a task in Microsoft To Do
 * @param {Object} taskData - Task information
 * @param {string} taskData.title - Task title (required)
 * @param {string} [taskData.notes] - Task notes/description
 * @param {string} [taskData.importance] - "low" | "normal" | "high"
 * @param {string} [taskData.dueDate] - ISO date string (YYYY-MM-DD)
 * @returns {Promise<Object>} Created task from Microsoft Graph
 */
export async function createMicrosoftTask(taskData) {
  try {
    // 1. Get access token
    const accessToken = await getAccessToken();
    
    // 2. Get Tasks list ID
    const listId = await getTasksListId(accessToken);
    
    // 3. Build request body
    const requestBody = {
      title: taskData.title,
      importance: taskData.importance || 'normal',
    };

    // Add notes if provided
    if (taskData.notes) {
      requestBody.body = {
        content: taskData.notes,
        contentType: 'text'
      };
    }

    // Add due date if provided
    if (taskData.dueDate) {
      requestBody.dueDateTime = {
        dateTime: `${taskData.dueDate}T17:00:00`,
        timeZone: 'America/Chicago'
      };
    }

    // 4. Create task via Graph API
    const response = await fetch(
      `${GRAPH_API_ENDPOINT}/me/todo/lists/${listId}/tasks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API error: ${response.status} ${errorText}`);
    }

    const createdTask = await response.json();
    
    console.log(`✅ Task created in Microsoft To Do: "${createdTask.title}" (${createdTask.id})`);
    
    return createdTask;
  } catch (error) {
    console.error('❌ Error creating Microsoft task:', error.message);
    throw error;
  }
}

/**
 * List all To Do lists for debugging
 * @returns {Promise<Array>} List of To Do lists
 */
export async function listAllToDoLists() {
  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(`${GRAPH_API_ENDPOINT}/me/todo/lists`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error('❌ Error listing To Do lists:', error.message);
    throw error;
  }
}

/**
 * Check if authentication is configured and tokens are available
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const refreshToken = await loadRefreshToken();
  return refreshToken !== null;
}

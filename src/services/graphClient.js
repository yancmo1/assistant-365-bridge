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
let listIdCache = {}; // Cache list IDs by category

// Category to list name mapping
const CATEGORY_LIST_MAP = {
  'work': 'Work',
  'personal': 'Tasks'  // Default Tasks list
};

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
 * Get the list ID for a specific list name in Microsoft To Do
 * Creates the list if it doesn't exist
 * @param {string} accessToken 
 * @param {string} listName - Name of the list to find/create
 * @returns {Promise<{id: string, displayName: string}>} List info
 */
async function getListByName(accessToken, listName) {
  // Return cached value if available
  if (listIdCache[listName]) {
    return listIdCache[listName];
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
    
    // Find the list by name
    let targetList = lists.find(list => 
      list.displayName.toLowerCase() === listName.toLowerCase() ||
      (listName === 'Tasks' && list.wellknownListName === 'defaultList')
    );

    // Create list if it doesn't exist (except for Tasks which should always exist)
    if (!targetList && listName !== 'Tasks') {
      console.log(`📝 Creating new list: ${listName}`);
      const createResponse = await fetch(`${GRAPH_API_ENDPOINT}/me/todo/lists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ displayName: listName })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create list: ${createResponse.status} ${errorText}`);
      }

      targetList = await createResponse.json();
      console.log(`✅ Created list: ${targetList.displayName} (${targetList.id})`);
    }

    if (!targetList) {
      throw new Error(`Could not find or create list: ${listName}`);
    }

    // Cache the list info
    listIdCache[listName] = { id: targetList.id, displayName: targetList.displayName };
    console.log(`✅ Found list: ${targetList.displayName} (${targetList.id})`);
    
    return listIdCache[listName];
  } catch (error) {
    console.error(`❌ Error getting list "${listName}":`, error.message);
    throw error;
  }
}

/**
 * Get the list ID for a category
 * @param {string} category - "work" | "personal" (defaults to personal)
 * @returns {Promise<{id: string, displayName: string}>} List info
 */
async function getListByCategory(category = 'personal') {
  const accessToken = await getAccessToken();
  const listName = CATEGORY_LIST_MAP[category] || CATEGORY_LIST_MAP['personal'];
  return getListByName(accessToken, listName);
}

/**
 * Get the list ID for the "Tasks" list in Microsoft To Do
 * @param {string} accessToken 
 * @returns {Promise<string>} List ID
 */
async function getTasksListId(accessToken) {
  const listInfo = await getListByName(accessToken, 'Tasks');
  return listInfo.id;
}

/**
 * Create a task in Microsoft To Do
 * @param {Object} taskData - Task information
 * @param {string} taskData.title - Task title (required)
 * @param {string} [taskData.notes] - Task notes/description
 * @param {string} [taskData.importance] - "low" | "normal" | "high"
 * @param {string} [taskData.dueDate] - ISO date string (YYYY-MM-DD)
 * @param {string} [taskData.category] - "work" | "personal" (defaults to personal)
 * @returns {Promise<Object>} Created task from Microsoft Graph with list info
 */
export async function createMicrosoftTask(taskData) {
  try {
    // 1. Get access token
    const accessToken = await getAccessToken();
    
    // 2. Get list by category
    const listInfo = await getListByCategory(taskData.category);
    
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
      `${GRAPH_API_ENDPOINT}/me/todo/lists/${listInfo.id}/tasks`,
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
    
    // Add list info to response
    createdTask.listId = listInfo.id;
    createdTask.listDisplayName = listInfo.displayName;
    
    console.log(`✅ Task created in "${listInfo.displayName}": "${createdTask.title}" (${createdTask.id})`);
    
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
 * List tasks from a category
 * @param {Object} options - Query options
 * @param {string} [options.category] - "work" | "personal" (defaults to personal)
 * @param {number} [options.top] - Max number of tasks to return (default 10)
 * @param {boolean} [options.includeCompleted] - Include completed tasks (default false)
 * @returns {Promise<Array>} List of tasks
 */
export async function listTasks(options = {}) {
  try {
    const accessToken = await getAccessToken();
    const listInfo = await getListByCategory(options.category);
    const top = options.top || 10;
    
    // Build query params
    let queryParams = `$top=${top}&$orderby=createdDateTime desc`;
    if (!options.includeCompleted) {
      queryParams += `&$filter=status ne 'completed'`;
    }
    
    const response = await fetch(
      `${GRAPH_API_ENDPOINT}/me/todo/lists/${listInfo.id}/tasks?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const tasks = data.value || [];
    
    // Normalize response
    return tasks.map(task => ({
      microsoftTaskId: task.id,
      title: task.title,
      importance: task.importance,
      status: task.status,
      createdDateTime: task.createdDateTime,
      dueDate: task.dueDateTime?.dateTime?.split('T')[0] || null,
      notes: task.body?.content || null,
      listId: listInfo.id,
      listDisplayName: listInfo.displayName
    }));
  } catch (error) {
    console.error('❌ Error listing tasks:', error.message);
    throw error;
  }
}

/**
 * Mark a task as completed
 * @param {Object} options
 * @param {string} options.microsoftTaskId - The Microsoft Graph task ID
 * @param {string} [options.category] - "work" | "personal" to identify the list
 * @param {string} [options.listId] - Direct list ID (alternative to category)
 * @returns {Promise<Object>} Updated task
 */
export async function completeTask(options) {
  try {
    const accessToken = await getAccessToken();
    
    // Get list ID either from direct param or category
    let listId = options.listId;
    let listDisplayName = 'Unknown';
    
    if (!listId) {
      const listInfo = await getListByCategory(options.category);
      listId = listInfo.id;
      listDisplayName = listInfo.displayName;
    }
    
    const response = await fetch(
      `${GRAPH_API_ENDPOINT}/me/todo/lists/${listId}/tasks/${options.microsoftTaskId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed'
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API error: ${response.status} ${errorText}`);
    }

    const updatedTask = await response.json();
    
    console.log(`✅ Task marked complete: "${updatedTask.title}" (${updatedTask.id})`);
    
    return {
      microsoftTaskId: updatedTask.id,
      title: updatedTask.title,
      status: updatedTask.status,
      completedDateTime: updatedTask.completedDateTime?.dateTime || new Date().toISOString(),
      listId,
      listDisplayName
    };
  } catch (error) {
    console.error('❌ Error completing task:', error.message);
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

/**
 * Test Graph API connectivity by calling /me endpoint
 * @returns {Promise<Object>} User profile data
 */
export async function testGraphConnection() {
  const accessToken = await getAccessToken();
  
  const response = await fetch(`${GRAPH_API_ENDPOINT}/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Graph API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

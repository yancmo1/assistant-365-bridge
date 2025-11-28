/**
 * Microsoft Graph API Client
 * 
 * Phase 2 implementation for Microsoft To Do integration
 * 
 * Flow:
 * 1. Authenticate using @azure/msal-node (Device Code or Auth Code flow)
 * 2. Get access token (handle refresh token rotation)
 * 3. Find "Tasks" list ID (cache in memory)
 * 4. Create tasks via POST /me/todo/lists/{list-id}/tasks
 * 
 * Required permissions (delegated):
 * - Tasks.ReadWrite
 * - offline_access
 * - User.Read
 */

// TODO: npm install @azure/msal-node
// import * as msal from '@azure/msal-node';

/**
 * Get or refresh access token for Microsoft Graph
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
  // TODO Phase 2: Implement MSAL token acquisition
  // - Load refresh token from file
  // - Use MSAL to get fresh access token
  // - Save updated refresh token
  throw new Error('Not implemented - Phase 2');
}

/**
 * Get the list ID for the "Tasks" list in Microsoft To Do
 * @param {string} accessToken 
 * @returns {Promise<string>} List ID
 */
async function getTasksListId(accessToken) {
  // TODO Phase 2: 
  // GET https://graph.microsoft.com/v1.0/me/todo/lists
  // Find list with displayName === "Tasks"
  // Cache result in memory
  throw new Error('Not implemented - Phase 2');
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
  // TODO Phase 2: Implement
  // 1. Get access token
  // 2. Get Tasks list ID
  // 3. Build request body:
  //    {
  //      title: taskData.title,
  //      importance: taskData.importance || "normal",
  //      body: { content: taskData.notes, contentType: "text" },
  //      dueDateTime: { 
  //        dateTime: taskData.dueDate + "T17:00:00",
  //        timeZone: "America/Chicago" 
  //      }
  //    }
  // 4. POST https://graph.microsoft.com/v1.0/me/todo/lists/{listId}/tasks
  // 5. Return response
  
  throw new Error('Not implemented - Phase 2');
}

/**
 * List all To Do lists for debugging
 * @returns {Promise<Array>} List of To Do lists
 */
export async function listAllToDoLists() {
  // TODO Phase 2: Useful for debugging
  // GET https://graph.microsoft.com/v1.0/me/todo/lists
  throw new Error('Not implemented - Phase 2');
}

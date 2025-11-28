import express from "express";
import dotenv from "dotenv";
import { createMicrosoftTask, isAuthenticated, testGraphConnection, listTasks, completeTask } from "./services/graphClient.js";
import logger from "./utils/logger.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET;
const startTime = Date.now();

// Parse JSON bodies
app.use(express.json());

// API Key Middleware - validates X-Assistant-Key header
// Excludes / and /health for basic accessibility
const apiKeyMiddleware = (req, res, next) => {
  // Skip auth for root and health endpoints
  if (req.path === '/' || req.path === '/health') {
    return next();
  }

  // Check if API_SECRET is configured
  if (!API_SECRET) {
    logger.error('AUTH', 'API_SECRET not configured - rejecting request');
    return res.status(500).json({
      status: 'error',
      message: 'Server misconfiguration: API_SECRET not set'
    });
  }

  const providedKey = req.headers['x-assistant-key'];

  if (!providedKey) {
    logger.security('AUTH_FAILED', { reason: 'missing_key', ip: req.ip, path: req.path });
    return res.status(401).json({
      status: 'error',
      message: 'Missing X-Assistant-Key header'
    });
  }

  if (providedKey !== API_SECRET) {
    logger.security('AUTH_FAILED', { reason: 'invalid_key', ip: req.ip, path: req.path });
    return res.status(403).json({
      status: 'error',
      message: 'Invalid API key'
    });
  }

  next();
};

// Apply API key middleware to all routes
app.use(apiKeyMiddleware);

// Root endpoint - info about available endpoints
app.get("/", (req, res) => {
  res.json({
    service: "assistant-365-bridge",
    version: "0.3.0",
    endpoints: {
      "GET /": "Service info (public)",
      "GET /health": "Server health check (public)",
      "GET /status": "Graph connectivity status (requires X-Assistant-Key)",
      "POST /promoteTask": "Create task in Microsoft To Do (requires X-Assistant-Key)",
      "GET /tasks": "List tasks from To Do (requires X-Assistant-Key)",
      "POST /completeTask": "Mark a task as completed (requires X-Assistant-Key)"
    },
    authentication: "Protected endpoints require X-Assistant-Key header",
    categories: ["work", "personal"]
  });
});

// Simple health check (no auth required)
app.get("/health", async (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const authenticated = await isAuthenticated();
  
  res.json({
    status: "ok",
    service: "assistant-365-bridge",
    version: "0.3.0",
    uptimeSeconds,
    graphStatus: authenticated ? "configured" : "not-configured"
  });
});

// Status endpoint - tests Graph connectivity (requires auth)
app.get("/status", async (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  
  try {
    const graphResult = await testGraphConnection();
    
    res.json({
      status: "ok",
      service: "assistant-365-bridge",
      version: "0.3.0",
      uptimeSeconds,
      graph: {
        status: "ok",
        user: graphResult.displayName || graphResult.userPrincipalName,
        email: graphResult.mail || graphResult.userPrincipalName
      }
    });
  } catch (error) {
    const authenticated = await isAuthenticated();
    
    res.status(503).json({
      status: "degraded",
      service: "assistant-365-bridge",
      version: "0.3.0",
      uptimeSeconds,
      graph: {
        status: authenticated ? "error" : "authRequired",
        error: error.message,
        hint: authenticated 
          ? "Graph API call failed - check permissions or token validity"
          : "Run: node src/auth-setup.js to authenticate"
      }
    });
  }
});

// Input validation helper
function validateTaskPayload(payload) {
  const errors = [];
  
  // Title is required
  if (!payload.title || typeof payload.title !== 'string') {
    errors.push('title is required and must be a string');
  } else if (payload.title.trim().length === 0) {
    errors.push('title cannot be empty');
  } else if (payload.title.length > 500) {
    errors.push('title must be 500 characters or less');
  }
  
  // Notes is optional but must be string if provided
  if (payload.notes !== undefined && typeof payload.notes !== 'string') {
    errors.push('notes must be a string');
  }
  
  // Importance must be valid value
  const validImportance = ['low', 'normal', 'high'];
  if (payload.importance !== undefined && !validImportance.includes(payload.importance)) {
    errors.push(`importance must be one of: ${validImportance.join(', ')}`);
  }
  
  // Category must be valid value
  const validCategories = ['work', 'personal'];
  if (payload.category !== undefined && !validCategories.includes(payload.category)) {
    errors.push(`category must be one of: ${validCategories.join(', ')}`);
  }
  
  // Due date must be valid ISO date string if provided
  if (payload.dueDate !== undefined) {
    if (typeof payload.dueDate !== 'string') {
      errors.push('dueDate must be a string in YYYY-MM-DD format');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.dueDate)) {
      errors.push('dueDate must be in YYYY-MM-DD format');
    } else {
      const date = new Date(payload.dueDate);
      if (isNaN(date.getTime())) {
        errors.push('dueDate is not a valid date');
      }
    }
  }
  
  return errors;
}

// Normalize task payload
function normalizeTaskPayload(payload) {
  return {
    title: payload.title.trim(),
    notes: payload.notes?.trim() || null,
    importance: payload.importance || 'normal',
    category: payload.category || 'personal',
    dueDate: payload.dueDate || null,
    source: payload.source || 'unknown',
    externalId: payload.externalId || null
  };
}

// promoteTask endpoint - creates task in Microsoft To Do
app.post("/promoteTask", async (req, res) => {
  const payload = req.body || {};
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  // Input validation
  const validationErrors = validateTaskPayload(payload);
  if (validationErrors.length > 0) {
    logger.warn('PROMOTE_TASK', `[${requestId}] Validation failed`, { errors: validationErrors });
    return res.status(400).json({
      status: 'error',
      message: 'Invalid request payload',
      errors: validationErrors,
      requestId
    });
  }

  // Normalize the payload
  const normalized = normalizeTaskPayload(payload);

  // Log incoming request
  logger.request(requestId, 'PROMOTE_TASK', {
    title: normalized.title,
    importance: normalized.importance,
    category: normalized.category,
    dueDate: normalized.dueDate,
    source: normalized.source
  });

  // Check if Microsoft Graph is configured
  const authenticated = await isAuthenticated();
  
  if (authenticated) {
    try {
      // Create task in Microsoft To Do
      const microsoftTask = await createMicrosoftTask({
        title: normalized.title,
        notes: normalized.notes,
        importance: normalized.importance,
        dueDate: normalized.dueDate,
        category: normalized.category
      });

      logger.response(requestId, 'success', { 
        microsoftTaskId: microsoftTask.id,
        list: microsoftTask.listDisplayName,
        title: microsoftTask.title 
      });

      res.json({
        status: "created",
        requestId,
        microsoftTaskId: microsoftTask.id,
        list: microsoftTask.listDisplayName,
        title: microsoftTask.title,
        importance: microsoftTask.importance,
        dueDate: normalized.dueDate,
        createdDateTime: microsoftTask.createdDateTime
      });
    } catch (error) {
      logger.error('PROMOTE_TASK', `[${requestId}] Failed to create task`, { error: error.message });
      
      res.status(500).json({
        status: "error",
        requestId,
        message: "Failed to create task in Microsoft 365",
        error: error.message,
        hint: error.message.includes('refresh token') 
          ? "Run: node src/auth-setup.js on the server to re-authenticate"
          : "Check server logs for details"
      });
    }
  } else {
    logger.warn('PROMOTE_TASK', `[${requestId}] Graph not configured - stubbed response`);
    
    res.json({
      status: "stubbed",
      requestId,
      message: "Task accepted but not yet sent to Microsoft 365.",
      hint: "To enable real task creation, run: node src/auth-setup.js",
      echo: normalized
    });
  }
});

// GET /tasks - List tasks from Microsoft To Do
app.get("/tasks", async (req, res) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const category = req.query.category || 'personal';
  const top = parseInt(req.query.top) || 10;
  const includeCompleted = req.query.includeCompleted === 'true';

  // Validate category
  const validCategories = ['work', 'personal'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      status: 'error',
      message: `category must be one of: ${validCategories.join(', ')}`,
      requestId
    });
  }

  // Validate top
  if (top < 1 || top > 100) {
    return res.status(400).json({
      status: 'error',
      message: 'top must be between 1 and 100',
      requestId
    });
  }

  logger.request(requestId, 'LIST_TASKS', { category, top, includeCompleted });

  const authenticated = await isAuthenticated();
  
  if (!authenticated) {
    return res.status(503).json({
      status: 'error',
      requestId,
      message: 'Microsoft Graph not configured',
      hint: 'Run: node src/auth-setup.js'
    });
  }

  try {
    const tasks = await listTasks({ category, top, includeCompleted });
    
    logger.response(requestId, 'success', { count: tasks.length });

    res.json({
      status: 'ok',
      requestId,
      category,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    logger.error('LIST_TASKS', `[${requestId}] Failed`, { error: error.message });
    
    res.status(500).json({
      status: 'error',
      requestId,
      message: 'Failed to list tasks',
      error: error.message
    });
  }
});

// POST /completeTask - Mark a task as completed
app.post("/completeTask", async (req, res) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const { microsoftTaskId, category } = req.body || {};

  // Validate microsoftTaskId
  if (!microsoftTaskId || typeof microsoftTaskId !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'microsoftTaskId is required and must be a string',
      requestId
    });
  }

  // Validate category if provided
  const validCategories = ['work', 'personal'];
  const normalizedCategory = category || 'personal';
  if (!validCategories.includes(normalizedCategory)) {
    return res.status(400).json({
      status: 'error',
      message: `category must be one of: ${validCategories.join(', ')}`,
      requestId
    });
  }

  logger.request(requestId, 'COMPLETE_TASK', { microsoftTaskId, category: normalizedCategory });

  const authenticated = await isAuthenticated();
  
  if (!authenticated) {
    return res.status(503).json({
      status: 'error',
      requestId,
      message: 'Microsoft Graph not configured',
      hint: 'Run: node src/auth-setup.js'
    });
  }

  try {
    const result = await completeTask({ 
      microsoftTaskId, 
      category: normalizedCategory 
    });
    
    logger.response(requestId, 'success', { 
      microsoftTaskId: result.microsoftTaskId,
      title: result.title 
    });

    res.json({
      status: 'completed',
      requestId,
      microsoftTaskId: result.microsoftTaskId,
      title: result.title,
      list: result.listDisplayName,
      completedDateTime: result.completedDateTime
    });
  } catch (error) {
    logger.error('COMPLETE_TASK', `[${requestId}] Failed`, { error: error.message });
    
    // Check for 404 (task not found)
    if (error.message.includes('404')) {
      return res.status(404).json({
        status: 'error',
        requestId,
        message: 'Task not found',
        hint: 'The task may have been deleted or the category is incorrect'
      });
    }
    
    res.status(500).json({
      status: 'error',
      requestId,
      message: 'Failed to complete task',
      error: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  logger.info('SERVER', `assistant-365-bridge listening on port ${port}`);
});

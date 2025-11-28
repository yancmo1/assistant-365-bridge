import express from "express";
import dotenv from "dotenv";
import { createMicrosoftTask, isAuthenticated } from "./services/graphClient.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Root endpoint - info about available endpoints
app.get("/", (req, res) => {
  res.json({
    service: "assistant-365-bridge",
    version: "0.1.0",
    endpoints: {
      "GET /health": "Server health check",
      "POST /promoteTask": "Promote task to Microsoft 365 (Phase 1: stubbed)"
    }
  });
});

// Simple health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "assistant-365-bridge",
    version: "0.1.0"
  });
});

// Stub promoteTask endpoint
app.post("/promoteTask", async (req, res) => {
  const payload = req.body || {};

  // Enhanced logging for Phase 1
  console.log("\n" + "=".repeat(60));
  console.log("📥 INCOMING TASK PROMOTION REQUEST");
  console.log("=".repeat(60));
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`📋 Title: ${payload.title || "(no title)"}`);
  console.log(`📝 Notes: ${payload.notes || "(none)"}`);
  console.log(`⚡ Importance: ${payload.importance || "normal"}`);
  console.log(`📅 Due Date: ${payload.dueDate || "(none)"}`);
  console.log(`🔖 Source: ${payload.source || "(unknown)"}`);
  console.log(`🆔 External ID: ${payload.externalId || "(none)"}`);
  console.log("─".repeat(60));
  console.log("Raw JSON:");
  console.log(JSON.stringify(payload, null, 2));
  console.log("=".repeat(60) + "\n");

  // Phase 2: Check if Microsoft Graph is configured
  const authenticated = await isAuthenticated();
  
  if (authenticated) {
    try {
      // Create task in Microsoft To Do
      const microsoftTask = await createMicrosoftTask({
        title: payload.title,
        notes: payload.notes,
        importance: payload.importance,
        dueDate: payload.dueDate
      });

      console.log("✅ Task created in Microsoft 365\n");

      res.json({
        status: "created",
        microsoftTaskId: microsoftTask.id,
        listDisplayName: "Tasks",
        title: microsoftTask.title,
        importance: microsoftTask.importance,
        createdDateTime: microsoftTask.createdDateTime
      });
    } catch (error) {
      console.error("❌ Failed to create task in Microsoft 365:", error.message);
      
      res.status(500).json({
        status: "error",
        message: "Failed to create task in Microsoft 365",
        error: error.message,
        hint: error.message.includes('refresh token') 
          ? "Run: node src/auth-setup.js on the server to re-authenticate"
          : "Check server logs for details"
      });
    }
  } else {
    // Phase 1: Stubbed response (no authentication configured yet)
    console.log("⚠️  Microsoft Graph not configured - returning stubbed response\n");
    
    res.json({
      status: "stubbed",
      message: "Task accepted but not yet sent to Microsoft 365.",
      hint: "To enable real task creation, run: node src/auth-setup.js",
      echo: payload
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`assistant-365-bridge listening on port ${port}`);
});

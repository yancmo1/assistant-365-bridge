import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Simple health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "assistant-365-bridge",
    version: "0.1.0"
  });
});

// Stub promoteTask endpoint
app.post("/promoteTask", (req, res) => {
  const payload = req.body || {};

  console.log("Received /promoteTask payload:");
  console.log(JSON.stringify(payload, null, 2));

  res.json({
    status: "stubbed",
    message: "Task accepted but not yet sent to Microsoft 365.",
    echo: payload
  });
});

// Start the server
app.listen(port, () => {
  console.log(`assistant-365-bridge listening on port ${port}`);
});

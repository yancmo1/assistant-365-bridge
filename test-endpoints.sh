#!/bin/bash
# Test script for assistant-365-bridge endpoints
# Usage: ./test-endpoints.sh [host]
# Example: ./test-endpoints.sh http://localhost:3000
#          ./test-endpoints.sh https://assistant.yancmo.xyz

HOST="${1:-http://localhost:3000}"

# Protected endpoints require X-Assistant-Key
# Provide via env var: ASSISTANT_KEY
ASSISTANT_KEY_VALUE="${ASSISTANT_KEY:-}"
AUTH_HEADER=()
if [ -n "$ASSISTANT_KEY_VALUE" ]; then
  AUTH_HEADER=(-H "X-Assistant-Key: $ASSISTANT_KEY_VALUE")
else
  echo "⚠️  ASSISTANT_KEY not set; protected endpoint tests may fail."
  echo "    Run like: ASSISTANT_KEY=... ./test-endpoints.sh $HOST"
  echo ""
fi

echo "🧪 Testing Assistant 365 Bridge endpoints at: $HOST"
echo ""

echo "📍 Test 1: Root endpoint (GET /)"
echo "---"
curl -s "$HOST/" | jq . || curl -s "$HOST/"
echo ""
echo ""

echo "📍 Test 2: Health check (GET /health)"
echo "---"
curl -s "$HOST/health" | jq . || curl -s "$HOST/health"
echo ""
echo ""

echo "📍 Test 3: Promote task (POST /promoteTask)"
echo "---"
curl -s -X POST "$HOST/promoteTask" \
  "${AUTH_HEADER[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task from automated test",
    "notes": "Testing the promoteTask endpoint functionality",
    "importance": "normal",
    "dueDate": "2025-12-01",
    "source": "test-script",
    "externalId": "test-auto-1"
  }' | jq . || curl -s -X POST "$HOST/promoteTask" \
  "${AUTH_HEADER[@]}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task from automated test",
    "notes": "Testing the promoteTask endpoint functionality",
    "importance": "normal",
    "dueDate": "2025-12-01",
    "source": "test-script",
    "externalId": "test-auto-1"
  }'
echo ""
echo ""

echo "📍 Test 4: Power Automate webhook sample (GET /webhooks/powerAutomate/todo/sample)"
echo "---"
curl -s "$HOST/webhooks/powerAutomate/todo/sample" \
  "${AUTH_HEADER[@]}" | jq . || curl -s "$HOST/webhooks/powerAutomate/todo/sample" \
  "${AUTH_HEADER[@]}"
echo ""
echo ""

echo "✅ Testing complete!"

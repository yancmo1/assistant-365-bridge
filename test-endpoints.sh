#!/bin/bash
# Test script for assistant-365-bridge endpoints
# Usage: ./test-endpoints.sh [host]
# Example: ./test-endpoints.sh http://localhost:3000
#          ./test-endpoints.sh https://assistant.yancmo.xyz

HOST="${1:-http://localhost:3000}"

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
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task from automated test",
    "notes": "Testing the promoteTask endpoint functionality",
    "importance": "normal",
    "dueDate": "2025-12-01",
    "source": "test-script",
    "externalId": "test-auto-1"
  }' | jq . || curl -s -X POST "$HOST/promoteTask" \
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

echo "✅ Testing complete!"

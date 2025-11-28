#!/bin/bash
# Git commit helper for Phase 1 completion

echo "📦 Staging Phase 1 files..."

git add .github/
git add src/
git add .env.example
git add .gitignore
git add DEPLOY.md
git add PHASE1-COMPLETE.md
git add QUICKREF.md
git add assistant-bridge.service
git add cloudflared-config.yml
git add ecosystem.config.js
git add test-endpoints.sh
git add workspace-living-doc
git add SERVER-GUIDE.md
git add package-lock.json

echo "✅ Files staged!"
echo ""
echo "Suggested commit message:"
echo "========================================"
cat << 'EOF'
Phase 1 Complete: Core infrastructure & deployment ready

✅ Core Application
- Express server with ES modules
- Root (/) endpoint with service info
- Enhanced /promoteTask logging with visual formatting
- Health check endpoint

✅ Configuration
- PM2 ecosystem config (recommended)
- systemd service file (alternative)
- Cloudflare Tunnel configuration
- .env.example template
- Comprehensive .gitignore

✅ Testing & Development
- Automated test script (test-endpoints.sh)
- All endpoints verified working

✅ Documentation
- DEPLOY.md - Complete Ubuntu deployment guide
- QUICKREF.md - Command reference
- PHASE1-COMPLETE.md - Status summary
- .github/copilot-instructions.md - AI agent guidelines

✅ Phase 2 Preparation
- src/services/graphClient.js scaffolded
- Function signatures ready for Microsoft Graph integration

Ready for Ubuntu deployment and Cloudflare Tunnel setup.
See DEPLOY.md for deployment instructions.
EOF
echo "========================================"
echo ""
echo "Run: git commit -F- <<'EOF'"
echo "Then paste the message above and close with EOF"
echo ""
echo "Or use: git commit -m 'Phase 1 Complete: Core infrastructure ready'"

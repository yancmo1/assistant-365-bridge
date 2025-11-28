# Azure AD App Registration Guide

**Phase 2 - Microsoft Graph Integration Setup**

This guide walks you through registering an Azure AD application to enable the Assistant 365 Bridge to create tasks in your Microsoft To Do.

---

## Overview

We'll use **Device Code Flow** authentication because:
- ✅ Works great for server-side apps
- ✅ No web redirect needed
- ✅ You authenticate once, then tokens refresh automatically
- ✅ Perfect for personal use (you're the only user)

---

## Step 1: Register Application in Azure Portal

1. **Go to Azure Portal:**
   - Visit: https://portal.azure.com/
   - Sign in with your Microsoft 365 account

2. **Navigate to App Registrations:**
   - Search for "**Azure Active Directory**" or "**Microsoft Entra ID**"
   - Click **App registrations** in the left sidebar
   - Click **+ New registration**

3. **Register the app:**
   - **Name:** `Assistant 365 Bridge`
   - **Supported account types:** 
     - Select: **Accounts in this organizational directory only (Single tenant)**
   - **Redirect URI:** Leave blank (not needed for Device Code Flow)
   - Click **Register**

4. **Copy these values (you'll need them):**
   - **Application (client) ID** - Copy this, you'll need it
   - **Directory (tenant) ID** - Copy this too

---

## Step 2: Configure API Permissions

1. **In your app, go to "API permissions"**
   - Click **+ Add a permission**
   - Select **Microsoft Graph**
   - Select **Delegated permissions**

2. **Add these permissions:**
   - ✅ `Tasks.ReadWrite` - Read and write user tasks
   - ✅ `offline_access` - Maintain access to data (refresh token)
   - ✅ `User.Read` - Basic user profile

3. **Grant admin consent (if required):**
   - Click **Grant admin consent for [Your Organization]**
   - Confirm

---

## Step 3: Enable Public Client Flow

This is required for Device Code Flow:

1. **Go to "Authentication"**
2. **Scroll down to "Advanced settings"**
3. **Find "Allow public client flows"**
4. **Toggle to "Yes"**
5. **Click "Save"**

---

## Step 4: Create Environment File on Ubuntu

Once you have your Client ID and Tenant ID, create a `.env` file on the Ubuntu server:

```bash
ssh yancmo@100.105.31.42 "cat > /opt/apps/assistant-365-bridge/.env << 'EOF'
PORT=3000

# Azure AD Configuration
AZURE_CLIENT_ID=your-client-id-here
AZURE_TENANT_ID=your-tenant-id-here

# Token Storage
TOKEN_FILE_PATH=/opt/apps/assistant-365-bridge/data/tokens.json
EOF
"
```

**Replace `your-client-id-here` and `your-tenant-id-here` with actual values!**

---

## Step 5: Create Data Directory

```bash
ssh yancmo@100.105.31.42 "mkdir -p /opt/apps/assistant-365-bridge/data && chmod 700 /opt/apps/assistant-365-bridge/data"
```

This directory will store your refresh token securely (not in git).

---

## Step 6: First-Time Authentication (After Code is Deployed)

After the Phase 2 code is deployed, you'll run a one-time authentication:

```bash
ssh yancmo@100.105.31.42 "cd /opt/apps/assistant-365-bridge && node src/auth-setup.js"
```

This will:
1. Show you a URL and a code
2. You visit the URL on any device
3. Enter the code and sign in with your Microsoft 365 account
4. Token is saved to `data/tokens.json`
5. Future requests auto-refresh the token

---

## Security Notes

- **Tokens are stored in:** `/opt/apps/assistant-365-bridge/data/tokens.json`
- **This file is in `.gitignore`** - never committed to git
- **File permissions:** Only readable by `yancmo` user (chmod 600)
- **Refresh tokens expire after:** 90 days of inactivity (using the API keeps it active)

---

## Testing Permissions

After setup, you can test by calling:

```bash
curl -X POST https://assistant.yancmo.xyz/promoteTask \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Graph Integration",
    "notes": "This should create a real task in Microsoft To Do!",
    "importance": "high",
    "dueDate": "2025-12-01"
  }'
```

If successful, you'll see a real task appear in **Microsoft To Do → Tasks list**!

---

## Troubleshooting

### "Invalid client" error
- Make sure you enabled "Allow public client flows" in Authentication settings

### "Insufficient privileges" error
- Grant admin consent for API permissions
- Make sure you added `Tasks.ReadWrite` permission

### "Token expired" error
- The refresh token expired (90 days of inactivity)
- Re-run `node src/auth-setup.js` to authenticate again

### Can't find "Tasks" list
- Open Microsoft To Do app/website
- The default list is called "Tasks" - make sure it exists
- If you renamed it, update the code to search for your list name

---

## Next Steps

1. ✅ Complete this Azure AD setup
2. ✅ Create `.env` file with your Client ID and Tenant ID
3. ⏳ Wait for Phase 2 code to be implemented and deployed
4. ⏳ Run first-time authentication
5. ⏳ Test creating tasks!

---

**After completing Steps 1-5, let me know and I'll implement the authentication code!**

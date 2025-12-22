/**
 * Initial Authentication Setup (Persistent)
 *
 * Run this script to authenticate with Microsoft Graph via Device Code Flow.
 * MSAL will persist tokens (including refresh tokens) to a local cache file.
 *
 * After this completes, the backend should be able to call Microsoft Graph
 * without prompting again on restarts (until tokens are revoked/invalidated).
 *
 * Usage:
 *   node src/auth-setup.js
 */

import dotenv from 'dotenv';
import { acquireTokenInteractive, DEFAULT_GRAPH_SCOPES, getCacheFilePath } from './services/persistentAuth.js';

dotenv.config();

const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || process.env.CLIENT_ID;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || process.env.TENANT_ID;

// Validate environment variables
if (!AZURE_CLIENT_ID || !AZURE_TENANT_ID) {
  console.error('❌ Missing required environment variables!');
  console.error('');
  console.error('Please create a .env file with:');
  console.error('  AZURE_CLIENT_ID=your-client-id');
  console.error('  AZURE_TENANT_ID=your-tenant-id');
  console.error('');
  console.error('See AZURE-SETUP.md for instructions.');
  process.exit(1);
}


async function authenticate() {
  try {
    console.log('Starting authentication...\n');
    
    // Acquire token via Device Code Flow (will persist to MSAL cache on disk)
    const response = await acquireTokenInteractive(DEFAULT_GRAPH_SCOPES);
    
    console.log('\n✅ Authentication successful!');
    console.log(`   Signed in as: ${response.account?.username || 'Unknown'}\n`);
    
    console.log('✅ Persistent MSAL cache saved to:');
    console.log(`   ${getCacheFilePath()}`);
    console.log('');
    console.log('🎉 Setup complete!');
    console.log('');
    console.log('You can now use the API to create tasks in Microsoft To Do.');
    console.log('The server will use the cached tokens and silently refresh when possible.');
    console.log('');
    console.log('Test it with:');
    console.log('  curl -X POST https://assistant.yancmo.xyz/promoteTask \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"title":"Test from Graph API","importance":"high"}\'');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Authentication failed:', error.message);
    console.error('');
    
    if (error.errorCode === 'invalid_client') {
      console.error('Make sure you enabled "Allow public client flows" in Azure AD:');
      console.error('  Azure Portal > App registrations > Your app > Authentication');
      console.error('  > Advanced settings > Allow public client flows: Yes');
    }
    
    console.error('\nSee AZURE-SETUP.md for troubleshooting.');
    process.exit(1);
  }
}

// Run authentication
authenticate();

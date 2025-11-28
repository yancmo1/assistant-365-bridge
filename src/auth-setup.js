/**
 * Initial Authentication Setup
 * 
 * Run this script ONCE to authenticate with Microsoft and get a refresh token.
 * The refresh token will be saved and used for all future API calls.
 * 
 * Usage:
 *   node src/auth-setup.js
 */

import * as msal from '@azure/msal-node';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_AUTHORITY = process.env.AZURE_AUTHORITY || 'https://login.microsoftonline.com/';
const TOKEN_FILE_PATH = process.env.TOKEN_FILE_PATH || './data/tokens.json';

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

// MSAL Configuration
const msalConfig = {
  auth: {
    clientId: AZURE_CLIENT_ID,
    authority: `${AZURE_AUTHORITY}${AZURE_TENANT_ID}`,
  }
};

const pca = new msal.PublicClientApplication(msalConfig);

// Device Code Flow request
const deviceCodeRequest = {
  scopes: ['Tasks.ReadWrite', 'User.Read', 'offline_access'],
  deviceCodeCallback: (response) => {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 MICROSOFT AUTHENTICATION REQUIRED');
    console.log('='.repeat(60));
    console.log('');
    console.log('To authorize this application:');
    console.log('');
    console.log(`  1. Open this URL in your browser:`);
    console.log(`     ${response.verificationUri}`);
    console.log('');
    console.log(`  2. Enter this code: ${response.userCode}`);
    console.log('');
    console.log(`  3. Sign in with your Microsoft 365 account`);
    console.log('');
    console.log('Waiting for authentication...');
    console.log('='.repeat(60) + '\n');
  }
};

async function authenticate() {
  try {
    console.log('Starting authentication...\n');
    
    // Acquire token via Device Code Flow
    const response = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
    
    console.log('\n✅ Authentication successful!');
    console.log(`   Signed in as: ${response.account?.username || 'Unknown'}\n`);
    
    // Get the token cache to extract refresh token
    const cache = pca.getTokenCache();
    const accounts = await cache.getAllAccounts();
    
    if (accounts.length === 0) {
      throw new Error('No accounts found in token cache');
    }
    
    // Get refresh token from cache
    const account = accounts[0];
    const cacheData = cache.serialize();
    const cacheObj = JSON.parse(cacheData);
    
    // Extract refresh token from cache
    let refreshToken = null;
    if (cacheObj.RefreshToken) {
      const refreshTokenKeys = Object.keys(cacheObj.RefreshToken);
      if (refreshTokenKeys.length > 0) {
        refreshToken = cacheObj.RefreshToken[refreshTokenKeys[0]].secret;
      }
    }
    
    if (!refreshToken) {
      throw new Error('Could not extract refresh token from cache');
    }
    
    // Save the refresh token
    const dir = path.dirname(TOKEN_FILE_PATH);
    await fs.mkdir(dir, { recursive: true });
    
    const tokenData = {
      refreshToken: refreshToken,
      account: account.username,
      homeAccountId: account.homeAccountId,
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(TOKEN_FILE_PATH, JSON.stringify(tokenData, null, 2), { mode: 0o600 });
    
    console.log(`✅ Refresh token saved to: ${TOKEN_FILE_PATH}`);
    console.log('');
    console.log('🎉 Setup complete!');
    console.log('');
    console.log('You can now use the API to create tasks in Microsoft To Do.');
    console.log('The refresh token will be used automatically for all future requests.');
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

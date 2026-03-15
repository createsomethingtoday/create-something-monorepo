/**
 * Gmail OAuth Flow
 * 
 * Handles interactive OAuth authorization for Gmail API access.
 * Stores tokens locally for subsequent use.
 */

import { google, Auth } from 'googleapis';
import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { OAuthTokens } from '../types.js';

/** Escape HTML special characters to prevent XSS. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
];

// Resolve relative to the package root (src/gmail/oauth.ts -> ../../)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const TOKEN_PATH = path.join(PACKAGE_ROOT, '.gmail-tokens.json');

export class GmailOAuth {
  private oauth2Client;
  private redirectUri: string;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3847/callback';

    if (!clientId || !clientSecret) {
      throw new Error(
        'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required.\n' +
        'Set them in .env file or environment variables.'
      );
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      this.redirectUri
    );
  }

  /**
   * Get authenticated OAuth2 client.
   * Loads tokens from file, refreshes if needed.
   */
  async getAuthenticatedClient(): Promise<Auth.OAuth2Client> {
    const tokens = await this.loadTokens();
    
    if (!tokens) {
      throw new Error(
        'No Gmail tokens found.\n' +
        'Run `pnpm auth` to authorize with Gmail first.'
      );
    }

    this.oauth2Client.setCredentials(tokens);

    // Check if token needs refresh (1 minute buffer)
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date - 60000) {
      console.log('🔄 Refreshing Gmail access token...');
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        await this.saveTokens(credentials as OAuthTokens);
        this.oauth2Client.setCredentials(credentials);
      } catch (error) {
        console.error('❌ Token refresh failed. Re-run `pnpm auth`');
        throw error;
      }
    }

    return this.oauth2Client;
  }

  /**
   * Check if tokens exist and are valid.
   */
  async hasValidTokens(): Promise<boolean> {
    const tokens = await this.loadTokens();
    if (!tokens) return false;
    
    // Check if we have a refresh token (required for long-term use)
    return !!tokens.refresh_token;
  }

  /**
   * Run OAuth flow interactively (one-time setup).
   * Opens browser for consent, captures callback, saves tokens.
   */
  async runAuthFlow(): Promise<OAuthTokens> {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force refresh token generation
    });

    console.log('\n🔐 Gmail OAuth Authorization');
    console.log('────────────────────────────');
    console.log('Opening browser for authorization...\n');

    // Try to open browser
    try {
      const open = (await import('open')).default;
      await open(authUrl);
      console.log('✓ Browser opened\n');
    } catch {
      console.log('Could not open browser automatically.');
      console.log(`\nVisit this URL to authorize:\n${authUrl}\n`);
    }

    // Start local server to capture callback
    const code = await this.captureAuthCode();

    // Exchange code for tokens
    console.log('Exchanging authorization code for tokens...');
    const { tokens } = await this.oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      console.warn('\n⚠️  No refresh token received.');
      console.warn('   You may need to revoke access and re-authorize.');
      console.warn('   Visit: https://myaccount.google.com/permissions\n');
    }

    await this.saveTokens(tokens as OAuthTokens);

    console.log('\n✅ Gmail authorized successfully!');
    console.log(`   Tokens saved to: ${TOKEN_PATH}\n`);
    
    return tokens as OAuthTokens;
  }

  /**
   * Start local HTTP server to capture OAuth callback.
   */
  private captureAuthCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url || '', true);
        
        if (parsedUrl.pathname === '/callback') {
          const code = parsedUrl.query.code as string;
          const error = parsedUrl.query.error as string;
          
          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head><meta charset="utf-8"></head>
                <body style="font-family: system-ui; padding: 40px; text-align: center;">
                  <h1>&#10060; Authorization Failed</h1>
                  <p>Error: ${escapeHtml(error)}</p>
                  <p>Please try again.</p>
                </body>
              </html>
            `);
            server.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }
          
          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head><meta charset="utf-8"></head>
                <body style="font-family: system-ui; padding: 40px; text-align: center;">
                  <h1>&#10004; Gmail Authorized</h1>
                  <p>You can close this window and return to the terminal.</p>
                </body>
              </html>
            `);
            server.close();
            resolve(code);
          } else {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Error: No authorization code</h1>');
            server.close();
            reject(new Error('No authorization code received'));
          }
        }
      });

      // Extract port from redirect URI
      const portMatch = this.redirectUri.match(/:(\d+)/);
      const port = portMatch ? parseInt(portMatch[1]) : 3847;
      
      server.listen(port, () => {
        console.log(`Waiting for authorization on http://localhost:${port}...`);
      });

      // Handle server errors
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use. Kill the process using it or change GOOGLE_REDIRECT_URI.`));
        } else {
          reject(err);
        }
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('Authorization timed out after 5 minutes'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Load tokens from file.
   */
  private async loadTokens(): Promise<OAuthTokens | null> {
    try {
      if (fs.existsSync(TOKEN_PATH)) {
        const content = fs.readFileSync(TOKEN_PATH, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn(`Warning: Could not load tokens from ${TOKEN_PATH}`);
    }
    return null;
  }

  /**
   * Save tokens to file.
   */
  private async saveTokens(tokens: OAuthTokens): Promise<void> {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  }
}

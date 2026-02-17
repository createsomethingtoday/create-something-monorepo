/**
 * Gmail OAuth Flow (local single-user)
 *
 * - Uses GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
 * - Stores tokens on disk (default: ~/.config/create-something/createsomething-gmail-mcp/tokens.json)
 */

import { google, Auth } from 'googleapis';
import * as http from 'node:http';
import * as url from 'node:url';
import * as fs from 'node:fs';
import * as path from 'node:path';
import os from 'node:os';
import type { OAuthTokens } from '../types.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function defaultTokenPath(): string {
  const base = process.env.XDG_CONFIG_HOME
    ? process.env.XDG_CONFIG_HOME
    : path.join(os.homedir(), '.config');
  return path.join(base, 'create-something', 'createsomething-gmail-mcp', 'tokens.json');
}

function ensureTokenDir(tokenPath: string) {
  const dir = path.dirname(tokenPath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

function getScopes(): string[] {
  const raw = (process.env.GMAIL_SCOPES || '').trim();
  if (raw) return raw.split(',').map(s => s.trim()).filter(Boolean);
  // Default: read + labels + send + modify (for label changes/trash)
  return [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ];
}

export class GmailOAuth {
  private oauth2Client: Auth.OAuth2Client;
  private redirectUri: string;
  private tokenPath: string;
  private clientId?: string;
  private clientSecret?: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3857/callback';
    this.tokenPath = process.env.GMAIL_TOKEN_PATH || defaultTokenPath();

    // Allow the MCP server to boot without env; tools will fail with a clear error on use.
    this.oauth2Client = new google.auth.OAuth2(this.clientId || '', this.clientSecret || '', this.redirectUri);
  }

  private assertConfigured(): void {
    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.\n' +
        'Set them in packages/createsomething-gmail-mcp/.env or as environment variables.'
      );
    }
  }

  async getAuthenticatedClient(): Promise<Auth.OAuth2Client> {
    this.assertConfigured();
    const tokens = await this.loadTokens();
    if (!tokens) {
      throw new Error('No Gmail tokens found. Run `pnpm --filter @create-something/createsomething-gmail-mcp auth` first.');
    }

    this.oauth2Client.setCredentials(tokens);

    // Refresh if expired (1 minute buffer)
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date - 60_000) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        await this.saveTokens(credentials as OAuthTokens);
        this.oauth2Client.setCredentials(credentials);
      } catch (error) {
        throw new Error(`Token refresh failed. Re-run auth. ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return this.oauth2Client;
  }

  async runAuthFlow(): Promise<OAuthTokens> {
    this.assertConfigured();
    const scopes = getScopes();
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    // Try to open browser
    try {
      const open = (await import('open')).default;
      await open(authUrl);
    } catch {
      // ignore
    }

    const code = await this.captureAuthCode();
    const { tokens } = await this.oauth2Client.getToken(code);

    ensureTokenDir(this.tokenPath);
    await this.saveTokens(tokens as OAuthTokens);
    return tokens as OAuthTokens;
  }

  private captureAuthCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url || '', true);

        if (parsedUrl.pathname !== '/callback') {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not found');
          return;
        }

        const code = parsedUrl.query.code as string | undefined;
        const error = parsedUrl.query.error as string | undefined;

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!doctype html><html><body><h1>Authorization Failed</h1><p>${escapeHtml(error)}</p></body></html>`);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<!doctype html><html><body><h1>Missing authorization code</h1></body></html>');
          server.close();
          reject(new Error('No authorization code received'));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<!doctype html><html><body><h1>Gmail Authorized</h1><p>You can close this window.</p></body></html>');
        server.close();
        resolve(code);
      });

      const portMatch = this.redirectUri.match(/:(\d+)/);
      const port = portMatch ? parseInt(portMatch[1], 10) : 3857;

      server.listen(port, () => {
        // eslint-disable-next-line no-console
        console.error(`[createsomething-gmail-mcp] Waiting for authorization on http://localhost:${port}/callback`);
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use. Change GOOGLE_REDIRECT_URI or free the port.`));
        } else {
          reject(err);
        }
      });

      setTimeout(() => {
        server.close();
        reject(new Error('Authorization timed out after 5 minutes'));
      }, 5 * 60 * 1000);
    });
  }

  private async loadTokens(): Promise<OAuthTokens | null> {
    try {
      if (!fs.existsSync(this.tokenPath)) return null;
      const content = fs.readFileSync(this.tokenPath, 'utf-8');
      return JSON.parse(content) as OAuthTokens;
    } catch {
      return null;
    }
  }

  private async saveTokens(tokens: OAuthTokens): Promise<void> {
    ensureTokenDir(this.tokenPath);
    fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  }
}

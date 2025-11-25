#!/usr/bin/env node
/**
 * Gmail OAuth Setup Script
 *
 * This script helps you get a refresh token for Gmail API access.
 *
 * Prerequisites:
 * 1. Go to console.cloud.google.com
 * 2. Create or select a project
 * 3. Enable the Gmail API
 * 4. Create OAuth 2.0 credentials (Desktop App type)
 * 5. Download the credentials and save as gmail-credentials.json
 *
 * Usage:
 *   node scripts/gmail-oauth-setup.js
 *
 * The script will:
 * 1. Start a local server
 * 2. Open browser for Google OAuth consent
 * 3. Exchange auth code for tokens
 * 4. Display the refresh token to save
 */

const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3333;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = [
	'https://www.googleapis.com/auth/gmail.readonly',
	'https://www.googleapis.com/auth/gmail.send',
	'https://www.googleapis.com/auth/gmail.modify'
];

// Load credentials
const credentialsPath = path.join(__dirname, 'gmail-credentials.json');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Gmail OAuth Setup for PM Agent                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

if (!fs.existsSync(credentialsPath)) {
	console.log(`
❌ Missing gmail-credentials.json

To fix this:
1. Go to https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Desktop app" as application type
4. Download the JSON file
5. Save it as: ${credentialsPath}

Then run this script again.
`);
	process.exit(1);
}

let credentials;
try {
	const raw = fs.readFileSync(credentialsPath, 'utf8');
	const parsed = JSON.parse(raw);
	credentials = parsed.installed || parsed.web;
	if (!credentials) {
		throw new Error('Invalid credentials format');
	}
} catch (error) {
	console.error('❌ Error reading credentials:', error.message);
	process.exit(1);
}

const { client_id, client_secret } = credentials;

console.log(`✅ Loaded credentials for client: ${client_id.substring(0, 30)}...`);
console.log(`📧 Scopes: ${SCOPES.join(', ')}`);

// Build authorization URL
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', client_id);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES.join(' '));
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token

// Start local server to receive callback
const server = http.createServer(async (req, res) => {
	const url = new URL(req.url, `http://localhost:${PORT}`);

	if (url.pathname === '/callback') {
		const code = url.searchParams.get('code');
		const error = url.searchParams.get('error');

		if (error) {
			res.writeHead(400, { 'Content-Type': 'text/html' });
			res.end(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
            <h1>❌ Authorization Failed</h1>
            <p>Error: ${error}</p>
            <p>Please try again.</p>
          </body>
        </html>
      `);
			server.close();
			process.exit(1);
		}

		if (code) {
			console.log('\n📥 Received authorization code, exchanging for tokens...');

			try {
				// Exchange code for tokens
				const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({
						code,
						client_id,
						client_secret,
						redirect_uri: REDIRECT_URI,
						grant_type: 'authorization_code'
					})
				});

				const tokens = await tokenResponse.json();

				if (tokens.error) {
					throw new Error(tokens.error_description || tokens.error);
				}

				res.writeHead(200, { 'Content-Type': 'text/html' });
				res.end(`
          <html>
            <body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
              <h1>✅ Authorization Successful!</h1>
              <p>Your tokens have been generated. Check your terminal for the refresh token.</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);

				console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ✅ SUCCESS! Here are your tokens:                            ║
╚═══════════════════════════════════════════════════════════════╝

🔑 REFRESH TOKEN (save this - you need it for the agent):
${tokens.refresh_token}

🔐 ACCESS TOKEN (temporary, will be refreshed automatically):
${tokens.access_token?.substring(0, 50)}...

⏱️  Access token expires in: ${tokens.expires_in} seconds

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEPS:

1. Save these secrets to Wrangler:

   cd packages/io
   npx wrangler secret put GMAIL_CLIENT_ID
   # Paste: ${client_id}

   npx wrangler secret put GMAIL_CLIENT_SECRET
   # Paste: ${client_secret}

   npx wrangler secret put GMAIL_REFRESH_TOKEN
   # Paste: ${tokens.refresh_token}

2. Deploy the agent:
   pnpm run build && pnpm run deploy

3. Test Gmail access:
   curl -X POST https://createsomething.io/api/agent \\
     -H "Content-Type: application/json" \\
     -d '{"action": "gmail_triage"}'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

				// Also save to a file for reference
				const tokenFile = path.join(__dirname, 'gmail-tokens.json');
				fs.writeFileSync(
					tokenFile,
					JSON.stringify(
						{
							client_id,
							client_secret,
							refresh_token: tokens.refresh_token,
							access_token: tokens.access_token,
							scope: tokens.scope,
							token_type: tokens.token_type,
							generated_at: new Date().toISOString(),
							note: 'Save refresh_token as GMAIL_REFRESH_TOKEN secret in Wrangler'
						},
						null,
						2
					)
				);

				console.log(`\n📄 Tokens also saved to: ${tokenFile}`);
				console.log('   (Keep this file secure or delete after saving to Wrangler secrets)\n');

				server.close();
				process.exit(0);
			} catch (error) {
				res.writeHead(500, { 'Content-Type': 'text/html' });
				res.end(`
          <html>
            <body style="font-family: sans-serif; padding: 40px;">
              <h1>❌ Token Exchange Failed</h1>
              <p>Error: ${error.message}</p>
            </body>
          </html>
        `);
				console.error('❌ Token exchange failed:', error.message);
				server.close();
				process.exit(1);
			}
		}
	} else {
		res.writeHead(404);
		res.end('Not found');
	}
});

server.listen(PORT, () => {
	console.log(`
🌐 Starting local server on http://localhost:${PORT}

📋 Opening authorization URL in your browser...
   (If it doesn't open, copy and paste this URL):

${authUrl.toString()}

⏳ Waiting for authorization...
`);

	// Try to open browser automatically
	const { exec } = require('child_process');
	const command =
		process.platform === 'darwin'
			? 'open'
			: process.platform === 'win32'
				? 'start'
				: 'xdg-open';

	exec(`${command} "${authUrl.toString()}"`, (error) => {
		if (error) {
			console.log('   Could not open browser automatically. Please open the URL manually.');
		}
	});
});

// Handle cleanup
process.on('SIGINT', () => {
	console.log('\n\n👋 Cancelled. Run the script again when ready.');
	server.close();
	process.exit(0);
});

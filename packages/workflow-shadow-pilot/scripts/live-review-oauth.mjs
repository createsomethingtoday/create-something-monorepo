import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { auth } from '@modelcontextprotocol/sdk/client/auth.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import {
  assertWorkflowPilotPrivacy,
  observeTemplateReviewQueue,
} from '../dist/index.js';

const mcpUrl =
  process.env.WORKFLOW_PILOT_REVIEW_MCP_URL?.trim() ||
  'https://webflow-template-review-mcp.createsomething.workers.dev/mcp';
const callbackPort = Number.parseInt(process.env.WORKFLOW_PILOT_OAUTH_PORT || '65221', 10);
const callbackUrl = `http://127.0.0.1:${callbackPort}/callback`;
const limit = Number.parseInt(process.env.WORKFLOW_PILOT_LIVE_LIMIT || '5', 10);
const oauthTimeoutMs = Number.parseInt(
  process.env.WORKFLOW_PILOT_OAUTH_TIMEOUT_MS || '900000',
  10,
);
const outputDir = process.env.WORKFLOW_PILOT_LIVE_OUT?.trim();
const corpusDir = process.env.WORKFLOW_PILOT_CORPUS_DIR?.trim();
const expectedState = randomBytes(24).toString('hex');
const OAUTH_SCOPE = 'openid profile email mcp template-review:queue-read';
const IDENTITY_USERINFO_URL = 'https://id.createsomething.space/oauth/userinfo';

class EphemeralOAuthProvider {
  constructor(onRedirect) {
    this.onRedirect = onRedirect;
  }
  get redirectUrl() {
    return callbackUrl;
  }
  get clientMetadata() {
    return {
      client_name: 'CREATE SOMETHING Workflow Shadow Pilot',
      redirect_uris: [callbackUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: OAUTH_SCOPE,
    };
  }
  state() {
    return expectedState;
  }
  clientInformation() {
    return this.clientInfo;
  }
  saveClientInformation(value) {
    this.clientInfo = value;
  }
  tokens() {
    return this.savedTokens;
  }
  saveTokens(value) {
    this.savedTokens = value;
  }
  redirectToAuthorization(url) {
    this.onRedirect(url);
  }
  saveCodeVerifier(value) {
    this.savedCodeVerifier = value;
  }
  codeVerifier() {
    if (!this.savedCodeVerifier) throw new Error('OAuth PKCE verifier is unavailable.');
    return this.savedCodeVerifier;
  }
}

async function verifyIdentityUserInfo(provider) {
  const accessToken = provider.savedTokens?.access_token;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('OAuth token exchange did not return an in-memory access token.');
  }
  const response = await fetch(IDENTITY_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Identity userinfo verification failed with HTTP ${response.status}.`);
  }
  const payload = await response.json();
  const expectedResource = mcpUrl.replace(/\/+$/, '');
  const resource = typeof payload.resource === 'string' ? payload.resource.replace(/\/+$/, '') : '';
  const scopes = typeof payload.scope === 'string'
    ? payload.scope.split(/\s+/).filter(Boolean)
    : [];
  if (
    resource !== expectedResource ||
    !scopes.includes('template-review:queue-read') ||
    scopes.includes('template-review:read') ||
    scopes.includes('template-review:write')
  ) {
    throw new Error('Identity userinfo did not preserve the exact queue-only resource scope.');
  }
  return {
    schemaVersion: 'workflow_live_auth_evidence.v0.1',
    tokenExchangeSucceeded: true,
    userinfoValidated: true,
    resource: expectedResource,
    scope: OAUTH_SCOPE,
    broaderTemplateReviewScopesPresent: false,
  };
}

function waitForAuthorizationCode() {
  let resolveCode;
  let rejectCode;
  const codePromise = new Promise((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', callbackUrl);
    if (url.pathname !== '/callback') {
      response.writeHead(404).end('Not found');
      return;
    }
    const error = url.searchParams.get('error');
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    if (error || state !== expectedState || !code) {
      response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Authorization could not be verified. You may close this tab.');
      rejectCode(new Error(error || 'OAuth callback state or code was invalid.'));
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><title>Authorization received</title><main><h1>Authorization received</h1><p>The adapter is completing token exchange and the bounded observation. Check Codex for the verified result before treating the workflow as complete.</p></main>');
    resolveCode(code);
  });
  server.listen(callbackPort, '127.0.0.1');
  const timeout = setTimeout(
    () => rejectCode(new Error('OAuth authorization timed out.')),
    oauthTimeoutMs,
  );
  return {
    codePromise,
    close: async () => {
      clearTimeout(timeout);
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

const callback = waitForAuthorizationCode();
let authorizationUrl;
const provider = new EphemeralOAuthProvider((url) => {
  authorizationUrl = url.toString();
});
let bootstrapClient;

try {
  const authorizationResult = await auth(provider, {
    serverUrl: mcpUrl,
    scope: OAUTH_SCOPE,
  });
  if (authorizationResult !== 'REDIRECT' || !authorizationUrl) {
    throw new Error('OAuth authorization did not produce the expected redirect.');
  }
  const parsedAuthorizationUrl = new URL(authorizationUrl);
  if (parsedAuthorizationUrl.searchParams.get('scope') !== OAUTH_SCOPE) {
    throw new Error('OAuth authorization URL widened beyond the queue-only application scope.');
  }
  process.stdout.write(
    `${JSON.stringify({ authorizationRequired: true, authorizationUrl, callbackUrl })}\n`,
  );
  const code = await callback.codePromise;
  const tokenResult = await auth(provider, {
    serverUrl: mcpUrl,
    authorizationCode: code,
    scope: OAUTH_SCOPE,
  });
  if (tokenResult !== 'AUTHORIZED') {
    throw new Error('OAuth token exchange did not complete.');
  }
  const authEvidence = await verifyIdentityUserInfo(provider);

  bootstrapClient = new Client(
    { name: 'workflow-shadow-pilot', version: '0.1.0' },
    { capabilities: {} },
  );
  const bootstrapTransport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    authProvider: provider,
  });
  await bootstrapClient.connect(bootstrapTransport);

  const transport = {
    async listTools() {
      const result = await bootstrapClient.listTools();
      return result.tools.map((tool) => ({ name: tool.name }));
    },
    async callTool(name, args) {
      return bootstrapClient.callTool({ name, arguments: args });
    },
  };
  const receipt = await observeTemplateReviewQueue({ transport, limit });
  if (corpusDir) await assertWorkflowPilotPrivacy(corpusDir, receipt);
  if (outputDir) {
    await mkdir(outputDir, { recursive: true });
    await writeFile(
      path.join(outputDir, 'live-auth-evidence.json'),
      `${JSON.stringify(authEvidence, null, 2)}\n`,
      'utf8',
    );
    await writeFile(
      path.join(outputDir, 'live-review-adapter-receipt.json'),
      `${JSON.stringify(receipt, null, 2)}\n`,
      'utf8',
    );
  }
  process.stdout.write(`${JSON.stringify({ ok: true, receipt }, null, 2)}\n`);
} finally {
  await callback.close();
  await bootstrapClient?.close().catch(() => undefined);
}

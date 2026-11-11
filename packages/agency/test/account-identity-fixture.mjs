/**
 * Local-only Identity provider for rendered account acceptance checks.
 * This exercises the application's normal ES256 verification; it is never an
 * application route, authentication bypass, production credential, or deploy step.
 *
 * From the repository root, first build Agency, then run in separate terminals:
 *   node packages/agency/test/account-identity-fixture.mjs
 *   node scripts/run-wrangler.mjs --cwd packages/agency pages dev .svelte-kit/cloudflare \
 *     --ip 127.0.0.1 --port 4197 --persist-to /tmp/agency-account-fixture-state \
 *     --binding CS_IDENTITY_ISSUER=http://127.0.0.1:4198 \
 *     --binding CS_IDENTITY_JWKS_URL=http://127.0.0.1:4198/.well-known/jwks.json \
 *     --binding CS_IDENTITY_AUDIENCE=client-workspace --binding ENVIRONMENT=development
 *
 * Open http://127.0.0.1:4198/session (or /session?long=1) to set the synthetic
 * HTTP-only cookie and continue to the local account. /clear removes that cookie.
 * Cookies are host-scoped, so both local ports share it. No Secure attribute is
 * used because this isolated loopback fixture uses HTTP. Stop both servers after QA.
 */

import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

export const FIXTURE_ISSUER = 'http://127.0.0.1:4198';
const ACCOUNT_URL = 'http://127.0.0.1:4197/account';
const AUDIENCE = 'client-workspace';
const SUBJECT = 'usr_customer';
const COOKIE_NAME = 'cs_access_token';
const LIFETIME_SECONDS = 60 * 60;
const encode = (value) => Buffer.from(typeof value === 'string' ? value : new Uint8Array(value)).toString('base64url');

export async function createAccountIdentityFixture() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
  );
  const publicJwk = {
    ...await crypto.subtle.exportKey('jwk', keyPair.publicKey),
    kid: 'agency-account-local-fixture', alg: 'ES256', use: 'sig'
  };
  const jwks = { keys: [publicJwk] };
  const profiles = new Map();

  async function createToken(longEmail = false) {
    const now = Math.floor(Date.now() / 1000);
    const email = longEmail
      ? 'account-layout-review-with-a-deliberately-long-email-address@customer-workspace-with-a-long-subdomain.example.invalid'
      : 'owner@example.invalid';
    const claims = {
      sub: SUBJECT, email, tier: 'agency', source: 'space',
      iss: FIXTURE_ISSUER, aud: [AUDIENCE],
      kind: 'identity_access_token', session_version: 2, email_verified: true,
      iat: now - 30, exp: now + LIFETIME_SECONDS
    };
    const signingInput = [
      encode(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: publicJwk.kid })),
      encode(JSON.stringify(claims))
    ].join('.');
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' }, keyPair.privateKey,
      new TextEncoder().encode(signingInput)
    );
    const token = `${signingInput}.${encode(signature)}`;
    profiles.set(token, claims);
    return token;
  }

  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' });
      response.end('GET only');
      return;
    }
    const url = new URL(request.url ?? '/', FIXTURE_ISSUER);
    if (url.pathname === '/.well-known/jwks.json') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(jwks));
      return;
    }
    if (url.pathname === '/v1/users/me') {
      const bearer = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      const claims = profiles.get(bearer);
      if (!claims || claims.exp <= Math.floor(Date.now() / 1000)) {
        response.writeHead(401, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'Fixture session required' }));
        return;
      }
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        id: SUBJECT, email: claims.email, tier: 'agency', analytics_opt_out: true
      }));
      return;
    }
    if (url.pathname === '/session') {
      const token = await createToken(url.searchParams.get('long') === '1');
      response.writeHead(302, {
        'Set-Cookie': `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${LIFETIME_SECONDS}`,
        Location: ACCOUNT_URL
      });
      response.end();
      return;
    }
    if (url.pathname === '/clear') {
      response.writeHead(302, {
        'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
        Location: ACCOUNT_URL
      });
      response.end();
      return;
    }
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Local account Identity fixture: /session, /session?long=1, /clear');
  });

  return { server, createToken, jwks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server } = await createAccountIdentityFixture();
  server.listen(4198, '127.0.0.1', () => {
    console.log(`Local synthetic Identity fixture: ${FIXTURE_ISSUER}/session`);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close());
  }
}

/** LOCAL ONLY: run `pnpm --filter @create-something/a2a exec tsx scripts/shared-inbox-fixture.ts`.
 * Loopback-only Vite plus actual Worker app.fetch, ephemeral SQLite and locally signed
 * synthetic owner sessions. No external Identity, production data, secrets or delivery.
 * The adapter injects a synthetic owner cookie; it does NOT prove browser OAuth/login.
 * Never import this script into Worker/build entrypoints. Restart resets all data.
 */
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import app from '../src/app';
import { randomToken, hash, seal } from '../src/crypto';
import { createTestDatabase } from '../test/sqlite';
import type { RuntimeEnv } from '../src/env';

const base = 'https://a2a.createsomething.agency';
export async function sharedHttpFixture() {
  const storage = createTestDatabase();
  const pair = await generateKeyPair('ES256');
  const jwk = await exportJWK(pair.publicKey);
  jwk.kid = 'shared-http';
  const env = {
    DB: storage.db,
    BASE_URL: base,
    AUTH_RESOURCE: base + '/mcp',
    IDENTITY_ISSUER: 'https://id.createsomething.space',
    ENVIRONMENT: 'test',
    ALLOWED_EMAILS: 'pilot@example.com',
    SELF_SERVICE_ENABLED: 'true',
    SHARED_INBOXES_ENABLED: 'true',
    LOCAL_TEST_JWKS: JSON.stringify({ keys: [jwk] }),
    SESSION_KEY: randomToken(),
    AUTH_CLIENT_ID: 'test',
    BUILD_REVISION: 'shared-fixture',
    ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) },
    DELIVERIES: { send: async () => {} }
  } as unknown as RuntimeEnv;
  async function token(subject: string, connection?: string) {
    return new SignJWT({
      kind: 'oauth_access_token',
      resource: base + '/mcp',
      scope: 'a2a:read a2a:write a2a:admin',
      email: subject + '@example.com',
      email_verified: true,
      client_id: 'test',
      ...(connection ? { connection_id: connection } : {})
    })
      .setProtectedHeader({ alg: 'ES256', kid: jwk.kid })
      .setIssuer(env.IDENTITY_ISSUER)
      .setAudience(env.AUTH_RESOURCE)
      .setSubject(subject)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(pair.privateKey);
  }
  async function owner(subject: string) {
    const raw = randomToken(),
      id = await hash(raw),
      now = Date.now();
    await storage.db
      .prepare(
        'INSERT INTO auth_sessions(id_hash,owner_subject,token_ciphertext,access_expires_at,expires_at,created_at) VALUES(?,?,?,?,?,?)'
      )
      .bind(
        id,
        subject,
        await seal(
          env.SESSION_KEY,
          JSON.stringify({ access_token: await token(subject), expires_in: 3600 }),
          `session:${id}`
        ),
        now + 3600000,
        now + 3600000,
        now
      )
      .run();
    return { cookie: `__Host-a2a_session=${raw}` };
  }
  async function call(
    path: string,
    headers: Record<string, string>,
    method = 'GET',
    body?: unknown
  ) {
    return app.fetch(
      new Request(base + path, {
        method,
        headers: {
          origin: base,
          ...headers,
          ...(body !== undefined ? { 'content-type': 'application/json' } : {})
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
      }),
      env
    );
  }
  return { storage, env, token, owner, call };
}

import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const f = await sharedHttpFixture();
const ownerHeaders = await f.owner('fixture-owner');
const audit: { path: string; method: string; body: unknown }[] = [];
let mode = 'normal',
  delayNextPost = 0;
async function api(path: string, method = 'GET', body?: unknown) {
  const r = await f.call('/api/v2' + path, ownerHeaders, method, body);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<any>;
}
const agent = (await api('/agents', 'POST', { name: 'Fixture research' })).agent;
await api('/agents', 'POST', { name: 'Fixture delivery' });
const inbox = (await api('/inboxes', 'POST', { name: 'Long history fixture' })).inbox;
const second = (await api('/inboxes', 'POST', { name: 'Second fixture inbox' })).inbox;
await api(`/inboxes/${inbox.id}/members`, 'POST', { agentId: agent.id });
for (let n = 1; n <= 55; n++)
  await api(`/inboxes/${inbox.id}/messages`, 'POST', {
    text: `Synthetic history ${n}`,
    idempotencyKey: `fixture-${n}`
  });
await api(`/inboxes/${inbox.id}/context`, 'POST', {
  title: 'Long context fixture',
  text: 'A'.repeat(4100) + 'END VERIFIED'
});
const v = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../web', import.meta.url)),
  server: { host: '127.0.0.1', port: 4176, strictPort: true },
  plugins: [
    {
      name: 'local-actual-shared-http',
      transformIndexHtml(html) {
        return html.replace(
          '<body class="console shared-console">',
          '<body class="console shared-console"><div role="note">LOCAL FIXTURE · synthetic owner sessions and SQLite · no production authentication or delivery</div>'
        );
      },
      configureServer(s) {
        s.middlewares.use(async (req, res, next) => {
          const u = new URL(req.url ?? '/', 'http://127.0.0.1:4176');
          if (u.pathname === '/fixture/mode') {
            mode = u.searchParams.get('value') ?? 'normal';
            res.end('ok');
            return;
          }
          if (u.pathname === '/fixture/delay-next-post') {
            delayNextPost = 1000;
            res.end('ok');
            return;
          }
          if (u.pathname === '/fixture/audit') {
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify(audit));
            return;
          }
          if (u.pathname === '/fixture/state') {
            res.setHeader('content-type', 'application/json');
            res.end(
              JSON.stringify({ inboxId: inbox.id, secondInboxId: second.id, agentId: agent.id })
            );
            return;
          }
          if (u.pathname === '/api/v1/config') {
            const r = await f.call(u.pathname, {});
            res.statusCode = r.status;
            res.setHeader('content-type', 'application/json');
            res.end(await r.text());
            return;
          }
          if (!u.pathname.startsWith('/api/v2')) return next();
          try {
            let text = '';
            for await (const c of req) text += c;
            const body = text ? JSON.parse(text) : undefined;
            audit.push({ path: u.pathname.slice(7), method: req.method ?? 'GET', body });
            if (mode === 'signin') {
              res.statusCode = 401;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: { message: 'Synthetic signed out' } }));
              return;
            }
            if (mode === 'error') {
              res.statusCode = 503;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: { message: 'Synthetic service unavailable' } }));
              return;
            }
            if (req.method === 'POST' && u.pathname.endsWith('/messages') && delayNextPost) {
              const ms = delayNextPost;
              delayNextPost = 0;
              await new Promise((r) => setTimeout(r, ms));
            }
            const r = await f.call(u.pathname + u.search, ownerHeaders, req.method, body);
            res.statusCode = r.status;
            res.setHeader('content-type', 'application/json');
            res.end(await r.text());
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: { message: String(e) } }));
          }
        });
      }
    }
  ]
});
await v.listen();
console.log(
  'LOCAL ONLY http://127.0.0.1:4176/inboxes.html (actual app.fetch; synthetic owner cookies; restart resets data)'
);
async function close() {
  await v.close();
  f.storage.close();
  process.exit(0);
}
process.once('SIGINT', () => void close());
process.once('SIGTERM', () => void close());

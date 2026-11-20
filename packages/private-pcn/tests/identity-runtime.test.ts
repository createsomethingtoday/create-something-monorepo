import { afterAll, beforeAll, expect, it } from 'vitest';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { fileURLToPath } from 'node:url';

const issuer = 'https://identity.example.test';
let script: string;
let token: string;
let jwks: { keys: JsonWebKey[] };
const runtimes: Miniflare[] = [];

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify'
  ]);
  const publicKey = await crypto.subtle.exportKey('jwk', pair.publicKey);
  Object.assign(publicKey, { kid: 'offline-runtime-fixture', alg: 'ES256', use: 'sig' });
  jwks = { keys: [publicKey] };
  const encode = (value: string | ArrayBuffer) =>
    Buffer.from(typeof value === 'string' ? value : new Uint8Array(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const input = [
    encode(JSON.stringify({ alg: 'ES256', kid: 'offline-runtime-fixture' })),
    encode(
      JSON.stringify({
        sub: 'offline-user',
        email: 'member@example.test',
        iss: issuer,
        aud: ['agency'],
        iat: now,
        exp: now + 300,
        kind: 'identity_access_token',
        session_version: 2,
        email_verified: true
      })
    )
  ].join('.');
  token = `${input}.${encode(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.privateKey,
      new TextEncoder().encode(input)
    )
  )}`;

  // Bundle source directly: a stale Canon dist must not hide a runtime regression.
  const output = await build({
    stdin: {
      resolveDir: fileURLToPath(new URL('.', import.meta.url)),
      contents: `
        import { verifyIdentityToken } from '../../canon/src/lib/auth/server.ts';
        export default {
          async fetch(request, env) {
            const identity = await verifyIdentityToken(env.TOKEN, {
              issuer: '${issuer}',
              audience: 'agency',
              jwksUrl: '${issuer}/jwks',
              fetch: globalThis.fetch
            });
            return Response.json({
              identity: identity && { subject: identity.subject, email: identity.email }
            });
          }
        };
      `
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    write: false
  });
  script = output.outputFiles[0].text;
});

afterAll(async () => {
  await Promise.all(runtimes.map((runtime) => runtime.dispose()));
});

async function verify(redirect: boolean) {
  const requests: string[] = [];
  const runtime = new Miniflare({
    modules: true,
    script,
    compatibilityDate: '2026-06-01',
    compatibilityFlags: ['nodejs_compat'],
    bindings: { TOKEN: token },
    // All subrequests terminate here. No network, provider or real credential.
    outboundService: (request: { url: string }) => {
      requests.push(request.url);
      if (redirect && request.url === `${issuer}/jwks`) {
        return new Response(null, {
          status: 302,
          headers: { Location: `${issuer}/redirected-jwks` }
        });
      }
      return Response.json(jwks);
    }
  });
  runtimes.push(runtime);
  const response = await runtime.dispatchFetch('https://pcn.example.test/session');
  return { result: await response.json(), requests };
}

it('verifies a valid Identity session through the real workerd fetch and stream APIs', async () => {
  const { result, requests } = await verify(false);
  expect(result).toEqual({
    identity: { subject: 'offline-user', email: 'member@example.test' }
  });
  expect(requests).toEqual([`${issuer}/jwks`]);
});

it('fails closed on a JWKS redirect without following its destination', async () => {
  const { result, requests } = await verify(true);
  expect(result).toEqual({ identity: null });
  expect(requests).toEqual([`${issuer}/jwks`]);
});

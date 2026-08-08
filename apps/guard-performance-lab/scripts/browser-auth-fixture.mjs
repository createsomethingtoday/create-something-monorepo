import { createServer } from 'node:http';
import { webcrypto } from 'node:crypto';

const port = Number(process.env.PORT ?? 4180);
const issuer = `http://127.0.0.1:${port}`;
const audience = 'guard-performance-lab';
const keyId = 'guard-lab-browser-fixture';
const keys = await webcrypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
);
const publicJwk = await webcrypto.subtle.exportKey('jwk', keys.publicKey);

function encode(value) {
  return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
}

async function token(subject, includeEmail = true) {
  const now = Math.floor(Date.now() / 1000);
  const signingInput = `${encode({ alg: 'ES256', typ: 'JWT', kid: keyId })}.${encode({
    iss: issuer,
    aud: audience,
    sub: subject,
    ...(includeEmail ? { email: `${subject}@fixture.invalid` } : {}),
    iat: now,
    exp: now + 900
  })}`;
  const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keys.privateKey,
    Buffer.from(signingInput)
  );
  return `${signingInput}.${Buffer.from(signature).toString('base64url')}`;
}

const tokens = {
  operator: await token('subject-operator'),
  player: await token('subject-player', false),
  unbound: await token('subject-unbound')
};

let playerAccess = null;
let playerAccessSecret = null;

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { return null; }
}

createServer(async (request, response) => {
  response.setHeader('content-type', 'application/json');
  if (request.url === '/.well-known/jwks.json') {
    response.end(JSON.stringify({ keys: [{ ...publicJwk, kid: keyId, alg: 'ES256', use: 'sig' }] }));
    return;
  }
  const name = request.url?.replace('/token/', '');
  if (name && name in tokens) {
    response.end(JSON.stringify({ access_token: tokens[name] }));
    return;
  }
  if (request.url?.startsWith('/v1/auth/player-access/admin-') && request.method === 'POST') {
    if (request.headers['x-api-key'] !== 'fixture-player-access-admin') {
      response.statusCode = 401;
      response.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    const payload = await body(request);
    if (request.url.endsWith('/admin-get')) {
      response.end(JSON.stringify({ player_access: playerAccess }));
      return;
    }
    if (request.url.endsWith('/admin-upsert')) {
      playerAccess = {
        subject: payload?.subject_id,
        player_code: payload?.player_code,
        manager_subject: payload?.manager_subject,
        status: 'active'
      };
      playerAccessSecret = payload?.passphrase;
      response.statusCode = 201;
      response.end(JSON.stringify({ success: true, player_access: playerAccess }));
      return;
    }
    if (request.url.endsWith('/admin-revoke')) {
      if (playerAccess) playerAccess.status = 'revoked';
      response.end(JSON.stringify({ success: true, player_access: playerAccess }));
      return;
    }
  }
  if (request.url === '/v1/auth/player-login' && request.method === 'POST') {
    const payload = await body(request);
    if (!playerAccess || playerAccess.status !== 'active' || payload?.player_code?.toUpperCase() !== playerAccess.player_code || payload?.passphrase !== playerAccessSecret) {
      response.statusCode = 401;
      response.end(JSON.stringify({ error: 'invalid_credentials' }));
      return;
    }
    response.end(JSON.stringify({ access_token: tokens.player, refresh_token: 'fixture-player-refresh', expires_in: 900, refresh_expires_in: 43200, user: { id: 'subject-player', access_type: 'player' } }));
    return;
  }
  if (request.url === '/v1/auth/refresh' && request.method === 'POST') {
    response.end(JSON.stringify({ access_token: tokens.player, refresh_token: 'fixture-player-refresh-rotated', expires_in: 900, refresh_expires_in: 43200 }));
    return;
  }
  if (request.url === '/v1/auth/logout' && request.method === 'POST') {
    response.end(JSON.stringify({ success: true }));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ error: 'not_found' }));
}).listen(port, '127.0.0.1', () => {
  console.log(JSON.stringify({ issuer, jwksUrl: `${issuer}/.well-known/jwks.json`, tokenNames: Object.keys(tokens) }));
});

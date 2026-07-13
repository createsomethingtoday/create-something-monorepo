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

async function token(subject) {
  const now = Math.floor(Date.now() / 1000);
  const signingInput = `${encode({ alg: 'ES256', typ: 'JWT', kid: keyId })}.${encode({
    iss: issuer,
    aud: audience,
    sub: subject,
    email: `${subject}@fixture.invalid`,
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
  player: await token('subject-player'),
  unbound: await token('subject-unbound')
};

createServer((request, response) => {
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
  response.statusCode = 404;
  response.end(JSON.stringify({ error: 'not_found' }));
}).listen(port, '127.0.0.1', () => {
  console.log(JSON.stringify({ issuer, jwksUrl: `${issuer}/.well-known/jwks.json`, tokenNames: Object.keys(tokens) }));
});

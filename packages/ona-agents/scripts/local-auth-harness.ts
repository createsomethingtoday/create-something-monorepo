import { createServer } from 'node:http';

const host = '127.0.0.1';
const port = Number(process.env.LOCAL_AUTH_PORT || '8788');
const issuer = `http://${host}:${port}`;
const audience = 'ona-agents';
const password = 'local-auth-proof';

function base64Url(value: string | ArrayBuffer): string {
  return Buffer.from(typeof value === 'string' ? value : new Uint8Array(value)).toString(
    'base64url'
  );
}

const keyPair = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
);
const publicJwk = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as JsonWebKey & {
  kid: string;
  alg: string;
  use: string;
};
publicJwk.kid = 'local-auth-proof-key';
publicJwk.alg = 'ES256';
publicJwk.use = 'sig';

async function signIdentity(email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const subject = email.startsWith('operator@') ? 'local_staff' : 'local_outsider';
  const signingInput = [
    base64Url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: publicJwk.kid })),
    base64Url(
      JSON.stringify({
        sub: subject,
        email,
        tier: email.endsWith('@createsomething.io') ? 'agency' : 'free',
        source: 'io',
        iss: issuer,
        aud: [audience],
        iat: now,
        exp: now + 15 * 60
      })
    )
  ].join('.');
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keyPair.privateKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64Url(signature)}`;
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/.well-known/jwks.json') {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ keys: [publicJwk] }));
    return;
  }

  if (request.method === 'POST' && request.url === '/v1/auth/login') {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      email?: string;
      password?: string;
    };
    if (!body.email || body.password !== password) {
      response.writeHead(401, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'invalid_credentials' }));
      return;
    }
    const accessToken = await signIdentity(body.email.toLowerCase());
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(
      JSON.stringify({
        access_token: accessToken,
        refresh_token: 'local-refresh-proof',
        token_type: 'Bearer',
        expires_in: 15 * 60,
        user: {
          id: body.email.startsWith('operator@') ? 'local_staff' : 'local_outsider',
          email: body.email.toLowerCase(),
          tier: body.email.endsWith('@createsomething.io') ? 'agency' : 'free',
          source: 'io',
          created_at: new Date().toISOString()
        }
      })
    );
    return;
  }

  response.writeHead(404, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(port, host, () => {
  console.log(`Local auth proof harness listening on ${issuer}`);
});

import { createRemoteJWKSet, jwtVerify } from 'jose';

export type RemoteAccessOptions = {
  teamDomain: string;
  audience: string;
  allowedEmail: string;
};

let cachedIssuer = '';
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function jwksFor(issuer: string): ReturnType<typeof createRemoteJWKSet> {
  if (cachedIssuer !== issuer || !cachedJwks) {
    cachedJwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    cachedIssuer = issuer;
  }
  return cachedJwks;
}

export async function verifyRemoteAccess(
  request: Request,
  options: RemoteAccessOptions
): Promise<boolean> {
  const assertion = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!assertion || !options.teamDomain || !options.audience || !options.allowedEmail) return false;

  try {
    const issuer = options.teamDomain.replace(/\/$/, '');
    const { payload } = await jwtVerify(assertion, jwksFor(issuer), {
      issuer,
      audience: options.audience,
      algorithms: ['RS256']
    });
    return typeof payload.email === 'string' &&
      payload.email.toLowerCase() === options.allowedEmail.toLowerCase();
  } catch {
    return false;
  }
}

import { timingSafeEqual } from 'node:crypto';

export const LOOPBACK_CAPABILITY_COOKIE = 'cs_workspace_capability';

export type LoopbackDecision = 'allow' | 'bootstrap' | 'deny';

const TRUSTED_DESKTOP_ORIGINS = new Set([
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost'
]);

function equal(left: string | undefined, right: string): boolean {
  if (!left) return false;
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function decideLoopbackRequest(options: {
  configuredToken: string;
  expectedOrigin: string;
  requestMethod: string;
  requestUrl: URL;
  requestOrigin?: string;
  cookieToken?: string;
  presentedToken?: string;
}): LoopbackDecision {
  if (!/^[a-f0-9]{64}$/.test(options.configuredToken)) return 'deny';
  if (options.requestUrl.origin !== options.expectedOrigin) return 'deny';
  if (
    options.requestOrigin &&
    options.requestOrigin !== options.expectedOrigin &&
    !TRUSTED_DESKTOP_ORIGINS.has(options.requestOrigin)
  ) {
    return 'deny';
  }
  if (equal(options.cookieToken, options.configuredToken)) return 'allow';
  if (
    options.requestMethod === 'GET' &&
    options.requestUrl.pathname === '/' &&
    equal(options.presentedToken, options.configuredToken)
  ) {
    return 'bootstrap';
  }
  return 'deny';
}

export function loopbackBootstrapDocument(): string {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0;url=/"><title>Opening workspace</title></head><body>Opening your local workspace.<script>location.replace(\'/\')</script></body></html>';
}

export function loopbackCapabilityCookie(token: string): string {
  return `${LOOPBACK_CAPABILITY_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax`;
}

export function applyLoopbackSecurityHeaders(
  headers: Headers,
  expectedOrigin?: string,
  allowSameOriginFrame = false
): void {
  if (!headers.has('content-security-policy')) {
    headers.set(
      'content-security-policy',
      "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self'"
    );
  }
  if (!allowSameOriginFrame && /^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(expectedOrigin ?? '')) {
    const policy = headers.get('content-security-policy') ?? '';
    if (!policy.includes(expectedOrigin!)) {
      headers.set(
        'content-security-policy',
        policy.replace(
          /connect-src ([^;]+)/,
          (_directive, sources: string) =>
            `connect-src ${sources.trim() === "'none'" ? expectedOrigin : `${sources} ${expectedOrigin}`}`
        )
      );
    }
  }
  if (allowSameOriginFrame) {
    const policy = headers.get('content-security-policy') ?? '';
    headers.set(
      'content-security-policy',
      /(?:^|;)\s*frame-ancestors [^;]+/.test(policy)
        ? policy.replace(/frame-ancestors [^;]+/, "frame-ancestors 'self'")
        : `${policy.replace(/;?\s*$/, '')}; frame-ancestors 'self'`
    );
  }
  headers.set('referrer-policy', 'no-referrer');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', allowSameOriginFrame ? 'SAMEORIGIN' : 'DENY');
  headers.set('cross-origin-opener-policy', 'same-origin');
  headers.set('cross-origin-resource-policy', 'same-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  headers.set('cache-control', 'no-store');
}

export function applyLoopbackBootstrapSecurityHeaders(headers: Headers): void {
  applyLoopbackSecurityHeaders(headers);
  headers.set(
    'content-security-policy',
    "default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'sha256-qBjLReXPsRLHPao6+8nICoVlbEWZcc/Os2pcXx5BCa0='; navigate-to 'self'"
  );
}

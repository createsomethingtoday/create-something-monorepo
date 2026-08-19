/**
 * Human-viewable screenshot links.
 *
 * claude.ai renders MCP image content into the model's context but not into
 * the chat UI, so reviewers cannot see inline captures. Each capture is
 * therefore also stored briefly (KV, ~1h TTL) and exposed through an
 * HMAC-signed URL the reviewer can open in a browser — same
 * capability-URL pattern as the thumbnail proxy.
 */

export const SCREENSHOT_VIEW_PATH = '/screenshot-view';
export const SCREENSHOT_VIEW_TTL_SECONDS = 60 * 60;

const encoder = new TextEncoder();

export interface ScreenshotViewClaims {
  id: string;
  exp: number;
}

function claimsPayload(claims: ScreenshotViewClaims): string {
  return `screenshot-view:${claims.id}:${claims.exp}`;
}

function importHmacKey(secret: string, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usages);
}

function hexFromBuffer(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function bufferFromHex(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/** Generic HMAC signer shared with the gallery route (distinct payload prefixes prevent cross-route signature reuse). */
export async function signCapabilityClaims(secret: string, payload: string): Promise<string> {
  const key = await importHmacKey(secret, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return hexFromBuffer(signature);
}

export async function verifyCapabilitySignature(
  secret: string,
  payload: string,
  signatureHex: string,
): Promise<boolean> {
  const signature = bufferFromHex(signatureHex);
  if (!signature) return false;
  const key = await importHmacKey(secret, ['verify']);
  return crypto.subtle.verify('HMAC', key, signature as unknown as ArrayBuffer, encoder.encode(payload));
}

export async function signScreenshotViewClaims(secret: string, claims: ScreenshotViewClaims): Promise<string> {
  return signCapabilityClaims(secret, claimsPayload(claims));
}

export async function verifyScreenshotViewSignature(
  secret: string,
  claims: ScreenshotViewClaims,
  signatureHex: string,
): Promise<boolean> {
  return verifyCapabilitySignature(secret, claimsPayload(claims), signatureHex);
}

export interface BuildScreenshotViewUrlOptions {
  origin: string;
  secret: string;
  id: string;
  ttlSeconds?: number;
}

export async function buildScreenshotViewUrl(options: BuildScreenshotViewUrlOptions): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + (options.ttlSeconds ?? SCREENSHOT_VIEW_TTL_SECONDS);
  const signature = await signScreenshotViewClaims(options.secret, { id: options.id, exp });
  const url = new URL(SCREENSHOT_VIEW_PATH, options.origin);
  url.searchParams.set('id', options.id);
  url.searchParams.set('exp', String(exp));
  url.searchParams.set('sig', signature);
  return url.toString();
}

export interface StoredScreenshot {
  bytes: ArrayBuffer;
  mimeType: string;
}

export interface ScreenshotViewDeps {
  secret?: string;
  getScreenshot: (id: string) => Promise<StoredScreenshot | null>;
}

function viewError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleScreenshotViewRequest(url: URL, deps: ScreenshotViewDeps): Promise<Response> {
  if (!deps.secret) {
    return viewError(503, 'VIEW_NOT_CONFIGURED', 'Screenshot view signing secret is not configured.');
  }
  const id = url.searchParams.get('id') ?? '';
  const exp = Number.parseInt(url.searchParams.get('exp') ?? '', 10);
  const signature = url.searchParams.get('sig') ?? '';
  if (!id || !Number.isFinite(exp) || !signature) {
    return viewError(400, 'BAD_REQUEST', 'Missing id, exp, or sig.');
  }
  if (!(await verifyScreenshotViewSignature(deps.secret, { id, exp }, signature))) {
    return viewError(403, 'BAD_SIGNATURE', 'Signature verification failed.');
  }
  if (exp < Math.floor(Date.now() / 1000)) {
    return viewError(410, 'LINK_EXPIRED', 'This screenshot link has expired. Re-run the capture tool for fresh links.');
  }
  const stored = await deps.getScreenshot(id);
  if (!stored) {
    return viewError(410, 'SCREENSHOT_EXPIRED', 'This screenshot is no longer stored. Re-run the capture tool for fresh links.');
  }
  return new Response(stored.bytes, {
    headers: {
      'Content-Type': stored.mimeType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

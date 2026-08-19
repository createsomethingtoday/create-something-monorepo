import type { TemplateReviewAssetThumbnails, TemplateReviewAttachment } from './airtable.js';

/**
 * Signed image proxy for Webflow Admin execute scripts.
 *
 * Airtable attachment URLs expire after ~2 hours and may not be CORS-fetchable
 * from https://webflow.com. Execute scripts therefore fall back to this worker
 * route, which re-resolves the attachment from Airtable at request time (so the
 * bytes are always fresh) and serves them with permissive CORS. Requests are
 * gated by an HMAC signature so the route is not an open proxy: only URLs
 * minted by the prepare tools (same worker, same secret) verify.
 */

export const THUMBNAIL_PROXY_PATH = '/thumbnail-proxy';
export const THUMBNAIL_PROXY_DEFAULT_TTL_SECONDS = 60 * 60;

export const THUMBNAIL_PROXY_KINDS = ['thumbnail', 'secondary', 'carousel'] as const;
export type ThumbnailProxyKind = (typeof THUMBNAIL_PROXY_KINDS)[number];

export interface ThumbnailProxyClaims {
  assetId: string;
  kind: ThumbnailProxyKind;
  index: number;
  expiresAtEpochSeconds: number;
}

const encoder = new TextEncoder();

function claimsPayload(claims: ThumbnailProxyClaims): string {
  return `${claims.assetId}|${claims.kind}|${claims.index}|${claims.expiresAtEpochSeconds}`;
}

async function importHmacKey(secret: string, usages: KeyUsage[]): Promise<CryptoKey> {
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
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function signThumbnailProxyClaims(secret: string, claims: ThumbnailProxyClaims): Promise<string> {
  const key = await importHmacKey(secret, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(claimsPayload(claims)));
  return hexFromBuffer(signature);
}

export async function verifyThumbnailProxySignature(
  secret: string,
  claims: ThumbnailProxyClaims,
  signatureHex: string,
): Promise<boolean> {
  const signature = bufferFromHex(signatureHex);
  if (!signature) return false;
  const key = await importHmacKey(secret, ['verify']);
  return crypto.subtle.verify('HMAC', key, signature as unknown as ArrayBuffer, encoder.encode(claimsPayload(claims)));
}

export interface BuildThumbnailProxyUrlOptions {
  origin: string;
  secret: string;
  assetId: string;
  kind: ThumbnailProxyKind;
  index?: number;
  ttlSeconds?: number;
  nowEpochMs?: number;
}

export async function buildThumbnailProxyUrl(options: BuildThumbnailProxyUrlOptions): Promise<string> {
  const index = options.index ?? 0;
  const ttlSeconds = options.ttlSeconds ?? THUMBNAIL_PROXY_DEFAULT_TTL_SECONDS;
  const nowEpochMs = options.nowEpochMs ?? Date.now();
  const claims: ThumbnailProxyClaims = {
    assetId: options.assetId,
    kind: options.kind,
    index,
    expiresAtEpochSeconds: Math.floor(nowEpochMs / 1000) + ttlSeconds,
  };
  const signature = await signThumbnailProxyClaims(options.secret, claims);
  const url = new URL(THUMBNAIL_PROXY_PATH, options.origin.replace(/\/+$/, '') + '/');
  url.searchParams.set('asset', claims.assetId);
  url.searchParams.set('kind', claims.kind);
  url.searchParams.set('i', String(claims.index));
  url.searchParams.set('exp', String(claims.expiresAtEpochSeconds));
  url.searchParams.set('sig', signature);
  return url.toString();
}

export function pickThumbnailAttachment(
  thumbnails: TemplateReviewAssetThumbnails,
  kind: ThumbnailProxyKind,
  index: number,
): TemplateReviewAttachment | null {
  if (kind === 'thumbnail') return index === 0 ? thumbnails.thumbnail : null;
  if (kind === 'secondary') return thumbnails.secondaryThumbnails[index] ?? null;
  return thumbnails.carouselImages[index] ?? null;
}

const PROXY_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Cache-Control': 'private, max-age=300',
};

function proxyError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...PROXY_CORS_HEADERS },
  });
}

export interface ThumbnailProxyDeps {
  secret: string | undefined;
  getThumbnails: (assetId: string) => Promise<TemplateReviewAssetThumbnails | null>;
  fetchImpl?: typeof fetch;
  nowEpochMs?: number;
}

export async function handleThumbnailProxyRequest(url: URL, deps: ThumbnailProxyDeps): Promise<Response> {
  if (!deps.secret) {
    return proxyError(503, 'PROXY_NOT_CONFIGURED', 'Thumbnail proxy signing secret is not configured.');
  }

  const assetId = url.searchParams.get('asset') ?? '';
  const kind = url.searchParams.get('kind') ?? '';
  const indexRaw = url.searchParams.get('i') ?? '';
  const expRaw = url.searchParams.get('exp') ?? '';
  const signature = url.searchParams.get('sig') ?? '';

  const index = Number.parseInt(indexRaw, 10);
  const expiresAtEpochSeconds = Number.parseInt(expRaw, 10);
  if (
    !assetId ||
    !signature ||
    !Number.isInteger(index) ||
    index < 0 ||
    !Number.isInteger(expiresAtEpochSeconds) ||
    !THUMBNAIL_PROXY_KINDS.includes(kind as ThumbnailProxyKind)
  ) {
    return proxyError(400, 'BAD_REQUEST', 'Missing or malformed thumbnail proxy parameters.');
  }

  const claims: ThumbnailProxyClaims = {
    assetId,
    kind: kind as ThumbnailProxyKind,
    index,
    expiresAtEpochSeconds,
  };

  const nowEpochSeconds = Math.floor((deps.nowEpochMs ?? Date.now()) / 1000);
  if (expiresAtEpochSeconds <= nowEpochSeconds) {
    return proxyError(403, 'LINK_EXPIRED', 'Thumbnail proxy link has expired. Re-run the prepare tool for a fresh link.');
  }

  const validSignature = await verifyThumbnailProxySignature(deps.secret, claims, signature);
  if (!validSignature) {
    return proxyError(403, 'BAD_SIGNATURE', 'Thumbnail proxy signature is invalid.');
  }

  const thumbnails = await deps.getThumbnails(assetId);
  if (!thumbnails) {
    return proxyError(404, 'ASSET_NOT_FOUND', 'Template asset not found in template-review scope.');
  }

  const attachment = pickThumbnailAttachment(thumbnails, claims.kind, claims.index);
  if (!attachment?.url) {
    return proxyError(404, 'IMAGE_NOT_FOUND', `No ${claims.kind} image at index ${claims.index} for this asset.`);
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const upstream = await fetchImpl(attachment.url);
  if (!upstream.ok || !upstream.body) {
    return proxyError(502, 'UPSTREAM_FETCH_FAILED', `Airtable attachment fetch failed with status ${upstream.status}.`);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? attachment.type ?? 'application/octet-stream',
      ...PROXY_CORS_HEADERS,
    },
  });
}

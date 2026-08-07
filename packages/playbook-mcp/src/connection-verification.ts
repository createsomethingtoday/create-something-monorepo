import { MCP_CATALOG } from './catalog.js';

const ALLOWED_CATALOG_ORIGINS = new Set(
  MCP_CATALOG.map((entry) => new URL(entry.url).origin),
);

export interface CatalogHealthCheck {
  cleanedUrl: string;
  healthUrl: string;
  urlsToTry: string[];
  strippedSuffix: boolean;
}

export function parseCatalogHealthCheck(rawUrl: string): CatalogHealthCheck {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Connection verification requires a valid HTTPS catalog URL');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Connection verification requires an HTTPS catalog URL');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Connection verification does not accept credentials, query parameters, or fragments');
  }
  if (!ALLOWED_CATALOG_ORIGINS.has(url.origin)) {
    throw new Error('Connection verification is limited to an MCP catalog origin');
  }

  const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';
  if (normalizedPath !== '/' && !/^\/(mcp|sse)(\/.*)?$/.test(normalizedPath)) {
    throw new Error('Connection verification only supports health or MCP transport paths');
  }

  const cleanedUrl = normalizedPath === '/' ? `${url.origin}/` : `${url.origin}${normalizedPath}`;
  const strippedSuffix = normalizedPath !== '/';
  const healthUrl = `${url.origin}/`;

  return {
    cleanedUrl,
    healthUrl,
    urlsToTry: strippedSuffix ? [healthUrl, cleanedUrl] : [cleanedUrl],
    strippedSuffix,
  };
}

export async function readJsonBodyLimited(
  response: Response,
  maxBytes = 64 * 1024,
): Promise<Record<string, unknown> | undefined> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error(`Connection verification response exceeds ${maxBytes} bytes`);
  }
  if (!response.body) return undefined;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Connection verification response exceeds ${maxBytes} bytes`);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(body)) as Record<string, unknown>;
}

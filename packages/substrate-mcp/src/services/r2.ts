/**
 * Cloudflare R2 service — file storage for Substrate.
 *
 * Uses the S3-compatible API with AWS Signature V4 signing.
 * R2's S3 endpoint: https://{account_id}.r2.cloudflarestorage.com
 *
 * Files live in R2; metadata lives in D1. Together they form the
 * file layer of the agent-native data system.
 */

import type { R2Config } from '../types.js';

// ─── S3 Endpoint ─────────────────────────────────────────────────────

function getEndpoint(config: R2Config): string {
  return `https://${config.accountId}.r2.cloudflarestorage.com`;
}

// ─── AWS Signature V4 ───────────────────────────────────────────────
// Minimal implementation for R2's S3-compatible API.

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function sha256(data: string | ArrayBuffer): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return hexEncode(hash);
}

function hexEncode(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(secret: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
  let key: ArrayBuffer = await hmacSha256(new TextEncoder().encode('AWS4' + secret), date);
  key = await hmacSha256(key, region);
  key = await hmacSha256(key, service);
  key = await hmacSha256(key, 'aws4_request');
  return key;
}

interface SignedRequest {
  url: string;
  headers: Record<string, string>;
}

async function signRequest(
  config: R2Config,
  method: string,
  path: string,
  body: ArrayBuffer | null,
  contentType?: string,
): Promise<SignedRequest> {
  const endpoint = getEndpoint(config);
  const url = `${endpoint}/${config.bucketName}${path}`;
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateOnly = dateStamp.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const scope = `${dateOnly}/${region}/${service}/aws4_request`;

  const payloadHash = body ? await sha256(body) : await sha256('');
  const headers: Record<string, string> = {
    host: `${config.accountId}.r2.cloudflarestorage.com`,
    'x-amz-date': dateStamp,
    'x-amz-content-sha256': payloadHash,
  };
  if (contentType) headers['content-type'] = contentType;

  // Canonical request
  const signedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderKeys.map(k => `${k}:${headers[k]}\n`).join('');
  const signedHeadersStr = signedHeaderKeys.join(';');

  const canonicalRequest = [
    method, `/${config.bucketName}${path}`, '',
    canonicalHeaders, signedHeadersStr, payloadHash,
  ].join('\n');

  // String to sign
  const stringToSign = [
    'AWS4-HMAC-SHA256', dateStamp, scope, await sha256(canonicalRequest),
  ].join('\n');

  // Signature
  const signingKey = await getSigningKey(config.secretAccessKey, dateOnly, region, service);
  const signature = hexEncode(await hmacSha256(signingKey, stringToSign));

  headers['authorization'] =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

  return { url, headers };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Upload a file to R2.
 * @param key - storage key (e.g. "workspace-id/files/uuid/filename.pdf")
 * @param data - raw bytes
 * @param contentType - MIME type
 */
export async function putObject(
  config: R2Config,
  key: string,
  data: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const signed = await signRequest(config, 'PUT', `/${key}`, data, contentType);
  const res = await fetch(signed.url, {
    method: 'PUT',
    headers: signed.headers,
    body: data,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 PUT failed (${res.status}): ${text}`);
  }
}

/**
 * Download a file from R2.
 * @returns Raw bytes, or null if not found.
 */
export async function getObject(
  config: R2Config,
  key: string,
): Promise<ArrayBuffer | null> {
  const signed = await signRequest(config, 'GET', `/${key}`, null);
  const res = await fetch(signed.url, {
    method: 'GET',
    headers: signed.headers,
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 GET failed (${res.status}): ${text}`);
  }
  return res.arrayBuffer();
}

/**
 * Delete a file from R2.
 */
export async function deleteObject(
  config: R2Config,
  key: string,
): Promise<void> {
  const signed = await signRequest(config, 'DELETE', `/${key}`, null);
  const res = await fetch(signed.url, {
    method: 'DELETE',
    headers: signed.headers,
  });
  // 204 or 404 both mean "gone"
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`R2 DELETE failed (${res.status}): ${text}`);
  }
}

/**
 * Check if a file exists in R2.
 */
export async function headObject(
  config: R2Config,
  key: string,
): Promise<boolean> {
  const signed = await signRequest(config, 'HEAD', `/${key}`, null);
  const res = await fetch(signed.url, {
    method: 'HEAD',
    headers: signed.headers,
  });
  return res.ok;
}

// ─── Key Generation ──────────────────────────────────────────────────

/**
 * Generate a unique storage key for a file.
 * Format: {workspace_id}/files/{file_id}/{sanitized_filename}
 */
export function generateStorageKey(workspaceId: string, fileId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${workspaceId}/files/${fileId}/${safe}`;
}

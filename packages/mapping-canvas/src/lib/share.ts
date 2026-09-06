import { isDocument, type CanvasDocument } from './document';
import type { D1Database } from '@cloudflare/workers-types';

export const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const encoder = new TextEncoder();
const MAX_DOCUMENT_BYTES = 500_000;
const DEFAULT_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;
const MAX_RETENTION_MS = 365 * 24 * 60 * 60 * 1_000;

export type ShareRecord = { shareId: string; document: CanvasDocument; revision: number; publishedAt: string; updatedAt: string; expiresAt: string | null };
export type ShareDb = Pick<D1Database, 'prepare' | 'batch'>;

const randomToken = (bytes: number) => { const data = crypto.getRandomValues(new Uint8Array(bytes)); return btoa(String.fromCharCode(...data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); };
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
const constantTimeEqual = (left: string, right: unknown) => { const candidate = typeof right === 'string' ? right : ''; let mismatch = left.length ^ candidate.length; for (let index = 0; index < Math.max(left.length, candidate.length); index += 1) mismatch |= (left.charCodeAt(index) || 0) ^ (candidate.charCodeAt(index) || 0); return mismatch === 0; };
export const capabilityHash = async (token: string) => hex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));

export function validateSnapshot(value: unknown): CanvasDocument {
  if (!isDocument(value)) throw new Error('Snapshot is not a supported Draw document.');
  const bytes = encoder.encode(JSON.stringify(value)).length;
  if (bytes > MAX_DOCUMENT_BYTES || value.objects.length > 1_000 || encoder.encode(value.title).length > 240) throw new Error('Snapshot exceeds Draw sharing limits.');
  return structuredClone(value);
}

const rowToShare = (row: Record<string, unknown>): ShareRecord => ({
  shareId: String(row.share_id), document: JSON.parse(String(row.document_json)) as CanvasDocument,
  revision: Number(row.revision), publishedAt: String(row.published_at), updatedAt: String(row.updated_at),
  expiresAt: row.expires_at ? String(row.expires_at) : null
});

export async function createShare(db: ShareDb, documentValue: unknown, expiresAt?: string | null) {
  const document = validateSnapshot(documentValue), shareId = randomToken(16), managementToken = randomToken(32), managementHash = await capabilityHash(managementToken), now = new Date().toISOString();
  const currentTime = Date.now(), parsedExpiry = expiresAt ? Date.parse(expiresAt) : currentTime + DEFAULT_RETENTION_MS;
  if (!Number.isFinite(parsedExpiry) || parsedExpiry <= currentTime || parsedExpiry > currentTime + MAX_RETENTION_MS) throw new Error('Snapshot expiration must be a valid future date within one year.');
  const expiry = new Date(parsedExpiry).toISOString();
  await db.prepare('INSERT INTO draw_shares (share_id, management_hash, document_json, title, revision, published_at, updated_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, NULL)')
    .bind(shareId, managementHash, JSON.stringify(document), document.title, now, now, expiry).run();
  return { shareId, managementToken, revision: 1, publishedAt: now, expiresAt: expiry };
}

export async function readShare(db: ShareDb, shareId: string): Promise<ShareRecord | null> {
  if (!SHARE_ID_PATTERN.test(shareId)) return null;
  const row = await db.prepare('SELECT share_id, document_json, revision, published_at, updated_at, expires_at FROM draw_shares WHERE share_id = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)').bind(shareId, new Date().toISOString()).first<Record<string, unknown>>();
  if (!row) return null;
  try { const share = rowToShare(row); return isDocument(share.document) ? share : null; } catch { return null; }
}

async function authorize(db: ShareDb, shareId: string, token: string) {
  if (!SHARE_ID_PATTERN.test(shareId) || !token) return null;
  const row = await db.prepare('SELECT management_hash, revision FROM draw_shares WHERE share_id = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)').bind(shareId, new Date().toISOString()).first<Record<string, unknown>>();
  if (!row || !constantTimeEqual(await capabilityHash(token), row.management_hash)) return null;
  return Number(row.revision);
}

export async function updateShare(db: ShareDb, shareId: string, token: string, expectedRevision: number, documentValue: unknown) {
  const authorizedRevision = await authorize(db, shareId, token);
  if (authorizedRevision === null) return null;
  if (authorizedRevision !== expectedRevision) return { conflict: true as const, revision: authorizedRevision };
  const document = validateSnapshot(documentValue), now = new Date().toISOString(), next = expectedRevision + 1;
  const result = await db.prepare('UPDATE draw_shares SET document_json = ?, title = ?, revision = ?, updated_at = ? WHERE share_id = ? AND revision = ? AND revoked_at IS NULL').bind(JSON.stringify(document), document.title, next, now, shareId, expectedRevision).run();
  if (!result.success || result.meta.changes !== 1) {
    const current = await authorize(db, shareId, token);
    return current === null ? null : { conflict: true as const, revision: current };
  }
  return { shareId, revision: next, updatedAt: now };
}

export async function revokeShare(db: ShareDb, shareId: string, token: string) {
  if (await authorize(db, shareId, token) === null) return false;
  const result = await db.prepare('UPDATE draw_shares SET revoked_at = ?, document_json = ? WHERE share_id = ? AND revoked_at IS NULL').bind(new Date().toISOString(), '{}', shareId).run();
  return result.success && result.meta.changes === 1;
}

export async function purgeExpiredShares(db: ShareDb, now = new Date().toISOString(), limit = 25) {
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const legacyCutoff = new Date(Date.parse(now) - MAX_RETENTION_MS).toISOString();
  const result = await db.prepare('DELETE FROM draw_shares WHERE share_id IN (SELECT share_id FROM draw_shares WHERE (expires_at IS NOT NULL AND expires_at <= ?) OR (expires_at IS NULL AND published_at <= ?) LIMIT ?)')
    .bind(now, legacyCutoff, boundedLimit).run();
  return result.success ? result.meta.changes : 0;
}

export async function purgeExpiredPublishLimits(db: ShareDb, currentWindowStart = Math.floor(Date.now() / 600_000) * 600_000, limit = 100) {
  const boundedLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const result = await db.prepare('DELETE FROM draw_publish_limits WHERE bucket_key IN (SELECT bucket_key FROM draw_publish_limits WHERE window_started_at < ? LIMIT ?)')
    .bind(currentWindowStart, boundedLimit).run();
  return result.success ? result.meta.changes : 0;
}

export async function consumePublishLimit(db: ShareDb, address: string, secret: string, now = Date.now()) {
  if (!secret) throw new Error('Sharing is temporarily unavailable.');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(address || 'unknown'))), windowStart = Math.floor(now / 600_000) * 600_000;
  const result = await db.prepare('INSERT INTO draw_publish_limits (bucket_key, window_started_at, publish_count) VALUES (?, ?, 1) ON CONFLICT(bucket_key) DO UPDATE SET window_started_at = excluded.window_started_at, publish_count = CASE WHEN draw_publish_limits.window_started_at = excluded.window_started_at THEN draw_publish_limits.publish_count + 1 ELSE 1 END WHERE draw_publish_limits.window_started_at != excluded.window_started_at OR draw_publish_limits.publish_count < 10').bind(digest, windowStart).run();
  return result.success && result.meta.changes === 1;
}

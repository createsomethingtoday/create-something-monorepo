import { createHash } from 'node:crypto';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createTemplateDraftAccessToken(
  assetId: string,
  creatorEmail: string,
  secret: string
): string {
  return createHash('sha256')
    .update(`template-draft:${assetId}:${normalizeEmail(creatorEmail)}:${secret}`)
    .digest('hex');
}

export function verifyTemplateDraftAccessToken(
  assetId: string,
  creatorEmail: string,
  secret: string,
  token: string | null | undefined
): boolean {
  if (!token) return false;
  return createTemplateDraftAccessToken(assetId, creatorEmail, secret) === token.trim();
}

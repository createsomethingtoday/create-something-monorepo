import { type ReviewerDirectory, type ReviewerProfile, getReviewerProfileForEmail } from './reviewer-directory.js';

export const SCOPE_READ = 'template-review:read';
export const SCOPE_WRITE = 'template-review:write';

/**
 * Derive the Clerk Frontend API origin from a publishable key.
 * Publishable keys encode the frontend API domain: pk_live_<base64("clerk.example.com$")>.
 */
export function clerkFrontendApiFromPublishableKey(publishableKey?: string | null): string | null {
  const trimmed = publishableKey?.trim();
  if (!trimmed) return null;
  const match = /^pk_(?:test|live)_(.+)$/.exec(trimmed);
  if (!match) return null;
  try {
    const decoded = atob(match[1]);
    const domain = decoded.endsWith('$') ? decoded.slice(0, -1) : decoded;
    if (!domain || domain.includes(' ')) return null;
    return `https://${domain}`;
  } catch {
    return null;
  }
}

export function parseAllowedEmails(raw?: string | null): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export interface OAuthAccessInput {
  email?: string | null;
  allowedDomain: string;
  allowedEmails: Set<string>;
  directory: ReviewerDirectory;
}

export type OAuthAccessResult =
  | { allowed: false; reason: 'missing_email' | 'domain_not_allowed' | 'email_not_allowlisted' }
  | { allowed: true; email: string; scopes: string[]; reviewerProfile: ReviewerProfile | null };

/**
 * Central access policy for OAuth-authenticated sessions:
 * - email must belong to the allowed domain
 * - when an explicit allowlist is configured, the email must be on it
 * - allowlisted users and directory-listed reviewers get write scope;
 *   everyone else is read-only
 */
export function resolveOAuthAccess(input: OAuthAccessInput): OAuthAccessResult {
  const email = input.email?.trim().toLowerCase();
  if (!email) return { allowed: false, reason: 'missing_email' };
  if (!email.endsWith(`@${input.allowedDomain}`)) {
    return { allowed: false, reason: 'domain_not_allowed' };
  }
  if (input.allowedEmails.size > 0 && !input.allowedEmails.has(email)) {
    return { allowed: false, reason: 'email_not_allowlisted' };
  }

  const reviewerProfile = getReviewerProfileForEmail(input.directory, email);
  const isReviewer = Boolean(reviewerProfile) || input.allowedEmails.has(email);
  return {
    allowed: true,
    email,
    scopes: isReviewer ? [SCOPE_READ, SCOPE_WRITE] : [SCOPE_READ],
    reviewerProfile,
  };
}

/**
 * RFC 9728 protected resource metadata pointing MCP clients at the Clerk
 * authorization server for discovery, registration (DCR), and token issuance.
 */
export function buildProtectedResourceMetadata(options: {
  resourceOrigin: string;
  resourcePath: string;
  authorizationServer: string;
}): Record<string, unknown> {
  return {
    resource: `${options.resourceOrigin}${options.resourcePath}`,
    authorization_servers: [options.authorizationServer],
    scopes_supported: ['email', 'profile'],
    bearer_methods_supported: ['header'],
    resource_name: 'Webflow Template Review MCP',
  };
}

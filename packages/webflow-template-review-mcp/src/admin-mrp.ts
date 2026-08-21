import { AirtableClientError } from './airtable.js';

/**
 * Server-side client for the key-authenticated Marketplace MRP write-back
 * route: PUT https://webflow.com/admin/api/mrp/airtable.
 *
 * Contract (entrypoints/server, webflow/webflow — updateMRPViaAirtable):
 * - Auth is `Authorization: Bearer <marketplace airtable API key>` only — no
 *   Okta session, no CSRF. The route exists to receive Airtable-automation
 *   calls, so it is safe to call from this worker's egress.
 * - Prod also requires `X-Requested-With: XMLHttpRequest`; without it the
 *   route returns the public HTML shell instead of JSON.
 * - Partial-update semantics: only fields present in the body are $set. This
 *   client deliberately sends visibility only.
 * - `mrpId` is the MarketplaceResourceProfile _id; for TEMPLATE resources it
 *   equals the legacy Template _id shown at /admin/templates/<id>.
 * - Rate limit: 30 requests / 60s / IP. runValidators is on, so enum values
 *   must be exact.
 */

export const MRP_VISIBILITY_VALUES = ['PUBLIC', 'PRIVATE'] as const;
export type MrpVisibility = (typeof MRP_VISIBILITY_VALUES)[number];

export interface MarketplaceAdminConfig {
  /** 128-char marketplace Airtable API key (worker secret). */
  apiKey?: string;
  /** Override for tests; defaults to https://webflow.com. */
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface SetMrpVisibilityResult {
  mrpId: string;
  requestedVisibility: MrpVisibility;
  /** Raw route response (the updated MRP document when the route returns one). */
  response: unknown;
}

export async function setMrpVisibility(
  config: MarketplaceAdminConfig,
  mrpId: string,
  visibility: MrpVisibility,
): Promise<SetMrpVisibilityResult> {
  if (!config.apiKey) {
    throw new AirtableClientError(
      'MARKETPLACE_ADMIN_KEY_UNAVAILABLE',
      'The marketplace admin API key is not configured in this MCP runtime, so MRP visibility cannot be changed here.',
      503,
    );
  }

  const fetchFn = config.fetchFn ?? fetch;
  const baseUrl = (config.baseUrl ?? 'https://webflow.com').replace(/\/$/, '');
  const response = await fetchFn(`${baseUrl}/admin/api/mrp/airtable`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // Required in prod: without it the route serves the public HTML shell.
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ mrpId, visibility }),
  });

  const rawText = await response.text();
  let parsed: unknown;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const code =
      response.status === 404
        ? 'MRP_NOT_FOUND'
        : response.status === 401 || response.status === 403
          ? 'MARKETPLACE_ADMIN_KEY_REJECTED'
          : response.status === 429
            ? 'MRP_ROUTE_RATE_LIMITED'
            : 'MRP_UPDATE_FAILED';
    throw new AirtableClientError(code, `PUT /admin/api/mrp/airtable failed with status ${response.status}.`, response.status, {
      mrpId,
      visibility,
      response: parsed ?? rawText.slice(0, 500),
    });
  }

  if (parsed === null && rawText.trimStart().startsWith('<')) {
    throw new AirtableClientError(
      'MRP_ROUTE_RETURNED_HTML',
      'The MRP route returned HTML instead of JSON — the write may not have been applied. Verify in Admin before retrying.',
      502,
      { mrpId, visibility },
    );
  }

  return { mrpId, requestedVisibility: visibility, response: parsed };
}

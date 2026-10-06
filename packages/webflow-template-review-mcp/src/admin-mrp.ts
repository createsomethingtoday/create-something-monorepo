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

/**
 * Body for POST /admin/api/mrp/airtable with resourceType TEMPLATE
 * (createNewMRPViaAirtable). Beyond the schema's required core fields, templates
 * also need price, support (email or url) and templateMetadata — enforced
 * server-side by validateMRPByType. price.value is in cents, like Template.cost.
 */
export interface MrpTemplateCreatePayload {
  name: string;
  displayName: string;
  description: string;
  resourceType: 'TEMPLATE';
  /** Site short name (the `<shortName>.webflow.io` slug). */
  siteSlug: string;
  visibility: MrpVisibility;
  price: { value: number; unit: 'USD' };
  support: { email?: string; url?: string };
  templateMetadata: {
    type: string;
    extDetailPageUrl?: string;
    extCategory?: string;
    extMainTag?: string;
  };
  thumbnailImage?: { url: string; altText: string };
}

export interface CreateMrpTemplateResult {
  /** New MRP _id — equals the legacy Template _id shown at /admin/templates/<id>. */
  templateId: string;
  adminUrl: string;
  /** Raw route response (the created MRP document). */
  response: unknown;
}

async function callMrpRoute(
  config: MarketplaceAdminConfig,
  method: 'POST' | 'PUT',
  body: Record<string, unknown>,
  errorContext: Record<string, unknown>,
  failureCode: string,
): Promise<unknown> {
  if (!config.apiKey) {
    throw new AirtableClientError(
      'MARKETPLACE_ADMIN_KEY_UNAVAILABLE',
      'The marketplace admin API key is not configured in this MCP runtime, so this Webflow write cannot run here.',
      503,
    );
  }

  const fetchFn = config.fetchFn ?? fetch;
  const baseUrl = (config.baseUrl ?? 'https://webflow.com').replace(/\/$/, '');
  const response = await fetchFn(`${baseUrl}/admin/api/mrp/airtable`, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // Required in prod: without it the route serves the public HTML shell.
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let parsed: unknown;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message = typeof parsed === 'object' && parsed !== null ? String((parsed as { msg?: string; error?: string }).msg ?? (parsed as { error?: string }).error ?? '') : '';
    const code =
      response.status === 404
        ? 'MRP_NOT_FOUND'
        : response.status === 401 || response.status === 403
          ? 'MARKETPLACE_ADMIN_KEY_REJECTED'
          : response.status === 429
            ? 'MRP_ROUTE_RATE_LIMITED'
            : /already exists/i.test(message)
              ? 'TEMPLATE_ALREADY_EXISTS'
              : failureCode;
    throw new AirtableClientError(code, `${method} /admin/api/mrp/airtable failed with status ${response.status}.`, response.status, {
      ...errorContext,
      response: parsed ?? rawText.slice(0, 500),
    });
  }

  if (parsed === null && rawText.trimStart().startsWith('<')) {
    throw new AirtableClientError(
      'MRP_ROUTE_RETURNED_HTML',
      'The MRP route returned HTML instead of JSON — the write may not have been applied. Verify in Admin before retrying.',
      502,
      errorContext,
    );
  }

  return parsed;
}

export async function setMrpVisibility(
  config: MarketplaceAdminConfig,
  mrpId: string,
  visibility: MrpVisibility,
): Promise<SetMrpVisibilityResult> {
  const response = await callMrpRoute(config, 'PUT', { mrpId, visibility }, { mrpId, visibility }, 'MRP_UPDATE_FAILED');
  return { mrpId, requestedVisibility: visibility, response };
}

/**
 * Creates the MRP + legacy Template for a site in one server-side call. The
 * route rejects a site that already has a Template ("already exists") and a
 * site with code components or Adobe Fonts.
 */
export async function createMrpTemplate(
  config: MarketplaceAdminConfig,
  payload: MrpTemplateCreatePayload,
): Promise<CreateMrpTemplateResult> {
  const response = await callMrpRoute(
    config,
    'POST',
    payload as unknown as Record<string, unknown>,
    { siteSlug: payload.siteSlug, name: payload.name },
    'MRP_CREATE_FAILED',
  );
  const templateId = typeof response === 'object' && response !== null ? String((response as { _id?: unknown })._id ?? '') : '';
  if (!/^[0-9a-f]{24}$/i.test(templateId)) {
    throw new AirtableClientError(
      'MRP_CREATE_RESPONSE_UNEXPECTED',
      'The MRP route returned 200 without a 24-hex _id. Check Admin for a partially created template before retrying.',
      502,
      { siteSlug: payload.siteSlug, response },
    );
  }
  return { templateId, adminUrl: `https://webflow.com/admin/templates/${templateId}`, response };
}

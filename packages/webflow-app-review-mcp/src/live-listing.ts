import { AirtableClientError } from './airtable.js';

/**
 * Client for the live Marketplace listing profile (MRP) of an app, through the
 * key-authenticated Webflow route PUT https://webflow.com/admin/api/mrp/airtable.
 *
 * Contract (webflow/webflow, updateMRPViaAirtable, read on branch dev 2026-11-17):
 * - Auth is `Authorization: Bearer <marketplace key>` only. No session, no CSRF.
 * - Prod also needs `X-Requested-With: XMLHttpRequest`, or the route serves HTML.
 * - Only fields present in the body are written. A body of `mrpId` alone writes
 *   nothing and returns the current document, so that body is the read.
 * - Rate limit: 30 requests / 60 s / IP.
 *
 * The same route is used by webflow-template-review-mcp (src/admin-mrp.ts).
 */

export const LIVE_LISTING_STATUSES = ['DRAFT', 'UNDER_REVIEW', 'REJECTED', 'APPROVED', 'SUSPENDED', 'ARCHIVED'] as const;
export const LIVE_LISTING_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;

export type LiveListingStatus = (typeof LIVE_LISTING_STATUSES)[number];
export type LiveListingVisibility = (typeof LIVE_LISTING_VISIBILITIES)[number];

export interface LiveListingConfig {
  /** Marketplace admin key (worker secret). Unset = the live listing tools are off. */
  apiKey?: string;
  /** Override for tests; defaults to https://webflow.com. */
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface LiveListing {
  mrpId: string;
  status: string | null;
  visibility: string | null;
  /** INTEGRATION for an app listing. */
  resourceType: string | null;
  /** The Webflow app ID for an app listing. */
  resourceId: string | null;
  name: string | null;
  displayName: string | null;
  slug: string | null;
  updatedOn: string | null;
  /** A listing shows in the Marketplace only when it is APPROVED and PUBLIC. */
  isLive: boolean;
}

export interface LiveListingChange {
  status?: LiveListingStatus;
  visibility?: LiveListingVisibility;
}

const MRP_ID_PATTERN = /^[0-9a-f]{24}$/i;

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function toLiveListing(mrpId: string, document: unknown): LiveListing {
  if (typeof document !== 'object' || document === null) {
    throw new AirtableClientError(
      'LIVE_LISTING_RESPONSE_UNEXPECTED',
      'The listing route returned no document. Check the listing in Admin before you retry.',
      502,
      { mrpId },
    );
  }
  const doc = document as Record<string, unknown>;
  const resource = (typeof doc.resource === 'object' && doc.resource !== null ? doc.resource : {}) as Record<string, unknown>;
  const status = stringOrNull(doc.status);
  const visibility = stringOrNull(doc.visibility);
  return {
    // No fallback to the requested ID: a document without _id must fail the ID check.
    mrpId: stringOrNull(doc._id) ?? '',
    status,
    visibility,
    resourceType: stringOrNull(resource.type),
    resourceId: stringOrNull(resource.id),
    name: stringOrNull(doc.name),
    displayName: stringOrNull(doc.displayName),
    slug: stringOrNull(doc.slug),
    updatedOn: stringOrNull(doc.updatedOn),
    isLive: status === 'APPROVED' && visibility === 'PUBLIC',
  };
}

async function callListingRoute(config: LiveListingConfig, body: { mrpId: string } & LiveListingChange): Promise<LiveListing> {
  if (!config.apiKey) {
    throw new AirtableClientError(
      'MARKETPLACE_ADMIN_KEY_UNAVAILABLE',
      'The Marketplace admin key is not configured in this MCP runtime, so the live listing tools are off.',
      503,
    );
  }
  if (!MRP_ID_PATTERN.test(body.mrpId)) {
    throw new AirtableClientError('INVALID_MRP_ID', 'mrp_id must be a 24-character hex listing profile ID.', 400, {
      mrpId: body.mrpId,
    });
  }

  const fetchFn = config.fetchFn ?? fetch;
  const baseUrl = (config.baseUrl ?? 'https://webflow.com').replace(/\/$/, '');
  const response = await fetchFn(`${baseUrl}/admin/api/mrp/airtable`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let parsed: unknown = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const code =
      response.status === 404
        ? 'LIVE_LISTING_NOT_FOUND'
        : response.status === 401 || response.status === 403
          ? 'MARKETPLACE_ADMIN_KEY_REJECTED'
          : response.status === 429
            ? 'LIVE_LISTING_RATE_LIMITED'
            : 'LIVE_LISTING_REQUEST_FAILED';
    // Raw text only, capped and with the key removed, so an upstream echo cannot reach tool output.
    throw new AirtableClientError(code, `The listing route failed with status ${response.status}.`, response.status, {
      mrpId: body.mrpId,
      response: rawText.slice(0, 500).split(config.apiKey).join('[redacted]'),
    });
  }

  if (parsed === null) {
    throw new AirtableClientError(
      'LIVE_LISTING_RESPONSE_UNEXPECTED',
      'The listing route did not return JSON. If this was a write, check the listing in Admin before you retry.',
      502,
      { mrpId: body.mrpId },
    );
  }

  const listing = toLiveListing(body.mrpId, parsed);
  if (listing.mrpId.toLowerCase() !== body.mrpId.toLowerCase()) {
    throw new AirtableClientError(
      'LIVE_LISTING_RESPONSE_UNEXPECTED',
      'The listing route returned a different listing. If this was a write, check the listing in Admin before you retry.',
      502,
      { mrpId: body.mrpId, returnedMrpId: listing.mrpId },
    );
  }
  return listing;
}

/** Reads the live listing. Sends `mrpId` only, so the route writes nothing. */
export async function readLiveListing(config: LiveListingConfig, mrpId: string): Promise<LiveListing> {
  return callListingRoute(config, { mrpId });
}

/** Writes status, visibility, or both to the live listing. No other field is sent. */
export async function writeLiveListing(config: LiveListingConfig, mrpId: string, change: LiveListingChange): Promise<LiveListing> {
  const body: { mrpId: string } & LiveListingChange = { mrpId };
  if (change.status !== undefined) body.status = change.status;
  if (change.visibility !== undefined) body.visibility = change.visibility;
  if (body.status === undefined && body.visibility === undefined) {
    throw new AirtableClientError('NO_MUTATION_FIELDS', 'Supply status, visibility, or both.', 400);
  }
  const listing = await callListingRoute(config, body);
  if ((body.status !== undefined && listing.status !== body.status) || (body.visibility !== undefined && listing.visibility !== body.visibility)) {
    throw new AirtableClientError(
      'LIVE_LISTING_WRITE_NOT_APPLIED',
      'The listing route returned 200, but the listing does not show the requested values. Check the listing in Admin.',
      502,
      { mrpId, requested: change, current: { status: listing.status, visibility: listing.visibility } },
    );
  }
  return listing;
}

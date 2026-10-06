// Keep in sync with packages/webflow-template-search/src/supportRequest.ts.
export const SUPPORT_REQUEST_TYPES = [
  'pre_purchase',
  'bug_help',
  'customization',
  'file_request',
  'refund_licensing',
  'other',
] as const;

export type SupportRequestType = (typeof SUPPORT_REQUEST_TYPES)[number];

export const SUPPORT_REQUEST_TYPE_LABELS: Readonly<Record<SupportRequestType, string>> = {
  pre_purchase: 'Pre-purchase question',
  bug_help: 'Bug or help using the template',
  customization: 'Customization request',
  file_request: 'File request (Figma, assets)',
  refund_licensing: 'Refund or licensing',
  other: 'Other',
};

// The templates.webflow.com proxy, not workers.dev: webflow.com's CSP limits
// connect-src to https://*.webflow.com (see agentTools.ts).
export const SUPPORT_REQUEST_ENDPOINT =
  'https://templates.webflow.com/templates-api/api/templates/support-request';

export interface SupportRequestPayload {
  template_slug: string;
  request_type: SupportRequestType;
  buyer_name: string;
  buyer_email: string;
  message: string;
  website: string;
  /** Stable for one form submission, including its retries. */
  idempotency_key: string;
}

export type SupportRequestError =
  | 'invalid_fields'
  | 'rate_limited'
  | 'template_not_found'
  | 'creator_unreachable'
  | 'support_requests_disabled'
  | 'support_requests_unavailable'
  | 'origin_not_allowed'
  | 'send_failed'
  | 'network_error';

export type SupportRequestResult =
  | { ok: true; requestId: string }
  | { ok: false; error: SupportRequestError; fields?: string[]; retryAfterSeconds?: number };

export const SUPPORT_REQUEST_ERROR_MESSAGES: Readonly<Record<SupportRequestError, string>> = {
  invalid_fields: 'Check the highlighted fields and try again.',
  rate_limited: "You've sent several requests recently. Try again later.",
  template_not_found: "We couldn't find this template. Refresh the page and try again.",
  creator_unreachable: "We couldn't reach this creator. Contact Webflow support and we'll help.",
  support_requests_disabled: "Support requests aren't available yet. Contact Webflow support instead.",
  support_requests_unavailable: "Support requests aren't available right now. Try again later.",
  origin_not_allowed: "Support requests can only be sent from webflow.com.",
  send_failed: "Your request didn't send. Try again in a few minutes.",
  network_error: "Your request didn't send. Check your connection and try again.",
};

/** "Try again in about 3 hours." style wording for a Retry-After value. */
export function describeRetryAfter(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`;
  const hours = Math.ceil(minutes / 60);
  return `Try again in about ${hours} hour${hours === 1 ? '' : 's'}.`;
}

export function createIdempotencyKey(): string {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  return `tsr-${random}`;
}

function isKnownError(value: unknown): value is SupportRequestError {
  return typeof value === 'string' && value in SUPPORT_REQUEST_ERROR_MESSAGES;
}

/** The dialog can't be dismissed mid-submit, so the wait must be bounded. */
export const SUPPORT_REQUEST_TIMEOUT_MS = 20_000;

export async function submitSupportRequest(
  payload: SupportRequestPayload,
  fetchImpl: typeof fetch = fetch,
  endpoint = SUPPORT_REQUEST_ENDPOINT,
  timeoutMs = SUPPORT_REQUEST_TIMEOUT_MS,
): Promise<SupportRequestResult> {
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch {
    // Includes the timeout abort. The caller keeps the same idempotency key,
    // so a retry is deduplicated if the first attempt did reach the creator.
    if (timer) clearTimeout(timer);
    return { ok: false, error: 'network_error' };
  }

  // The timer stays armed through body decoding: headers can arrive and the
  // body still stall. An abort here rejects json(), which reads as send_failed.
  const json = (await response.json().catch(() => null).finally(() => timer && clearTimeout(timer))) as {
    success?: boolean;
    data?: { request_id?: string };
    error?: unknown;
    fields?: unknown;
    retry_after_seconds?: unknown;
  } | null;

  if (response.ok && json?.success && json.data?.request_id) {
    return { ok: true, requestId: json.data.request_id };
  }
  const fields = Array.isArray(json?.fields) ? json.fields.filter((field): field is string => typeof field === 'string') : undefined;
  const retryAfterSeconds = typeof json?.retry_after_seconds === 'number' ? json.retry_after_seconds : undefined;
  return {
    ok: false,
    error: isKnownError(json?.error) ? json.error : 'send_failed',
    ...(fields ? { fields } : {}),
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  };
}

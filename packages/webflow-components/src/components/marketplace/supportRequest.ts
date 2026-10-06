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

// workers.dev, not the templates.webflow.com proxy: the proxy only forwards
// known paths (see telemetryFallback.ts).
export const SUPPORT_REQUEST_ENDPOINT =
  'https://webflow-template-search.webflow-inc.workers.dev/api/templates/support-request';

export interface SupportRequestPayload {
  template_slug: string;
  request_type: SupportRequestType;
  buyer_name: string;
  buyer_email: string;
  message: string;
  website: string;
}

export type SupportRequestError =
  | 'invalid_fields'
  | 'rate_limited'
  | 'template_not_found'
  | 'creator_unreachable'
  | 'support_requests_disabled'
  | 'support_requests_unavailable'
  | 'send_failed'
  | 'network_error';

export type SupportRequestResult =
  | { ok: true; requestId: string }
  | { ok: false; error: SupportRequestError; fields?: string[] };

export const SUPPORT_REQUEST_ERROR_MESSAGES: Readonly<Record<SupportRequestError, string>> = {
  invalid_fields: 'Check the highlighted fields and try again.',
  rate_limited: "You've sent several requests recently. Try again in an hour.",
  template_not_found: "We couldn't find this template. Refresh the page and try again.",
  creator_unreachable: "We couldn't reach this creator. Contact Webflow support and we'll help.",
  support_requests_disabled: "Support requests aren't available yet. Contact Webflow support instead.",
  support_requests_unavailable: "Support requests aren't available right now. Try again later.",
  send_failed: "Your request didn't send. Try again in a few minutes.",
  network_error: "Your request didn't send. Check your connection and try again.",
};

function isKnownError(value: unknown): value is SupportRequestError {
  return typeof value === 'string' && value in SUPPORT_REQUEST_ERROR_MESSAGES;
}

export async function submitSupportRequest(
  payload: SupportRequestPayload,
  fetchImpl: typeof fetch = fetch,
  endpoint = SUPPORT_REQUEST_ENDPOINT,
): Promise<SupportRequestResult> {
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: 'network_error' };
  }

  const json = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: { request_id?: string };
    error?: unknown;
    fields?: unknown;
  } | null;

  if (response.ok && json?.success && json.data?.request_id) {
    return { ok: true, requestId: json.data.request_id };
  }
  const fields = Array.isArray(json?.fields) ? json.fields.filter((field): field is string => typeof field === 'string') : undefined;
  return { ok: false, error: isKnownError(json?.error) ? json.error : 'send_failed', ...(fields ? { fields } : {}) };
}

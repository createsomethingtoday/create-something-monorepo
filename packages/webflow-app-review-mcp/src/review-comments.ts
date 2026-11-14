/**
 * Client for the webflow-review-comments Worker: per-version review threads
 * that replace Zendesk tickets for Marketplace reviews.
 *
 * Each review MCP calls it with its own reviewer key. The Worker takes the
 * role and the scope (template or app) from the key, so the MCP can only act
 * as a reviewer inside its own review program. The MCP has already resolved
 * the reviewer from the session and passes their email.
 *
 * The Template Review MCP and the App Review MCP each carry this file. Keep
 * the two copies identical; a test in the App Review MCP compares them.
 */

export type CommentVisibility = 'internal' | 'draft' | 'released';
export type CommentResolution = 'open' | 'resolved' | 'carried_forward';

export interface ReviewComment {
  id: string;
  assetRef: string;
  versionRef: string;
  parentId: string | null;
  authorEmail: string;
  authorRole: 'creator' | 'reviewer' | 'system';
  body: string;
  visibility: CommentVisibility;
  releasedAt: string | null;
  resolution: CommentResolution;
  rubricRef: string | null;
  createdAt: string;
  editedAt: string | null;
}

export interface NewReviewComment {
  assetRef: string;
  body: string;
  visibility: 'internal' | 'draft';
  parentId?: string;
  rubricRef?: string;
  /** One key for one save. A repeat with the same key returns the first comment and writes nothing. */
  requestKey?: string;
}

/** One draft as the reviewer read it: its id and its last edit time (null when never edited). */
export interface ExpectedDraft {
  id: string;
  editedAt: string | null;
}

export type ReviewOutcome = 'changes_requested' | 'approved' | 'rejected';

/**
 * Who the Worker emails when a release makes feedback visible. Built from the
 * review record, never from tool input. The Worker adds the link itself.
 */
export interface ReleaseNotice {
  recipientEmail: string;
  recipientName?: string;
  assetName: string;
  assetType?: string;
  versionNumber?: number;
  outcome?: ReviewOutcome;
}

/** What happened to the email: sent, not needed, or failed (retry by releasing again). */
export interface ReleaseNotification {
  status: 'sent' | 'none' | 'failed';
  reason?: 'not_configured' | 'nothing_released' | 'no_recipient' | 'send_in_progress';
  sent?: number;
  pending?: number;
  error?: string;
}

export interface ReleaseResult {
  released: number;
  notification?: ReleaseNotification;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A notice when the record holds a usable address and asset name; otherwise
 * undefined, and the release goes out with no email. A record can list several
 * creator addresses, joined by commas; the email goes to the first valid one.
 * Values are cut to the Worker's limits so a long name cannot fail the release.
 */
export function buildReleaseNotice(input: {
  email?: string | null;
  name?: string | null;
  assetName?: string | null;
  assetType: string;
  versionNumber?: number | null;
  outcome?: ReviewOutcome;
}): ReleaseNotice | undefined {
  const recipientEmail = (input.email ?? '')
    .split(/[,;\s]+/)
    .find((address) => address.length <= 254 && EMAIL_PATTERN.test(address));
  const assetName = input.assetName?.trim() ?? '';
  if (!assetName || !recipientEmail) return undefined;
  const recipientName = input.name?.trim();
  return {
    recipientEmail,
    assetName: assetName.slice(0, 200),
    assetType: input.assetType,
    ...(recipientName ? { recipientName: recipientName.slice(0, 120) } : {}),
    ...(Number.isInteger(input.versionNumber) && (input.versionNumber as number) >= 0
      ? { versionNumber: input.versionNumber as number }
      : {}),
    ...(input.outcome ? { outcome: input.outcome } : {}),
  };
}

export interface ReviewCommentsConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export class ReviewCommentsClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ReviewCommentsClientError';
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;

export class ReviewCommentsClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: ReviewCommentsConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = config.fetch ?? fetch;
  }

  listVersion(versionRef: string, actorEmail: string): Promise<ReviewComment[]> {
    return this.request('GET', `/v1/versions/${encodeURIComponent(versionRef)}/comments`, actorEmail);
  }

  add(versionRef: string, actorEmail: string, input: NewReviewComment): Promise<ReviewComment> {
    return this.request('POST', `/v1/versions/${encodeURIComponent(versionRef)}/comments`, actorEmail, input);
  }

  edit(commentId: string, actorEmail: string, body: string): Promise<ReviewComment> {
    return this.request('PATCH', `/v1/comments/${encodeURIComponent(commentId)}`, actorEmail, { body });
  }

  remove(commentId: string, actorEmail: string): Promise<{ deleted: string }> {
    return this.request('DELETE', `/v1/comments/${encodeURIComponent(commentId)}`, actorEmail);
  }

  /**
   * Releases the drafts. With a notice, the Worker also emails the creator when it released something new.
   * With `expected`, the Worker releases only when the drafts on the version are exactly those, unchanged;
   * otherwise it releases nothing and answers 409.
   */
  release(versionRef: string, actorEmail: string, notice?: ReleaseNotice, expected?: ExpectedDraft[]): Promise<ReleaseResult> {
    return this.request(
      'POST',
      `/v1/versions/${encodeURIComponent(versionRef)}/release`,
      actorEmail,
      notice || expected ? { ...(notice ? { notify: notice } : {}), ...(expected ? { expected } : {}) } : undefined,
    );
  }

  resolve(commentId: string, actorEmail: string, resolution: CommentResolution): Promise<ReviewComment> {
    return this.request('POST', `/v1/comments/${encodeURIComponent(commentId)}/resolution`, actorEmail, { resolution });
  }

  private async request<T>(method: string, path: string, actorEmail: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'X-Actor-Email': actorEmail,
          'X-Actor-Role': 'reviewer',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
    } catch (error) {
      throw new ReviewCommentsClientError(
        'REVIEW_COMMENTS_UNREACHABLE',
        `Review comments service did not respond: ${error instanceof Error ? error.message : String(error)}`,
        503,
      );
    }

    type Envelope = { success?: boolean; data?: T; error?: string; correlationId?: string };
    let payload: Envelope | null;
    try {
      payload = (await response.json()) as Envelope | null;
    } catch {
      payload = null;
    }

    if (!response.ok || !payload?.success) {
      throw new ReviewCommentsClientError(
        'REVIEW_COMMENTS_REQUEST_FAILED',
        payload?.error ?? `Review comments service returned HTTP ${response.status}.`,
        response.status,
        payload?.correlationId ? { correlationId: payload.correlationId } : undefined,
      );
    }
    return payload.data as T;
  }
}

/** Null unless both the URL and the key are set; the comment tools then stay unregistered. */
export function buildReviewCommentsClient(baseUrl: string | undefined, apiKey: string | undefined): ReviewCommentsClient | null {
  if (!baseUrl?.trim() || !apiKey?.trim()) return null;
  return new ReviewCommentsClient({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() });
}

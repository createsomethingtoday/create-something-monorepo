/**
 * Client for the review comments service (repo webflow/marketplace-review-comments, a Webflow Cloud app): per-version review threads
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

/**
 * The decision summary the service stores per version. The service builds the
 * creator-facing wording (`text`) from these fields; the MCP only sends facts.
 */
export interface SummaryInput {
  outcome: ReviewOutcome;
  /** The Airtable "✨ Quality Rating" value as is, e.g. "🥇Exceptional". Cut to 80 characters. */
  qualityRating: string | null;
  /** The Airtable "✨Improvement Areas" values. At most 20, each cut to 200 characters. */
  improvementAreas: string[];
  /** The Airtable "🎨Creator Trust Level" (integer 0 to 100), or null. */
  creatorTrustLevel: number | null;
  assetType: string | null;
}

export interface DecisionSummary extends SummaryInput {
  versionRef: string;
  assetRef: string;
  setAt: string;
  text: {
    before: string[];
    areasLabel: string | null;
    areas: string[];
    after: string[];
    links: Array<{ phrase: string; url: string }>;
  };
}

/**
 * A dated fact about a version's review that the creator was told about, such
 * as "the review started". The service records it once per version and sends
 * at most one email for it; `email` says whether the creator got that email.
 */
export interface ReviewEvent {
  id: string;
  versionRef: string;
  assetRef: string;
  kind: 'review_started';
  occurredAt: string;
  email?: 'sent' | 'pending' | 'not_sent';
  emailSentAt?: string | null;
}

const MAX_SUMMARY_RATING_CHARS = 80;
const MAX_SUMMARY_AREAS = 20;
const MAX_SUMMARY_AREA_CHARS = 200;

/**
 * The summary for a decision, from the version record the MCP already loaded.
 * Values are cut to the service's limits so a long value cannot fail the send.
 * A trust level that is not an integer from 0 to 100 becomes null.
 */
export function buildDecisionSummary(
  version: { qualityRating?: string | null; improvementAreas?: readonly string[] | null; creatorTrustLevel?: number | null },
  asset: { assetType?: string | null } | null | undefined,
  outcome: ReviewOutcome,
): SummaryInput {
  const qualityRating = version.qualityRating?.trim().slice(0, MAX_SUMMARY_RATING_CHARS) || null;
  const improvementAreas = (version.improvementAreas ?? [])
    .map((area) => area.trim().slice(0, MAX_SUMMARY_AREA_CHARS))
    .filter(Boolean)
    .slice(0, MAX_SUMMARY_AREAS);
  const trust = version.creatorTrustLevel;
  const creatorTrustLevel = typeof trust === 'number' && Number.isInteger(trust) && trust >= 0 && trust <= 100 ? trust : null;
  return { outcome, qualityRating, improvementAreas, creatorTrustLevel, assetType: asset?.assetType?.trim() || null };
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

/** A time window as two ISO timestamps: `from` is included, `to` is not. Without them the window is all time. */
export interface CommentWindow {
  from?: string;
  to?: string;
}

export interface CommentSearchQuery extends CommentWindow {
  author?: string;
  assetRef?: string;
  visibility?: CommentVisibility;
  authorRole?: 'creator' | 'reviewer';
  limit?: number;
  cursor?: string;
}

export interface CommentSearchPage {
  /** Newest first. */
  comments: ReviewComment[];
  nextCursor: string | null;
}

/** "Written" goes by the time a comment was created; "sent" goes by the time it was released to the creator. */
export interface CommentCounts {
  written: number;
  sent: number;
  draft: number;
  internal: number;
  versions: number;
  assets: number;
  lastAt: string | null;
}

export interface CommentMetrics {
  from: string;
  to: string;
  author: string | null;
  totals: CommentCounts;
  reviewers: Array<CommentCounts & { email: string }>;
  /** Null when the counts are for one reviewer. */
  creatorReplies: number | null;
}

function queryString(query: object): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(name, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

/** The comment service's limit for one comment. */
export const MAX_COMMENT_CHARS = 20_000;

/**
 * Text that is longer than one comment may be, cut into comments in order. A
 * cut falls on a paragraph break when one exists, then a line break, then a
 * space, so no part is over the limit and no word is cut when a space exists.
 */
export function splitCommentBody(text: string, max: number = MAX_COMMENT_CHARS): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    const window = rest.slice(0, max);
    const at = [window.lastIndexOf('\n\n'), window.lastIndexOf('\n'), window.lastIndexOf(' ')].find((index) => index > max / 2);
    const cut = at ?? max;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts.filter(Boolean);
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
    // A bare `fetch` stored on an object loses its `this` on Cloudflare Workers ("Illegal invocation").
    this.fetchImpl = config.fetch ?? ((input, init) => fetch(input, init));
  }

  listVersion(versionRef: string, actorEmail: string): Promise<ReviewComment[]> {
    return this.request('GET', `/v1/versions/${encodeURIComponent(versionRef)}/comments`, actorEmail);
  }

  /** Comments across versions in this review program, newest first, one page at a time. */
  search(actorEmail: string, query: CommentSearchQuery = {}): Promise<CommentSearchPage> {
    return this.request('GET', `/v1/search/comments${queryString(query)}`, actorEmail);
  }

  /** Written and sent counts for this review program: in total and per reviewer, or for one author. */
  metrics(actorEmail: string, query: CommentWindow & { author?: string } = {}): Promise<CommentMetrics> {
    return this.request('GET', `/v1/metrics/comments${queryString(query)}`, actorEmail);
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
   * With `summary`, the Worker stores the decision summary for the version as part of the release.
   */
  release(
    versionRef: string,
    actorEmail: string,
    notice?: ReleaseNotice,
    expected?: ExpectedDraft[],
    summary?: SummaryInput,
  ): Promise<ReleaseResult> {
    return this.request(
      'POST',
      `/v1/versions/${encodeURIComponent(versionRef)}/release`,
      actorEmail,
      notice || expected || summary
        ? { ...(notice ? { notify: notice } : {}), ...(expected ? { expected } : {}), ...(summary ? { summary } : {}) }
        : undefined,
    );
  }

  /** What the creator was told about the review of a version (for example "review started"), oldest first. */
  listEvents(versionRef: string, actorEmail: string): Promise<ReviewEvent[]> {
    return this.request('GET', `/v1/versions/${encodeURIComponent(versionRef)}/events`, actorEmail);
  }

  /** The decision summary of a version, or null when none is set. */
  getSummary(versionRef: string, actorEmail: string): Promise<DecisionSummary | null> {
    return this.request('GET', `/v1/versions/${encodeURIComponent(versionRef)}/summary`, actorEmail);
  }

  /** Sets the decision summary of a version. Fails with 404 when the version has no thread yet. */
  setSummary(versionRef: string, summary: SummaryInput, actorEmail: string): Promise<DecisionSummary> {
    return this.request('PUT', `/v1/versions/${encodeURIComponent(versionRef)}/summary`, actorEmail, { summary });
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

/**
 * Client for the review comments service (repo webflow/marketplace-review-comments,
 * a Webflow Cloud app). The service holds the data; this dashboard verifies
 * the creator's session and asset ownership, then calls it as that creator.
 * Its key carries the creator role, so it never sees drafts or internal notes.
 *
 * Returns null until REVIEW_COMMENTS_URL and REVIEW_COMMENTS_API_KEY are set,
 * so the feature stays off until the Worker is deployed.
 * REVIEW_COMMENTS_ASSET_TYPES ("App" or "App,Template") limits it to the asset
 * types whose reviews have moved off Zendesk; unset means every type.
 */

export interface ReviewComment {
	id: string;
	assetRef: string;
	versionRef: string;
	parentId: string | null;
	authorRole: 'creator' | 'reviewer' | 'system';
	body: string;
	visibility: 'internal' | 'draft' | 'released';
	releasedAt: string | null;
	resolution: 'open' | 'resolved' | 'carried_forward';
	createdAt: string;
}

/**
 * The review team's decision summary for one round: rating, fixed intro
 * sentences, improvement areas and next steps. The Worker builds the text;
 * the dashboard only renders it.
 */
export interface DecisionSummary {
	versionRef: string;
	assetRef: string;
	setAt: string;
	outcome: 'changes_requested' | 'approved' | 'rejected';
	qualityRating: string | null;
	improvementAreas: string[];
	text: {
		before: string[];
		areasLabel: string | null;
		areas: string[];
		after: string[];
		links: Array<{ phrase: string; url: string }>;
	};
}

export class ReviewCommentsError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
	}
}

interface ReviewCommentsEnv {
	REVIEW_COMMENTS_URL?: string;
	REVIEW_COMMENTS_API_KEY?: string;
	REVIEW_COMMENTS_ASSET_TYPES?: string;
}

function isConfigured(env: ReviewCommentsEnv): boolean {
	return Boolean(env.REVIEW_COMMENTS_URL && env.REVIEW_COMMENTS_API_KEY);
}

/** True when the Worker is configured and this asset type uses review comments. */
export function isReviewCommentsEnabled(env: ReviewCommentsEnv, assetType: string | undefined): boolean {
	if (!isConfigured(env)) return false;
	const allowed = (env.REVIEW_COMMENTS_ASSET_TYPES ?? '')
		.split(',')
		.map((type) => type.trim().toLowerCase())
		.filter(Boolean);
	if (allowed.length === 0) return true;
	return assetType !== undefined && allowed.includes(assetType.trim().toLowerCase());
}

const REQUEST_TIMEOUT_MS = 10_000;

// Only these fields reach the browser. Author emails stay server-side: a
// creator sees "you" or "Webflow review team".
function toCreatorView(comment: ReviewComment): ReviewComment {
	return {
		id: comment.id,
		assetRef: comment.assetRef,
		versionRef: comment.versionRef,
		parentId: comment.parentId,
		authorRole: comment.authorRole,
		body: comment.body,
		visibility: comment.visibility,
		releasedAt: comment.releasedAt,
		resolution: comment.resolution,
		createdAt: comment.createdAt
	};
}

// The Worker already filters by role. This is the second check on the way out.
function releasedOnly(comments: ReviewComment[]): ReviewComment[] {
	return comments.filter((comment) => comment.visibility === 'released').map(toCreatorView);
}

const strings = (value: unknown): string[] =>
	Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

// Only the fields the card shows reach the browser. Trust level and asset type
// stay on the server.
function toCreatorSummary(summary: DecisionSummary): DecisionSummary {
	const text = summary.text ?? ({} as Partial<DecisionSummary['text']>);
	return {
		versionRef: summary.versionRef,
		assetRef: summary.assetRef,
		setAt: summary.setAt,
		outcome: summary.outcome,
		qualityRating: typeof summary.qualityRating === 'string' ? summary.qualityRating : null,
		improvementAreas: strings(summary.improvementAreas),
		text: {
			before: strings(text.before),
			areasLabel: typeof text.areasLabel === 'string' ? text.areasLabel : null,
			areas: strings(text.areas),
			after: strings(text.after),
			links: Array.isArray(text.links)
				? text.links.filter(
						(link) => typeof link?.phrase === 'string' && typeof link?.url === 'string'
					)
				: []
		}
	};
}

export function getReviewCommentsClient(env: ReviewCommentsEnv, fetcher: typeof fetch = fetch) {
	if (!isConfigured(env)) return null;
	const baseUrl = env.REVIEW_COMMENTS_URL!.replace(/\/+$/, '');

	async function call<T>(path: string, creatorEmail: string, init: RequestInit = {}): Promise<T> {
		const response = await fetcher(`${baseUrl}${path}`, {
			...init,
			headers: {
				Authorization: `Bearer ${env.REVIEW_COMMENTS_API_KEY}`,
				'Content-Type': 'application/json',
				'X-Actor-Email': creatorEmail,
				'X-Actor-Role': 'creator'
			},
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		}).catch((cause: unknown) => {
			throw new ReviewCommentsError(504, cause instanceof Error ? cause.message : 'no response');
		});
		const payload = (await response.json().catch(() => null)) as
			| { success: true; data: T }
			| { success: false; error: string }
			| null;
		if (!response.ok || !payload?.success) {
			const message = payload && !payload.success ? payload.error : 'review comments unavailable';
			throw new ReviewCommentsError(response.status, message);
		}
		return payload.data;
	}

	return {
		async listForAsset(assetId: string, creatorEmail: string): Promise<ReviewComment[]> {
			const comments = await call<ReviewComment[]>(
				`/v1/assets/${encodeURIComponent(assetId)}/comments`,
				creatorEmail
			);
			return releasedOnly(comments);
		},

		/**
		 * Decision summaries of the rounds that have released feedback. A failure
		 * is not fatal: the thread still shows its comments, so this returns [].
		 */
		async listSummariesByAsset(assetId: string, creatorEmail: string): Promise<DecisionSummary[]> {
			try {
				const summaries = await call<DecisionSummary[]>(
					`/v1/assets/${encodeURIComponent(assetId)}/summaries`,
					creatorEmail
				);
				return Array.isArray(summaries) ? summaries.map(toCreatorSummary) : [];
			} catch (err) {
				console.error(
					'[Review comments] Decision summaries unavailable:',
					err instanceof ReviewCommentsError ? err.status : 'unknown',
					err instanceof Error ? err.message : ''
				);
				return [];
			}
		},

		async reply(
			assetId: string,
			versionId: string,
			creatorEmail: string,
			input: { body: string; parentId?: string | null }
		): Promise<ReviewComment> {
			const comment = await call<ReviewComment>(
				`/v1/versions/${encodeURIComponent(versionId)}/comments`,
				creatorEmail,
				{
					method: 'POST',
					body: JSON.stringify({ assetRef: assetId, body: input.body, parentId: input.parentId ?? null })
				}
			);
			return toCreatorView(comment);
		}
	};
}

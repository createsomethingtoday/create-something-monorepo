import type { DecisionSummary, ReviewComment } from '$lib/server/review-comments';
import { isSilencedReviewStatus } from './review-status';

export interface TextSegment {
	text: string;
	/** Set when the segment is a link; only http(s) URLs are ever set. */
	url?: string;
}

/**
 * Split a paragraph into plain and linked segments. The result is rendered as
 * text nodes and anchors, so service text never becomes markup. At each
 * position the earliest match wins, and for equal positions the longest
 * phrase wins ("Template Submission Guidelines" over "Submission Guidelines").
 * Matching is case-sensitive.
 */
export function splitLinks(text: string, links: Array<{ phrase: string; url: string }>): TextSegment[] {
	const usable = links
		.filter((link) => link.phrase && /^https?:\/\//i.test(link.url))
		.sort((a, b) => b.phrase.length - a.phrase.length);
	const segments: TextSegment[] = [];
	let rest = text;

	while (rest) {
		let best: { index: number; link: (typeof usable)[number] } | null = null;
		for (const link of usable) {
			const index = rest.indexOf(link.phrase);
			if (index !== -1 && (best === null || index < best.index)) best = { index, link };
		}
		if (!best) break;
		if (best.index > 0) segments.push({ text: rest.slice(0, best.index) });
		segments.push({ text: best.link.phrase, url: best.link.url });
		rest = rest.slice(best.index + best.link.phrase.length);
	}

	if (rest) segments.push({ text: rest });
	return segments;
}

/**
 * What the creator may see of the thread. A round in a "(No Notification)"
 * status is deliberately silent: its comments and its summary stay hidden for
 * as long as it is silent, even if feedback was released before.
 */
export function visibleThread(
	rounds: Array<{ id: string; rawStatus: string }>,
	comments: ReviewComment[],
	summaries: DecisionSummary[]
): { comments: ReviewComment[]; summaries: DecisionSummary[] } {
	const silent = new Set(
		rounds.filter((round) => isSilencedReviewStatus(round.rawStatus)).map((round) => round.id)
	);
	const known = new Set(rounds.map((round) => round.id));
	return {
		comments: comments.filter((comment) => !silent.has(comment.versionRef)),
		// One summary per round, and only for rounds of this asset.
		summaries: summaries.filter(
			(summary, index) =>
				known.has(summary.versionRef) &&
				!silent.has(summary.versionRef) &&
				summaries.findIndex((other) => other.versionRef === summary.versionRef) === index
		)
	};
}

/**
 * Split a round's comments at the first creator reply. The next-steps text
 * belongs right after the opening run of review-team comments, so it never
 * lands under the creator's own reply. With no reply, `rest` is empty.
 */
export function splitAtFirstReply<T extends { authorRole: string }>(
	comments: T[]
): { opening: T[]; rest: T[] } {
	const index = comments.findIndex((comment) => comment.authorRole === 'creator');
	if (index === -1) return { opening: comments, rest: [] };
	return { opening: comments.slice(0, index), rest: comments.slice(index) };
}

/**
 * The rating as shown to the creator: leading non-letters (the rating emoji)
 * removed, so "🥇Exceptional" reads "Exceptional". Null when there is no rating.
 */
export function ratingLabel(rating: string | null): string | null {
	if (!rating) return null;
	const label = rating.replace(/^[^\p{L}]+/u, '').trim();
	return label || null;
}

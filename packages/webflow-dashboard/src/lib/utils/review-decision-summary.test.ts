import { describe, expect, it } from 'vitest';
import type { DecisionSummary, ReviewComment } from '$lib/server/review-comments';
import { ratingLabel, splitAtFirstReply, splitLinks, visibleThread } from './review-decision-summary';

const GUIDELINES = 'https://webflow.com/templates/submission-guidelines';
const RUBRIC = 'https://webflow.com/templates/grading-rubric';

describe('splitLinks', () => {
	it('returns one plain segment when there is nothing to link', () => {
		expect(splitLinks('Nothing here.', [{ phrase: 'quality rubric', url: RUBRIC }])).toEqual([
			{ text: 'Nothing here.' }
		]);
		expect(splitLinks('', [])).toEqual([]);
	});

	it('splits text around each phrase', () => {
		const text = 'Review our quality rubric and submission guidelines, then update.';
		expect(
			splitLinks(text, [
				{ phrase: 'quality rubric', url: RUBRIC },
				{ phrase: 'submission guidelines', url: GUIDELINES }
			])
		).toEqual([
			{ text: 'Review our ' },
			{ text: 'quality rubric', url: RUBRIC },
			{ text: ' and ' },
			{ text: 'submission guidelines', url: GUIDELINES },
			{ text: ', then update.' }
		]);
	});

	it('prefers the longest phrase at the same position', () => {
		const text = 'See the Template Submission Guidelines.';
		const segments = splitLinks(text, [
			{ phrase: 'Submission Guidelines', url: 'https://example.com/short' },
			{ phrase: 'Template Submission Guidelines', url: GUIDELINES }
		]);
		expect(segments).toEqual([
			{ text: 'See the ' },
			{ text: 'Template Submission Guidelines', url: GUIDELINES },
			{ text: '.' }
		]);
	});

	it('matches case-sensitively', () => {
		expect(splitLinks('Our Quality Rubric', [{ phrase: 'quality rubric', url: RUBRIC }])).toEqual([
			{ text: 'Our Quality Rubric' }
		]);
	});

	it('links every occurrence and keeps the text intact', () => {
		const text = 'rubric one, rubric two';
		const segments = splitLinks(text, [{ phrase: 'rubric', url: RUBRIC }]);
		expect(segments.filter((s) => s.url)).toHaveLength(2);
		expect(segments.map((s) => s.text).join('')).toBe(text);
	});

	it('never emits markup and refuses non-http URLs', () => {
		const text = '<b>quality rubric</b> and bad link';
		const segments = splitLinks(text, [
			{ phrase: 'quality rubric', url: RUBRIC },
			{ phrase: 'bad link', url: 'javascript:alert(1)' }
		]);
		expect(segments).toEqual([
			{ text: '<b>' },
			{ text: 'quality rubric', url: RUBRIC },
			{ text: '</b> and bad link' }
		]);
	});
});

const comment = (id: string, versionRef: string) => ({ id, versionRef }) as ReviewComment;
const summary = (versionRef: string) => ({ versionRef }) as DecisionSummary;

describe('visibleThread', () => {
	const rounds = [
		{ id: 'recVer3', rawStatus: '📤Changes Requested' },
		{ id: 'recVer2', rawStatus: '📤Changes Requested (No Notification)' },
		{ id: 'recVer1', rawStatus: '✅Approved' }
	];

	it('joins comments and summaries by version and hides a "(No Notification)" round entirely', () => {
		const result = visibleThread(
			rounds,
			[comment('c3', 'recVer3'), comment('c2', 'recVer2'), comment('c1', 'recVer1')],
			[summary('recVer3'), summary('recVer2'), summary('recVer1')]
		);
		expect(result.comments.map((c) => c.id)).toEqual(['c3', 'c1']);
		expect(result.summaries.map((s) => s.versionRef)).toEqual(['recVer3', 'recVer1']);
	});

	it('drops summaries for versions that are not rounds of the asset, and duplicates', () => {
		const result = visibleThread(rounds, [], [summary('recOther'), summary('recVer3'), summary('recVer3')]);
		expect(result.summaries.map((s) => s.versionRef)).toEqual(['recVer3']);
	});

	it('leaves a round without a summary alone', () => {
		const result = visibleThread(rounds, [comment('c3', 'recVer3')], []);
		expect(result.comments).toHaveLength(1);
		expect(result.summaries).toEqual([]);
	});
});

describe('splitAtFirstReply', () => {
	const c = (id: string, authorRole: string) => ({ id, authorRole });
	const ids = (list: Array<{ id: string }>) => list.map((x) => x.id);

	it('keeps everything in the opening run when there is no creator reply', () => {
		const result = splitAtFirstReply([c('a', 'reviewer'), c('b', 'reviewer')]);
		expect(ids(result.opening)).toEqual(['a', 'b']);
		expect(result.rest).toEqual([]);
	});

	it('splits before a reply in the middle', () => {
		const result = splitAtFirstReply([c('a', 'reviewer'), c('b', 'creator'), c('c', 'creator')]);
		expect(ids(result.opening)).toEqual(['a']);
		expect(ids(result.rest)).toEqual(['b', 'c']);
	});

	it('keeps a reviewer comment that follows a reply after the split', () => {
		const result = splitAtFirstReply([c('a', 'reviewer'), c('b', 'creator'), c('c', 'reviewer')]);
		expect(ids(result.opening)).toEqual(['a']);
		expect(ids(result.rest)).toEqual(['b', 'c']);
	});

	it('has an empty opening run when the thread starts with a reply', () => {
		const result = splitAtFirstReply([c('a', 'creator'), c('b', 'reviewer')]);
		expect(result.opening).toEqual([]);
		expect(ids(result.rest)).toEqual(['a', 'b']);
	});

	it('handles an empty thread', () => {
		expect(splitAtFirstReply([])).toEqual({ opening: [], rest: [] });
	});
});

describe('ratingLabel', () => {
	it('removes the leading emoji', () => {
		expect(ratingLabel('🥇Exceptional')).toBe('Exceptional');
		expect(ratingLabel('🥉Satisfactory')).toBe('Satisfactory');
		expect(ratingLabel('  🥈 Good ')).toBe('Good');
	});

	it('keeps a rating that has no emoji', () => {
		expect(ratingLabel('Good')).toBe('Good');
	});

	it('returns null when there is no usable rating', () => {
		expect(ratingLabel(null)).toBeNull();
		expect(ratingLabel('')).toBeNull();
		expect(ratingLabel('🥇')).toBeNull();
	});
});

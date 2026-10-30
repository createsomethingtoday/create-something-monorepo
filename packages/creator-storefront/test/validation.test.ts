import { describe, expect, it } from 'vitest';
import { StorefrontError } from '../src/errors';
import { validateDraftFields, validateSelectionInput } from '../src/validation';

const options = { allowedCoverOrigins: ['https://dashboard.example'] };

function issuesOf(fn: () => unknown): Array<{ field: string; issue: string }> {
	try {
		fn();
	} catch (error) {
		expect(error).toBeInstanceOf(StorefrontError);
		return ((error as StorefrontError).details as { issues: Array<{ field: string; issue: string }> }).issues;
	}
	throw new Error('expected validation to fail');
}

describe('validateDraftFields', () => {
	it('normalizes valid input and treats blanks as null', () => {
		const fields = validateDraftFields(
			{
				positioning: '  Clean templates  ',
				coverUrl: 'https://dashboard.example/api/uploads/abc/cover.webp',
				coverAlt: 'Cover',
				portfolioUrl: 'https://dribbble.com/example',
				supportText: 'Ask us',
				supportUrl: 'mailto:help@example.com',
			},
			options
		);
		expect(fields).toEqual({
			positioning: 'Clean templates',
			coverUrl: 'https://dashboard.example/api/uploads/abc/cover.webp',
			coverAlt: 'Cover',
			portfolioUrl: 'https://dribbble.com/example',
			supportText: 'Ask us',
			supportUrl: 'mailto:help@example.com'
		});
		expect(validateDraftFields({ positioning: '   ' }, options).positioning).toBeNull();
	});

	it('rejects unknown keys so service-owned fields cannot be written', () => {
		expect(() => validateDraftFields({ status: 'Published' }, options)).toThrowError(/Unknown draft fields/);
		expect(() => validateDraftFields({ draftVersion: 9 }, options)).toThrowError(/Unknown draft fields/);
	});

	it('enforces length limits', () => {
		expect(issuesOf(() => validateDraftFields({ positioning: 'x'.repeat(121) }, options))).toContainEqual({
			field: 'positioning',
			issue: 'max_120_chars'
		});
	});

	it('requires https without credentials for links', () => {
		expect(issuesOf(() => validateDraftFields({ portfolioUrl: 'http://example.com' }, options))[0].issue).toBe('must_be_https');
		expect(issuesOf(() => validateDraftFields({ portfolioUrl: 'https://u:p@example.com' }, options))[0].issue).toBe(
			'must_be_https'
		);
		expect(issuesOf(() => validateDraftFields({ portfolioUrl: 'javascript:alert(1)' }, options))[0].issue).toBe(
			'must_be_https'
		);
	});

	it('only accepts covers uploaded through the dashboard upload path', () => {
		const bad = [
			'https://evil.example/api/uploads/x.webp',
			'https://dashboard.example/other/x.webp',
			'https://dashboard.example/api/uploads/../secrets'
		];
		for (const coverUrl of bad) {
			expect(issuesOf(() => validateDraftFields({ coverUrl, coverAlt: 'a' }, options))).toContainEqual({
				field: 'coverUrl',
				issue: 'must_be_dashboard_upload'
			});
		}
		expect(issuesOf(() => validateDraftFields({ coverUrl: 'https://dashboard.example/api/uploads/x.webp' }, options))).toContainEqual({
			field: 'coverAlt',
			issue: 'required_with_cover'
		});
	});

	it('requires support text and URL together', () => {
		expect(issuesOf(() => validateDraftFields({ supportText: 'Help' }, options))).toContainEqual({
			field: 'support',
			issue: 'text_and_url_required_together'
		});
	});

	it('rejects malformed mailto escapes and headers instead of throwing', () => {
		for (const supportUrl of ['mailto:%ZZ@a.com', 'mailto:a@b.com?cc=x@y.com', 'mailto:not-an-address']) {
			expect(issuesOf(() => validateDraftFields({ supportText: 'Help', supportUrl }, options))).toContainEqual({
				field: 'supportUrl',
				issue: 'must_be_https_or_mailto'
			});
		}
	});
});

describe('validateSelectionInput', () => {
	const id = (n: number) => `recASSET${String(n).padStart(9, '0')}`;

	it('accepts up to three unique asset IDs with notes', () => {
		expect(validateSelectionInput([{ assetId: id(1), note: ' Hi ' }, { assetId: id(2) }])).toEqual([
			{ assetId: id(1), note: 'Hi' },
			{ assetId: id(2), note: null }
		]);
	});

	it('rejects more than three, duplicates, bad IDs and long notes', () => {
		const issues = issuesOf(() =>
			validateSelectionInput([
				{ assetId: id(1) },
				{ assetId: id(1) },
				{ assetId: 'nope' },
				{ assetId: id(4), note: 'x'.repeat(241) }
			])
		).map((i) => i.issue);
		expect(issues).toEqual(expect.arrayContaining(['max_3', 'duplicate', 'invalid_asset_id', 'max_240_chars']));
	});
});

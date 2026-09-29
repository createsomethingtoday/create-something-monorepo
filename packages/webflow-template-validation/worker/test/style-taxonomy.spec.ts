import { describe, it, expect, vi } from 'vitest';
import { validateDesignerData } from '../src/validators/designer-validator';
import worker from '../src/index';
import type { DesignerData, StyleData } from '../src/types';

const MEDIA_QUERIES = [
	{ id: 'main', name: 'Desktop', minWidth: null, maxWidth: null, isBase: true },
	{ id: 'large', name: '1280px and up', minWidth: 1280, maxWidth: null, isBase: false },
	{ id: 'medium', name: 'Tablet', minWidth: null, maxWidth: 991, isBase: false },
	{ id: 'small', name: 'Mobile landscape', minWidth: null, maxWidth: 767, isBase: false },
	{ id: 'tiny', name: 'Mobile portrait', minWidth: null, maxWidth: 479, isBase: false }
];

function designer(styles: StyleData[], extra: Partial<DesignerData> = {}): DesignerData {
	return { components: [], styles, pages: [], assets: [], ...extra } as DesignerData;
}

async function stylesCategory(data: DesignerData) {
	const result = await validateDesignerData(data);
	const category = result.categories.find((c) => c.category === 'Styles');
	if (!category) throw new Error('Styles category missing');
	return category;
}

function issue(category: Awaited<ReturnType<typeof stylesCategory>>, id: string) {
	return category.issues.find((i) => i.id === id);
}

// A payload exactly as pre-2.2 extensions send it: type is always 'class',
// no source, no breakpointProperties, no mediaQueries.
const LEGACY_STYLES: StyleData[] = [
	{ id: 's1', name: 'Heading Large', type: 'class', isHtmlTag: false, hasVariables: false, properties: {} },
	{ id: 's2', name: 'Max Width 30px', type: 'class', isHtmlTag: false, hasVariables: false, properties: { width: '1200px' } },
	{ id: 's3', name: 'All H1 Headings', type: 'class', isHtmlTag: true, hasVariables: false, properties: {} }
];

describe('styles taxonomy: legacy payloads', () => {
	it('produces the same Styles result as before the taxonomy fields existed', async () => {
		const category = await stylesCategory(designer(LEGACY_STYLES));
		expect(category).toEqual({
			category: 'Styles',
			passed: true,
			issues: [
				{
					id: 'styles.naming-inconsistent',
					category: 'Styles',
					severity: 'warning',
					message: "1 classes don't follow consistent naming.",
					details: { sample: ['Max Width 30px'] },
					howToFix: expect.any(String)
				}
			],
			stats: { totalClasses: 3, hasTypographyClasses: true, hasHtmlTagStyles: true }
		});
	});

	it('never emits the new checks without taxonomy/breakpoint data', async () => {
		const category = await stylesCategory(designer(LEGACY_STYLES));
		expect(issue(category, 'styles.element-scoped')).toBeUndefined();
		expect(issue(category, 'styles.fixed-width-overflow')).toBeUndefined();
	});
});

describe('styles.naming-inconsistent', () => {
	it('ignores library-imported classes the creator did not author', async () => {
		const category = await stylesCategory(
			designer([
				{ id: 'a', name: 'Heading Large', type: 'global', source: 'site' },
				{ id: 'b', name: 'Lib Width 40px', type: 'global', source: 'library' }
			])
		);
		expect(issue(category, 'styles.naming-inconsistent')).toBeUndefined();
	});

	it('still flags site-authored classes', async () => {
		const category = await stylesCategory(
			designer([
				{ id: 'a', name: 'Heading Large', type: 'global', source: 'site' },
				{ id: 'b', name: 'Site Width 40px', type: 'global', source: 'site' },
				{ id: 'c', name: 'Lib Width 40px', type: 'global', source: 'library' }
			])
		);
		expect(issue(category, 'styles.naming-inconsistent')?.details).toEqual({ sample: ['Site Width 40px'] });
	});
});

describe('styles.element-scoped', () => {
	it('warns with a count and sample of element-scoped styles', async () => {
		const category = await stylesCategory(
			designer([
				{ id: 'a', name: 'Heading Large', type: 'global', source: 'site' },
				{ id: 'e1', name: 'Div Block 3', type: 'element', source: 'site' },
				{ id: 'e2', name: 'Image 7', type: 'element', source: 'site' }
			])
		);
		const found = issue(category, 'styles.element-scoped');
		expect(found).toMatchObject({
			category: 'Styles',
			severity: 'warning',
			details: { count: 2, sample: ['Div Block 3', 'Image 7'] }
		});
		expect(found?.message).toContain('2');
		expect(found?.howToFix).toEqual(expect.any(String));
		expect(category.passed).toBe(true);
	});

	it('is silent when no element styles exist', async () => {
		const category = await stylesCategory(designer([{ id: 'a', name: 'Heading Large', type: 'global' }]));
		expect(issue(category, 'styles.element-scoped')).toBeUndefined();
	});
});

describe('styles.fixed-width-overflow', () => {
	it('flags px width/min-width wider than a bounded breakpoint', async () => {
		const category = await stylesCategory(
			designer(
				[
					{ id: 'a', name: 'Heading Large', type: 'global' },
					{
						id: 'b',
						name: 'Hero Card',
						type: 'global',
						breakpointProperties: { medium: { width: '1200px' }, small: { 'min-width': '800px' } }
					},
					{
						id: 'c',
						name: 'Promo Tile',
						type: 'combo',
						breakpointProperties: { tiny: { width: '520px' } }
					}
				],
				{ mediaQueries: MEDIA_QUERIES }
			)
		);
		const found = issue(category, 'styles.fixed-width-overflow');
		expect(found).toMatchObject({ category: 'Styles', severity: 'warning' });
		// The extension panel renders each sample with String(item), so samples must be strings.
		expect(found?.details).toEqual({
			count: 2,
			sample: ['Hero Card (Tablet, Mobile landscape)', 'Promo Tile (Mobile portrait)']
		});
		expect(category.passed).toBe(true);
	});

	it('ignores values that fit, relative units, and unbounded breakpoints', async () => {
		const category = await stylesCategory(
			designer(
				[
					{ id: 'a', name: 'Heading Large', type: 'global' },
					{
						id: 'b',
						name: 'Fits',
						type: 'global',
						breakpointProperties: {
							medium: { width: '991px' },
							small: { width: '100%', 'min-width': '90vw' },
							large: { width: '5000px' },
							main: { width: '5000px' }
						}
					}
				],
				{ mediaQueries: MEDIA_QUERIES }
			)
		);
		expect(issue(category, 'styles.fixed-width-overflow')).toBeUndefined();
	});

	describe('max-width clamping', () => {
		const withMaxWidth = (maxWidth: string) =>
			designer(
				[
					{ id: 'a', name: 'Heading Large', type: 'global' },
					{
						id: 'b',
						name: 'Hero Card',
						type: 'global',
						breakpointProperties: { medium: { width: '1200px', 'max-width': maxWidth } }
					}
				],
				{ mediaQueries: MEDIA_QUERIES }
			);

		it('does not flag a px width clamped by a percentage max-width', async () => {
			const category = await stylesCategory(withMaxWidth('100%'));
			expect(issue(category, 'styles.fixed-width-overflow')).toBeUndefined();
		});

		it('does not flag a px width clamped by a vw max-width', async () => {
			const category = await stylesCategory(withMaxWidth('90vw'));
			expect(issue(category, 'styles.fixed-width-overflow')).toBeUndefined();
		});

		it('does not flag a px width clamped by a px max-width within the breakpoint', async () => {
			const category = await stylesCategory(withMaxWidth('900px'));
			expect(issue(category, 'styles.fixed-width-overflow')).toBeUndefined();
		});

		it('still flags when the px max-width is itself wider than the breakpoint', async () => {
			const category = await stylesCategory(withMaxWidth('1100px'));
			expect(issue(category, 'styles.fixed-width-overflow')).toMatchObject({
				severity: 'warning',
				details: { count: 1, sample: ['Hero Card (Tablet)'] }
			});
		});
	});
});

describe('styles.naming-inconsistent: taxonomy gating', () => {
	it('only naming-checks global, combo, and legacy class styles', async () => {
		const category = await stylesCategory(
			designer([
				{ id: 'a', name: 'Heading Large', type: 'global', source: 'site' },
				{ id: 'e', name: 'Div Block 30px', type: 'element', source: 'site' },
				{ id: 'd', name: 'Nav Link 2rem', type: 'descendant', source: 'site' },
				{ id: 't', name: 'h1', type: 'tag', source: 'site', isHtmlTag: true }
			])
		);

		expect(issue(category, 'styles.naming-inconsistent')).toBeUndefined();
		expect(issue(category, 'styles.element-scoped')?.details).toEqual({ count: 1, sample: ['Div Block 30px'] });
		// Unchanged: every style still counts toward totalClasses.
		expect(category.stats?.totalClasses).toBe(4);
	});

	it('keeps checking styles with an unknown or missing type (legacy payloads)', async () => {
		const category = await stylesCategory(
			designer([
				{ id: 'a', name: 'Heading Large', type: 'style' },
				{ id: 'b', name: 'Padding 2rem', type: 'style' },
				{ id: 'c', name: 'Max Width 30px' } as StyleData
			])
		);
		expect(issue(category, 'styles.naming-inconsistent')?.details).toEqual({ sample: ['Padding 2rem', 'Max Width 30px'] });
	});

	it('still flags combo styles the creator named', async () => {
		const category = await stylesCategory(
			designer([
				{ id: 'a', name: 'Heading Large', type: 'global', source: 'site' },
				{ id: 'c', name: 'Hero Card 40px', type: 'combo', source: 'site' }
			])
		);
		expect(issue(category, 'styles.naming-inconsistent')?.details).toEqual({ sample: ['Hero Card 40px'] });
	});

	it('skips the check when media queries are not in the payload', async () => {
		const category = await stylesCategory(
			designer([
				{ id: 'a', name: 'Heading Large', type: 'global' },
				{ id: 'b', name: 'Hero Card', type: 'global', breakpointProperties: { medium: { width: '1200px' } } }
			])
		);
		expect(issue(category, 'styles.fixed-width-overflow')).toBeUndefined();
	});
});

describe('styles taxonomy: payload transport', () => {
	it('new fields survive POST /api/validate to the validator', async () => {
		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/api/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteUrl: 'https://taxonomy.webflow.io',
					designerData: designer(
						[
							{ id: 'a', name: 'Heading Large', type: 'global', source: 'site' },
							{ id: 'e', name: 'Div Block 3', type: 'element', source: 'site' },
							{ id: 'l', name: 'Lib Width 40px', type: 'global', source: 'library' },
							{ id: 'b', name: 'Hero Card', type: 'global', breakpointProperties: { medium: { width: '1200px' } } }
						],
						{ mediaQueries: MEDIA_QUERIES }
					)
				})
			}),
			{} as any,
			{ waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as { categories: Array<{ category: string; issues: Array<{ id: string; severity: string }> }> };
		const styles = body.categories.find((c) => c.category === 'Styles');
		const ids = styles?.issues.map((i) => i.id) ?? [];
		expect(ids).toContain('styles.element-scoped');
		expect(ids).toContain('styles.fixed-width-overflow');
		expect(ids).not.toContain('styles.naming-inconsistent');
		for (const i of styles?.issues ?? []) {
			if (i.id === 'styles.element-scoped' || i.id === 'styles.fixed-width-overflow') {
				expect(i.severity).toBe('warning');
			}
		}
	});
});

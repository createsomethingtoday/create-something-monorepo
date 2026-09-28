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
		expect(found?.details).toEqual({
			count: 2,
			sample: [
				{ style: 'Hero Card', breakpoints: ['Tablet', 'Mobile landscape'] },
				{ style: 'Promo Tile', breakpoints: ['Mobile portrait'] }
			]
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
							medium: { width: '991px', 'font-size': '2000px' },
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

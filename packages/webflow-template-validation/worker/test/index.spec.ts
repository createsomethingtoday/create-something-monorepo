import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

vi.mock('../src/utils/fetch-utils', () => {
	const fetchHTML = vi.fn(async (url: string) => ({
		html: '<!doctype html><html><head><title>Test</title></head><body></body></html>',
		status: 200,
		headers: {},
		size: 0,
		loadTime: 0
	}));
	const fetchAsset = vi.fn(async () => ({
		buffer: new ArrayBuffer(0),
		size: 0,
		mimeType: 'image/webp',
		headers: {}
	}));
	const fetchAssetMetadata = vi.fn(async () => ({
		size: 0,
		mimeType: 'image/webp',
		headers: {}
	}));

	const parseHTML = vi.fn(() => ({
		rawHtml: '<!doctype html><html><head><title>Test</title></head><body></body></html>',
		document: {
			querySelector: (selector: string) => {
				if (selector === 'title') return { textContent: 'Test' };
				return null;
			},
			querySelectorAll: () => [],
			body: { textContent: '', innerHTML: '' }
		},
		images: [],
		links: [],
		forms: [],
		headings: [],
		scripts: [],
		stylesheets: []
	}));

	const isPlatformManagedHeading = (heading: any) => {
		const className = typeof heading.getAttribute === 'function'
			? heading.getAttribute('class') || ''
			: heading.className || '';
		return /(?:^|\s)w-commerce-/.test(className);
	};

	return { fetchHTML, parseHTML, fetchAsset, fetchAssetMetadata, isPlatformManagedHeading };
});

import { validateDesignerData } from '../src/validators/designer-validator';
import { generateContentIssues, validateContent } from '../src/validators/content-validator';
import { validateAccessibility } from '../src/validators/accessibility-validator';
import { validateInteractions } from '../src/validators/interactions-validator';
import { generateAssetIssues } from '../src/validators/asset-validator';
import { analyzeImageOptimization } from '../src/utils/asset-utils';
import { fetchHTML, parseHTML } from '../src/utils/fetch-utils';
import worker from '../src/index';

function createParsedHTML(overrides: Partial<any> = {}) {
	return {
		rawHtml: '<!doctype html><html><head><title>Test</title></head><body></body></html>',
		document: {
			querySelector: (selector: string) => {
				if (selector === 'title') return { textContent: 'Test' };
				return null;
			},
			querySelectorAll: () => [],
			body: { textContent: '', innerHTML: '' }
		},
		images: [],
		links: [],
		forms: [],
		headings: [],
		scripts: [],
		stylesheets: [],
		...overrides
	};
}

function createImage(attrs: Record<string, string | null>, extras: Partial<any> = {}) {
	return {
		getAttribute: (name: string) => name in attrs ? attrs[name] : null,
		hasAttribute: (name: string) => name in attrs,
		className: attrs.class || '',
		src: attrs.src || undefined,
		...extras
	};
}

beforeEach(() => {
	vi.mocked(fetchHTML).mockResolvedValue({
		html: '<!doctype html><html><head><title>Test</title></head><body></body></html>',
		status: 200,
		headers: {},
		size: 0,
		loadTime: 0
	});
	vi.mocked(parseHTML).mockReturnValue(createParsedHTML());
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function createExecutionContext() {
	return {
		waitUntil: vi.fn(),
		passThroughOnException: vi.fn()
	} as unknown as ExecutionContext;
}

async function sha256ForTest(value: string) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

describe('Designer Validator', () => {
	it('reports missing core designer primitives instead of skipping the categories', async () => {
		const result = await validateDesignerData({
			variables: undefined,
			components: [],
			styles: [],
			pages: [],
			assets: []
		} as any);

		expect(result.categories.find((category) => category.category === 'Variables')?.issues.some((issue) => issue.id === 'variables.none')).toBe(true);
		expect(result.categories.find((category) => category.category === 'Components')?.issues.some((issue) => issue.id === 'components.none')).toBe(true);
		expect(result.categories.find((category) => category.category === 'Styles')?.issues.some((issue) => issue.id === 'styles.missing-typography')).toBe(true);
		expect(result.categories.find((category) => category.category === 'Required Pages')?.issues.some((issue) => issue.id === 'required-pages.missing-style-guide')).toBe(true);
		expect(result.categories.find((category) => category.category === 'Page Structure')?.issues.some((issue) => issue.id === 'pages.no-pages')).toBe(true);
	});

	it('accepts Title Case variables with "/" grouping and numeric tokens (including 2XLarge)', async () => {
		const result = await validateDesignerData({
			variables: {
				collections: [
					{
						id: 'col_colors',
						name: 'Colors',
						variables: [
							{ id: 'v1', name: 'Primary 100', type: 'color', value: null },
							{ id: 'v2', name: 'Primary 200', type: 'color', value: null },
							{ id: 'v3', name: 'Primary 300', type: 'color', value: null }
						]
					},
					{
						id: 'col_typo',
						name: 'Typography',
						variables: [
							{ id: 'v4', name: 'Typography/Body Font', type: 'string', value: null },
							{ id: 'v5', name: 'Heading Size/2XLarge', type: 'string', value: null }
						]
					}
				]
			},
			components: [],
			styles: [],
			pages: [],
			assets: []
		});

		const variablesCategory = result.categories.find(c => c.category === 'Variables');
		expect(variablesCategory).toBeTruthy();
		const namingIssue = variablesCategory!.issues.find(i => i.id === 'variables.naming');
		expect(namingIssue).toBeUndefined();
	});

	it('does not report missing variable modes when mode data is absent from the Designer payload', async () => {
		const result = await validateDesignerData({
			variables: {
				collections: [
					{
						id: 'col_colors',
						name: 'Colors',
						variables: [
							{ id: 'v1', name: 'Primary 100', type: 'color', value: null },
							{ id: 'v2', name: 'Primary 200', type: 'color', value: null },
							{ id: 'v3', name: 'Primary 300', type: 'color', value: null }
						]
					}
				]
			},
			components: [],
			styles: [],
			pages: [],
			assets: []
		});

		const modesCategory = result.categories.find(c => c.category === 'Variable Modes');
		expect(modesCategory).toBeTruthy();
		expect(modesCategory!.passed).toBe(true);
		expect(modesCategory!.issues.find(i => i.id === 'modes.none')).toBeUndefined();
		expect(modesCategory!.issues.find(i => i.id === 'modes.unavailable')).toBeTruthy();
		expect(modesCategory!.stats?.modeDataAvailable).toBe(false);
	});

	it('reports missing variable modes only when mode data was collected and empty', async () => {
		const result = await validateDesignerData({
			variables: {
				collections: [
					{
						id: 'col_colors',
						name: 'Colors',
						variables: [
							{ id: 'v1', name: 'Primary 100', type: 'color', value: null },
							{ id: 'v2', name: 'Primary 200', type: 'color', value: null },
							{ id: 'v3', name: 'Primary 300', type: 'color', value: null }
						],
						modes: []
					}
				]
			},
			components: [],
			styles: [],
			pages: [],
			assets: []
		});

		const modesCategory = result.categories.find(c => c.category === 'Variable Modes');
		expect(modesCategory).toBeTruthy();
		expect(modesCategory!.issues.find(i => i.id === 'modes.none')).toBeTruthy();
		expect(modesCategory!.issues.find(i => i.id === 'modes.unavailable')).toBeUndefined();
		expect(modesCategory!.stats?.modeDataAvailable).toBe(true);
	});

	it('recognizes responsive variable modes collected from Designer collections', async () => {
		const result = await validateDesignerData({
			variables: {
				collections: [
					{
						id: 'col_spacing',
						name: 'Spacing',
						variables: [
							{ id: 'v1', name: 'Spacing 100', type: 'size', value: null },
							{ id: 'v2', name: 'Spacing 200', type: 'size', value: null },
							{ id: 'v3', name: 'Spacing 300', type: 'size', value: null }
						],
						modes: [
							{ id: 'mode_tablet', name: 'Tablet' },
							{ id: 'mode_mobile', name: 'Mobile' }
						]
					}
				]
			},
			components: [],
			styles: [],
			pages: [],
			assets: []
		});

		const modesCategory = result.categories.find(c => c.category === 'Variable Modes');
		expect(modesCategory).toBeTruthy();
		expect(modesCategory!.issues.find(i => i.id === 'modes.good')).toBeTruthy();
		expect(modesCategory!.issues.find(i => i.id === 'modes.none')).toBeUndefined();
		expect(modesCategory!.stats).toMatchObject({
			totalModes: 2,
			collectionsWithModes: 1,
			hasResponsiveModes: true,
			responsiveModeNamesDetected: true,
			modeDataAvailable: true
		});
	});

	it('does not warn when variable modes exist but their names are not breakpoint keywords', async () => {
		const result = await validateDesignerData({
			variables: {
				collections: [
					{
						id: 'col_modes',
						name: 'Design Modes',
						variables: [
							{ id: 'v1', name: 'Spacing 100', type: 'size', value: null },
							{ id: 'v2', name: 'Spacing 200', type: 'size', value: null },
							{ id: 'v3', name: 'Spacing 300', type: 'size', value: null }
						],
						modes: [
							{ id: 'mode_1', name: 'Compact' },
							{ id: 'mode_2', name: 'Comfortable' },
							{ id: 'mode_3', name: 'Dense' },
							{ id: 'mode_4', name: 'Expanded' }
						]
					}
				]
			},
			components: [],
			styles: [],
			pages: [],
			assets: []
		});

		const modesCategory = result.categories.find(c => c.category === 'Variable Modes');
		expect(modesCategory).toBeTruthy();
		expect(modesCategory!.passed).toBe(true);
		expect(modesCategory!.issues.find(i => i.id === 'modes.good')).toBeTruthy();
		expect(modesCategory!.issues.find(i => i.id === 'modes.no-responsive')).toBeUndefined();
		expect(modesCategory!.stats).toMatchObject({
			totalModes: 4,
			collectionsWithModes: 1,
			responsiveModeNamesDetected: false,
			modeNames: ['Compact', 'Comfortable', 'Dense', 'Expanded'],
			modeDataAvailable: true
		});
	});

	it('accepts common Webflow class naming formats (combo-like, acronyms, numeric modifiers)', async () => {
		const result = await validateDesignerData({
			variables: undefined,
			components: [],
			styles: [
				{ id: 's_body', name: 'Body', type: 'style' },
				{ id: 's_heading', name: 'Heading', type: 'style' },
				{ id: 's_combo', name: 'CTA Image 3rd', type: 'style' },
				{ id: 's_width', name: 'Max Width 30', type: 'style' },
				{ id: 's_state', name: 'Is 1st', type: 'style' },
				{ id: 's_clientfirst', name: 'section testimonials dark', type: 'style' },
				{ id: 's_bem', name: 'block__element--modifier', type: 'style' },
				{ id: 's_camel', name: 'heroContainerElement', type: 'style' },
				{ id: 's_pascal', name: 'HeroContainerElement', type: 'style' }
			] as any,
			pages: [],
			assets: []
		} as any);

		const stylesCategory = result.categories.find(c => c.category === 'Styles');
		expect(stylesCategory).toBeTruthy();
		const namingIssue = stylesCategory!.issues.find(i => i.id === 'styles.naming-inconsistent');
		expect(namingIssue).toBeUndefined();
	});

	it('rejects class names that encode literal units (e.g., 30px, 2rem)', async () => {
		const result = await validateDesignerData({
			variables: undefined,
			components: [],
			styles: [
				{ id: 's_body', name: 'Body', type: 'style' },
				{ id: 's_heading', name: 'Heading', type: 'style' },
				{ id: 's_bad_px', name: 'Max Width 30px', type: 'style' },
				{ id: 's_bad_rem', name: 'Padding 2rem', type: 'style' },
				{ id: 's_ok', name: 'Max Width 30', type: 'style' }
			] as any,
			pages: [],
			assets: []
		} as any);

		const stylesCategory = result.categories.find(c => c.category === 'Styles');
		expect(stylesCategory).toBeTruthy();
		const namingIssue = stylesCategory!.issues.find(i => i.id === 'styles.naming-inconsistent');
		expect(namingIssue).toBeTruthy();
		const sample = (namingIssue as any).details?.sample || [];
		expect(sample.join(' ')).toMatch(/Max Width 30px|Padding 2rem/);
	});

	it('rejects non-compliant variable names (lowercase, underscores)', async () => {
		const result = await validateDesignerData({
			variables: {
				collections: [
					{
						id: 'col_colors',
						name: 'Colors',
						variables: [
							{ id: 'v1', name: 'Primary_Color', type: 'color', value: null },
							{ id: 'v2', name: 'primary color', type: 'color', value: null },
							{ id: 'v3', name: 'Primary 100', type: 'color', value: null }
						]
					}
				]
			},
			components: [],
			styles: [],
			pages: [],
			assets: []
		});

		const variablesCategory = result.categories.find(c => c.category === 'Variables');
		expect(variablesCategory).toBeTruthy();
		const namingIssue = variablesCategory!.issues.find(i => i.id === 'variables.naming');
		expect(namingIssue).toBeTruthy();
		const sample = (namingIssue as any).details?.sample || [];
		expect(sample.join(' ')).toMatch(/Primary_Color|primary color/);
	});
});

describe('Content Validator', () => {
	it('preserves empty alt attributes in the Worker HTML parser', async () => {
		const actual = await vi.importActual<typeof import('../src/utils/fetch-utils')>('../src/utils/fetch-utils');
		const parsed = actual.parseHTMLWorker('<!doctype html><html><body><img src="/divider.svg" alt=""></body></html>');

		expect(parsed.images[0].getAttribute('alt')).toBe('');
		expect(parsed.images[0].hasAttribute('alt')).toBe(true);
	});

	it('detects placeholder content consistently across repeated runs', async () => {
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: '<!doctype html><html><head><title>Repeated Placeholder Test</title></head><body><main><h1>Lorem Ipsum</h1><p>Lorem ipsum dolor sit amet.</p></main></body></html>',
			document: {
				querySelector: (selector: string) => selector === 'title' ? { textContent: 'Repeated Placeholder Test' } : null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Lorem Ipsum Lorem ipsum dolor sit amet.',
					innerHTML: '<main><h1>Lorem Ipsum</h1><p>Lorem ipsum dolor sit amet.</p></main>'
				}
			},
			headings: [{ tagName: 'H1', textContent: 'Lorem Ipsum' }]
		}));

		const first = await validateContent('https://example.com');
		const second = await validateContent('https://example.com/about');

		expect(first.issues.find((issue) => issue.id === 'lorem-ipsum-detected')).toEqual(expect.objectContaining({
			severity: 'warning'
		}));
		expect(second.issues.find((issue) => issue.id === 'lorem-ipsum-detected')).toEqual(expect.objectContaining({
			severity: 'warning'
		}));
	});

	it('ignores placeholder text inside Webflow search result snippets', async () => {
		const rawHtml = `<!doctype html><html><head><title>Search</title></head><body>
			<main><h1>Search</h1><p>Find articles, resources, and updates from this template.</p></main>
			<div class="w-search-result"><p>Lorem ipsum dolor sit amet from a generated search snippet.</p></div>
		</body></html>`;
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml,
			document: {
				querySelector: (selector: string) => selector === 'title' ? { textContent: 'Search' } : null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Search Find articles, resources, and updates from this template. Lorem ipsum dolor sit amet from a generated search snippet.',
					innerHTML: rawHtml
				}
			},
			headings: [{ tagName: 'H1', textContent: 'Search' }]
		}));

		const result = await validateContent('https://example.com/search');

		expect(result.issues.some((issue) => issue.id === 'lorem-ipsum-detected')).toBe(false);
		expect(result.issues.some((issue) => issue.id === 'placeholder-content-detected')).toBe(false);
	});

	it('ignores Webflow CSS comments when checking default content', async () => {
		const rawHtml = `<!doctype html><html><head><title>Styled Page</title>
			<style>/* Get rid of top margin on first element in any rich text element */</style>
		</head><body>
			<main><h1>Styled Page</h1><p>Purpose-built content that should not be treated as Webflow default text.</p></main>
		</body></html>`;
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml,
			document: {
				querySelector: (selector: string) => selector === 'title' ? { textContent: 'Styled Page' } : null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Get rid of top margin on first element in any rich text element Styled Page Purpose-built content that should not be treated as Webflow default text.',
					innerHTML: rawHtml
				}
			},
			headings: [{ tagName: 'H1', textContent: 'Styled Page' }]
		}));

		const result = await validateContent('https://example.com/styled');

		expect(result.issues.some((issue) => issue.id === 'webflow-default-content')).toBe(false);
	});

	it('still flags authored placeholder text outside search result snippets', async () => {
		const rawHtml = `<!doctype html><html><head><title>About</title></head><body>
			<main><h1>About</h1><p>Lorem ipsum dolor sit amet in authored page copy.</p></main>
		</body></html>`;
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml,
			document: {
				querySelector: (selector: string) => selector === 'title' ? { textContent: 'About' } : null,
				querySelectorAll: () => [],
				body: {
					textContent: 'About Lorem ipsum dolor sit amet in authored page copy.',
					innerHTML: rawHtml
				}
			},
			headings: [{ tagName: 'H1', textContent: 'About' }]
		}));

		const result = await validateContent('https://example.com/about');

		expect(result.issues.find((issue) => issue.id === 'lorem-ipsum-detected')).toEqual(expect.objectContaining({
			severity: 'warning'
		}));
	});

	it('allows placeholder/example copy on utility pages without suppressing other audits', async () => {
		const rawHtml = `<!doctype html><html><head><title>Style Guide</title></head><body>
			<main>
				<h1>Style Guide</h1>
				<h3>Typography</h3>
				<p>Lorem ipsum dolor sit amet.</p>
				<p>Heading 1</p>
				<a href="/contact">Button Text</a>
			</main>
		</body></html>`;
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml,
			document: {
				querySelector: (selector: string) => selector === 'title' ? { textContent: 'Style Guide' } : null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Style Guide Typography Lorem ipsum dolor sit amet. Heading 1 Button Text',
					innerHTML: rawHtml
				}
			},
			headings: [
				{ tagName: 'H1', textContent: 'Style Guide' },
				{ tagName: 'H3', textContent: 'Typography' }
			]
		}));

		const result = await validateContent(
			'https://example.com',
			undefined,
			{
				pageScope: 'current',
				currentPageSlug: '/info/style-guide',
				contentChecks: { lorem: true, headings: true, altText: false, seo: false, links: false, contentQuality: true }
			} as any
		);

		expect(result.issues.some((issue) => issue.id === 'lorem-ipsum-detected')).toBe(false);
		expect(result.issues.some((issue) => issue.id === 'placeholder-content-detected')).toBe(false);
		expect(result.issues.some((issue) => issue.id === 'webflow-default-content')).toBe(false);
		expect(result.stats.pagesWithLoremIpsum).toBe(0);
		expect(result.issues.find((issue) => issue.id === 'heading-hierarchy-errors')).toEqual(expect.objectContaining({
			severity: 'error'
		}));
	});

	it('reports exact skipped heading transitions for blocking fix guidance', async () => {
		const rawHtml = `<!doctype html><html><head><title>Services</title></head><body>
			<main>
				<h1>Expert window services</h1>
				<h3>Window installation</h3>
			</main>
		</body></html>`;
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml,
			document: {
				querySelector: (selector: string) => selector === 'title' ? { textContent: 'Services' } : null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Expert window services Window installation',
					innerHTML: rawHtml
				}
			},
			headings: [
				{ tagName: 'H1', textContent: 'Expert window services' },
				{ tagName: 'H3', textContent: 'Window installation' }
			]
		}));

		const result = await validateContent(
			'https://example.com/services',
			undefined,
			{
				pageScope: 'current',
				contentChecks: {
					lorem: false,
					headings: true,
					altText: false,
					seo: false,
					links: false,
					contentQuality: false
				}
			} as any
		);

		const issue = result.issues.find((item) => item.id === 'heading-hierarchy-errors');
		const headingIssue = issue?.details?.headingIssues?.[0];

		expect(issue?.message).toBe('Heading hierarchy errors found on 1 page(s)');
		expect(headingIssue).toEqual(expect.objectContaining({
			page: 'Services',
			pageUrl: 'https://example.com/services',
			issueType: 'skipped_level',
			fromLevel: 1,
			toLevel: 3,
			fromPosition: 1,
			toPosition: 2,
			fromText: 'Expert window services',
			toText: 'Window installation',
			missingLevel: 2
		}));
		expect(headingIssue?.issue).toBe('H1 "Expert window services" is followed by H3 "Window installation", skipping H2');
		expect(headingIssue?.headingSequence).toBe('H1 "Expert window services" → H3 "Window installation"');
	});

	it('surfaces matched snippets for real Webflow default content', async () => {
		const rawHtml = `<!doctype html><html><head><title>Default Copy</title></head><body>
			<main><h1>Default Copy</h1><div>This is some text inside of a div block.</div></main>
		</body></html>`;
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml,
			document: {
				querySelector: (selector: string) => selector === 'title' ? { textContent: 'Default Copy' } : null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Default Copy This is some text inside of a div block.',
					innerHTML: rawHtml
				}
			},
			headings: [{ tagName: 'H1', textContent: 'Default Copy' }]
		}));

		const result = await validateContent('https://example.com/default-copy');
		const issue = result.issues.find((item) => item.id === 'webflow-default-content') as any;

		expect(issue).toBeTruthy();
		expect(issue.details.affectedPages[0].matches[0].sample).toBe('This is some text inside of a div block');
	});

	it('does not flag decorative images that use empty alt text', async () => {
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: '<!doctype html><html><head><title>Decorative Image Test</title><meta name="description" content="A sufficiently long meta description for testing content analysis behavior without accessibility false positives."></head><body><h1>Decorative Image Test</h1><img src="/decorative-divider.svg" alt="" /></body></html>',
			document: {
				querySelector: (selector: string) => {
					if (selector === 'title') return { textContent: 'Decorative Image Test' };
					if (selector === 'meta[name="description"]') return { getAttribute: () => 'A sufficiently long meta description for testing content analysis behavior without accessibility false positives.' };
					return null;
				},
				querySelectorAll: () => [],
				body: {
					textContent: 'Decorative Image Test meaningful content for validation.',
					innerHTML: '<h1>Decorative Image Test</h1><img src="/decorative-divider.svg" alt="" />'
				}
			},
			images: [{ getAttribute: (name: string) => name === 'alt' ? '' : name === 'src' ? '/decorative-divider.svg' : null }],
			headings: [{ tagName: 'H1', textContent: 'Decorative Image Test' }]
		}));

		const result = await validateContent('https://example.com');

		expect(result.issues.some((issue) => issue.id === 'missing-alt-text')).toBe(false);
	});

	it('does not flag platform-controlled video fallback images as actionable missing alt text', async () => {
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: '<!doctype html><html><head><title>Video Fallback Test</title></head><body><h1>Video Fallback Test</h1><div class="w-background-video"><img class="poster-image" src="/hero-poster.webp"></div></body></html>',
			document: {
				querySelector: (selector: string) => selector === 'title' ? { textContent: 'Video Fallback Test' } : null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Video Fallback Test meaningful page content for validation.',
					innerHTML: '<h1>Video Fallback Test</h1><div class="w-background-video"><img class="poster-image" src="/hero-poster.webp"></div>'
				}
			},
			images: [createImage({ src: '/hero-poster.webp', class: 'poster-image' }, {
				closest: (selector: string) => selector.includes('.w-background-video') ? {} : null
			})],
			headings: [{ tagName: 'H1', textContent: 'Video Fallback Test' }]
		}));

		const result = await validateContent('https://example.com');

		expect(result.issues.some((issue) => issue.id === 'missing-alt-text')).toBe(false);
	});

	it('does not flag Webflow generated background video fallback images without editable alt text', async () => {
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: '<!doctype html><html><head><title>Generated Video Fallback Test</title></head><body><h1>Generated Video Fallback Test</h1><img data-wf-bgvideo-fallback-img="true" src="/hero_poster.0000000.jpg"></body></html>',
			document: {
				querySelector: (selector: string) => selector === 'title' ? { textContent: 'Generated Video Fallback Test' } : null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Generated Video Fallback Test meaningful page content for validation.',
					innerHTML: '<h1>Generated Video Fallback Test</h1><img data-wf-bgvideo-fallback-img="true" src="/hero_poster.0000000.jpg">'
				}
			},
			images: [createImage({ src: '/hero_poster.0000000.jpg', 'data-wf-bgvideo-fallback-img': 'true' })],
			headings: [{ tagName: 'H1', textContent: 'Generated Video Fallback Test' }]
		}));

		const result = await validateContent('https://example.com');

		expect(result.issues.some((issue) => issue.id === 'missing-alt-text')).toBe(false);
	});

	it('surfaces actionable image details for missing alt text', async () => {
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: '<!doctype html><html><head><title>Image Detail Test</title></head><body><h1>Image Detail Test</h1><img class="team-photo" src="/team.webp"></body></html>',
			document: {
				querySelector: (selector: string) => selector === 'title' ? { textContent: 'Image Detail Test' } : null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Image Detail Test meaningful page content for validation.',
					innerHTML: '<h1>Image Detail Test</h1><img class="team-photo" src="/team.webp">'
				}
			},
			images: [createImage({ src: '/team.webp', class: 'team-photo' })],
			headings: [{ tagName: 'H1', textContent: 'Image Detail Test' }]
		}));

		const result = await validateContent('https://example.com');
		const missingAltIssue = result.issues.find((issue) => issue.id === 'missing-alt-text');

		expect(missingAltIssue).toBeTruthy();
		expect(missingAltIssue?.details?.missingImages).toEqual([
			expect.objectContaining({
				src: '/team.webp',
				selector: 'img.team-photo',
				pageUrl: 'https://example.com'
			})
		]);
	});

	it('still flags regular non-video poster images without alt text', async () => {
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: '<!doctype html><html><head><title>Poster Image Detail Test</title></head><body><h1>Poster Image Detail Test</h1><img class="event-poster" src="/product-poster.webp"></body></html>',
			document: {
				querySelector: (selector: string) => selector === 'title' ? { textContent: 'Poster Image Detail Test' } : null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Poster Image Detail Test meaningful page content for validation.',
					innerHTML: '<h1>Poster Image Detail Test</h1><img class="event-poster" src="/product-poster.webp">'
				}
			},
			images: [createImage({ src: '/product-poster.webp', class: 'event-poster' })],
			headings: [{ tagName: 'H1', textContent: 'Poster Image Detail Test' }]
		}));

		const result = await validateContent('https://example.com');
		const missingAltIssue = result.issues.find((issue) => issue.id === 'missing-alt-text');

		expect(missingAltIssue).toBeTruthy();
		expect(missingAltIssue?.details?.missingImages).toEqual([
			expect.objectContaining({
				src: '/product-poster.webp',
				selector: 'img.event-poster'
			})
		]);
	});

	it('can run only the alt text check', () => {
		const pages: any[] = [{
			url: 'https://example.com/',
			title: 'Home',
			hasLoremIpsum: true,
			headingHierarchy: { h1Count: 0, hasSkippedLevels: true, structure: [] },
			imageCount: 2,
			imagesWithoutAlt: 1,
			seo: {
				title: null,
				titleLength: 0,
				metaDescription: null,
				metaDescriptionLength: 0,
				hasValidTitle: false,
				hasValidDescription: false,
				openGraph: { title: null, description: null, image: null, url: null },
				twitterCard: { title: null, description: null, image: null },
				canonical: null,
				robots: null
			},
			links: {
				totalLinks: 1,
				internalLinks: 0,
				externalLinks: 1,
				brokenLinks: [{ href: 'javascript:alert(1)', text: 'x', status: 'suspicious', error: 'Potentially unsafe link type' }],
				emailLinks: 0,
				phoneLinks: 0,
				anchorLinks: 0,
				downloadLinks: 0,
				socialMediaLinks: 0
			},
			contentQuality: {
				hasPlaceholderContent: true,
				hasLoremIpsum: true,
				hasWebflowDefaults: false,
				hasGenericContent: false,
				contentScore: 10,
				issues: [],
				wordCount: 10,
				duplicateContent: []
			}
		}];

		const issues = generateContentIssues(pages as any, {
			lorem: false,
			headings: false,
			altText: true,
			seo: false,
			links: false,
			contentQuality: false
		});

		expect(issues.map(i => i.id)).toEqual(['missing-alt-text']);
	});

	it('can run only the lorem/placeholder check', () => {
		const pages: any[] = [{
			url: 'https://example.com/',
			title: 'Home',
			hasLoremIpsum: true,
			headingHierarchy: { h1Count: 1, hasSkippedLevels: false, structure: [] },
			imageCount: 0,
			imagesWithoutAlt: 0,
			seo: {
				title: 'Ok Title',
				titleLength: 8,
				metaDescription: 'Ok desc',
				metaDescriptionLength: 7,
				hasValidTitle: true,
				hasValidDescription: true,
				openGraph: { title: null, description: null, image: null, url: null },
				twitterCard: { title: null, description: null, image: null },
				canonical: null,
				robots: null
			},
			links: {
				totalLinks: 0,
				internalLinks: 0,
				externalLinks: 0,
				brokenLinks: [],
				emailLinks: 0,
				phoneLinks: 0,
				anchorLinks: 0,
				downloadLinks: 0,
				socialMediaLinks: 0
			},
			contentQuality: {
				hasPlaceholderContent: false,
				hasLoremIpsum: true,
				hasWebflowDefaults: false,
				hasGenericContent: false,
				contentScore: 80,
				issues: [],
				wordCount: 100,
				duplicateContent: []
			}
		}];

		const issues = generateContentIssues(pages as any, {
			lorem: true,
			headings: false,
			altText: false,
			seo: false,
			links: false,
			contentQuality: false
		});

		expect(issues.map(i => i.id)).toEqual(['lorem-ipsum-detected']);
		expect(issues[0].severity).toBe('warning');
	});

	it('pageScope=current analyzes only the current page URL and does not crawl slugs', async () => {
		(fetchHTML as any).mockClear();

		await validateContent(
			'https://example.com',
			['/a', '/b', '/c'],
			{
				pageScope: 'current',
				currentPageSlug: '/about',
				contentChecks: { lorem: false, headings: false, altText: false, seo: false, links: false, contentQuality: false }
			} as any
		);

		expect(fetchHTML).toHaveBeenCalledTimes(1);
		expect((fetchHTML as any).mock.calls[0][0]).toBe('https://example.com/about');
	});

	it('excludePageSlugs filters out provided slugs when pageScope=all', async () => {
		(fetchHTML as any).mockClear();

		await validateContent(
			'https://example.com',
			['/style-guide', '/about'],
			{
				excludePageSlugs: ['/style-guide'],
				contentChecks: { lorem: false, headings: false, altText: false, seo: false, links: false, contentQuality: false }
			} as any
		);

		expect(fetchHTML).toHaveBeenCalledTimes(2);
		const calledUrls = (fetchHTML as any).mock.calls.map((c: any[]) => c[0]);
		expect(calledUrls).toEqual(['https://example.com', 'https://example.com/about']);
	});

	it('pageScope=current returns warning without fetching when current page is excluded', async () => {
		(fetchHTML as any).mockClear();

		const result = await validateContent(
			'https://example.com',
			undefined,
			{
				pageScope: 'current',
				currentPageSlug: '/style-guide',
				excludePageSlugs: ['/style-guide'],
				contentChecks: { lorem: false, headings: false, altText: false, seo: false, links: false, contentQuality: false }
			} as any
		);

		expect(fetchHTML).toHaveBeenCalledTimes(0);
		expect(result.issues[0]?.id).toBe('content-excluded-page');
		expect(result.issues[0]?.severity).toBe('warning');
	});
});

describe('Accessibility Validator', () => {
	it('does not invent contrast findings when no real contrast data exists', async () => {
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: '<!doctype html><html><head><title>Plain Page</title></head><body><h1>Plain Page</h1><p>Normal readable text.</p></body></html>',
			document: {
				querySelector: () => null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Plain Page Normal readable text.',
					innerHTML: '<h1>Plain Page</h1><p>Normal readable text.</p>'
				}
			},
			headings: [{ tagName: 'H1', textContent: 'Plain Page' }]
		}));

		const result = await validateAccessibility('https://example.com');

		expect(result.stats.contrastViolations).toBe(0);
		expect(result.issues.some((issue) => issue.id === 'color-contrast-violations')).toBe(false);
	});

	it('does not flag syntax-highlighted Webflow code blocks as page contrast violations', async () => {
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: `<!doctype html><html><head><title>Install</title></head><body>
				<h1>Install</h1>
				<pre contenteditable="false" class="install-code-block w-code-block" style="display:block;overflow-x:auto;background:#2b2b2b;color:#f8f8f2;padding:0.5em"><code class="language-javascript"><span><span style="color:#dcc6e0">import</span><span> { Client } </span><span style="color:#dcc6e0">from</span><span> </span><span style="color:#abe338">&quot;@AEYE/product&quot;</span><span>;</span></span></code></pre>
			</body></html>`,
			document: {
				querySelector: () => null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Install import { Client } from "@AEYE/product";',
					innerHTML: '<h1>Install</h1>'
				}
			},
			headings: [{ tagName: 'H1', textContent: 'Install' }]
		}));

		const result = await validateAccessibility('https://example.com/install');

		expect(result.stats.contrastViolations).toBe(0);
		expect(result.issues.some((issue) => issue.id === 'color-contrast-violations')).toBe(false);
	});

	it('does not require labels for submit-style inputs with their own accessible value', async () => {
		const emailInput = {
			tagName: 'INPUT',
			getAttribute: (name: string) => {
				if (name === 'type') return 'email';
				if (name === 'id') return 'email';
				if (name === 'placeholder') return 'Enter your email';
				return null;
			},
			hasAttribute: () => false
		};
		const submitInput = {
			tagName: 'INPUT',
			getAttribute: (name: string) => {
				if (name === 'type') return 'submit';
				if (name === 'value') return 'Subscribe';
				return null;
			},
			hasAttribute: () => false
		};
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			forms: [{
				querySelectorAll: () => [emailInput, submitInput],
				querySelector: () => null
			}],
			headings: [{ tagName: 'H1', textContent: 'Home' }]
		}));

		const result = await validateAccessibility('https://example.com');
		const formIssue = result.issues.find((issue) => issue.id === 'form-labels-missing');

		expect(formIssue?.message).toBe('1 form inputs missing labels');
		expect(formIssue?.details).toMatchObject({
			totalInputs: 1,
			unlabeledInputs: [{ type: 'email', id: 'email', placeholder: 'Enter your email' }]
		});
	});

	it('does not flag platform-controlled video fallback images in accessibility-only checks', async () => {
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: '<!doctype html><html><body><h1>Video Fallback Test</h1><div class="w-background-video"><img class="poster-image" src="/hero-poster.webp"></div></body></html>',
			document: {
				querySelector: () => null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Video Fallback Test meaningful page content.',
					innerHTML: '<h1>Video Fallback Test</h1><div class="w-background-video"><img class="poster-image" src="/hero-poster.webp"></div>'
				}
			},
			images: [createImage({ src: '/hero-poster.webp', class: 'poster-image' }, {
				closest: (selector: string) => selector.includes('.w-background-video') ? {} : null
			})],
			headings: [{ tagName: 'H1', textContent: 'Video Fallback Test' }]
		}));

		const result = await validateAccessibility('https://example.com');

		expect(result.stats.missingAltText).toBe(0);
		expect(result.issues.some((issue) => issue.id === 'missing-alt-text-critical')).toBe(false);
	});

	it('does not flag generated video fallback images in accessibility-only checks', async () => {
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: '<!doctype html><html><body><h1>Generated Video Fallback Test</h1><img data-wf-bgvideo-fallback-img="true" src="/hero_poster.0000000.jpg"></body></html>',
			document: {
				querySelector: () => null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Generated Video Fallback Test meaningful page content.',
					innerHTML: '<h1>Generated Video Fallback Test</h1><img data-wf-bgvideo-fallback-img="true" src="/hero_poster.0000000.jpg">'
				}
			},
			images: [createImage({ src: '/hero_poster.0000000.jpg', 'data-wf-bgvideo-fallback-img': 'true' })],
			headings: [{ tagName: 'H1', textContent: 'Generated Video Fallback Test' }]
		}));

		const result = await validateAccessibility('https://example.com');

		expect(result.stats.missingAltText).toBe(0);
		expect(result.issues.some((issue) => issue.id === 'missing-alt-text-critical')).toBe(false);
	});

	it('excludes Webflow Ecommerce fixed-tag headings from content heading hierarchy analysis', async () => {
		const cartHeading = {
			tagName: 'H4',
			textContent: 'Your Cart',
			getAttribute: (name: string) => name === 'class' ? 'w-commerce-commercecartheading cart_title' : null,
			hasAttribute: (name: string) => name === 'class'
		};
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			rawHtml: '<!doctype html><html><head><title>Cart Page</title></head><body><h1>Hero Title</h1><h2>Section Title</h2><p>Purpose-built content for this page.</p></body></html>',
			document: {
				querySelector: (selector: string) => selector === 'title' ? { textContent: 'Cart Page' } : null,
				querySelectorAll: () => [],
				body: {
					textContent: 'Hero Title Section Title Purpose-built content for this page.',
					innerHTML: '<h1>Hero Title</h1><h2>Section Title</h2>'
				}
			},
			headings: [
				{ tagName: 'H1', textContent: 'Hero Title' },
				cartHeading,
				{ tagName: 'H2', textContent: 'Section Title' }
			]
		}));

		const result = await validateContent('https://example.com');

		expect(result.issues.some((issue) => issue.id === 'heading-hierarchy-errors')).toBe(false);
	});

	it('excludes Webflow Ecommerce fixed-tag headings from heading hierarchy analysis', async () => {
		const cartHeading = {
			tagName: 'H4',
			textContent: 'Your Cart',
			getAttribute: (name: string) => name === 'class' ? 'w-commerce-commercecartheading cart_title' : null,
			hasAttribute: (name: string) => name === 'class'
		};
		vi.mocked(parseHTML).mockReturnValue(createParsedHTML({
			headings: [
				{ tagName: 'H1', textContent: 'Hero Title' },
				cartHeading,
				{ tagName: 'H2', textContent: 'Section Title' }
			]
		}));

		const result = await validateAccessibility('https://example.com');

		expect(result.audit.headingStructure.errors.some((error: any) => error.type === 'skipped_level')).toBe(false);
		expect(result.issues.some((issue) => issue.id === 'heading-structure-errors')).toBe(false);
	});
});

describe('Asset Validator', () => {
	it('treats SVG assets as optimized vector assets instead of raster conversion candidates', () => {
		const optimization = analyzeImageOptimization(new ArrayBuffer(700 * 1024), 'image/svg+xml');
		const issues = generateAssetIssues([
			{
				name: 'utility-lock.svg',
				url: 'https://uploads-ssl.webflow.com/site/utility-lock.svg',
				size: 700 * 1024,
				format: 'image/svg+xml',
				isOptimized: optimization.isOptimized,
				usageCount: 1,
				hasLicensingIssues: false
			},
			{
				name: 'Frame 20 (5).svg',
				url: 'https://uploads-ssl.webflow.com/site/Frame%2020%20(5).svg',
				size: 280 * 1024,
				format: 'application/octet-stream',
				isOptimized: false,
				usageCount: 1,
				hasLicensingIssues: false
			}
		]);

		expect(optimization).toEqual(expect.objectContaining({
			isOptimized: true,
			recommendation: undefined
		}));
		expect(issues.some((issue) => issue.id === 'assets-not-optimized')).toBe(false);
		expect(issues.some((issue) => issue.id === 'assets-above-compression-target')).toBe(false);
	});

	it('treats 150KB as a review target and 4MB as the blocking maximum', () => {
		const issues = generateAssetIssues([
			{
				name: 'portfolio-hero.webp',
				url: 'https://uploads-ssl.webflow.com/site/portfolio-hero.webp',
				size: 280 * 1024,
				format: 'image/webp',
				isOptimized: true,
				usageCount: 1,
				hasLicensingIssues: false
			},
			{
				name: 'raw-gallery-image.png',
				url: 'https://uploads-ssl.webflow.com/site/raw-gallery-image.png',
				size: 5 * 1024 * 1024,
				format: 'image/png',
				isOptimized: false,
				usageCount: 1,
				hasLicensingIssues: false
			}
		]);

		const compressionIssue = issues.find((issue) => issue.id === 'assets-above-compression-target');
		const maxSizeIssue = issues.find((issue) => issue.id === 'assets-extremely-large');

		expect(compressionIssue).toEqual(expect.objectContaining({
			severity: 'warning',
			message: '1 assets are above the 150KB compression target'
		}));
		expect(compressionIssue?.details?.oversizedAssets).toEqual([
			expect.objectContaining({ name: 'portfolio-hero.webp', size: '280KB' })
		]);
		expect(maxSizeIssue).toEqual(expect.objectContaining({
			severity: 'error',
			message: '1 assets exceed the 4MB maximum file size'
		}));
	});
});

describe('Interactions Validator', () => {
	it('detects IX2 on accessible pages even when another page fails', async () => {
		vi.mocked(fetchHTML).mockImplementation(async (url: string) => {
			if (url.endsWith('/missing')) {
				throw new Error('HTTP 404: Not Found');
			}

			return {
				html: '<!doctype html><html><body><div data-w-id="abc"></div><script>Webflow.require("ix2").init({})</script></body></html>',
				status: 200,
				headers: { 'content-type': 'text/html' },
				size: 0,
				loadTime: 0
			};
		});

		const result = await validateInteractions('https://example.com', ['/missing']);

		expect(result.stats.legacyIx2Detected).toBe(true);
		expect(result.stats.legacyIx2Count).toBe(2);
		expect(result.stats.pagesAnalyzed).toBe(1);
		expect(result.stats.pagesFailed).toBe(1);
		expect(result.stats.analysisStatus).toBe('partial');
		expect(result.issues.some((issue) => issue.id === 'legacy-ix2-interactions-detected' && issue.severity === 'error')).toBe(true);
		expect(result.issues.some((issue) => issue.id === 'interactions-analysis-incomplete' && issue.severity === 'warning')).toBe(true);
	});

	it('skips internal CMS template detail slugs instead of fetching them as published pages', async () => {
		const fetchMock = vi.mocked(fetchHTML);
		vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
		fetchMock.mockClear();
		fetchMock.mockImplementation(async (url: string) => {
			if (url.includes('/detail_')) {
				throw new Error('Internal CMS template slug should not be fetched');
			}

			return {
				html: '<!doctype html><html><head><title>Published Page</title></head><body></body></html>',
				status: 200,
				headers: { 'content-type': 'text/html' },
				size: 0,
				loadTime: 0
			};
		});

		const result = await validateInteractions('https://example.com', [
			'/detail_blog-posts',
			'detail_portofolios',
			'/blog-posts/real-item'
		]);

		expect(result.stats.pagesRequested).toBe(2);
		expect(result.stats.pagesAnalyzed).toBe(2);
		expect(result.stats.pagesFailed).toBe(0);
		expect(result.stats.pagesSkipped).toBe(2);
		expect(result.stats.analysisStatus).toBe('completed');
		expect(result.stats.skippedCmsTemplateSlugs).toEqual(['/detail_blog-posts', '/detail_portofolios']);
		expect(result.stats.cmsTemplateCoverageStatus).toBe('uncovered');
		expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
			'https://example.com/',
			'https://example.com/blog-posts/real-item'
		]);
		expect(result.issues.some((issue) => issue.id === 'interactions-analysis-incomplete')).toBe(false);
	});

	it('validates CMS template coverage with real published item URLs from sitemap', async () => {
		const fetchMock = vi.mocked(fetchHTML);
		fetchMock.mockClear();
		fetchMock.mockImplementation(async (url: string) => {
			if (url.includes('/detail_')) {
				throw new Error('Internal CMS template slug should not be fetched');
			}

			return {
				html: '<!doctype html><html><head><title>Published Page</title></head><body></body></html>',
				status: 200,
				headers: { 'content-type': 'text/html' },
				size: 0,
				loadTime: 0
			};
		});
		vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
			const url = input instanceof Request ? input.url : String(input);
			if (url.endsWith('/sitemap.xml')) {
				return new Response(`<?xml version="1.0" encoding="UTF-8"?>
					<urlset>
						<url><loc>https://kitpro-aurix.webflow.io/</loc></url>
						<url><loc>https://kitpro-aurix.webflow.io/blog-posts/innovative-branding-strategies-for</loc></url>
						<url><loc>https://kitpro-aurix.webflow.io/portofolios/rejuve</loc></url>
					</urlset>`, {
					status: 200,
					headers: { 'Content-Type': 'application/xml' }
				});
			}
			return new Response('', { status: 404 });
		}));

		const result = await validateInteractions('https://kitpro-aurix.webflow.io', [], {
			cmsTemplateHints: [
				{ templateSlug: '/detail_blog-posts', collectionName: 'Blog Posts' },
				{ templateSlug: '/detail_portofolios', collectionName: 'Portofolios' }
			]
		});

		expect(result.stats.pagesRequested).toBe(3);
		expect(result.stats.pagesAnalyzed).toBe(3);
		expect(result.stats.pagesFailed).toBe(0);
		expect(result.stats.pagesSkipped).toBe(2);
		expect(result.stats.cmsItemUrlsDiscovered).toBe(2);
		expect(result.stats.cmsItemUrlsValidated).toBe(2);
		expect(result.stats.cmsTemplateCoverageStatus).toBe('covered');
		expect(result.stats.cmsTemplateCoverage).toEqual([
			expect.objectContaining({
				templateSlug: '/detail_blog-posts',
				source: 'sitemap',
				status: 'covered',
				validatedUrls: ['https://kitpro-aurix.webflow.io/blog-posts/innovative-branding-strategies-for']
			}),
			expect.objectContaining({
				templateSlug: '/detail_portofolios',
				source: 'sitemap',
				status: 'covered',
				validatedUrls: ['https://kitpro-aurix.webflow.io/portofolios/rejuve']
			})
		]);
		expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
			'https://kitpro-aurix.webflow.io/',
			'https://kitpro-aurix.webflow.io/blog-posts/innovative-branding-strategies-for',
			'https://kitpro-aurix.webflow.io/portofolios/rejuve'
		]);
	});

	it('falls back to homepage links when sitemap does not expose CMS item URLs', async () => {
		vi.mocked(fetchHTML).mockResolvedValue({
			html: '<!doctype html><html><head><title>Published Page</title></head><body></body></html>',
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});
		vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
			const url = input instanceof Request ? input.url : String(input);
			if (url.endsWith('/sitemap.xml')) {
				return new Response('', { status: 404 });
			}
			if (url === 'https://example.com/' || url === 'https://example.com') {
				return new Response('<a href="/blog-posts/from-homepage">Post</a>', {
					status: 200,
					headers: { 'Content-Type': 'text/html' }
				});
			}
			return new Response('', { status: 404 });
		}));

		const result = await validateInteractions('https://example.com', [], {
			cmsTemplateHints: [{ templateSlug: '/detail_blog-posts', collectionName: 'Blog Posts' }]
		});

		expect(result.stats.cmsTemplateCoverageStatus).toBe('covered');
		expect(result.stats.cmsTemplateCoverage?.[0]).toEqual(expect.objectContaining({
			source: 'link',
			validatedUrls: ['https://example.com/blog-posts/from-homepage']
		}));
	});

	it('skips ecommerce template roots and validates real product/category URLs from homepage links', async () => {
		const fetchHtmlMock = vi.mocked(fetchHTML);
		fetchHtmlMock.mockClear();
		fetchHtmlMock.mockImplementation(async (url: string) => {
			if (url === 'https://example.com/product' || url === 'https://example.com/category' || url === 'https://example.com/sku') {
				throw new Error('Template root should not be fetched');
			}

			return {
				html: '<!doctype html><html><head><title>Published Page</title></head><body></body></html>',
				status: 200,
				headers: { 'content-type': 'text/html' },
				size: 0,
				loadTime: 0
			};
		});
		vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
			const url = input instanceof Request ? input.url : String(input);
			if (url.endsWith('/sitemap.xml')) {
				return new Response('', { status: 404 });
			}
			if (url === 'https://example.com/' || url === 'https://example.com') {
				return new Response('<a href="/product/brightening-renewal-serum">Serum</a><a href="/category/toner">Toner</a>', {
					status: 200,
					headers: { 'Content-Type': 'text/html' }
				});
			}
			return new Response('', { status: 404 });
		}));

		const result = await validateInteractions('https://example.com', ['/product', '/sku', '/category']);

		expect(result.stats.pagesSkipped).toBe(3);
		expect(result.stats.pagesFailed).toBe(0);
		expect(result.stats.analysisStatus).toBe('completed');
		expect(result.stats.cmsItemUrlsDiscovered).toBe(2);
		expect(result.stats.cmsItemUrlsValidated).toBe(2);
		expect(result.stats.cmsTemplateCoverageStatus).toBe('partial');
		expect(result.issues.some((issue) => issue.id === 'interactions-analysis-incomplete')).toBe(false);
		expect(fetchHtmlMock.mock.calls.map(([url]) => url)).toEqual([
			'https://example.com/',
			'https://example.com/product/brightening-renewal-serum',
			'https://example.com/category/toner'
		]);
	});

	it('uses homepage links when an available sitemap misses a CMS collection', async () => {
		const fetchHtmlMock = vi.mocked(fetchHTML);
		fetchHtmlMock.mockClear();
		fetchHtmlMock.mockResolvedValue({
			html: '<!doctype html><html><head><title>Published Page</title></head><body></body></html>',
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = input instanceof Request ? input.url : String(input);
			if (url.endsWith('/sitemap.xml')) {
				return new Response(`<?xml version="1.0" encoding="UTF-8"?>
					<urlset>
						<url><loc>https://example.webflow.io/</loc></url>
						<url><loc>https://example.webflow.io/utility/style-guide</loc></url>
					</urlset>`, {
					status: 200,
					headers: { 'Content-Type': 'application/xml' }
				});
			}
				if (url === 'https://example.webflow.io/' || url === 'https://example.webflow.io') {
					return new Response('<a href="/blog-posts/from-homepage">Post</a><a href="/project/from-homepage">Project</a>', {
					status: 200,
					headers: { 'Content-Type': 'text/html' }
				});
			}
			return new Response('', { status: 404 });
		});
		vi.stubGlobal('fetch', fetchMock);

		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteUrl: 'https://example.webflow.io',
					pageSlugs: [],
					designerData: {
						components: [],
						styles: [],
							pages: [
								{
									id: 'page_blog',
									name: 'Blog Posts Template',
									slug: '/detail_blog-posts',
									type: 'Page',
									collectionId: 'collection_blog',
									collectionName: 'Blog Posts',
									isCmsTemplate: true
								},
								{
									id: 'page_project',
									name: 'Projects Template',
									slug: '/detail_projects',
									type: 'Page',
									collectionId: 'collection_project',
									collectionName: 'Projects',
									isCmsTemplate: true
								}
							],
						assets: [],
						siteInfo: { id: 'site_123' }
					},
					options: {
						skipAssets: true,
						skipContent: true,
						skipAccessibility: true
					}
				})
			}),
			{},
			createExecutionContext()
		);

		expect(response.status).toBe(200);
		const payload = await response.json() as any;
		expect(payload.analysis.interactions.stats.cmsTemplateCoverageStatus).toBe('covered');
		expect(payload.analysis.interactions.stats.cmsTemplateCoverage).toEqual([
			expect.objectContaining({
				templateSlug: '/detail_blog-posts',
				source: 'link',
				validatedUrls: ['https://example.webflow.io/blog-posts/from-homepage']
			}),
			expect.objectContaining({
				templateSlug: '/detail_projects',
				candidateSlugs: ['projects', 'project'],
				source: 'link',
				validatedUrls: ['https://example.webflow.io/project/from-homepage']
			})
		]);
		expect(fetchHtmlMock.mock.calls.map(([url]) => url)).toEqual([
			'https://example.webflow.io/',
			'https://example.webflow.io/blog-posts/from-homepage',
			'https://example.webflow.io/project/from-homepage'
		]);
		expect(fetchMock.mock.calls.map(([input]) => input instanceof Request ? input.url : String(input))).toEqual([
			'https://example.webflow.io/sitemap.xml',
			'https://example.webflow.io'
		]);
	});

	it('uses sitemap URLs before homepage links when both expose the CMS collection', async () => {
		const fetchHtmlMock = vi.mocked(fetchHTML);
		fetchHtmlMock.mockClear();
		fetchHtmlMock.mockResolvedValue({
			html: '<!doctype html><html><head><title>Published Page</title></head><body></body></html>',
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = input instanceof Request ? input.url : String(input);
			if (url.endsWith('/sitemap.xml')) {
				return new Response(`<?xml version="1.0" encoding="UTF-8"?>
					<urlset>
						<url><loc>https://example.webflow.io/blog-posts/from-sitemap</loc></url>
					</urlset>`, {
					status: 200,
					headers: { 'Content-Type': 'application/xml' }
				});
			}
			if (url === 'https://example.webflow.io/' || url === 'https://example.webflow.io') {
				return new Response('<a href="/blog-posts/from-homepage">Post</a>', {
					status: 200,
					headers: { 'Content-Type': 'text/html' }
				});
			}
			return new Response('', { status: 404 });
		});
		vi.stubGlobal('fetch', fetchMock);

		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteUrl: 'https://example.webflow.io',
					pageSlugs: [],
					designerData: {
						components: [],
						styles: [],
						pages: [{
							id: 'page_blog',
							name: 'Blog Posts Template',
							slug: '/detail_blog-posts',
							type: 'Page',
							collectionId: 'collection_blog',
							collectionName: 'Blog Posts',
							isCmsTemplate: true
						}],
						assets: [],
						siteInfo: { id: 'site_123' }
					},
					options: {
						skipAssets: true,
						skipContent: true,
						skipAccessibility: true
					}
				})
			}),
			{},
			createExecutionContext()
		);

		expect(response.status).toBe(200);
		const payload = await response.json() as any;
		expect(payload.analysis.interactions.stats.cmsTemplateCoverageStatus).toBe('covered');
		expect(payload.analysis.interactions.stats.cmsTemplateCoverage[0]).toEqual(expect.objectContaining({
			source: 'sitemap',
			validatedUrls: ['https://example.webflow.io/blog-posts/from-sitemap']
		}));
		expect(fetchHtmlMock.mock.calls.map(([url]) => url)).toEqual([
			'https://example.webflow.io/',
			'https://example.webflow.io/blog-posts/from-sitemap'
		]);
		expect(fetchMock.mock.calls.map(([input]) => input instanceof Request ? input.url : String(input))).toEqual([
			'https://example.webflow.io/sitemap.xml',
			'https://example.webflow.io'
		]);
	});

	it('does not treat Webflow Lottie element markers as legacy IX2', async () => {
		vi.mocked(fetchHTML).mockResolvedValue({
			html: `<!doctype html><html><body>
				<div data-w-id="lottie-1" data-is-ix2-target="0" data-animation-type="lottie" data-src="/animation.json" data-renderer="svg" data-default-duration="0"></div>
				<script>Webflow.require("ix2").init({ events: { "e-1": { action: { actionTypeId: "PLUGIN_LOTTIE_EFFECT" } } }, actionLists: { pluginLottie: { actionItemGroups: [{ actionItems: [{ actionTypeId: "PLUGIN_LOTTIE" }] }] } } })</script>
			</body></html>`,
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});

		const result = await validateInteractions('https://example.com');

		expect(result.stats.legacyIx2Detected).toBe(false);
		expect(result.stats.legacyIx2Count).toBe(0);
		expect(result.issues.some((issue) => issue.id === 'legacy-ix2-interactions-detected')).toBe(false);
	});

	it('does not reject bare Webflow DOM markers without IX2 runtime or action evidence', async () => {
		vi.mocked(fetchHTML).mockResolvedValue({
			html: '<!doctype html><html class="w-mod-js w-mod-ix"><body><div data-w-id="decorative-motion"></div></body></html>',
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});

		const result = await validateInteractions('https://example.com');

		expect(result.stats.legacyIx2Detected).toBe(false);
		expect(result.stats.legacyIx2Count).toBe(0);
		expect(result.issues.some((issue) => issue.id === 'legacy-ix2-interactions-detected')).toBe(false);
	});

	it('still detects non-Lottie IX2 markers on pages that also include Lottie', async () => {
		vi.mocked(fetchHTML).mockResolvedValue({
			html: `<!doctype html><html><body>
				<div data-w-id="lottie-1" data-is-ix2-target="0" data-animation-type="lottie" data-src="/animation.json" data-renderer="svg" data-default-duration="0"></div>
				<div data-w-id="legacy-card"></div>
				<script>Webflow.require("ix2").init({})</script>
			</body></html>`,
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});

		const result = await validateInteractions('https://example.com');

		expect(result.stats.legacyIx2Detected).toBe(true);
		expect(result.stats.legacyIx2Count).toBe(2);
		expect(result.issues.some((issue) => issue.id === 'legacy-ix2-interactions-detected')).toBe(true);
	});

	it('warns when no pages can be checked for IX2', async () => {
		vi.mocked(fetchHTML).mockRejectedValue(new Error('HTTP 404: Not Found'));

		const result = await validateInteractions('https://example.com', ['/missing']);

		expect(result.stats.legacyIx2Detected).toBeNull();
		expect(result.stats.pagesAnalyzed).toBe(0);
		expect(result.stats.pagesFailed).toBe(2);
		expect(result.stats.analysisStatus).toBe('failed');
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'interactions-analysis-incomplete',
					severity: 'warning'
				})
			])
		);
	});
});

describe('Validation Submission Endpoint', () => {
	it('serves the published review snippet asset with permissive CORS headers', async () => {
		const assetFetch = vi.fn(async () =>
			new Response('// review snippet', {
				status: 200,
				headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
			})
		);

		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js', {
				method: 'GET',
				headers: {
					Origin: 'https://clone-galleries-webflow-template-brix-t.webflow.io'
				}
			}),
			{ ASSETS: { fetch: assetFetch } } as any,
			createExecutionContext()
		);

		expect(response.status).toBe(200);
		expect(await response.text()).toContain('review snippet');
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(assetFetch).toHaveBeenCalledTimes(1);
	});

	it('keeps programmatic snippet install on the manual-first route', async () => {
		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/install', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://designer.webflow-ext.com'
				},
				body: JSON.stringify({
					siteId: 'site_programmatic_disabled',
					siteName: 'Programmatic Disabled',
					installTarget: 'head',
					mode: 'webflow-api'
				})
			}),
			{ WEBFLOW_DATA_API_TOKEN: 'token-that-should-not-trigger-auto-install' } as any,
			createExecutionContext()
		);

		expect(response.status).toBe(200);
		const payload = await response.json() as any;
		expect(payload.status).toBe('pending_manual');
		expect(payload.installed).toBe(false);
		expect(payload.installMethod).toBe('manual-fallback');
		expect(payload.message).toContain('Copy the script');
		expect(payload.snippet).toContain('__WF_REVIEW_BRIDGE');
	});

	it('verifies a manually published bridge snippet and promotes status to active', async () => {
		const installResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/install', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://designer.webflow-ext.com'
				},
				body: JSON.stringify({
					siteId: 'site_manual_verify',
					siteName: 'Manual Verify',
					installTarget: 'head',
					mode: 'manual-fallback'
				})
			}),
			{} as any,
			createExecutionContext()
		);

		expect(installResponse.status).toBe(200);
		const installPayload = await installResponse.json() as any;
		expect(installPayload.status).toBe('pending_manual');

		vi.mocked(fetchHTML).mockResolvedValueOnce({
			html: `<!doctype html><html><head><script>window.__WF_REVIEW_BRIDGE = { marker: "__wf_review_snippet_v1", bridgeToken: "${installPayload.bridgeToken}" };</script><script src="https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js"></script></head><body></body></html>`,
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});

		const statusResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/status?siteId=site_manual_verify&siteUrl=https%3A%2F%2Fexample.com', {
				method: 'GET',
				headers: {
					Origin: 'https://designer.webflow-ext.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);

		expect(statusResponse.status).toBe(200);
		const statusPayload = await statusResponse.json() as any;
		expect(statusPayload.status).toBe('active');
		expect(statusPayload.installed).toBe(true);
		expect(statusPayload.message).toContain('published-site audits');
	});

	it('keeps manual status pending when the bridge token is present but the review script is missing', async () => {
		const installResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/install', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://designer.webflow-ext.com'
				},
				body: JSON.stringify({
					siteId: 'site_missing_review_surface',
					siteName: 'Missing Review Surface',
					installTarget: 'head',
					mode: 'manual-fallback'
				})
			}),
			{} as any,
			createExecutionContext()
		);

		const installPayload = await installResponse.json() as any;

		vi.mocked(fetchHTML).mockResolvedValueOnce({
			html: `<!doctype html><html><head><script>window.__WF_REVIEW_BRIDGE = { marker: "__wf_review_snippet_v1", bridgeToken: "${installPayload.bridgeToken}" };</script></head><body></body></html>`,
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});

		const statusResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/status?siteId=site_missing_review_surface&siteUrl=https%3A%2F%2Fexample.com', {
				method: 'GET',
				headers: {
					Origin: 'https://designer.webflow-ext.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);

		expect(statusResponse.status).toBe(200);
		const statusPayload = await statusResponse.json() as any;
		expect(statusPayload.status).toBe('pending_manual');
		expect(statusPayload.message).toContain('review script is missing');
	});

	it('resets manual bridge status after token rotation until the new snippet is republished', async () => {
		const installResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/install', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://designer.webflow-ext.com'
				},
				body: JSON.stringify({
					siteId: 'site_manual_rotate',
					siteName: 'Manual Rotate',
					installTarget: 'head',
					mode: 'manual-fallback'
				})
			}),
			{} as any,
			createExecutionContext()
		);
		const installPayload = await installResponse.json() as any;

		vi.mocked(fetchHTML).mockResolvedValueOnce({
			html: `<!doctype html><html><head><script>window.__WF_REVIEW_BRIDGE = { marker: "__wf_review_snippet_v1", bridgeToken: "${installPayload.bridgeToken}" };</script><script src="https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js"></script></head><body></body></html>`,
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});
		await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/status?siteId=site_manual_rotate&siteUrl=https%3A%2F%2Fexample.com', {
				method: 'GET',
				headers: {
					Origin: 'https://designer.webflow-ext.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);

		const rotateResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/rotate-token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://designer.webflow-ext.com'
				},
				body: JSON.stringify({
					siteId: 'site_manual_rotate',
					siteName: 'Manual Rotate'
				})
			}),
			{} as any,
			createExecutionContext()
		);

		expect(rotateResponse.status).toBe(200);
		const rotatePayload = await rotateResponse.json() as any;
		expect(rotatePayload.status).toBe('pending_manual');
		expect(rotatePayload.installed).toBe(false);
		expect(rotatePayload.bridgeToken).not.toBe(installPayload.bridgeToken);
		expect(rotatePayload.message).toContain('Publish the updated bridge and review surface');
	});

	it('allows webflow-ext.com origins for worker bridge routes', async () => {
		const origin = 'https://designer.webflow-ext.com';
		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/status?siteId=site_bridge', {
				method: 'GET',
				headers: {
					Origin: origin
				}
			}),
			{} as any,
			createExecutionContext()
		);

		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
	});

	it('exposes latest submitted Validator result by site ID and bridge token hash', async () => {
		const installResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/install', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://designer.webflow-ext.com'
				},
				body: JSON.stringify({
					siteId: 'site_latest_result',
					siteName: 'Latest Result',
					installTarget: 'head',
					mode: 'manual-fallback'
				})
			}),
			{} as any,
			createExecutionContext()
		);
		const installPayload = await installResponse.json() as any;
		const bridgeTokenSha256 = await sha256ForTest(installPayload.bridgeToken);

		const submitResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com'
				},
				body: JSON.stringify({
					siteId: 'site_latest_result',
					siteName: 'Latest Result',
					siteUrl: 'https://latest-result.webflow.io',
					validationResults: {
						url: 'https://latest-result.webflow.io',
						summary: { totalErrors: 0, totalWarnings: 1, passedCategories: 4, failedCategories: 0 },
						categories: [
							{ category: 'Assets & Images', passed: true, issues: [] },
							{ category: 'Content & Accessibility', passed: true, issues: [] },
							{ category: 'Interactions and GSAP', passed: true, issues: [] },
							{ category: 'Designer Structure', passed: true, issues: [] }
						]
					}
				})
			}),
			{} as any,
			createExecutionContext()
		);
		expect(submitResponse.status).toBe(200);

		const bySiteResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submission/latest?siteId=site_latest_result', {
				method: 'GET',
				headers: {
					Origin: 'https://webflow.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);
		const byTokenResponse = await worker.fetch(
			new Request(`https://validation-worker.createsomething.workers.dev/app-validator/submission/latest?bridgeTokenSha256=${bridgeTokenSha256}`, {
				method: 'GET',
				headers: {
					Origin: 'https://webflow.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);

		expect(bySiteResponse.status).toBe(200);
		expect(byTokenResponse.status).toBe(200);
		const byTokenPayload = await byTokenResponse.json() as any;
		expect(byTokenPayload.status).toBe('available');
		expect(byTokenPayload.passed).toBe(true);
		expect(byTokenPayload.summary.score).toBe(100);
		expect(byTokenPayload.summary.totalCategories).toBe(4);
		expect(byTokenPayload.rawBridgeTokenStored).toBe(false);
		expect(JSON.stringify(byTokenPayload)).not.toContain(installPayload.bridgeToken);
	});

	it('tracks bridge usage for retroactive lookup without exposing raw bridge tokens', async () => {
		const installResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/install', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://designer.webflow-ext.com'
				},
				body: JSON.stringify({
					siteId: 'site_bridge_usage',
					siteName: 'Bridge Usage Site',
					installTarget: 'head',
					mode: 'manual-fallback'
				})
			}),
			{} as any,
			createExecutionContext()
		);
		const installPayload = await installResponse.json() as any;

		vi.mocked(fetchHTML).mockResolvedValueOnce({
			html: `<!doctype html><html><head><script>window.__WF_REVIEW_BRIDGE = { marker: "__wf_review_snippet_v1", bridgeToken: "${installPayload.bridgeToken}" };</script><script src="https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js"></script></head><body></body></html>`,
			status: 200,
			headers: { 'content-type': 'text/html' },
			size: 0,
			loadTime: 0
		});

		await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/snippet/status?siteId=site_bridge_usage&siteUrl=https%3A%2F%2Fbridge-usage.webflow.io', {
				method: 'GET',
				headers: {
					Origin: 'https://designer.webflow-ext.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);

		await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com'
				},
				body: JSON.stringify({
					siteId: 'site_bridge_usage',
					siteName: 'Bridge Usage Site',
					siteUrl: 'https://bridge-usage.webflow.io',
					validationResults: {
						url: 'https://bridge-usage.webflow.io',
						summary: { totalErrors: 0, totalWarnings: 0, passedCategories: 2, failedCategories: 0 },
						categories: [
							{ category: 'Assets & Images', passed: true, issues: [] },
							{ category: 'Content & Accessibility', passed: true, issues: [] }
						]
					}
				})
			}),
			{} as any,
			createExecutionContext()
		);

		const unauthorizedResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/bridge/usage?siteId=site_bridge_usage', {
				method: 'GET',
				headers: { Origin: 'https://webflow.com' }
			}),
			{} as any,
			createExecutionContext()
		);
		expect(unauthorizedResponse.status).toBe(503);

		const usageResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/bridge/usage?siteId=site_bridge_usage', {
				method: 'GET',
				headers: {
					Origin: 'https://webflow.com',
					Authorization: 'Bearer test-admin-token'
				}
			}),
			{ VALIDATOR_BRIDGE_USAGE_ADMIN_TOKEN: 'test-admin-token' } as any,
			createExecutionContext()
		);

		expect(usageResponse.status).toBe(200);
		const usagePayload = await usageResponse.json() as any;
		expect(usagePayload.count).toBe(1);
		expect(usagePayload.rawBridgeTokenStored).toBe(false);
		expect(usagePayload.items[0]).toEqual(expect.objectContaining({
			siteId: 'site_bridge_usage',
			siteName: 'Bridge Usage Site',
			siteUrl: 'https://bridge-usage.webflow.io/',
			status: 'active',
			installed: true,
			lastEvent: 'validation_submit',
			rawBridgeTokenStored: false
		}));
		expect(usagePayload.items[0].latestResult.passed).toBe(true);
		expect(usagePayload.items[0].eventCounts).toEqual(expect.objectContaining({
			install: 1,
			status: 1,
			submit: 1
		}));
		expect(JSON.stringify(usagePayload)).not.toContain(installPayload.bridgeToken);
	});

	it('marks latest Validator result as failed when errors or failed categories remain', async () => {
		await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com'
				},
				body: JSON.stringify({
					siteId: 'site_latest_failed_result',
					siteName: 'Latest Failed Result',
					validationResults: {
						summary: { totalErrors: 1, totalWarnings: 0, passedCategories: 3, failedCategories: 1 },
						categories: [
							{
								category: 'Assets & Images',
								passed: false,
								issues: [{ severity: 'error', message: 'Image exceeds the maximum size.' }]
							},
							{
								category: 'Page Structure',
								passed: true,
								issues: [{ severity: 'warning', message: 'Some pages need title-case names.' }]
							}
						]
					}
				})
			}),
			{} as any,
			createExecutionContext()
		);

		const latestResponse = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submission/latest?siteId=site_latest_failed_result', {
				method: 'GET',
				headers: {
					Origin: 'https://webflow.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);

		expect(latestResponse.status).toBe(200);
		const payload = await latestResponse.json() as any;
		expect(payload.passed).toBe(false);
		expect(payload.summary.failedCategories).toBe(1);
		expect(payload.summary.totalErrors).toBe(1);
		expect(payload.failedCategoryDetails).toEqual([
			{
				category: 'Assets & Images',
				passed: false,
				issues: [{ severity: 'error', message: 'Image exceeds the maximum size.' }]
			}
		]);
		expect(payload.warningCategoryDetails).toEqual([
			{
				category: 'Page Structure',
				passed: true,
				issues: [{ severity: 'warning', message: 'Some pages need title-case names.' }]
			}
		]);
	});

	it('returns missing when no latest Validator result has been submitted', async () => {
		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submission/latest?siteId=site_no_latest_result', {
				method: 'GET',
				headers: {
					Origin: 'https://webflow.com'
				}
			}),
			{} as any,
			createExecutionContext()
		);

		expect(response.status).toBe(404);
		const payload = await response.json() as any;
		expect(payload.status).toBe('missing');
		expect(payload.rawBridgeTokenStored).toBe(false);
	});

	it('accepts submissions for sites that are not in Airtable without failing the client flow', async () => {
		const fetchMock = vi.fn(async () =>
			new Response(JSON.stringify({ records: [] }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		vi.stubGlobal('fetch', fetchMock);

		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com',
					'CF-Connecting-IP': '203.0.113.20'
				},
				body: JSON.stringify({
					siteId: 'site_missing_record',
					siteName: 'Missing Record',
					validationResults: {
						url: 'https://example.com',
						summary: { totalErrors: 2, totalWarnings: 1, passedCategories: 3, failedCategories: 1 },
						categories: []
					}
				})
			}),
			{ AIRTABLE_API_KEY: 'test_airtable_key' } as any,
			createExecutionContext()
		);

		expect(response.status).toBe(200);
		const payload = await response.json() as any;
		expect(payload.accepted).toBe(true);
		expect(payload.persisted).toBe(false);
		expect(payload.reason).toBe('record_not_found');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('persists sanitized validation result artifacts when R2 binding is configured', async () => {
		const putMock = vi.fn(async () => undefined);

		const response = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com',
					'CF-Connecting-IP': '203.0.113.22'
				},
				body: JSON.stringify({
					siteId: 'site_artifact',
					siteName: 'Artifact Site',
					siteUrl: 'https://artifact.example.com',
					validationResults: {
						url: 'https://artifact.example.com',
						summary: { totalErrors: 1, totalWarnings: 0, passedCategories: 1, failedCategories: 1 },
						categories: [
							{
								category: 'Assets & Images',
								passed: false,
								issues: [
									{
										severity: 'error',
										message: 'Oversized asset found',
										details: { bridgeToken: 'wfbt_should_not_persist' }
									}
								]
							}
						]
					}
				})
			}),
			{
				VALIDATOR_RESULT_ARTIFACTS: { put: putMock }
			} as any,
			createExecutionContext()
		);

		expect(response.status).toBe(200);
		const payload = await response.json() as any;
		expect(payload.accepted).toBe(true);
		expect(payload.persisted).toBe(false);
		expect(payload.reason).toBe('airtable_not_configured');
		expect(payload.artifact.persisted).toBe(true);
		expect(payload.artifact.key).toContain('validator-app-results/site=site_artifact/');
		expect(payload.artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
		expect(putMock).toHaveBeenCalledTimes(1);

		const [key, body, options] = putMock.mock.calls[0];
		expect(key).toContain('validator-app-results/site=site_artifact/');
		expect(options.httpMetadata.contentType).toBe('application/json');
		expect(options.customMetadata.siteId).toBe('site_artifact');
		expect(body).not.toContain('wfbt_should_not_persist');
		expect(body).toContain('"raw_bridge_token_stored": false');
		expect(body).toContain('Oversized asset found');
	});

	it('rate limits repeated submissions per site', async () => {
		const responseOne = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com',
					'CF-Connecting-IP': '203.0.113.21'
				},
				body: JSON.stringify({
					siteId: 'site_rate_limit',
					validationResults: {
						summary: { totalErrors: 0, totalWarnings: 0, passedCategories: 1, failedCategories: 0 },
						categories: []
					}
				})
			}),
			{
				VALIDATION_SUBMIT_MAX_PER_WINDOW: '2',
				VALIDATION_SUBMIT_WINDOW_MS: '600000'
			} as any,
			createExecutionContext()
		);

		const responseTwo = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com',
					'CF-Connecting-IP': '203.0.113.21'
				},
				body: JSON.stringify({
					siteId: 'site_rate_limit',
					validationResults: {
						summary: { totalErrors: 0, totalWarnings: 0, passedCategories: 1, failedCategories: 0 },
						categories: []
					}
				})
			}),
			{
				VALIDATION_SUBMIT_MAX_PER_WINDOW: '2',
				VALIDATION_SUBMIT_WINDOW_MS: '600000'
			} as any,
			createExecutionContext()
		);

		const responseThree = await worker.fetch(
			new Request('https://validation-worker.createsomething.workers.dev/app-validator/submit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Origin: 'https://app.webflow.com',
					'CF-Connecting-IP': '203.0.113.21'
				},
				body: JSON.stringify({
					siteId: 'site_rate_limit',
					validationResults: {
						summary: { totalErrors: 0, totalWarnings: 0, passedCategories: 1, failedCategories: 0 },
						categories: []
					}
				})
			}),
			{
				VALIDATION_SUBMIT_MAX_PER_WINDOW: '2',
				VALIDATION_SUBMIT_WINDOW_MS: '600000'
			} as any,
			createExecutionContext()
		);

		expect(responseOne.status).toBe(200);
		expect(responseTwo.status).toBe(200);
		expect(responseThree.status).toBe(429);
		const payload = await responseThree.json() as any;
		expect(payload.reason).toBe('rate_limited');
		expect(payload.limit.remaining).toBe(0);
	});
});

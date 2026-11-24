import { describe, expect, it } from 'vitest';
import { validateDesignerData } from '../src/validators/designer-validator';
import { generateContentIssues } from '../src/validators/content-validator';

const HOME = {
	id: 'home', name: 'Home', slug: '', type: 'Page', isHomePage: true, publishPath: '/',
	seo: { title: 'Acme - Webflow HTML website template', description: 'H'.repeat(155), openGraphImage: 'https://example.com/og.jpg' }
};

let pageCount = 0;
const page = (name: string, title: string, extra: Record<string, unknown> = {}) => {
	pageCount += 1;
	const slug = name.toLowerCase().replace(/\s+/g, '-');
	return {
		id: `p${pageCount}`, name, slug, type: 'Page', publishPath: `/${slug}`,
		// Each page gets its own description, so the duplicate check stays quiet.
		seo: { title, description: `${name} ${pageCount} `.padEnd(155, 'd') },
		...extra
	};
};

const seoCategory = (pages: unknown[]) =>
	validateDesignerData({ variables: { collections: [] }, components: [], styles: [], pages, assets: [] } as any)
		.then((result) => result.categories.find((c) => c.category === 'SEO Metadata')!);

const formatIssue = (category: Awaited<ReturnType<typeof seoCategory>>) =>
	category.issues.find((i) => i.id === 'seo.page-title-format');

describe('SEO title format on pages other than Home', () => {
	it.each([
		'About - Acme - Webflow HTML website template',
		'About – acme – webflow html website template',
		'Shop - Acme - Webflow Ecommerce website template',
		// A CMS template page: the Designer gives the field binding as written.
		'{{wf {&quot;path&quot;:&quot;name&quot;,&quot;type&quot;:&quot;PlainText&quot;\\} }} - Acme - Webflow HTML website template'
	])('accepts %j', async (title) => {
		const category = await seoCategory([HOME, page('About', title)]);
		expect(formatIssue(category)).toBeUndefined();
	});

	it.each([
		'About | Acme',
		'About | Acme - Webflow HTML website template',
		'About - Webflow HTML website template',
		'About - Acme Webflow Website Template',
		'About - Other Template - Webflow HTML website template'
	])('warns on %j', async (title) => {
		const category = await seoCategory([HOME, page('About', title)]);
		const issue = formatIssue(category);
		expect(issue?.severity).toBe('warning');
		expect(issue?.details?.pages).toEqual([`About (/about): "${title}"`]);
		expect(issue?.message).toBe('1 page(s) other than Home do not follow the SEO title format.');
	});

	it('does not block the submission', async () => {
		const category = await seoCategory([HOME, page('About', 'About | Acme')]);
		expect(category.passed).toBe(true);
		expect(category.issues.filter((i) => i.severity === 'error')).toEqual([]);
	});

	it('names the template and the suffix of the Home title in the fix', async () => {
		const html = formatIssue(await seoCategory([HOME, page('About', 'About | Acme')]));
		expect(html?.howToFix).toContain('"{Page Name} - Acme - Webflow HTML website template"');

		const ecommerceHome = { ...HOME, seo: { ...HOME.seo, title: 'Acme Store - Webflow Ecommerce website template' } };
		const ecommerce = formatIssue(await seoCategory([ecommerceHome, page('Cart', 'Cart | Acme Store')]));
		expect(ecommerce?.howToFix).toContain('"{Page Name} - Acme Store - Webflow Ecommerce website template"');
	});

	it.each(['Home One | Acme', 'Home - Acme', 'Home V1 - Acme'])('does not put the Home label of "%s" in the template name', async (homeName) => {
		const prefixedHome = { ...HOME, seo: { ...HOME.seo, title: `${homeName} - Webflow HTML website template` } };
		const category = await seoCategory([
			prefixedHome,
			page('About', 'About - Acme - Webflow HTML website template'),
			page('Contact', 'Contact | Acme - Webflow HTML website template')
		]);
		const issue = formatIssue(category);
		expect(issue?.details?.pages).toEqual(['Contact (/contact): "Contact | Acme - Webflow HTML website template"']);
		expect(issue?.howToFix).toContain('"{Page Name} - Acme - Webflow HTML website template"');
	});

	it('keeps a separator that is part of the template name', async () => {
		const home = { ...HOME, seo: { ...HOME.seo, title: 'Acme - Studio - Webflow HTML website template' } };
		const category = await seoCategory([
			home,
			page('About', 'About - Acme - Studio - Webflow HTML website template'),
			page('Contact', 'Contact - Studio - Webflow HTML website template')
		]);
		const issue = formatIssue(category);
		expect(issue?.details?.pages).toEqual(['Contact (/contact): "Contact - Studio - Webflow HTML website template"']);
		expect(issue?.howToFix).toContain('"{Page Name} - Acme - Studio - Webflow HTML website template"');
	});

	it('judges CMS template pages, utility pages and the 404 page', async () => {
		const category = await seoCategory([
			HOME,
			page('Blog Posts Template', 'Only the post name', { isCmsTemplate: true, collectionId: 'c1' }),
			page('Licenses', 'Licenses | Acme'),
			page('404', 'Not Found')
		]);
		expect(formatIssue(category)?.details?.pages).toHaveLength(3);
	});

	it('shows a CMS field binding as "{CMS field}" in the page list', async () => {
		const bound = '{{wf {&quot;path&quot;:&quot;name&quot;,&quot;type&quot;:&quot;PlainText&quot;\\} }} | Acme';
		const issue = formatIssue(await seoCategory([HOME, page('Posts Template', bound, { isCmsTemplate: true, collectionId: 'c1' })]));
		expect(issue?.details?.pages).toEqual(['Posts Template (/posts-template): "{CMS field} | Acme"']);
	});

	it('lists at most 10 pages and counts all of them', async () => {
		const pages = Array.from({ length: 12 }, (_, index) => page(`Page ${index}`, `Page ${index} | Acme`));
		const issue = formatIssue(await seoCategory([HOME, ...pages]));
		expect(issue?.message).toBe('12 page(s) other than Home do not follow the SEO title format.');
		expect(issue?.details?.pages).toHaveLength(10);
	});

	it('does not judge a page with no title, a draft page, or the Home page', async () => {
		const category = await seoCategory([
			HOME,
			page('About', ''),
			page('Draft', 'Draft | Acme', { isDraft: true })
		]);
		expect(formatIssue(category)).toBeUndefined();
	});

	it('gives no finding when the Home title is not in the Home format', async () => {
		const badHome = { ...HOME, seo: { ...HOME.seo, title: 'Acme | Agency' } };
		const category = await seoCategory([badHome, page('About', 'About | Acme')]);
		expect(category.issues.find((i) => i.id === 'seo.home-title-format')?.severity).toBe('error');
		expect(formatIssue(category)).toBeUndefined();
	});
});

describe('title length limit and the required title format', () => {
	const longFormatTitle = 'Frequently Asked Questions - Acme Studio - Webflow HTML website template';
	const longHome = { ...HOME, seo: { ...HOME.seo, title: 'Acme Studio - Webflow HTML website template' } };

	it('does not warn on a title longer than 60 characters that is in the required format (Designer data)', async () => {
		expect(longFormatTitle.length).toBeGreaterThan(60);
		const category = await seoCategory([longHome, page('FAQ', longFormatTitle)]);
		expect(category.issues.find((i) => i.id === 'seo.title-too-long')).toBeUndefined();
	});

	it('still warns on a long title that is not in the required format (Designer data)', async () => {
		const title = 'Frequently Asked Questions About Our Studio And Services | Acme Studio';
		const category = await seoCategory([longHome, page('FAQ', title)]);
		expect(category.issues.find((i) => i.id === 'seo.title-too-long')?.details?.pages).toEqual(['FAQ (/faq)']);
	});

	const publishedPage = (path: string, title: string) => ({
		url: `https://example.com${path}`,
		title,
		hasLoremIpsum: false,
		headingHierarchy: { h1Count: 1, hasSkippedLevels: false, structure: [] },
		imageCount: 0,
		imagesWithoutAlt: 0,
		seo: {
			title,
			titleLength: title.length,
			metaDescription: 'x'.repeat(155),
			metaDescriptionLength: 155,
			hasValidTitle: true,
			hasValidDescription: true,
			openGraph: { title: 'og', description: 'og', image: 'og.jpg', url: null },
			twitterCard: { title: null, description: null, image: null },
			canonical: null,
			robots: null
		}
	});
	const seoOnly = { lorem: false, headings: false, altText: false, seo: true, links: false, contentQuality: false };

	it('applies the same rule to published pages', () => {
		const other = 'Frequently Asked Questions About Our Studio And Services | Acme Studio';
		const issues = generateContentIssues([publishedPage('/faq', longFormatTitle), publishedPage('/faq-2', other)] as any, seoOnly);
		const long = issues.filter((i) => i.id.startsWith('title-too-long'));
		expect(long.map((i) => i.location)).toEqual(['https://example.com/faq-2']);
	});
});

describe('meta description length', () => {
	it('is a warning and never blocks (Designer data)', async () => {
		const short = { ...page('About', 'About - Acme - Webflow HTML website template'), seo: { title: 'About - Acme - Webflow HTML website template', description: 'A short description.' } };
		const category = await seoCategory([HOME, short]);
		expect(category.issues.find((i) => i.id === 'seo.description-too-short')?.severity).toBe('warning');
		expect(category.passed).toBe(true);
	});
});

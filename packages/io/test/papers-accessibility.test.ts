import { readdirSync } from 'node:fs';
import { isIoResearchSurface } from '../src/lib/config/researchSurface';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import Page from '../src/routes/papers/+page.svelte';

// Supply the request URL normally provided by SvelteKit to Canon SEO.
vi.mock('$app/stores', async () => {
	const { readable } = await import('svelte/store');
	return { page: readable({ url: new URL('https://createsomething.io/papers') }) };
});

const data = {
	user: null,
	turnstileSiteKey: '',
	papers: [],
	meta: { title: 'Research Papers', description: 'Research index', keywords: [] }
};

describe('paper index accessibility before hydration', () => {
	it('exposes the initial category and order selections', () => {
		const { body } = render(Page, { props: { data } });
		expect(body).toContain('aria-label="Paper category"');
		expect(body).toContain('aria-label="Paper order"');
		expect(body.match(/aria-pressed="true"/g)).toHaveLength(2);
		expect(body.match(/aria-pressed="false"/g)).toHaveLength(5);
		expect(body).toMatch(/<button[^>]*aria-pressed="true"[^>]*>\s*All\s*<\/button>/);
		expect(body).toMatch(/<button[^>]*aria-pressed="true"[^>]*>\s*Newest\s*<\/button>/);
	});

	it('provides a persistent polite result status and empty-state recovery', () => {
		const { body } = render(Page, { props: { data } });
		expect(body).toMatch(/<p[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
		expect(body).toContain('0 papers');
		expect(body).toContain('No papers');
	});
});

describe('public research presentation boundary', () => {
	it.each([
		['/categories', '/categories'],
		['/contact', '/contact'],
		['/subscribe', '/subscribe'],
		['/privacy', '/privacy'],
		['/terms', '/terms'],
		['/docs', '/docs'],
		['/docs/ground', '/docs/ground'],
		['/docs/loom', '/docs/loom'],
		['/agents', '/agents'],
		['/agents/research', '/agents/[slug]'],
		['/mcp', '/mcp'],
		['/mcp/ground', '/mcp/[slug]'],
		['/category/research', '/category/[slug]'],
		['/category/not-yet-published', '/category/[slug]'],
		['/papers', '/papers'],
		['/papers/endpoint-construction-product', '/papers/[slug]'],
		['/papers/threshold-dwelling', '/papers/threshold-dwelling'],
		['/experiments', '/experiments'],
		['/experiments/agent-continuity', '/experiments/[slug]'],
		['/plugins', '/plugins'],
		['/plugins/canon', '/plugins/[slug]'],
		['/newsletters', '/newsletters'],
		['/newsletters/field-note', '/newsletters/[slug]']
	])('includes reading collection/detail %s', (pathname, routeId) => {
		expect(isIoResearchSurface(pathname, routeId)).toBe(true);
	});

	it('keeps every checked-in named experiment route outside the article shell', () => {
		const namedRoutes = readdirSync(new URL('../src/routes/experiments/', import.meta.url), {
			withFileTypes: true
		}).filter((entry) => entry.isDirectory() && !entry.name.startsWith('['));
		expect(namedRoutes.length).toBeGreaterThan(0);
		for (const route of namedRoutes) {
			const path = `/experiments/${route.name}`;
			expect(isIoResearchSurface(path, path), path).toBe(false);
		}
	});

	it.each([
		'/login', '/account', '/admin', '/admin/experiments', '/auth/callback',
		'/auth/cross-domain', '/check-in', '/confirm', '/unsubscribe',
		'/status',
		'/insights/tool-betrayal', '/visualizations/arena-scale'
	])('preserves the separate surface %s', (pathname) => {
		expect(isIoResearchSurface(pathname, pathname)).toBe(false);
	});

	it('uses the matched category route, not a broad pathname prefix', () => {
		expect(isIoResearchSurface('/category/research', null)).toBe(false);
		expect(isIoResearchSurface('/category/research', '/category/tool')).toBe(false);
	});
});

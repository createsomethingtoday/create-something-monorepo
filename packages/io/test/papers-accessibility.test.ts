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

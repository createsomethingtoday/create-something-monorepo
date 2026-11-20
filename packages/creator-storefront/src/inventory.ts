import { StorefrontError } from './errors';
import type { TemplateInventory } from './ports';

/**
 * Presence check against live template-search inventory, used at publish.
 * Ownership comes from Airtable; this only answers "is the template listed
 * right now". How fresh template-search is has not been measured, so a
 * "present" answer is not a freshness guarantee (CONTRACT.md §7).
 */
export class TemplateSearchInventory implements TemplateInventory {
	constructor(
		private readonly baseUrl: string,
		private readonly fetchImpl: typeof fetch = (input, init) => fetch(input, init),
		private readonly timeoutMs = 5000
	) {}

	/** Checks every slug in parallel (callers pass at most 3). Any failure fails the whole check. */
	async presentSlugs(templateSlugs: string[]): Promise<Set<string>> {
		const unique = [...new Set(templateSlugs)];
		const results = await Promise.all(unique.map(async (slug) => ((await this.isPresent(slug)) ? slug : null)));
		return new Set(results.filter((slug): slug is string => slug !== null));
	}

	private async isPresent(slug: string): Promise<boolean> {
		const url = new URL('/api/templates/search', this.baseUrl);
		url.searchParams.set('template_slug', slug);
		url.searchParams.set('page_size', '5');
		let response: Response;
		try {
			response = await this.fetchImpl(url.toString(), { signal: AbortSignal.timeout(this.timeoutMs) });
		} catch (error) {
			throw new StorefrontError('upstream_unavailable', 'Template inventory is unreachable', { cause: error });
		}
		if (!response.ok) {
			throw new StorefrontError('upstream_unavailable', `Template inventory returned ${response.status}`);
		}
		const body = (await response.json().catch(() => null)) as { items?: Array<{ template_slug?: string }> } | null;
		if (!body || !Array.isArray(body.items)) {
			throw new StorefrontError('upstream_unavailable', 'Template inventory returned an unexpected body');
		}
		return body.items.some((item) => item.template_slug === slug);
	}
}

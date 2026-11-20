import { describe, expect, it } from 'vitest';
import { extractSEOData } from '../src/validators/content-validator';
import { parseHTMLWorker } from '../src/utils/fetch-utils';

const page = (title: string, description: string) =>
	parseHTMLWorker(`<html><head><title>${title}</title><meta content="${description}" name="description"/></head><body></body></html>`);

describe('SEO title and description lengths', () => {
	it('counts HTML entities as the single character they render as', () => {
		const title = 'News &amp; Insights | Example:OS - Webflow HTML website template';
		const description =
			'Follow what&#x27;s new in Example:OS. Explore template updates, design improvements, new components, and release notes as the Webflow experience evolves over time.';
		const seo = extractSEOData(page(title, description));

		expect(seo.title).toBe('News & Insights | Example:OS - Webflow HTML website template');
		expect(seo.titleLength).toBe(60);
		expect(seo.hasValidTitle).toBe(true);
		expect(seo.metaDescriptionLength).toBe(158);
		expect(seo.hasValidDescription).toBe(true);
	});

	it('decodes decimal entities and leaves unknown named entities as written', () => {
		const seo = extractSEOData(page('It&#39;s &unknown; here', 'x'));
		expect(seo.title).toBe("It's &unknown; here");
	});
});

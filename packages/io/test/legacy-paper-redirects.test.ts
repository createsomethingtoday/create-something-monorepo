import { describe, expect, it } from 'vitest';

import { load } from '../src/routes/papers/[slug]/+page.server';

const legacyPaperRedirects = [
	['ascii-renderer', '/experiments/ascii-renderer'],
	['ai-native-filtering', '/experiments/ai-native-filtering'],
	['webflow-analyzer-lineage', '/experiments/webflow-analyzer-lineage']
] as const;

describe('legacy paper experiment routes', () => {
	for (const [slug, location] of legacyPaperRedirects) {
		it(`permanently redirects /papers/${slug} to ${location}`, async () => {
			const event = { params: { slug } } as unknown as Parameters<typeof load>[0];

			await expect(load(event)).rejects.toMatchObject({ status: 301, location });
		});
	}
});

/**
 * Products and Services Data
 *
 * Minimal data file for the MCP-first pivot.
 * Products (Ground, Loom) are tools for builders.
 */

export interface Product {
	id: string;
	title: string;
	description: string;
	pricing: string;
	timeline: string;
	stripeProductId?: string;
	stripePriceId?: string;
}

export const products: Product[] = [
	{
		id: 'ground',
		title: 'Ground',
		description:
			'Code verification infrastructure. Catch hallucinations before they reach production.',
		pricing: 'Free',
		timeline: 'Instant setup'
	},
	{
		id: 'loom',
		title: 'Loom',
		description:
			'Agent-native issue tracking. AI coordination that persists across sessions.',
		pricing: 'Free',
		timeline: 'Instant setup'
	}
];

/**
 * Get a product by its slug/id
 */
export function getOfferingBySlug(slug: string): Product | undefined {
	return products.find((p) => p.id === slug);
}

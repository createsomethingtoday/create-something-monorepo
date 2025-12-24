/**
 * Taste Page Server
 *
 * Loads curated visual references from Are.na sync.
 * Human curation → structured canon.
 */

import type { PageServerLoad } from './$types';
import type { Example, Resource } from '$lib/types';

interface Channel {
	slug: string;
	name: string;
	description: string;
	isPrimary: boolean;
}

// Channel metadata for display
const CHANNELS: Channel[] = [
	{
		slug: 'canon-minimalism',
		name: 'Canon Minimalism',
		description: 'Core visual vocabulary',
		isPrimary: true
	},
	{
		slug: 'motion-language',
		name: 'Motion Language',
		description: 'Animation and transition examples',
		isPrimary: true
	},
	{
		slug: 'people-dieter-rams',
		name: 'Dieter Rams',
		description: 'Rams artifacts and products',
		isPrimary: false
	},
	{
		slug: 'examples-swiss-design',
		name: 'Swiss Design',
		description: 'International typographic style',
		isPrimary: false
	},
	{
		slug: 'interfaces-motion',
		name: 'Interface Motion',
		description: 'UI animation patterns',
		isPrimary: false
	},
	{
		slug: 'minimal-modern-web',
		name: 'Minimal Web',
		description: 'Contemporary minimalist sites',
		isPrimary: false
	},
	{
		slug: 'clean-mymjklzsah4',
		name: 'Clean',
		description: 'Clean and clear minimalist design',
		isPrimary: false
	},
	{
		slug: 'minimalism-cpx4fblmr3i',
		name: 'Minimalism',
		description: 'Minimalist design references',
		isPrimary: false
	}
];

const MASTER_ID = 'arena-taste';

export const load: PageServerLoad = async ({ platform, parent }) => {
	const { user } = await parent();
	const db = platform?.env?.DB;

	if (!db) {
		return {
			examples: [],
			resources: [],
			channels: CHANNELS,
			stats: { examples: 0, resources: 0, lastSync: null },
			user
		};
	}

	try {
		const [examplesResult, resourcesResult] = await Promise.all([
			db
				.prepare(
					`SELECT * FROM examples
					 WHERE master_id = ?
					 ORDER BY created_at DESC`
				)
				.bind(MASTER_ID)
				.all<Example>(),
			db
				.prepare(
					`SELECT * FROM resources
					 WHERE master_id = ?
					 ORDER BY created_at DESC`
				)
				.bind(MASTER_ID)
				.all<Resource>()
		]);

		const examples = examplesResult.results || [];
		const resources = resourcesResult.results || [];

		return {
			examples,
			resources,
			channels: CHANNELS,
			stats: {
				examples: examples.length,
				resources: resources.length,
				lastSync: examples[0]?.created_at || resources[0]?.created_at || null
			},
			user
		};
	} catch (error) {
		console.error('Error loading taste references:', error);
		return {
			examples: [],
			resources: [],
			channels: CHANNELS,
			stats: { examples: 0, resources: 0, lastSync: null },
			user
		};
	}
};

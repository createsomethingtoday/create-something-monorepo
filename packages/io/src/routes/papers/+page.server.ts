/**
 * Research Papers List - Server Load
 *
 * Papers represent the Vorhandenheit (present-at-hand) mode of research:
 * theoretical analysis that DESCRIBES the hermeneutic circle.
 *
 * Distinguished from experiments which DEMONSTRATE the circle.
 *
 * Auto-discovers papers from ./[slug]/meta.ts files.
 */

import type { PageServerLoad } from './$types';
import type { PaperMeta } from './types';

// Auto-discover all papers with meta.ts files
const paperModules = import.meta.glob<{ meta: PaperMeta }>('./*/meta.ts', { eager: true });

// Extract metadata and sort by date (newest first)
const papers: PaperMeta[] = Object.values(paperModules)
	.map((mod) => mod.meta)
	.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const load: PageServerLoad = async () => {
	return {
		papers,
		meta: {
			title: 'Research Papers',
			description:
				'Formal research applying phenomenology, hermeneutics, and design philosophy to AI-native development.',
			keywords: [
				'research',
				'phenomenology',
				'hermeneutics',
				'Heidegger',
				'LLM',
				'AI development'
			]
		}
	};
};

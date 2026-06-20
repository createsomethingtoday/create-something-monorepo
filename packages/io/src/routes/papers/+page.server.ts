/**
 * Research Papers List - Server Load
 *
 * Papers represent the Vorhandenheit (present-at-hand) mode of research:
 * theoretical analysis that DESCRIBES the hermeneutic circle.
 *
 * Distinguished from experiments which DEMONSTRATE the circle.
 *
 * Auto-discovers papers from ./[slug]/meta.ts files and file-based paper config.
 */

import type { PageServerLoad } from './$types';
import { getPublishedPaperMetas } from '$lib/config/paperCatalog';

const papers = getPublishedPaperMetas();

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

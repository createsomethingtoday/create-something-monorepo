/**
 * Research Papers List - Server Load
 *
 * Papers represent the Vorhandenheit (present-at-hand) mode of research:
 * theoretical analysis that DESCRIBES the hermeneutic circle.
 *
 * Distinguished from experiments which DEMONSTRATE the circle.
 */

import type { PageServerLoad } from './$types';
import { getFileBasedPapers } from '$lib/config/fileBasedPapers';

export const load: PageServerLoad = async () => {
	const papers = getFileBasedPapers();

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

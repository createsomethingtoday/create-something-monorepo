/**
 * Motion Ontology Experiment - Server Load
 *
 * Loads corpus data and experiment metadata.
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	// For now, return empty corpus - will be populated as analyses are saved
	return {
		corpus: [],
		stats: {
			totalEntries: 0,
			byJudgment: { functional: 0, decorative: 0, ambiguous: 0 },
			byMode: { zuhandenheit: 0, vorhandenheit: 0 },
			byDisclosure: {
				state_transition: 0,
				spatial_relationship: 0,
				user_confirmation: 0,
				hierarchy_reveal: 0,
				temporal_sequence: 0,
				none: 0
			}
		}
	};
};

/**
 * Redirect from old experiment URL to new paper URL
 * kickstand-triad-audit was reclassified as a Paper (Vorhandenheit)
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	redirect(301, '/papers/kickstand-triad-audit');
};

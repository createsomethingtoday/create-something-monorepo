/**
 * Redirect from old experiment URL to new paper URL
 * understanding-graphs was reclassified as a Paper (Vorhandenheit)
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	redirect(301, '/papers/understanding-graphs');
};

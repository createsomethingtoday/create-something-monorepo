import { loadPublicStatus } from '$lib/status/source.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => ({
	status: await loadPublicStatus(fetch)
});

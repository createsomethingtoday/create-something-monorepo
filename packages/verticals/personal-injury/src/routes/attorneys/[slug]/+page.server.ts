/**
 * Attorney Detail Page Server Load
 * Validates attorney slug and returns data
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { siteConfig } from '$lib/config/site';

export const load: PageServerLoad = async ({ params }) => {
	const attorney = siteConfig.attorneys.find((a) => a.slug === params.slug);

	if (!attorney) {
		throw error(404, 'Attorney not found');
	}

	return {
		attorney,
		accidentTypes: siteConfig.accidentTypes
	};
};

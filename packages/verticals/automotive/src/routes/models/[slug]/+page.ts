import { error } from '@sveltejs/kit';
import { getVehicleBySlug } from '$lib/config/site';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const vehicle = getVehicleBySlug(params.slug);

	if (!vehicle) {
		throw error(404, {
			message: 'Vehicle not found'
		});
	}

	return {
		vehicle
	};
};

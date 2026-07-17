import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolveCustomerMapScope } from '$lib/server/customer-map-context';
import {
	createCustomerMapWorkspace,
	createD1CustomerMapRepository,
	CustomerMapAccessError
} from '$lib/server/customer-map-workspace';

export const load: PageServerLoad = async ({ platform, parent, params }) => {
	const { user } = await parent();
	if (!user?.id || !user.email) throw redirect(303, `/login?redirect=/map/workspace/${params.mapId}`);
	const db = platform?.env?.DB;
	if (!db) throw error(503, 'Map workspace database is unavailable');
	try {
		const scope = await resolveCustomerMapScope({ platform, user });
		const workspace = createCustomerMapWorkspace({ repository: createD1CustomerMapRepository(db) });
		return { handoff: await workspace.getBuildHandoff(scope, params.mapId, params.handoffId) };
	} catch (cause) {
		if (cause instanceof CustomerMapAccessError) throw error(404, cause.message);
		throw cause;
	}
};

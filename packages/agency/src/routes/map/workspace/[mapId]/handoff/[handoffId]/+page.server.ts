import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { resolveCustomerMapScope } from '$lib/server/customer-map-context';
import {
	createCustomerMapWorkspace,
	createD1CustomerMapRepository,
	CustomerMapAccessError,
	CustomerMapConflictError,
	CustomerMapValidationError
} from '$lib/server/customer-map-workspace';

function requireDatabase(platform: App.Platform | undefined): D1Database {
	const db = platform?.env?.DB;
	if (!db) throw error(503, 'Map workspace database is unavailable');
	return db;
}

export const load: PageServerLoad = async ({ platform, parent, params }) => {
	const { user } = await parent();
	if (!user?.id || !user.email) throw redirect(303, `/login?redirect=/map/workspace/${params.mapId}`);
	try {
		const scope = await resolveCustomerMapScope({ platform, user });
		const workspace = createCustomerMapWorkspace({ repository: createD1CustomerMapRepository(requireDatabase(platform)) });
		return { handoff: await workspace.getBuildHandoff(scope, params.mapId, params.handoffId) };
	} catch (cause) {
		if (cause instanceof CustomerMapAccessError) throw error(404, cause.message);
		throw cause;
	}
};

export const actions: Actions = {
	cancel: async ({ locals, params, platform, request }) => {
		if (!locals.user?.id || !locals.user.email) return fail(401, { message: 'Authentication required' });
		const data = await request.formData();
		try {
			const scope = await resolveCustomerMapScope({ platform, user: locals.user });
			const workspace = createCustomerMapWorkspace({
				repository: createD1CustomerMapRepository(requireDatabase(platform))
			});
			await workspace.cancelBuildHandoff(scope, params.mapId, params.handoffId, {
				note: String(data.get('note') ?? '')
			});
			return { success: true, message: 'Build handoff cancelled.' };
		} catch (cause) {
			if (cause instanceof CustomerMapAccessError) throw error(404, cause.message);
			if (cause instanceof CustomerMapConflictError) return fail(409, { message: cause.message });
			if (cause instanceof CustomerMapValidationError) return fail(400, { message: cause.message });
			throw cause;
		}
	}
};

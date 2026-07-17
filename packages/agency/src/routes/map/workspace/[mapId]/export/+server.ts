import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveCustomerMapScope } from '$lib/server/customer-map-context';
import {
	createCustomerMapWorkspace,
	createD1CustomerMapRepository,
	CustomerMapAccessError
} from '$lib/server/customer-map-workspace';

export const GET: RequestHandler = async ({ platform, locals, params }) => {
	if (!locals.user?.id || !locals.user.email) throw redirect(303, `/login?redirect=/map/workspace/${params.mapId}`);
	const db = platform?.env?.DB;
	if (!db) throw error(503, 'Map workspace database is unavailable');
	try {
		const scope = await resolveCustomerMapScope({ platform, user: locals.user });
		const workspace = createCustomerMapWorkspace({ repository: createD1CustomerMapRepository(db) });
		const payload = await workspace.export(scope, params.mapId);
		return new Response(JSON.stringify(payload, null, 2), {
			headers: {
				'content-type': 'application/json; charset=utf-8',
				'content-disposition': `attachment; filename="map-${params.mapId}-v${payload.map.currentVersion}.json"`,
				'cache-control': 'private, no-store'
			}
		});
	} catch (cause) {
		if (cause instanceof CustomerMapAccessError) throw error(404, cause.message);
		throw cause;
	}
};

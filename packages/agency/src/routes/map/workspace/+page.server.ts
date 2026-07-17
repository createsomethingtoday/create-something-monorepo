import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createPublicAtlasCanvas, normalizePublicAtlasCanvas } from '$lib/atlas/public';
import { resolveCustomerMapScope } from '$lib/server/customer-map-context';
import {
	createCustomerMapWorkspace,
	createD1CustomerMapRepository,
	CustomerMapValidationError
} from '$lib/server/customer-map-workspace';

function requireDatabase(platform: App.Platform | undefined): D1Database {
	const db = platform?.env?.DB;
	if (!db) throw error(503, 'Map workspace database is unavailable');
	return db;
}

export const load: PageServerLoad = async ({ parent, platform }) => {
	const { user } = await parent();
	if (!user?.id || !user.email) throw redirect(303, '/login?redirect=/map/workspace');
	const scope = await resolveCustomerMapScope({ platform, user });
	const workspace = createCustomerMapWorkspace({
		repository: createD1CustomerMapRepository(requireDatabase(platform))
	});
	return {
		maps: await workspace.list(scope),
		archivedMaps: await workspace.listArchived(scope),
		workspaceAccountId: scope.workspaceAccountId
	};
};

export const actions: Actions = {
	create: async ({ request, platform, locals }) => {
		if (!locals.user?.id || !locals.user.email) return fail(401, { message: 'Authentication required' });
		const form = await request.formData();
		const title = String(form.get('title') ?? '');
		const draft = String(form.get('canvas') ?? '').trim();
		let canvas = createPublicAtlasCanvas();
		if (draft) {
			try {
				canvas = normalizePublicAtlasCanvas(JSON.parse(draft));
			} catch {
				return fail(400, { message: 'The imported map must be valid JSON.' });
			}
		}

		try {
			const scope = await resolveCustomerMapScope({ platform, user: locals.user });
			const workspace = createCustomerMapWorkspace({
				repository: createD1CustomerMapRepository(requireDatabase(platform))
			});
			const created = await workspace.create(scope, { title, canvas });
			throw redirect(303, `/map/workspace/${created.map.id}`);
		} catch (cause) {
			if (cause instanceof CustomerMapValidationError) return fail(400, { message: cause.message });
			throw cause;
		}
	},
	recover: async ({ request, platform, locals }) => {
		if (!locals.user?.id || !locals.user.email) return fail(401, { message: 'Authentication required' });
		const form = await request.formData();
		const mapId = String(form.get('mapId') ?? '');
		try {
			const scope = await resolveCustomerMapScope({ platform, user: locals.user });
			const workspace = createCustomerMapWorkspace({
				repository: createD1CustomerMapRepository(requireDatabase(platform))
			});
			await workspace.recover(scope, mapId);
			return { success: true, message: 'Map recovered.' };
		} catch (cause) {
			if (cause instanceof CustomerMapValidationError) return fail(400, { message: cause.message });
			return fail(404, { message: 'That archived map is unavailable or its recovery window expired.' });
		}
	}
};

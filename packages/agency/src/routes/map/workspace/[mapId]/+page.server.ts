import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { normalizePublicAtlasCanvas } from '$lib/atlas/public';
import { resolveCustomerMapScope } from '$lib/server/customer-map-context';
import {
	createCustomerMapWorkspace,
	createD1CustomerMapRepository,
	CustomerMapAccessError,
	CustomerMapConflictError,
	CustomerMapValidationError,
	type CustomerMapReviewState
} from '$lib/server/customer-map-workspace';

function requireDatabase(platform: App.Platform | undefined): D1Database {
	const db = platform?.env?.DB;
	if (!db) throw error(503, 'Map workspace database is unavailable');
	return db;
}

function actionError(cause: unknown) {
	if (cause instanceof CustomerMapAccessError) throw error(404, cause.message);
	if (cause instanceof CustomerMapConflictError) return fail(409, { message: cause.message });
	if (cause instanceof CustomerMapValidationError) return fail(400, { message: cause.message });
	throw cause;
}

export const load: PageServerLoad = async ({ parent, platform, params, url }) => {
	const { user } = await parent();
	if (!user?.id || !user.email) throw redirect(303, `/login?redirect=/map/workspace/${params.mapId}`);
	const scope = await resolveCustomerMapScope({ platform, user });
	const workspace = createCustomerMapWorkspace({
		repository: createD1CustomerMapRepository(requireDatabase(platform))
	});
	try {
		const current = await workspace.get(scope, params.mapId);
		const history = await workspace.history(scope, params.mapId);
		const from = Number(url.searchParams.get('from'));
		const to = Number(url.searchParams.get('to'));
		const diff = Number.isInteger(from) && Number.isInteger(to)
			? await workspace.diff(scope, params.mapId, from, to)
			: null;
		return { ...current, history, diff };
	} catch (cause) {
		if (cause instanceof CustomerMapAccessError) throw error(404, cause.message);
		throw cause;
	}
};

export const actions: Actions = {
	save: async ({ request, platform, locals, params }) => {
		if (!locals.user?.id || !locals.user.email) return fail(401, { message: 'Authentication required' });
		const form = await request.formData();
		const expectedVersion = Number(form.get('expectedVersion'));
		const message = String(form.get('message') ?? '');
		let canvas;
		try {
			canvas = normalizePublicAtlasCanvas(JSON.parse(String(form.get('canvas') ?? '')));
		} catch {
			return fail(400, { message: 'Canvas must be valid JSON.' });
		}
		try {
			const scope = await resolveCustomerMapScope({ platform, user: locals.user });
			const workspace = createCustomerMapWorkspace({
				repository: createD1CustomerMapRepository(requireDatabase(platform))
			});
			await workspace.save(scope, params.mapId, { canvas, expectedVersion, message });
			return { success: true, message: 'New version saved.' };
		} catch (cause) {
			return actionError(cause);
		}
	},
	review: async ({ request, platform, locals, params }) => {
		if (!locals.user?.id || !locals.user.email) return fail(401, { message: 'Authentication required' });
		const form = await request.formData();
		const to = String(form.get('to') ?? '');
		if (!['draft', 'in_review', 'approved', 'changes_requested'].includes(to)) {
			return fail(400, { message: 'Invalid review transition.' });
		}
		try {
			const scope = await resolveCustomerMapScope({ platform, user: locals.user });
			const workspace = createCustomerMapWorkspace({
				repository: createD1CustomerMapRepository(requireDatabase(platform))
			});
			await workspace.review(scope, params.mapId, {
				to: to as CustomerMapReviewState,
				note: String(form.get('note') ?? '')
			});
			return { success: true, message: `Review state moved to ${to.replace('_', ' ')}.` };
		} catch (cause) {
			return actionError(cause);
		}
	},
	share: async ({ platform, locals, params, url }) => {
		if (!locals.user?.id || !locals.user.email) return fail(401, { message: 'Authentication required' });
		try {
			const scope = await resolveCustomerMapScope({ platform, user: locals.user });
			const workspace = createCustomerMapWorkspace({
				repository: createD1CustomerMapRepository(requireDatabase(platform))
			});
			const share = await workspace.share(scope, params.mapId);
			return {
				success: true,
				message: 'Read-only share created for the approved version.',
				shareUrl: `${url.origin}/map/share/${encodeURIComponent(share.token)}`
			};
		} catch (cause) {
			return actionError(cause);
		}
	},
	handoff: async ({ platform, locals, params, url }) => {
		if (!locals.user?.id || !locals.user.email) return fail(401, { message: 'Authentication required' });
		try {
			const scope = await resolveCustomerMapScope({ platform, user: locals.user });
			const workspace = createCustomerMapWorkspace({
				repository: createD1CustomerMapRepository(requireDatabase(platform))
			});
			const handoff = await workspace.prepareBuildHandoff(scope, params.mapId);
			return {
				success: true,
				message: `Build handoff prepared from version ${handoff.mapVersion}.`,
				handoffUrl: `${url.origin}/map/workspace/${params.mapId}/handoff/${handoff.handoffId}`
			};
		} catch (cause) {
			return actionError(cause);
		}
	},
	archive: async ({ platform, locals, params }) => {
		if (!locals.user?.id || !locals.user.email) return fail(401, { message: 'Authentication required' });
		try {
			const scope = await resolveCustomerMapScope({ platform, user: locals.user });
			const workspace = createCustomerMapWorkspace({
				repository: createD1CustomerMapRepository(requireDatabase(platform))
			});
			await workspace.archive(scope, params.mapId);
			throw redirect(303, '/map/workspace');
		} catch (cause) {
			return actionError(cause);
		}
	}
};

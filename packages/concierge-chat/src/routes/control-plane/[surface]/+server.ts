import { error, redirect } from '@sveltejs/kit';
import { buildAgencyControlPlaneUrl } from '$lib/server/control-plane';
import { isControlPlaneSurface } from '$lib/control-plane';
import type { RequestHandler } from './$types';

const redirectToControlPlane: RequestHandler = ({ params, url, platform }) => {
	if (!isControlPlaneSurface(params.surface)) {
		throw error(404, `Unknown control-plane surface: ${params.surface}`);
	}

	throw redirect(303, buildAgencyControlPlaneUrl(params.surface, url, platform).toString());
};

export const GET = redirectToControlPlane;
export const HEAD = redirectToControlPlane;

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildGovernanceProductCompositionManifest } from '../../../../lib/governance/product-manifest';

export const GET: RequestHandler = async () => {
	return json(buildGovernanceProductCompositionManifest(), {
		headers: {
			'Cache-Control': 'max-age=300'
		}
	});
};

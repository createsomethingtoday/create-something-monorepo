import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canonCorsHeaders } from '$lib/canon/control';
import { loadCanonWorkflowContext } from '$lib/canon/workflow-context';
import { resolveDeliveryFallback } from '$lib/delivery/contexts';

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 204, headers: canonCorsHeaders });
};

export const GET: RequestHandler = async ({ url, platform }) => {
	const contextId = url.searchParams.get('contextId');
	const context = await loadCanonWorkflowContext(
		platform?.env?.DB,
		contextId,
		resolveDeliveryFallback(contextId)
	);

	return json(context, {
		headers: {
			...canonCorsHeaders,
			'cache-control': 'no-store'
		}
	});
};

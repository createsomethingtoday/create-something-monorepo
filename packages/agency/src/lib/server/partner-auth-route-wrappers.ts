import type { RequestHandler } from '@sveltejs/kit';
import { HALF_DOZEN_PARTNER_KEY } from '$lib/server/partner-auth';

export function wrapHalfDozenPartnerRoute(
	handler: (event: Parameters<RequestHandler>[0]) => Response | Promise<Response>,
): RequestHandler {
	return (event) =>
		handler({
			...event,
			params: {
				...event.params,
				partnerKey: HALF_DOZEN_PARTNER_KEY,
			},
		});
}

/**
 * TEND Server Hooks
 *
 * Handles tenant resolution from URL.
 * In dev mode (no D1), uses demo tenant.
 */

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// In dev mode without D1, use a demo tenant object
	// In production with D1, this would resolve from database
	if (event.platform?.env?.DB) {
		try {
			const { getTenantBySlug } = await import('$lib/db/queries');
			const tenant = await getTenantBySlug(event.platform.env.DB, 'demo');
			event.locals.tenant = tenant;
		} catch {
			// D1 error - fall back to demo
			event.locals.tenant = {
				id: 'demo-tenant',
				name: 'Demo Workspace',
				slug: 'demo',
				tier: 'demo' as const,
				settings: {},
			};
		}
	} else {
		// Dev mode without D1 - use demo tenant
		event.locals.tenant = {
			id: 'demo-tenant',
			name: 'Demo Workspace',
			slug: 'demo',
			tier: 'demo' as const,
			settings: {},
		};
	}

	return resolve(event);
};

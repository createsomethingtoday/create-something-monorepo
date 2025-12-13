/**
 * Server Hooks - Response Header Modifications
 * Maverick X
 *
 * Allows iframe embedding for Webflow CMS admin at maverick-x-cms.webflow.io
 */

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Clone response to modify headers
	const newHeaders = new Headers(response.headers);

	// Remove X-Frame-Options to allow iframe embedding
	// The Content-Security-Policy frame-ancestors is the modern replacement
	newHeaders.delete('X-Frame-Options');

	// Set frame-ancestors to allow Webflow CMS
	newHeaders.set(
		'Content-Security-Policy',
		"frame-ancestors 'self' https://maverick-x-cms.webflow.io https://*.webflow.io https://webflow.com https://*.webflow.com"
	);

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders
	});
};

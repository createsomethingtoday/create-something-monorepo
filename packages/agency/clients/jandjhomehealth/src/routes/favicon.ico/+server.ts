import type { RequestHandler } from './$types';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#050505"/><path d="M18 18h28v28H18z" fill="none" stroke="#f8f8f5" stroke-width="5"/><path d="M32 13v38M13 32h38" stroke="#f8f8f5" stroke-width="5" stroke-linecap="square"/></svg>`;

export const GET: RequestHandler = () =>
	new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'public, max-age=604800'
		}
	});

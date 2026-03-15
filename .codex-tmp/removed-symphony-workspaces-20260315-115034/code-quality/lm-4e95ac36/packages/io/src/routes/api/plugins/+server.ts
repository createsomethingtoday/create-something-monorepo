import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PLUGINS } from '$lib/config/plugins';

export const GET: RequestHandler = async () => {
	return json({ plugins: PLUGINS });
};

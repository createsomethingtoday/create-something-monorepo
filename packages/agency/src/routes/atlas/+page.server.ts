import { redirect } from '@sveltejs/kit';

export function load(): never {
	throw redirect(308, '/map');
}


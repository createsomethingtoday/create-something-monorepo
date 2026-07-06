import type { PageLoad } from './$types';

const groups = new Set(['form', 'feedback', 'clear', 'navigation', 'data']);

export const load: PageLoad = ({ params }) => {
	const group = groups.has(params.group) ? params.group : 'form';
	return { group };
};

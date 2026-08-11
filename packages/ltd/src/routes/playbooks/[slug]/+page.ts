import { error } from '@sveltejs/kit';
import { getPlaybook } from '$lib/operator-library/playbooks';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const playbook = getPlaybook(params.slug);

	if (!playbook) error(404, 'Playbook not found');

	return { playbook };
};

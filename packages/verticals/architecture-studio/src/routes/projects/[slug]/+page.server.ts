import { error } from '@sveltejs/kit';
import { siteConfig } from '$lib/config/site';
import type { PageServerLoad, EntryGenerator } from './$types';

// Generate entries for prerendering all project pages
export const entries: EntryGenerator = () => {
	return siteConfig.projects.map((p) => ({ slug: p.slug }));
};

export const load: PageServerLoad = async ({ params }) => {
	const project = siteConfig.projects.find((p) => p.slug === params.slug);

	if (!project) {
		throw error(404, 'Project not found');
	}

	return { project };
};

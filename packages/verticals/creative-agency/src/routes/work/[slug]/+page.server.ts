import { error } from '@sveltejs/kit';
import { siteConfig } from '$lib/config/site';
import type { PageServerLoad, EntryGenerator } from './$types';

// Generate entries for prerendering all work pages
export const entries: EntryGenerator = () => {
	return siteConfig.work.map((p) => ({ slug: p.slug }));
};

export const load: PageServerLoad = async ({ params }) => {
	const project = siteConfig.work.find((p) => p.slug === params.slug);

	if (!project) {
		throw error(404, 'Case study not found');
	}

	return { project };
};

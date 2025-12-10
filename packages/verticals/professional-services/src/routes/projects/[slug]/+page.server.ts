import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { SiteConfig } from '$lib/config/site';

export const load: PageServerLoad = async ({ params, parent }) => {
	// Get site config from parent layout
	const parentData = await parent() as { siteConfig: SiteConfig };
	const { siteConfig } = parentData;

	const project = siteConfig.projects.find((p) => p.slug === params.slug);

	if (!project) {
		throw error(404, 'Project not found');
	}

	// Find adjacent projects for navigation
	const currentIndex = siteConfig.projects.findIndex((p) => p.slug === params.slug);
	const nextProject = siteConfig.projects[currentIndex + 1] || null;
	const prevProject = siteConfig.projects[currentIndex - 1] || null;

	return {
		project,
		nextProject,
		prevProject
	};
};

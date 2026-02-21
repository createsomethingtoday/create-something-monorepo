import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getCategorySummaries, getVideos } from '$lib/server/db/videos';
import { isAdminUser } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		redirect(302, '/login?redirect=/admin');
	}

	if (!isAdminUser(locals.user)) {
		redirect(302, '/demo');
	}

	const db = platform?.env.DB;
	if (!db) {
		return {
			user: locals.user,
			videos: [],
			categories: [],
			totalVideos: 0
		};
	}

	const [{ videos, total }, categories] = await Promise.all([
		getVideos(db),
		getCategorySummaries(db)
	]);

	return {
		user: locals.user,
		videos,
		categories,
		totalVideos: total
	};
};

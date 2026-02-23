import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCategorySummaries, getVideos, searchVideos } from '$lib/server/db/videos';
import { isAdminUser } from '$lib/server/auth';
import { getDBFromPlatform } from '$lib/server/d1-compat';

const LEGACY_WRITE_MIGRATION = {
	error: 'Legacy write endpoint retired. Use Stream upload v1 endpoints.',
	uploadsInit: '/api/v1/uploads/init',
	uploadsComplete: '/api/v1/uploads/complete',
	adminVideosApi: '/api/v1/admin/videos'
} as const;

export const GET: RequestHandler = async ({ url, platform, locals }) => {
	if (!isAdminUser(locals.user)) {
		return json({ success: false, error: 'Not authorized' }, { status: 403 });
	}

	const db = getDBFromPlatform(platform);

	const search = url.searchParams.get('search')?.trim() || '';
	const category = url.searchParams.get('category')?.trim() || '';
	const tier = url.searchParams.get('tier')?.trim() || '';

	try {
		let videos = search ? (await searchVideos(db, search)).videos : (await getVideos(db, category || undefined)).videos;

		if (!search && category) {
			videos = videos.filter((v) => v.category === category);
		}

		if (tier === 'free' || tier === 'preview' || tier === 'gated') {
			videos = videos.filter((v) => v.tier === tier);
		}

		const categories = await getCategorySummaries(db);

		return json({
			success: true,
			data: {
				videos,
				categories,
				total: videos.length
			}
		});
	} catch (error) {
		console.error('Error fetching admin videos:', error);
		return json({ success: false, error: 'Failed to fetch videos' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals }) => {
	if (!isAdminUser(locals.user)) {
		return json({ success: false, error: 'Not authorized' }, { status: 403 });
	}

	return json({ success: false, ...LEGACY_WRITE_MIGRATION }, { status: 410 });
};

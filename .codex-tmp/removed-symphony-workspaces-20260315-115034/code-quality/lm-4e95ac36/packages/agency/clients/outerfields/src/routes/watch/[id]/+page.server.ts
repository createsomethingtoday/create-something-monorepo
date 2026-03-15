import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAdminVideoById, getVideoById, getVideos } from '$lib/server/db/videos';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getSeriesByIdentifier } from '$lib/server/db/series';
import { isAdminUser } from '$lib/server/admin';
import { resolveRuntimeEnv } from '$lib/server/env';
import { filterPubliclyPlayable, isPubliclyPlayable } from '$lib/server/video-availability';

/**
 * Watch Page Server Load
 *
 * Fetches video data and related videos for the dedicated watch page.
 * Handles 404 for invalid video IDs and respects tier gating.
 */
export const load: PageServerLoad = async ({ params, locals, platform }) => {
	const db = getDBFromPlatform(platform);
	const runtimeEnv = resolveRuntimeEnv(((platform as { env?: Record<string, string | undefined> } | undefined)?.env));

	const { id } = params;

	if (!id) {
		throw error(400, 'Video ID is required');
	}

	const isAdmin = isAdminUser(locals.user, runtimeEnv);

	// Fetch the main video (admins can preview drafts/archived)
	const video = isAdmin ? await getAdminVideoById(db, id) : await getVideoById(db, id);

	if (!video) {
		throw error(404, 'Video not found');
	}

	if (!isAdmin && video.visibility !== 'published') {
		throw error(404, 'Video not found');
	}

	const series = video.series_id ? await getSeriesByIdentifier(db, video.series_id) : null;

	// Fetch related videos (same category, excluding current)
	const { videos: allVideos } = await getVideos(db);
	const publiclyPlayable = filterPubliclyPlayable(allVideos);
	
	// Get videos from same category (excluding current)
	const sameCategory = publiclyPlayable
		.filter(v => v.category === video.category && v.id !== video.id)
		.sort((a, b) => (a.episode_number ?? 999) - (b.episode_number ?? 999))
		.slice(0, 8);

	// Get videos from other categories as fallback
	const otherCategories = publiclyPlayable
		.filter(v => v.category !== video.category && v.id !== video.id)
		.slice(0, 6);

	// Determine next/previous episodes
	const categoryVideos = allVideos
		.filter(v => v.category === video.category)
		.sort((a, b) => (a.episode_number ?? 999) - (b.episode_number ?? 999));
	
	const currentIndex = categoryVideos.findIndex(v => v.id === video.id);
	const nextVideo = currentIndex >= 0
		? categoryVideos.slice(currentIndex + 1).find((candidate) => isPubliclyPlayable(candidate)) || null
		: null;
	const prevVideo = currentIndex > 0
		? [...categoryVideos.slice(0, currentIndex)]
				.reverse()
				.find((candidate) => isPubliclyPlayable(candidate)) || null
		: null;

	// Check user membership for gating
	const user = locals.user ?? null;
	const isMember = user?.membership ?? false;

	// Determine if video is accessible
	const isAccessible = isAdmin || video.tier === 'free' || isMember;

	return {
		video,
		related: {
			sameCategory,
			otherCategories,
			nextVideo,
			prevVideo
		},
		isAccessible,
		isMember,
		user,
		isAdmin,
		series: series
			? {
					id: series.id,
					slug: series.slug,
					title: series.title
				}
			: null
	};
};

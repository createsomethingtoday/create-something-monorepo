import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getVideoById, getVideos } from '$lib/server/db/videos';

/**
 * Watch Page Server Load
 *
 * Fetches video data and related videos for the dedicated watch page.
 * Handles 404 for invalid video IDs and respects tier gating.
 */
export const load: PageServerLoad = async ({ params, platform, locals }) => {
	const db = platform?.env.DB;

	if (!db) {
		throw error(500, 'Database not available');
	}

	const { id } = params;

	if (!id) {
		throw error(400, 'Video ID is required');
	}

	// Fetch the main video
	const video = await getVideoById(db, id);

	if (!video) {
		throw error(404, 'Video not found');
	}

	// Fetch related videos (same category, excluding current)
	const { videos: allVideos } = await getVideos(db);
	
	// Get videos from same category (excluding current)
	const sameCategory = allVideos
		.filter(v => v.category === video.category && v.id !== video.id)
		.sort((a, b) => (a.episode_number ?? 999) - (b.episode_number ?? 999))
		.slice(0, 8);

	// Get videos from other categories as fallback
	const otherCategories = allVideos
		.filter(v => v.category !== video.category)
		.slice(0, 6);

	// Determine next/previous episodes
	const categoryVideos = allVideos
		.filter(v => v.category === video.category)
		.sort((a, b) => (a.episode_number ?? 999) - (b.episode_number ?? 999));
	
	const currentIndex = categoryVideos.findIndex(v => v.id === video.id);
	const nextVideo = currentIndex >= 0 && currentIndex < categoryVideos.length - 1
		? categoryVideos[currentIndex + 1]
		: null;
	const prevVideo = currentIndex > 0
		? categoryVideos[currentIndex - 1]
		: null;

	// Check user membership for gating
	const user = locals.user ?? null;
	const isMember = user?.membership ?? false;

	// Determine if video is accessible
	const isAccessible = video.tier === 'free' || isMember;

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
		user
	};
};

import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getVideos, type Video } from '$lib/server/db/videos';
import { isAdminUser } from '$lib/server/auth';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { filterPubliclyPlayable } from '$lib/server/video-availability';

interface RowVideo {
	id: string;
	title: string;
	thumbnail: string;
	duration: string;
	tier: 'free' | 'preview' | 'gated';
	category: string;
	episodeNumber?: number;
}

const CATEGORY_TITLES: Record<string, string> = {
	'crew-call': 'Crew Call',
	'reconnecting-relationships': 'Reconnecting Relationships',
	kodiak: 'Kodiak',
	'lincoln-manufacturing': 'Lincoln Manufacturing',
	'guns-out-tv': 'Guns Out TV',
	films: 'Films',
	'coming-soon': 'Coming Soon',
	lmc: 'LMC'
};

function formatClock(totalSeconds: number): string {
	const s = Math.max(0, Math.floor(totalSeconds));
	const hours = Math.floor(s / 3600);
	const minutes = Math.floor((s % 3600) / 60);
	const seconds = s % 60;
	if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getThumbnailPath(video: Video): string {
	if (video.thumbnail_path.startsWith('http://') || video.thumbnail_path.startsWith('https://')) {
		return video.thumbnail_path;
	}
	if (video.thumbnail_path.startsWith('/thumbnails/')) return video.thumbnail_path;
	return `/thumbnails${video.thumbnail_path.startsWith('/') ? '' : '/'}${video.thumbnail_path}`;
}

function toRowVideo(video: Video): RowVideo {
	return {
		id: video.id,
		title: video.title,
		thumbnail: getThumbnailPath(video),
		duration: formatClock(video.duration),
		tier: video.tier,
		category: video.category,
		...(video.episode_number ? { episodeNumber: video.episode_number } : {})
	};
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		redirect(302, '/login?redirect=/demo');
	}

	const db = getDBFromPlatform(platform);

	const { videos: allVideos } = await getVideos(db);
	const videos = filterPubliclyPlayable(allVideos);

	const sortedByLatest = [...videos].sort((a, b) => b.created_at - a.created_at);
	const featuredVideo = sortedByLatest[0] || null;

	const grouped = new Map<string, RowVideo[]>();
	for (const video of sortedByLatest) {
		if (!grouped.has(video.category)) {
			grouped.set(video.category, []);
		}
		grouped.get(video.category)!.push(toRowVideo(video));
	}

	const categories = Array.from(grouped.entries()).map(([categoryId, items]) => ({
		categoryId,
		title: CATEGORY_TITLES[categoryId] || categoryId,
		items: items.sort((a, b) => {
			const aEpisode = a.episodeNumber ?? Number.MAX_SAFE_INTEGER;
			const bEpisode = b.episodeNumber ?? Number.MAX_SAFE_INTEGER;
			return aEpisode - bEpisode;
		})
	}));

	return {
		user: locals.user,
		isAdmin: isAdminUser(locals.user),
		featured: featuredVideo
			? {
					id: featuredVideo.id,
					title: featuredVideo.title,
					description: featuredVideo.description || 'Latest upload in your library.',
					thumbnail: getThumbnailPath(featuredVideo),
					duration: formatClock(featuredVideo.duration),
					tier: featuredVideo.tier
				}
			: null,
		categories,
		totalVideos: videos.length
	};
};

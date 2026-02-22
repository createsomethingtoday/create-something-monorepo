import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { R2Bucket } from '@cloudflare/workers-types';
import {
	createVideo,
	getCategorySummaries,
	getVideos,
	searchVideos,
	type CreateVideoInput
} from '$lib/server/db/videos';
import { isAdminUser } from '$lib/server/auth';
import { getDBFromPlatform } from '$lib/server/d1-compat';

const DEFAULT_THUMBNAIL = '/thumbnails/hero-building-outerfields.jpg';
const R2_PUBLIC_BASE = 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev';

function sanitizeBaseName(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60) || 'upload';
}

function getExtension(fileName: string, fallback: string): string {
	const parts = fileName.split('.');
	if (parts.length > 1 && parts.at(-1)) {
		return parts.at(-1)!.toLowerCase();
	}
	return fallback;
}

function normalizeAssetPath(path: string): string | null {
	const trimmed = path.trim();
	if (!trimmed) return null;

	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		try {
			const parsed = new URL(trimmed);
			if (!parsed.protocol.startsWith('http')) return null;
			return trimmed;
		} catch {
			return null;
		}
	}

	return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function hasMimePrefix(file: File, expectedPrefix: 'video/' | 'image/'): boolean {
	const contentType = file.type?.toLowerCase() || '';
	return contentType.startsWith(expectedPrefix);
}

async function uploadToR2(
	bucket: R2Bucket,
	file: File,
	folder: 'videos' | 'thumbnails',
	baseName: string
): Promise<string> {
	const extension = getExtension(file.name, folder === 'videos' ? 'mp4' : 'jpg');
	const key = `${folder}/uploads/${Date.now()}-${sanitizeBaseName(baseName)}.${extension}`;

	await bucket.put(key, await file.arrayBuffer(), {
		httpMetadata: file.type ? { contentType: file.type } : undefined
	});

	return `/${key}`;
}

function parseTier(value: string | null): 'free' | 'preview' | 'gated' {
	if (value === 'free' || value === 'preview' || value === 'gated') return value;
	return 'preview';
}

function parseOptionalNumber(value: string | null): number | null {
	if (!value || value.trim() === '') return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseRequiredDuration(value: string | null): number | null {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return null;
	return Math.floor(parsed);
}

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

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!isAdminUser(locals.user)) {
		return json({ success: false, error: 'Not authorized' }, { status: 403 });
	}

	const db = getDBFromPlatform(platform);

	try {
		const contentType = request.headers.get('content-type') || '';
		const bucket = (platform?.env as { VIDEO_ASSETS?: R2Bucket } | undefined)?.VIDEO_ASSETS;

		let input: CreateVideoInput | null = null;

		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData();

			const title = String(formData.get('title') || '').trim();
			const category = String(formData.get('category') || '').trim();
			const tier = parseTier(String(formData.get('tier') || 'preview'));
			const duration = parseRequiredDuration(String(formData.get('duration') || ''));
			const episodeNumber = parseOptionalNumber(String(formData.get('episodeNumber') || ''));
			const description = String(formData.get('description') || '').trim() || null;
			const assetPathRaw = String(formData.get('assetPath') || '').trim();
			const thumbnailPathRaw = String(formData.get('thumbnailPath') || '').trim();
			const videoFile = formData.get('video');
			const thumbnailFile = formData.get('thumbnail');

			if (!title || !category || !duration) {
				return json(
					{ success: false, error: 'title, category, and duration are required' },
					{ status: 400 }
				);
			}

			let assetPath = assetPathRaw;
			if (videoFile instanceof File && videoFile.size > 0) {
				if (!hasMimePrefix(videoFile, 'video/')) {
					return json(
						{ success: false, error: 'Uploaded video file must have a video/* MIME type' },
						{ status: 400 }
					);
				}
				if (!bucket) {
					return json(
						{ success: false, error: 'Upload bucket is not configured' },
						{ status: 500 }
					);
				}
				assetPath = await uploadToR2(bucket, videoFile, 'videos', title);
			}

			const normalizedAssetPath = normalizeAssetPath(assetPath);
			if (!normalizedAssetPath) {
				return json(
					{ success: false, error: 'Provide a valid video file or assetPath URL/path' },
					{ status: 400 }
				);
			}

			let thumbnailPath = thumbnailPathRaw || DEFAULT_THUMBNAIL;
			if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
				if (!hasMimePrefix(thumbnailFile, 'image/')) {
					return json(
						{ success: false, error: 'Uploaded thumbnail file must have an image/* MIME type' },
						{ status: 400 }
					);
				}
				if (!bucket) {
					return json(
						{ success: false, error: 'Upload bucket is not configured' },
						{ status: 500 }
					);
				}
				const uploadedThumbPath = await uploadToR2(bucket, thumbnailFile, 'thumbnails', title);
				thumbnailPath = `${R2_PUBLIC_BASE}${uploadedThumbPath}`;
			}
			const normalizedThumbnailPath = normalizeAssetPath(thumbnailPath);
			if (!normalizedThumbnailPath) {
				return json({ success: false, error: 'Invalid thumbnailPath URL/path' }, { status: 400 });
			}

			input = {
				title,
				category,
				tier,
				duration,
				episode_number: episodeNumber,
				description,
				asset_path: normalizedAssetPath,
				thumbnail_path: normalizedThumbnailPath
			};
		} else {
			const body = await request.json();
			const title = String(body.title || '').trim();
			const category = String(body.category || '').trim();
			const duration = Number(body.duration);

			if (!title || !category || !Number.isFinite(duration) || duration <= 0) {
				return json(
					{ success: false, error: 'title, category, and valid duration are required' },
					{ status: 400 }
				);
			}

			const assetPath = String(body.assetPath || body.asset_path || '').trim();
			if (!assetPath) {
				return json({ success: false, error: 'assetPath is required' }, { status: 400 });
			}
			const normalizedAssetPath = normalizeAssetPath(assetPath);
			if (!normalizedAssetPath) {
				return json({ success: false, error: 'assetPath must be a valid URL/path' }, { status: 400 });
			}
			const thumbnailPath = String(body.thumbnailPath || body.thumbnail_path || DEFAULT_THUMBNAIL).trim();
			const normalizedThumbnailPath = normalizeAssetPath(thumbnailPath);
			if (!normalizedThumbnailPath) {
				return json({ success: false, error: 'thumbnailPath must be a valid URL/path' }, { status: 400 });
			}

			input = {
				title,
				category,
				tier: parseTier(String(body.tier || 'preview')),
				duration: Math.floor(duration),
				episode_number: Number.isFinite(Number(body.episodeNumber))
					? Number(body.episodeNumber)
					: null,
				description: String(body.description || '').trim() || null,
				asset_path: normalizedAssetPath,
				thumbnail_path: normalizedThumbnailPath
			};
		}

		const created = await createVideo(db, input);

		return json({ success: true, data: created }, { status: 201 });
	} catch (error) {
		console.error('Error creating video:', error);
		return json({ success: false, error: 'Failed to create video' }, { status: 500 });
	}
};

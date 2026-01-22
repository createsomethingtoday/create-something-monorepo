import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadToR2 } from '$lib/server/r2';
import {
	validateWebP,
	validateFileSize,
	validateMimeType,
	THUMBNAIL_ASPECT_RATIO
} from '$lib/utils/upload-validation';

/** Maximum file size: 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Upload a file to R2 storage.
 *
 * POST /api/upload
 *
 * Form data:
 * - file: The file to upload (required, must be WebP)
 * - type: Upload type - 'thumbnail' | 'image' (optional, default: 'image')
 * - width: Image width in pixels (optional, for thumbnail validation)
 * - height: Image height in pixels (optional, for thumbnail validation)
 *
 * When type=thumbnail, validates the 150:199 aspect ratio.
 */
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	// Require authentication
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const uploads = platform?.env.UPLOADS;
	if (!uploads) {
		throw error(500, 'Storage not configured');
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file');
		const uploadType = formData.get('type')?.toString() || 'image';
		const width = formData.get('width');
		const height = formData.get('height');

		if (!file || !(file instanceof File)) {
			throw error(400, 'No file uploaded');
		}

		// Validate MIME type
		if (!validateMimeType(file.type)) {
			throw error(400, 'Only WebP images are allowed');
		}

		// Validate file size
		if (!validateFileSize(file.size, MAX_FILE_SIZE)) {
			throw error(400, 'File size must be less than 10MB');
		}

		// Read file and validate WebP format
		const arrayBuffer = await file.arrayBuffer();
		if (!validateWebP(arrayBuffer)) {
			throw error(400, 'Invalid WebP file format');
		}

		// Validate thumbnail aspect ratio if type=thumbnail and dimensions provided
		// Uses absolute tolerance (0.01) to match old interface behavior exactly
		if (uploadType === 'thumbnail' && width && height) {
			const w = parseInt(width.toString(), 10);
			const h = parseInt(height.toString(), 10);

			if (!isNaN(w) && !isNaN(h)) {
				const actualRatio = w / h;
				const expectedRatio = THUMBNAIL_ASPECT_RATIO.width / THUMBNAIL_ASPECT_RATIO.height;
				const deviation = Math.abs(actualRatio - expectedRatio);
				
				if (deviation > THUMBNAIL_ASPECT_RATIO.tolerance) {
					throw error(
						400,
						`Invalid thumbnail aspect ratio (${w}×${h}). Expected ${THUMBNAIL_ASPECT_RATIO.width}:${THUMBNAIL_ASPECT_RATIO.height} ratio. Try 750×995px.`
					);
				}
			}
		}

		// Upload to R2 using the utility function
		const result = await uploadToR2(uploads, arrayBuffer, {
			filename: file.name || 'upload.webp',
			userEmail: locals.user.email,
			contentType: 'image/webp',
			metadata: {
				uploadType
			}
		});

		return json({
			url: result.url,
			key: result.key,
			size: result.size
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		console.error('Upload error:', err);
		throw error(500, 'Failed to upload file');
	}
};

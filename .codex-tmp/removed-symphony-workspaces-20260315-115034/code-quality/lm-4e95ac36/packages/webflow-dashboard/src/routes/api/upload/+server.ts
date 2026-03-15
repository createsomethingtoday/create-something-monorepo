import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadToR2 } from '$lib/server/r2';
import {
	validateWebP,
	validateFileSize,
	validateMimeType,
	THUMBNAIL_ASPECT_RATIO,
	getWebPDimensions,
	validateThumbnailAspectRatio
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
 * When type=thumbnail, validates the 150:199 aspect ratio from decoded image bytes.
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

		// Validate thumbnail aspect ratio from actual image bytes (not client-provided metadata).
		if (uploadType === 'thumbnail') {
			const dimensions = getWebPDimensions(arrayBuffer);
			if (!dimensions) {
				throw error(400, 'Unable to determine image dimensions');
			}

			if (!validateThumbnailAspectRatio(dimensions.width, dimensions.height)) {
				throw error(
					400,
					`Invalid thumbnail aspect ratio (${dimensions.width}×${dimensions.height}). Expected ${THUMBNAIL_ASPECT_RATIO.width}:${THUMBNAIL_ASPECT_RATIO.height} ratio. Try 750×995px.`
				);
			}
		}

		// Extract origin for absolute URL construction (required for Airtable)
		const origin = new URL(request.url).origin;
		// Upload to R2 using the utility function
		const result = await uploadToR2(uploads, arrayBuffer, {
			filename: file.name || 'upload.webp',
			userEmail: locals.user.email,
			contentType: 'image/webp',
			origin,
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

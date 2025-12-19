import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Validate that a file is actually a WebP image by checking file headers
 * WebP files start with RIFF followed by file size, then WEBP
 */
function isWebP(arrayBuffer: ArrayBuffer): boolean {
	const header = new TextDecoder('ascii').decode(new Uint8Array(arrayBuffer.slice(0, 4)));
	const type = new TextDecoder('ascii').decode(new Uint8Array(arrayBuffer.slice(8, 12)));
	return header === 'RIFF' && type === 'WEBP';
}

/**
 * Generate a unique filename for the upload
 */
function generateFilename(originalName: string): string {
	const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
	const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
	return `${uniqueSuffix}_${safeName}`;
}

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

		if (!file || !(file instanceof File)) {
			throw error(400, 'No file uploaded');
		}

		// Validate MIME type
		if (file.type !== 'image/webp') {
			throw error(400, 'Only WebP images are allowed');
		}

		// Validate file size (max 10MB)
		const MAX_SIZE = 10 * 1024 * 1024;
		if (file.size > MAX_SIZE) {
			throw error(400, 'File size must be less than 10MB');
		}

		// Read file and validate WebP format
		const arrayBuffer = await file.arrayBuffer();
		if (!isWebP(arrayBuffer)) {
			throw error(400, 'Invalid WebP file format');
		}

		// Generate unique filename with user prefix for organization
		const userPrefix = locals.user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
		const filename = `${userPrefix}/${generateFilename(file.name || 'upload.webp')}`;

		// Upload to R2
		await uploads.put(filename, arrayBuffer, {
			httpMetadata: {
				contentType: 'image/webp'
			},
			customMetadata: {
				uploadedBy: locals.user.email,
				uploadedAt: new Date().toISOString()
			}
		});

		// Construct the public URL
		// Note: R2 public access must be enabled on the bucket, or use a Worker to serve files
		// For now, return a path that can be served via a separate endpoint
		const url = `/api/uploads/${filename}`;

		return json({ url, filename });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		console.error('Upload error:', err);
		throw error(500, 'Failed to upload file');
	}
};

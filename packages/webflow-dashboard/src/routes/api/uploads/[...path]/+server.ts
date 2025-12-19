import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Serve uploaded files from R2
 * GET /api/uploads/[...path]
 */
export const GET: RequestHandler = async ({ params, platform }) => {
	const uploads = platform?.env.UPLOADS;
	if (!uploads) {
		throw error(500, 'Storage not configured');
	}

	const path = params.path;
	if (!path) {
		throw error(400, 'File path required');
	}

	try {
		const object = await uploads.get(path);

		if (!object) {
			throw error(404, 'File not found');
		}

		const headers = new Headers();
		headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
		headers.set('Cache-Control', 'public, max-age=31536000, immutable');

		// Add ETag for caching
		if (object.httpEtag) {
			headers.set('ETag', object.httpEtag);
		}

		return new Response(object.body, { headers });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Error serving file:', err);
		throw error(500, 'Failed to retrieve file');
	}
};

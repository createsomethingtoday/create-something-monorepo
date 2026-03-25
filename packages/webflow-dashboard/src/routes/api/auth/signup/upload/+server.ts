import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadToR2 } from '$lib/server/r2';
import { getWebPDimensions, validateMimeType, validateWebP } from '$lib/utils/upload-validation';

const AVATAR_MAX_FILE_SIZE = 100 * 1024;
const AVATAR_WIDTH = 256;
const AVATAR_HEIGHT = 256;

export const POST: RequestHandler = async ({ request, platform }) => {
	const uploads = platform?.env?.UPLOADS;

	if (!uploads) {
		return json({ error: 'Storage not configured.' }, { status: 500 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file');
		const email = String(formData.get('email') || '').trim().toLowerCase();

		if (!file || !(file instanceof File)) {
			return json({ error: 'No file uploaded.' }, { status: 400 });
		}

		if (!validateMimeType(file.type)) {
			return json({ error: 'Only WebP images are allowed.' }, { status: 400 });
		}

		if (file.size > AVATAR_MAX_FILE_SIZE) {
			return json({ error: 'Profile image must be 100KB or smaller.' }, { status: 400 });
		}

		const arrayBuffer = await file.arrayBuffer();
		if (!validateWebP(arrayBuffer)) {
			return json({ error: 'Invalid WebP file format.' }, { status: 400 });
		}

		const dimensions = getWebPDimensions(arrayBuffer);
		if (!dimensions) {
			return json({ error: 'Unable to determine image dimensions.' }, { status: 400 });
		}

		if (dimensions.width !== AVATAR_WIDTH || dimensions.height !== AVATAR_HEIGHT) {
			return json(
				{
					error: `Profile image must be exactly ${AVATAR_WIDTH}x${AVATAR_HEIGHT}.`
				},
				{ status: 400 }
			);
		}

		const origin = new URL(request.url).origin;
		const upload = await uploadToR2(uploads, arrayBuffer, {
			filename: file.name || 'avatar.webp',
			userEmail: email || undefined,
			contentType: 'image/webp',
			origin,
			metadata: {
				uploadType: 'avatar'
			}
		});

		return json({
			...upload,
			width: dimensions.width,
			height: dimensions.height
		});
	} catch (error) {
		console.error('Signup upload error:', error);
		return json({ error: 'Failed to upload file.' }, { status: 500 });
	}
};

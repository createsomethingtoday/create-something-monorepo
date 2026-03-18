import {
  THUMBNAIL_ASPECT_RATIO,
  getWebPDimensions,
  uploadToR2,
  validateFileSize,
  validateMimeType,
  validateThumbnailAspectRatio,
  validateWebP
} from '@create-something/webflow-dashboard-core';
import { jsonNoStore } from '../../../lib/server/responses';
import { getEnvOrThrow } from '../../../lib/server/env';
import { getUserFromRequest } from '../../../lib/server/session';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const env = await getEnvOrThrow();
    if (!env.UPLOADS) {
      return jsonNoStore({ error: 'Storage not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const uploadType = formData.get('type')?.toString() || 'image';

    if (!file || !(file instanceof File)) {
      return jsonNoStore({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!validateMimeType(file.type)) {
      return jsonNoStore({ error: 'Only WebP images are allowed' }, { status: 400 });
    }

    if (!validateFileSize(file.size, MAX_FILE_SIZE)) {
      return jsonNoStore({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    if (!validateWebP(arrayBuffer)) {
      return jsonNoStore({ error: 'Invalid WebP file format' }, { status: 400 });
    }

    if (uploadType === 'thumbnail') {
      const dimensions = getWebPDimensions(arrayBuffer);
      if (!dimensions) {
        return jsonNoStore({ error: 'Unable to determine image dimensions' }, { status: 400 });
      }

      if (!validateThumbnailAspectRatio(dimensions.width, dimensions.height)) {
        return jsonNoStore(
          {
            error: `Invalid thumbnail aspect ratio (${dimensions.width}×${dimensions.height}). Expected ${THUMBNAIL_ASPECT_RATIO.width}:${THUMBNAIL_ASPECT_RATIO.height} ratio.`
          },
          { status: 400 }
        );
      }
    }

    const origin = new URL(request.url).origin;
    const result = await uploadToR2(env.UPLOADS, arrayBuffer, {
      filename: file.name || 'upload.webp',
      userEmail: user.email,
      contentType: 'image/webp',
      origin,
      metadata: {
        uploadType
      }
    });

    return jsonNoStore(result);
  } catch (error) {
    console.error('[Upload] Error:', error);
    return jsonNoStore({ error: 'Failed to upload file' }, { status: 500 });
  }
}

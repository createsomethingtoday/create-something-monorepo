import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadToR2 } from '$lib/server/r2';
import {
  validateWebP,
  validateFileSize,
  validateMimeType,
  getWebPDimensions
} from '$lib/utils/upload-validation';

const UPLOAD_CONSTRAINTS = {
  image: { maxSize: 10 * 1024 * 1024 },
  carousel: { maxSize: 10 * 1024 * 1024 },
  thumbnail: { width: 750, height: 995, maxSize: 300 * 1024 },
  'secondary-thumbnail': { width: 750, height: 995, maxSize: 300 * 1024 },
  gallery: { width: 1440, height: 900, maxSize: 250 * 1024 }
} as const;

type UploadType = keyof typeof UPLOAD_CONSTRAINTS;

function isUploadType(value: string): value is UploadType {
  return value in UPLOAD_CONSTRAINTS;
}

/**
 * Upload a file to R2 storage.
 *
 * POST /api/upload
 *
 * Form data:
 * - file: The file to upload (required, must be WebP)
 * - type: Upload type - 'image' | 'carousel' | 'thumbnail' | 'secondary-thumbnail' | 'gallery'
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

    if (!isUploadType(uploadType)) {
      throw error(400, 'Unknown upload type');
    }

    const constraints = UPLOAD_CONSTRAINTS[uploadType];

    // Validate MIME type
    if (!validateMimeType(file.type)) {
      throw error(400, 'Only WebP images are allowed');
    }

    // Validate file size
    if (!validateFileSize(file.size, constraints.maxSize)) {
      if ('width' in constraints) {
        throw error(
          400,
          `File exceeds the ${Math.round(constraints.maxSize / 1024)}KB limit for ${uploadType}`
        );
      }
      throw error(400, 'File size must be less than 10MB');
    }

    // Read file and validate WebP format
    const arrayBuffer = await file.arrayBuffer();
    if (!validateWebP(arrayBuffer)) {
      throw error(400, 'Invalid WebP file format');
    }

    const dimensions = getWebPDimensions(arrayBuffer);
    if ('width' in constraints) {
      if (!dimensions) {
        throw error(400, 'Unable to determine image dimensions');
      }

      if (dimensions.width !== constraints.width || dimensions.height !== constraints.height) {
        throw error(
          400,
          `${uploadType} images must be exactly ${constraints.width}x${constraints.height}`
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
      size: result.size,
      width: dimensions?.width,
      height: dimensions?.height
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    console.error('Upload error:', err);
    throw error(500, 'Failed to upload file');
  }
};

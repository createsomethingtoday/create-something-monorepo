/**
 * Upload API
 *
 * POST: Upload image to R2 bucket
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

/**
 * POST /api/upload
 *
 * Accepts multipart form data with a single file.
 * Uploads to R2 and returns the public URL.
 */
export const POST: RequestHandler = async ({ request, platform }) => {
  const bucket = platform?.env?.SITE_BUCKET;

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    throw error(400, 'No file provided');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw error(400, 'Only image files are allowed');
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    throw error(400, 'File too large (max 5MB)');
  }

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  if (!bucket) {
    // Development mode: return mock URL
    return json({
      success: true,
      url: `https://placeholder.createsomething.space/${filename}`,
      filename
    });
  }

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer();
  await bucket.put(filename, arrayBuffer, {
    httpMetadata: {
      contentType: file.type
    }
  });

  // Construct public URL
  // In production, this would use a custom domain or R2 public URL
  const url = `https://assets.createsomething.space/${filename}`;

  return json({
    success: true,
    url,
    filename
  });
};

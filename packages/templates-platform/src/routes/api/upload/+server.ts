/**
 * Upload API
 *
 * POST: Upload image to R2 bucket, scoped by tenant
 *
 * R2 Structure:
 *   user-uploads/{tenantId}/{timestamp}-{random}.{ext}
 *
 * This keeps tenant assets separate from template assets.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

// Allowed image types and extensions
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/upload
 *
 * Accepts multipart form data with:
 * - file: The image file
 * - siteId: The tenant/site ID (optional, for organizing uploads)
 *
 * Uploads to R2 and returns the public URL.
 */
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  const bucket = platform?.env?.SITE_BUCKET;

  const formData = await request.formData();
  const file = formData.get('file');
  const siteId = formData.get('siteId') as string | null;

  if (!file || !(file instanceof File)) {
    throw error(400, 'No file provided');
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw error(400, `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    throw error(400, `File too large (max ${MAX_SIZE / 1024 / 1024}MB)`);
  }

  // Generate unique filename with tenant scope
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);

  // Path structure: user-uploads/{siteId}/{timestamp}-{random}.{ext}
  // Falls back to 'shared' if no siteId provided
  const folder = siteId || 'shared';
  const filename = `user-uploads/${folder}/${timestamp}-${random}.${ext}`;

  if (!bucket) {
    // Development mode: return data URL for local testing
    const reader = new FileReader();
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    const dataUrl = `data:${file.type};base64,${base64}`;

    return json({
      success: true,
      url: dataUrl,
      filename,
      development: true
    });
  }

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer();
  await bucket.put(filename, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000, immutable'
    },
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      siteId: siteId || 'shared'
    }
  });

  // Construct public URL via R2 public access or custom domain
  const url = `https://assets.createsomething.space/${filename}`;

  return json({
    success: true,
    url,
    filename,
    size: file.size,
    type: file.type
  });
};

/**
 * DELETE /api/upload
 *
 * Delete an uploaded image from R2
 */
export const DELETE: RequestHandler = async ({ request, platform }) => {
  const bucket = platform?.env?.SITE_BUCKET;

  const body = await request.json() as { filename?: string };
  const { filename } = body;

  if (!filename || typeof filename !== 'string') {
    throw error(400, 'Filename required');
  }

  // Security: Only allow deleting user-uploads
  if (!filename.startsWith('user-uploads/')) {
    throw error(403, 'Cannot delete this file');
  }

  if (!bucket) {
    // Development mode
    return json({ success: true, development: true });
  }

  await bucket.delete(filename);

  return json({ success: true });
};

export interface UploadOptions {
  userEmail?: string;
  metadata?: Record<string, string>;
  contentType?: string;
  origin?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
}

export function sanitizeFilename(name: string): string {
  const lastDot = name.lastIndexOf('.');
  const ext = lastDot > 0 ? name.slice(lastDot) : '';
  const baseName = lastDot > 0 ? name.slice(0, lastDot) : name;
  const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${safeName}${ext}`;
}

export function generateStorageKey(filename: string, userEmail?: string): string {
  const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
  const safeName = sanitizeFilename(filename || 'upload.webp');

  if (userEmail) {
    const userPrefix = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
    return `${userPrefix}/${uniqueSuffix}_${safeName}`;
  }

  return `uploads/${uniqueSuffix}_${safeName}`;
}

export async function uploadToR2(
  bucket: R2Bucket,
  file: File | ArrayBuffer,
  options: UploadOptions & { filename?: string } = {}
): Promise<UploadResult> {
  const isFile = file instanceof File;
  const filename = isFile ? file.name : options.filename || 'upload.webp';
  const contentType = options.contentType || (isFile ? file.type : 'image/webp');
  const arrayBuffer = isFile ? await file.arrayBuffer() : file;
  const key = generateStorageKey(filename, options.userEmail);

  await bucket.put(key, arrayBuffer, {
    httpMetadata: { contentType },
    customMetadata: {
      uploadedBy: options.userEmail || 'anonymous',
      uploadedAt: new Date().toISOString(),
      ...(options.metadata || {})
    }
  });

  return {
    key,
    url: `${options.origin || ''}/api/uploads/${key}`,
    size: arrayBuffer.byteLength
  };
}

export async function deleteFromR2(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}

export async function existsInR2(bucket: R2Bucket, key: string): Promise<boolean> {
  return (await bucket.head(key)) !== null;
}

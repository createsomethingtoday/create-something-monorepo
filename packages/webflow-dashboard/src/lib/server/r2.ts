/**
 * Cloudflare R2 upload utilities.
 *
 * Provides consistent upload, delete, and URL operations for R2 storage.
 */

export interface UploadOptions {
	/** User email for organizing uploads */
	userEmail?: string;
	/** Custom metadata to attach to the object */
	metadata?: Record<string, string>;
	/** Content type override (default: auto-detect from file) */
	contentType?: string;
}

export interface UploadResult {
	/** The storage key for the uploaded file */
	key: string;
	/** The URL to access the file */
	url: string;
	/** Size in bytes */
	size: number;
}

/**
 * Sanitize a filename for safe storage.
 * Removes special characters, preserves extension.
 */
export function sanitizeFilename(name: string): string {
	// Get the extension
	const lastDot = name.lastIndexOf('.');
	const ext = lastDot > 0 ? name.slice(lastDot) : '';
	const baseName = lastDot > 0 ? name.slice(0, lastDot) : name;

	// Replace non-alphanumeric characters (except dash and underscore) with underscores
	const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

	return `${safeName}${ext}`;
}

/**
 * Generate a unique storage key for a file.
 * Format: {userPrefix}/{timestamp}_{random}_{sanitizedFilename}
 */
export function generateStorageKey(filename: string, userEmail?: string): string {
	const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
	const safeName = sanitizeFilename(filename || 'upload.webp');

	if (userEmail) {
		const userPrefix = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
		return `${userPrefix}/${uniqueSuffix}_${safeName}`;
	}

	return `uploads/${uniqueSuffix}_${safeName}`;
}

/**
 * Upload a file to R2.
 *
 * @param bucket - R2 bucket binding
 * @param file - File to upload
 * @param options - Upload options
 * @returns Upload result with key and URL
 */
export async function uploadToR2(
	bucket: R2Bucket,
	file: File | ArrayBuffer,
	options: UploadOptions & { filename?: string } = {}
): Promise<UploadResult> {
	const isFile = file instanceof File;
	const filename = isFile ? file.name : (options.filename || 'upload.webp');
	const contentType = options.contentType || (isFile ? file.type : 'image/webp');
	const arrayBuffer = isFile ? await file.arrayBuffer() : file;

	const key = generateStorageKey(filename, options.userEmail);

	await bucket.put(key, arrayBuffer, {
		httpMetadata: {
			contentType
		},
		customMetadata: {
			uploadedBy: options.userEmail || 'anonymous',
			uploadedAt: new Date().toISOString(),
			...(options.metadata || {})
		}
	});

	return {
		key,
		url: `/api/uploads/${key}`,
		size: arrayBuffer.byteLength
	};
}

/**
 * Delete an object from R2.
 *
 * @param bucket - R2 bucket binding
 * @param key - The storage key to delete
 */
export async function deleteFromR2(bucket: R2Bucket, key: string): Promise<void> {
	await bucket.delete(key);
}

/**
 * Get the URL for an R2 object.
 *
 * @param key - The storage key
 * @returns The URL to access the file
 */
export function getR2Url(key: string): string {
	return `/api/uploads/${key}`;
}

/**
 * Check if an object exists in R2.
 *
 * @param bucket - R2 bucket binding
 * @param key - The storage key
 * @returns True if the object exists
 */
export async function existsInR2(bucket: R2Bucket, key: string): Promise<boolean> {
	const object = await bucket.head(key);
	return object !== null;
}

/**
 * Get metadata for an R2 object without downloading it.
 *
 * @param bucket - R2 bucket binding
 * @param key - The storage key
 * @returns Object metadata or null if not found
 */
export async function getR2Metadata(
	bucket: R2Bucket,
	key: string
): Promise<{
	size: number;
	uploadedAt: string;
	uploadedBy: string;
	contentType: string;
} | null> {
	const object = await bucket.head(key);

	if (!object) {
		return null;
	}

	return {
		size: object.size,
		uploadedAt: object.customMetadata?.uploadedAt || object.uploaded.toISOString(),
		uploadedBy: object.customMetadata?.uploadedBy || 'unknown',
		contentType: object.httpMetadata?.contentType || 'application/octet-stream'
	};
}

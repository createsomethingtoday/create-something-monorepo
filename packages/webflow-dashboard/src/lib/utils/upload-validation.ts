/**
 * Upload validation utilities.
 *
 * Provides client and server-side validation for image uploads.
 * Includes WebP format validation and thumbnail aspect ratio checking.
 */

// WebP file signature: RIFF at bytes 0-3, WEBP at bytes 8-11
// Full structure: RIFF + [4 bytes size] + WEBP + [content]
const RIFF_SIGNATURE = 'RIFF';
const WEBP_SIGNATURE = 'WEBP';

/**
 * Validate that a buffer contains a valid WebP image.
 *
 * WebP files have the following structure:
 * - Bytes 0-3: "RIFF" (magic bytes)
 * - Bytes 4-7: File size (little-endian)
 * - Bytes 8-11: "WEBP" (format identifier)
 *
 * @param buffer - ArrayBuffer containing the file data
 * @returns True if the buffer contains valid WebP headers
 */
export function validateWebP(buffer: ArrayBuffer): boolean {
	if (buffer.byteLength < 12) {
		return false;
	}

	const header = new TextDecoder('ascii').decode(new Uint8Array(buffer.slice(0, 4)));
	const type = new TextDecoder('ascii').decode(new Uint8Array(buffer.slice(8, 12)));

	return header === RIFF_SIGNATURE && type === WEBP_SIGNATURE;
}

/**
 * Validate that a buffer contains valid WebP magic bytes.
 * More explicit byte-level check.
 *
 * @param buffer - ArrayBuffer containing the file data
 * @returns True if the buffer contains valid WebP magic bytes
 */
export function validateWebPMagicBytes(buffer: ArrayBuffer): boolean {
	if (buffer.byteLength < 12) {
		return false;
	}

	const bytes = new Uint8Array(buffer);

	// RIFF magic bytes: 0x52, 0x49, 0x46, 0x46
	const isRiff =
		bytes[0] === 0x52 && // R
		bytes[1] === 0x49 && // I
		bytes[2] === 0x46 && // F
		bytes[3] === 0x46; // F

	// WEBP magic bytes at offset 8: 0x57, 0x45, 0x42, 0x50
	const isWebP =
		bytes[8] === 0x57 && // W
		bytes[9] === 0x45 && // E
		bytes[10] === 0x42 && // B
		bytes[11] === 0x50; // P

	return isRiff && isWebP;
}

/**
 * Thumbnail aspect ratio constants.
 * Standard Webflow marketplace thumbnail: 150:199 (width:height)
 */
export const THUMBNAIL_ASPECT_RATIO = {
	width: 150,
	height: 199,
	ratio: 150 / 199, // ~0.7538
	tolerance: 0.01 // 1% tolerance for rounding errors
} as const;

/**
 * Validate that an image has the correct thumbnail aspect ratio.
 *
 * Standard ratio: 150:199 (approximately 0.754)
 * Allows for a small tolerance to account for rounding.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param tolerance - Acceptable deviation from expected ratio (default: 0.01)
 * @returns True if the aspect ratio matches within tolerance
 */
export function validateThumbnailAspectRatio(
	width: number,
	height: number,
	tolerance: number = THUMBNAIL_ASPECT_RATIO.tolerance
): boolean {
	if (width <= 0 || height <= 0) {
		return false;
	}

	const actualRatio = width / height;
	const deviation = Math.abs(actualRatio - THUMBNAIL_ASPECT_RATIO.ratio);

	return deviation <= tolerance;
}

/**
 * Generic aspect ratio validation.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param expectedWidth - Expected aspect ratio width component
 * @param expectedHeight - Expected aspect ratio height component
 * @param tolerance - Acceptable deviation (default: 0.05 or 5%)
 * @returns True if the aspect ratio matches within tolerance
 */
export function validateAspectRatio(
	width: number,
	height: number,
	expectedWidth: number,
	expectedHeight: number,
	tolerance: number = 0.05
): boolean {
	if (width <= 0 || height <= 0 || expectedWidth <= 0 || expectedHeight <= 0) {
		return false;
	}

	const actualRatio = width / height;
	const expectedRatio = expectedWidth / expectedHeight;
	const deviation = Math.abs(actualRatio - expectedRatio) / expectedRatio;

	return deviation <= tolerance;
}

/**
 * Sanitize a filename for safe storage.
 * Removes special characters and ensures a valid extension.
 *
 * @param name - Original filename
 * @returns Sanitized filename safe for storage
 */
export function sanitizeFilename(name: string): string {
	if (!name) {
		return 'upload.webp';
	}

	// Get the extension
	const lastDot = name.lastIndexOf('.');
	const ext = lastDot > 0 ? name.slice(lastDot).toLowerCase() : '.webp';
	const baseName = lastDot > 0 ? name.slice(0, lastDot) : name;

	// Replace non-alphanumeric characters (except dash and underscore) with underscores
	// Also collapse multiple underscores and trim
	const safeName = baseName
		.replace(/[^a-zA-Z0-9._-]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '');

	// Ensure we have a valid base name
	const finalName = safeName || 'upload';

	return `${finalName}${ext}`;
}

/**
 * Validate file size.
 *
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size in bytes (default: 10MB)
 * @returns True if size is within limit
 */
export function validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
	return size > 0 && size <= maxSize;
}

/**
 * Validate MIME type.
 *
 * @param mimeType - File MIME type
 * @param allowedTypes - Array of allowed MIME types
 * @returns True if MIME type is allowed
 */
export function validateMimeType(
	mimeType: string,
	allowedTypes: string[] = ['image/webp']
): boolean {
	return allowedTypes.includes(mimeType);
}

/**
 * Get image dimensions from a File object (browser only).
 *
 * @param file - File object containing an image
 * @returns Promise resolving to width and height, or null on error
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
	return new Promise((resolve) => {
		const img = new Image();

		img.onload = () => {
			const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
			URL.revokeObjectURL(img.src);
			resolve(dimensions);
		};

		img.onerror = () => {
			URL.revokeObjectURL(img.src);
			resolve(null);
		};

		img.src = URL.createObjectURL(file);
	});
}

/**
 * Comprehensive file validation result.
 */
export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Validate a file for upload.
 * Performs all standard validations.
 *
 * @param file - File to validate
 * @param options - Validation options
 * @returns Promise resolving to validation result
 */
export async function validateUploadFile(
	file: File,
	options: {
		maxSize?: number;
		requireWebP?: boolean;
		aspectRatio?: { width: number; height: number } | null;
		aspectRatioTolerance?: number;
	} = {}
): Promise<ValidationResult> {
	const {
		maxSize = 10 * 1024 * 1024,
		requireWebP = true,
		aspectRatio = null,
		aspectRatioTolerance = 0.05
	} = options;

	const errors: string[] = [];

	// Check file size
	if (!validateFileSize(file.size, maxSize)) {
		const maxMB = Math.round(maxSize / 1024 / 1024);
		errors.push(`File size must be less than ${maxMB}MB`);
	}

	// Check MIME type
	if (requireWebP && !validateMimeType(file.type)) {
		errors.push('Only WebP images are allowed');
	}

	// Check WebP magic bytes (deep validation)
	if (requireWebP) {
		try {
			const buffer = await file.arrayBuffer();
			if (!validateWebP(buffer)) {
				errors.push('Invalid WebP file format');
			}
		} catch {
			errors.push('Failed to read file');
		}
	}

	// Check aspect ratio if specified
	if (aspectRatio) {
		const dimensions = await getImageDimensions(file);
		if (!dimensions) {
			errors.push('Failed to read image dimensions');
		} else if (
			!validateAspectRatio(
				dimensions.width,
				dimensions.height,
				aspectRatio.width,
				aspectRatio.height,
				aspectRatioTolerance
			)
		) {
			errors.push(`Invalid aspect ratio. Expected ${aspectRatio.width}:${aspectRatio.height}`);
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

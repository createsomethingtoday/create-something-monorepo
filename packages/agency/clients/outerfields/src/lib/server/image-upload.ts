export const MAX_THUMBNAIL_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MIN_THUMBNAIL_WIDTH = 640;
export const MIN_THUMBNAIL_HEIGHT = 360;

const JPEG_SOI_0 = 0xff;
const JPEG_SOI_1 = 0xd8;
const JPEG_MARKER_PREFIX = 0xff;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

const RIFF_TAG = [0x52, 0x49, 0x46, 0x46] as const;
const WEBP_TAG = [0x57, 0x45, 0x42, 0x50] as const;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);

export type SupportedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';
export type SupportedImageExtension = 'jpg' | 'png' | 'webp';

export interface ImageDimensions {
	width: number;
	height: number;
}

export interface ValidatedImageUpload {
	contentType: SupportedImageMime;
	extension: SupportedImageExtension;
	size: number;
	width: number;
	height: number;
}

export class ImageUploadValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ImageUploadValidationError';
	}
}

function matchesAt(bytes: Uint8Array, offset: number, expected: readonly number[]): boolean {
	if (offset < 0 || bytes.length < offset + expected.length) return false;
	for (let i = 0; i < expected.length; i += 1) {
		if (bytes[offset + i] !== expected[i]) return false;
	}
	return true;
}

function readU16BE(bytes: Uint8Array, offset: number): number {
	return (bytes[offset] << 8) | bytes[offset + 1];
}

function readU32BE(bytes: Uint8Array, offset: number): number {
	return (
		(bytes[offset] * 0x1000000) +
		((bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3])
	);
}

function readU24LE(bytes: Uint8Array, offset: number): number {
	return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function normalizeDeclaredMime(mime: string): SupportedImageMime | null {
	if (mime === 'image/jpg') return 'image/jpeg';
	if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp') return mime;
	return null;
}

function sniffMime(bytes: Uint8Array): SupportedImageMime | null {
	if (bytes.length >= 3 && bytes[0] === JPEG_SOI_0 && bytes[1] === JPEG_SOI_1 && bytes[2] === JPEG_MARKER_PREFIX) {
		return 'image/jpeg';
	}
	if (matchesAt(bytes, 0, PNG_SIGNATURE)) {
		return 'image/png';
	}
	if (matchesAt(bytes, 0, RIFF_TAG) && matchesAt(bytes, 8, WEBP_TAG)) {
		return 'image/webp';
	}
	return null;
}

function parsePngDimensions(bytes: Uint8Array): ImageDimensions | null {
	// PNG IHDR width/height are big-endian uint32 at offsets 16 and 20.
	if (!matchesAt(bytes, 0, PNG_SIGNATURE) || bytes.length < 24) return null;
	const width = readU32BE(bytes, 16);
	const height = readU32BE(bytes, 20);
	if (width <= 0 || height <= 0) return null;
	return { width, height };
}

function isJpegSofMarker(marker: number): boolean {
	return (
		marker === 0xc0 ||
		marker === 0xc1 ||
		marker === 0xc2 ||
		marker === 0xc3 ||
		marker === 0xc5 ||
		marker === 0xc6 ||
		marker === 0xc7 ||
		marker === 0xc9 ||
		marker === 0xca ||
		marker === 0xcb ||
		marker === 0xcd ||
		marker === 0xce ||
		marker === 0xcf
	);
}

function parseJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
	if (bytes.length < 4 || bytes[0] !== JPEG_SOI_0 || bytes[1] !== JPEG_SOI_1) return null;

	let offset = 2;
	while (offset + 3 < bytes.length) {
		if (bytes[offset] !== JPEG_MARKER_PREFIX) {
			offset += 1;
			continue;
		}

		// Skip repeated 0xFF bytes before the actual marker.
		while (offset < bytes.length && bytes[offset] === JPEG_MARKER_PREFIX) {
			offset += 1;
		}
		if (offset >= bytes.length) break;

		const marker = bytes[offset];
		offset += 1;

		// Standalone markers do not include a length field.
		if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
			continue;
		}

		if (offset + 1 >= bytes.length) return null;
		const segmentLength = readU16BE(bytes, offset);
		if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;

		if (isJpegSofMarker(marker)) {
			if (segmentLength < 7) return null;
			const height = readU16BE(bytes, offset + 3);
			const width = readU16BE(bytes, offset + 5);
			if (width <= 0 || height <= 0) return null;
			return { width, height };
		}

		offset += segmentLength;
	}

	return null;
}

function parseWebpVp8Dimensions(chunkData: Uint8Array): ImageDimensions | null {
	if (chunkData.length < 10) return null;
	if (!(chunkData[3] === 0x9d && chunkData[4] === 0x01 && chunkData[5] === 0x2a)) return null;

	const width = (chunkData[6] | (chunkData[7] << 8)) & 0x3fff;
	const height = (chunkData[8] | (chunkData[9] << 8)) & 0x3fff;
	if (width <= 0 || height <= 0) return null;
	return { width, height };
}

function parseWebpVp8lDimensions(chunkData: Uint8Array): ImageDimensions | null {
	if (chunkData.length < 5) return null;
	if (chunkData[0] !== 0x2f) return null;
	const bits = chunkData[1] | (chunkData[2] << 8) | (chunkData[3] << 16) | (chunkData[4] << 24);
	const width = (bits & 0x3fff) + 1;
	const height = ((bits >> 14) & 0x3fff) + 1;
	if (width <= 0 || height <= 0) return null;
	return { width, height };
}

function parseWebpVp8xDimensions(chunkData: Uint8Array): ImageDimensions | null {
	if (chunkData.length < 10) return null;
	const width = readU24LE(chunkData, 4) + 1;
	const height = readU24LE(chunkData, 7) + 1;
	if (width <= 0 || height <= 0) return null;
	return { width, height };
}

function parseWebpDimensions(bytes: Uint8Array): ImageDimensions | null {
	if (!matchesAt(bytes, 0, RIFF_TAG) || !matchesAt(bytes, 8, WEBP_TAG)) return null;
	let offset = 12;

	while (offset + 8 <= bytes.length) {
		const chunkTagBytes = bytes.subarray(offset, offset + 4);
		const chunkTag = String.fromCharCode(
			chunkTagBytes[0],
			chunkTagBytes[1],
			chunkTagBytes[2],
			chunkTagBytes[3]
		);
		const chunkSize = readU32BE(
			new Uint8Array([bytes[offset + 7], bytes[offset + 6], bytes[offset + 5], bytes[offset + 4]]),
			0
		);
		const chunkDataStart = offset + 8;
		const chunkDataEnd = chunkDataStart + chunkSize;
		if (chunkDataEnd > bytes.length) return null;

		const chunkData = bytes.subarray(chunkDataStart, chunkDataEnd);

		if (chunkTag === 'VP8 ') {
			const parsed = parseWebpVp8Dimensions(chunkData);
			if (parsed) return parsed;
		}
		if (chunkTag === 'VP8L') {
			const parsed = parseWebpVp8lDimensions(chunkData);
			if (parsed) return parsed;
		}
		if (chunkTag === 'VP8X') {
			const parsed = parseWebpVp8xDimensions(chunkData);
			if (parsed) return parsed;
		}

		// Chunks are padded to even lengths.
		offset = chunkDataEnd + (chunkSize % 2);
	}

	return null;
}

function extractDimensions(bytes: Uint8Array, mime: SupportedImageMime): ImageDimensions | null {
	if (mime === 'image/png') return parsePngDimensions(bytes);
	if (mime === 'image/jpeg') return parseJpegDimensions(bytes);
	return parseWebpDimensions(bytes);
}

function extensionForMime(mime: SupportedImageMime): SupportedImageExtension {
	if (mime === 'image/png') return 'png';
	if (mime === 'image/webp') return 'webp';
	return 'jpg';
}

export function assertValidThumbnailUpload(file: {
	mimeType: string;
	size: number;
	bytes: Uint8Array;
}): ValidatedImageUpload {
	if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
		throw new ImageUploadValidationError('Thumbnail must be a JPG, PNG, or WebP image.');
	}
	if (file.size <= 0) {
		throw new ImageUploadValidationError('Thumbnail file is empty.');
	}
	if (file.size > MAX_THUMBNAIL_UPLOAD_BYTES) {
		throw new ImageUploadValidationError(
			`Thumbnail exceeds 5MB limit (${MAX_THUMBNAIL_UPLOAD_BYTES} bytes max).`
		);
	}

	const declaredMime = normalizeDeclaredMime(file.mimeType);
	const sniffedMime = sniffMime(file.bytes);
	if (!declaredMime || !sniffedMime || declaredMime !== sniffedMime) {
		throw new ImageUploadValidationError('Invalid image signature for declared thumbnail MIME type.');
	}

	const dimensions = extractDimensions(file.bytes, sniffedMime);
	if (!dimensions || !Number.isFinite(dimensions.width) || !Number.isFinite(dimensions.height)) {
		throw new ImageUploadValidationError('Could not read thumbnail dimensions.');
	}
	if (dimensions.width < MIN_THUMBNAIL_WIDTH || dimensions.height < MIN_THUMBNAIL_HEIGHT) {
		throw new ImageUploadValidationError(
			`Thumbnail dimensions too small (${dimensions.width}x${dimensions.height}). Minimum is ${MIN_THUMBNAIL_WIDTH}x${MIN_THUMBNAIL_HEIGHT}.`
		);
	}

	return {
		contentType: sniffedMime,
		extension: extensionForMime(sniffedMime),
		size: file.size,
		width: dimensions.width,
		height: dimensions.height
	};
}

import { describe, expect, it } from 'vitest';
import { getWebPDimensions, validateWebP } from './upload-validation';

function writeAscii(target: Uint8Array, offset: number, value: string): void {
	for (let index = 0; index < value.length; index++) {
		target[offset + index] = value.charCodeAt(index);
	}
}

function createVp8xWebP(width: number, height: number): ArrayBuffer {
	const totalLength = 30; // 12-byte RIFF header + 8-byte chunk header + 10-byte VP8X payload
	const bytes = new Uint8Array(totalLength);

	// RIFF + WEBP
	writeAscii(bytes, 0, 'RIFF');
	const fileSize = totalLength - 8;
	bytes[4] = fileSize & 0xff;
	bytes[5] = (fileSize >> 8) & 0xff;
	bytes[6] = (fileSize >> 16) & 0xff;
	bytes[7] = (fileSize >> 24) & 0xff;
	writeAscii(bytes, 8, 'WEBP');

	// VP8X chunk header
	writeAscii(bytes, 12, 'VP8X');
	bytes[16] = 10; // chunk size (little-endian)
	bytes[17] = 0;
	bytes[18] = 0;
	bytes[19] = 0;

	// VP8X payload
	const widthMinusOne = width - 1;
	const heightMinusOne = height - 1;
	bytes[24] = widthMinusOne & 0xff;
	bytes[25] = (widthMinusOne >> 8) & 0xff;
	bytes[26] = (widthMinusOne >> 16) & 0xff;
	bytes[27] = heightMinusOne & 0xff;
	bytes[28] = (heightMinusOne >> 8) & 0xff;
	bytes[29] = (heightMinusOne >> 16) & 0xff;

	return bytes.buffer;
}

describe('getWebPDimensions', () => {
	it('returns null for invalid input', () => {
		const invalid = new Uint8Array([0, 1, 2, 3]).buffer;
		expect(validateWebP(invalid)).toBe(false);
		expect(getWebPDimensions(invalid)).toBeNull();
	});

	it('extracts VP8X dimensions from image bytes', () => {
		const buffer = createVp8xWebP(750, 995);
		expect(validateWebP(buffer)).toBe(true);
		expect(getWebPDimensions(buffer)).toEqual({ width: 750, height: 995 });
	});
});

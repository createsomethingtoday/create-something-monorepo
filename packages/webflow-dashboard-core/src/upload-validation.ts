const RIFF_SIGNATURE = 'RIFF';
const WEBP_SIGNATURE = 'WEBP';

export const THUMBNAIL_ASPECT_RATIO = {
  width: 150,
  height: 199,
  ratio: 150 / 199,
  tolerance: 0.01
} as const;

export function validateWebP(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 12) return false;

  const header = new TextDecoder('ascii').decode(new Uint8Array(buffer.slice(0, 4)));
  const type = new TextDecoder('ascii').decode(new Uint8Array(buffer.slice(8, 12)));

  return header === RIFF_SIGNATURE && type === WEBP_SIGNATURE;
}

export function validateWebPMagicBytes(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 12) return false;

  const bytes = new Uint8Array(buffer);
  const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const isWebP = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

  return isRiff && isWebP;
}

export function getWebPDimensions(buffer: ArrayBuffer): { width: number; height: number } | null {
  if (!validateWebPMagicBytes(buffer)) return null;

  const bytes = new Uint8Array(buffer);
  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const chunkType = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3]
    );
    const chunkSize =
      bytes[offset + 4] |
      (bytes[offset + 5] << 8) |
      (bytes[offset + 6] << 16) |
      (bytes[offset + 7] << 24);
    const dataOffset = offset + 8;

    if (dataOffset + chunkSize > bytes.length) return null;

    if (chunkType === 'VP8X') {
      if (chunkSize < 10) return null;
      const widthMinusOne =
        bytes[dataOffset + 4] |
        (bytes[dataOffset + 5] << 8) |
        (bytes[dataOffset + 6] << 16);
      const heightMinusOne =
        bytes[dataOffset + 7] |
        (bytes[dataOffset + 8] << 8) |
        (bytes[dataOffset + 9] << 16);

      return { width: widthMinusOne + 1, height: heightMinusOne + 1 };
    }

    if (chunkType === 'VP8 ') {
      if (chunkSize < 10) return null;
      if (
        bytes[dataOffset + 3] !== 0x9d ||
        bytes[dataOffset + 4] !== 0x01 ||
        bytes[dataOffset + 5] !== 0x2a
      ) {
        return null;
      }

      const rawWidth = bytes[dataOffset + 6] | (bytes[dataOffset + 7] << 8);
      const rawHeight = bytes[dataOffset + 8] | (bytes[dataOffset + 9] << 8);

      return {
        width: rawWidth & 0x3fff,
        height: rawHeight & 0x3fff
      };
    }

    if (chunkType === 'VP8L') {
      if (chunkSize < 5 || bytes[dataOffset] !== 0x2f) return null;

      const b1 = bytes[dataOffset + 1];
      const b2 = bytes[dataOffset + 2];
      const b3 = bytes[dataOffset + 3];
      const b4 = bytes[dataOffset + 4];

      return {
        width: 1 + (b1 | ((b2 & 0x3f) << 8)),
        height: 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10))
      };
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  return null;
}

export function validateThumbnailAspectRatio(
  width: number,
  height: number,
  tolerance: number = THUMBNAIL_ASPECT_RATIO.tolerance
): boolean {
  if (width <= 0 || height <= 0) return false;
  const actualRatio = width / height;
  const deviation = Math.abs(actualRatio - THUMBNAIL_ASPECT_RATIO.ratio);
  return deviation <= tolerance;
}

export function validateMimeType(type: string): boolean {
  return type === 'image/webp';
}

export function validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
  return size > 0 && size <= maxSize;
}

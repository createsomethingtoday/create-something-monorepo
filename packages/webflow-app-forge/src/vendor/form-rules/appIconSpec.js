// App icon requirements from the listing docs: 900x900px, 1:1 ratio, PNG,
// 50KB max. Type and size are checked here; pixel dimensions need image
// decoding, which the browser does in the form (see validateAppIconDimensions
// usage in complete-form.js).

export const APP_ICON_MAX_BYTES = 50 * 1024;
export const APP_ICON_REQUIRED_SIZE = 900;

export function getAppIconStaticError(file) {
  if (!file) {
    return null;
  }

  const type = String(file.type || '').toLowerCase();
  if (type && type !== 'image/png') {
    return 'App icon must be a PNG file (900x900px, 50KB max).';
  }

  if (Number(file.size) > APP_ICON_MAX_BYTES) {
    const sizeKb = Math.ceil(Number(file.size) / 1024);
    return `App icon must be 50KB or smaller (this file is ${sizeKb}KB). Export a compressed 900x900 PNG.`;
  }

  return null;
}

export function getAppIconDimensionError(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  if (width !== APP_ICON_REQUIRED_SIZE || height !== APP_ICON_REQUIRED_SIZE) {
    return `App icon must be exactly 900x900px (this image is ${width}x${height}).`;
  }

  return null;
}

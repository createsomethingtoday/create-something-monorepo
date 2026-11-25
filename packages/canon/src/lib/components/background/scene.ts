/** A scene supports HTML content; it never carries essential instructions alone. */
export interface CanonBackgroundScene {
  src: string;
  /** Authored image ratios preserve the full scene without cropping. */
  aspectRatio?: number;
  mobileAspectRatio?: number;
  mobileSrc?: string;
  /** Omit for decoration. Supply a concise description when the scene adds meaning. */
  description?: string;
  position?: string;
  mobilePosition?: string;
  size?: string;
  mobileSize?: string;
}
/** Quote a URL as CSS data, including quotes, slashes and line breaks. */
export function backgroundImage(src: string): string {
  return `url("${src.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\n\r\f]/g, c => `\\${c.charCodeAt(0).toString(16)} `)}")`;
}

/** Ignore absent or invalid metadata rather than emitting broken CSS geometry. */
export function imageAspectRatio(width?: number, height?: number): number | undefined {
  return typeof width === 'number' && typeof height === 'number' &&
    Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? width / height
    : undefined;
}

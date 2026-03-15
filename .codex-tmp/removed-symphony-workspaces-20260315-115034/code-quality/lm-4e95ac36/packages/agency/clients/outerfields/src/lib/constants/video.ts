/**
 * Video CDN base URL for R2 (or custom domain).
 * Set PUBLIC_VIDEO_CDN_BASE in .env to your Cloudflare R2 public URL
 * (e.g. https://pub-xxxx.r2.dev or your custom domain).
 */
const DEFAULT_R2_CDN = 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev';

export const VIDEO_CDN_BASE =
	(import.meta as ImportMeta & { env?: Record<string, string> }).env?.PUBLIC_VIDEO_CDN_BASE ||
	DEFAULT_R2_CDN;

export type Role = 'admin' | 'member' | 'blocked';
export interface VideoPolicy {
  visibility: string;
  ingest_status: string;
  access: string;
}
export function canPlay(video: VideoPolicy, role?: Role): boolean {
  if (video.ingest_status !== 'ready') return false;
  if (role === 'admin') return true;
  return video.visibility === 'published' && (video.access === 'public' || role === 'member');
}
export function canRead(video: VideoPolicy, role?: Role): boolean {
  return (
    role === 'admin' ||
    (video.visibility === 'published' &&
      video.ingest_status === 'ready' &&
      (video.access === 'public' || role === 'member'))
  );
}
export function isSameOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function impactSurface(path: string): string | null {
  const pages: Record<string, string> = {
    '/': 'home',
    '/field-engineering': 'field',
    '/apply': 'apply',
    '/start': 'start',
    '/signup': 'signup',
    '/login': 'login',
    '/collection': 'collection',
    '/library': 'library',
    '/dashboard': 'workspace',
    '/support': 'support'
  };
  if (/^\/(?:n\/[a-z0-9-]+\/)?paths(?:\/[a-z0-9-]+)?$/.test(path)) return 'learning_path';
  if (pages[path]) return pages[path];
  if (/^\/(?:n\/[a-z0-9-]+\/)?lessons\/[a-z0-9-]+$/.test(path)) return 'lesson';
  if (/^\/n\/[a-z0-9-]+\/assets\/[a-z0-9-]+$/.test(path)) return 'asset';
  if (/^\/n\/[a-z0-9-]+\/settings$/.test(path)) return 'settings';
  if (/^\/n\/[a-z0-9-]+$/.test(path)) return 'network';
  return null;
}
export function trackImpact(
  event: 'page_view' | 'primary_action' | 'lesson_start' | 'lesson_resume' | 'practice_start',
  path: string
) {
  const surface = impactSurface(path);
  if (
    document.querySelector('meta[name="pcn-support-session"]')?.getAttribute('content') ||
    !surface ||
    navigator.doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
  )
    return;
  void fetch('/api/impact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, surface }),
    keepalive: true
  }).catch(() => {});
}

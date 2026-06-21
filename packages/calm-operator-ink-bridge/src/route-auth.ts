import type { AuthRole } from './auth.js';

const deviceGetPaths = new Set(['/ink/brief', '/ink/surface-brief', '/ink/clock', '/ink/device', '/ink/linear-open']);
const devicePostPaths = new Set(['/ink/device-heartbeat', '/ink/health-review/request', '/ink/operator-event', '/ink/linear-action']);

export function authRoleForInkRoute(method: string, path: string): AuthRole | null {
  const normalizedMethod = method.toUpperCase();

  if (normalizedMethod === 'GET' && deviceGetPaths.has(path)) return 'device';
  if (normalizedMethod === 'POST' && devicePostPaths.has(path)) return 'device';
  if (path.startsWith('/ink/')) return 'source';

  return null;
}

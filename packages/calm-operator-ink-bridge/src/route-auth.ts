import type { AuthRole } from './auth.js';

const deviceGetPaths = new Set(['/ink/brief', '/ink/surface-brief', '/ink/clock', '/ink/device', '/ink/linear-open']);
const devicePostPaths = new Set(['/ink/device-heartbeat', '/ink/health-review/request', '/ink/operator-event', '/ink/linear-action']);
const runnerPaths = new Set([
  'POST /ink/codex/snapshot',
  'GET /ink/codex/commands/next'
]);

export function authRoleForInkRoute(method: string, path: string): AuthRole | null {
  const normalizedMethod = method.toUpperCase();
  const route = `${normalizedMethod} ${path}`;

  if (runnerPaths.has(route)) return 'runner';
  if (
    normalizedMethod === 'POST' &&
    /^\/ink\/codex\/commands\/[A-Za-z0-9][A-Za-z0-9:._-]*\/(claim|receipt)$/.test(path)
  ) return 'runner';

  if (normalizedMethod === 'GET' && deviceGetPaths.has(path)) return 'device';
  if (normalizedMethod === 'POST' && devicePostPaths.has(path)) return 'device';
  if (normalizedMethod === 'GET' && path === '/ink/codex') return 'device';
  if (normalizedMethod === 'POST' && path === '/ink/codex/commands') return 'device';
  if (
    normalizedMethod === 'GET' &&
    /^\/ink\/codex\/commands\/[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(path)
  ) return 'device';
  if (path.startsWith('/ink/')) return 'source';

  return null;
}

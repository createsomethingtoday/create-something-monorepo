import type { AuthRole } from './auth.js';

const deviceGetPaths = new Set([
  '/ink/brief',
  '/ink/surface-brief',
  '/ink/clock',
  '/ink/device',
  '/ink/linear-open',
  '/ink/agent-console'
]);
const devicePostPaths = new Set([
  '/ink/device-heartbeat',
  '/ink/health-review/request',
  '/ink/operator-event',
  '/ink/linear-action',
  '/ink/agent-decision'
]);
const relayPostPaths = new Set(['/ink/agent-progress', '/ink/agent-decisions/lease']);

export function authRoleForInkRoute(method: string, path: string): AuthRole | null {
  const normalizedMethod = method.toUpperCase();

  if (normalizedMethod === 'GET' && deviceGetPaths.has(path)) return 'device';
  if (normalizedMethod === 'POST' && devicePostPaths.has(path)) return 'device';
  if (
    normalizedMethod === 'POST' &&
    (relayPostPaths.has(path) || /^\/ink\/agent-decisions\/[^/]+\/receipt$/.test(path))
  )
    return 'relay';
  if (path.startsWith('/ink/')) return 'source';

  return null;
}

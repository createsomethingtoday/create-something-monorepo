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
  '/ink/agent-decision',
  '/ink/voice-command'
]);
const relayPostPaths = new Set([
  '/ink/agent-progress',
  '/ink/agent-decisions/lease',
  '/ink/voice-commands/lease'
]);

export function canonicalOperatorPath(path: string): string {
  if (path === '/operator') return '/ink';
  if (path.startsWith('/operator/')) return `/ink/${path.slice('/operator/'.length)}`;
  return path;
}

export function authRoleForOperatorRoute(method: string, path: string): AuthRole | null {
  const normalizedMethod = method.toUpperCase();
  const canonicalPath = canonicalOperatorPath(path);

  if (normalizedMethod === 'GET' && deviceGetPaths.has(canonicalPath)) return 'device';
  if (normalizedMethod === 'GET' && /^\/ink\/voice-command\/[^/]+$/.test(canonicalPath)) {
    return 'device';
  }
  if (normalizedMethod === 'POST' && devicePostPaths.has(canonicalPath)) return 'device';
  if (normalizedMethod === 'POST' && /^\/ink\/voice-command\/[^/]+\/confirm$/.test(canonicalPath)) {
    return 'device';
  }
  if (
    normalizedMethod === 'POST' &&
    (relayPostPaths.has(canonicalPath) ||
      /^\/ink\/agent-decisions\/[^/]+\/receipt$/.test(canonicalPath) ||
      /^\/ink\/voice-command\/[^/]+\/transcript$/.test(canonicalPath))
  )
    return 'relay';
  if (canonicalPath.startsWith('/ink/')) return 'source';

  return null;
}

/** @deprecated Use authRoleForOperatorRoute. */
export const authRoleForInkRoute = authRoleForOperatorRoute;

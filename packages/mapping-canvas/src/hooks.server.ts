import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' https://cloudflareinsights.com${dev ? ' ws: wss:' : ''}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests'
  ].join('; '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
} as const;

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
  // Only the public canvas explicitly requested by the Agency mapping workbench
  // may be framed. Shared views and other routes retain their deny policy.
  if (event.url.pathname === '/' && event.url.searchParams.get('embed') === 'agency') {
    response.headers.set('Content-Security-Policy', SECURITY_HEADERS['Content-Security-Policy']
      .replace("frame-ancestors 'none'", 'frame-ancestors https://createsomething.agency'));
    response.headers.delete('X-Frame-Options');
  }
  return response;
};

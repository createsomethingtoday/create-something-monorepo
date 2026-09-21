import { json, type RequestEvent } from '@sveltejs/kit';
import { isReviewer } from './admission';
import { networkRole } from './networks';
import { isSameOrigin } from './policy';
export const supportCookie = '__Host-pcn_impersonation';
export type SupportSession = {
  id: string;
  actor_subject: string;
  actor_email: string;
  target_subject: string;
  target_email: string;
  reason: string;
  expires_at: number;
  revoked_at: number | null;
};
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
    (b) => b.toString(16).padStart(2, '0')
  ).join('');
}
export async function liveTarget(event: RequestEvent, email: string) {
  // SvelteKit event.fetch inherits Origin; the deputy intentionally rejects browser requests.
  const response = await fetch('https://id.createsomething.space/v1/private/support-target', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${event.cookies.get('__Host-pcn_access') || ''}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('Active target identity could not be verified.');
  const target = (await response.json()) as {
    id?: string;
    email?: string;
    email_verified?: boolean;
  };
  if (!target.id || target.email?.toLowerCase() !== email || target.email_verified !== true)
    throw new Error('Target identity changed.');
  return { subject: target.id, email };
}
// Explicit mutation allowlist: newly added actions are unavailable until reviewed.
export function supportActionAllowed(path: string, method: string) {
  if (
    /\/(?:billing|seller|purchase|recover)(?:\/|$)/.test(path) ||
    path.startsWith('/api/support') ||
    path.startsWith('/api/creators/review') ||
    path === '/review' ||
    path === '/impact' ||
    (path === '/api/impact' && method !== 'POST')
  )
    return false;
  if (method === 'GET' || method === 'HEAD') return true;
  if (method !== 'POST') return false;
  return (
    /^\/api\/(?:networks|playback|impact|creators\/(?:application|invitations))$/.test(path) ||
    /^\/api\/networks\/[a-z0-9-]+\/(?:settings|trial|field-notes|members|playback|uploads(?:\/reconcile)?|videos\/(?:status|publish)|assets(?:\/[a-zA-Z0-9-]+(?:\/release)?)?)$/.test(
      path
    )
  );
}
export async function applyImpersonation(
  event: RequestEvent
): Promise<{ response?: Response; auditId?: string }> {
  const token = event.cookies.get(supportCookie);
  if (
    event.url.pathname === '/api/impersonation' ||
    (event.url.pathname === '/support-session' && event.request.method === 'GET')
  )
    return {};
  if (!token) {
    if (
      !['GET', 'HEAD'].includes(event.request.method) &&
      event.request.headers.get('X-PCN-Support-Session')
    )
      return {
        response: json(
          { error: 'Account context changed. Reload before making changes.' },
          { status: 409 }
        )
      };
    return {};
  }
  const env = event.platform?.env;
  const actor = event.locals.identity;
  // Never silently fall back to administrator permissions with an invalid target session.
  event.locals.identity = null;
  event.locals.impersonation = { email: '', expiresAt: 0, invalid: true };
  const deny = (message: string, status = 403) => ({
    response: event.url.pathname.startsWith('/api/')
      ? json({ error: message }, { status })
      : new Response(
          '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Support session | Private</title><style>body{margin:0;background:#080a08;color:#f4f4ef;font:18px/1.6 system-ui,sans-serif}main{max-width:640px;margin:10vh auto;padding:24px}h1{font-size:clamp(32px,6vw,56px);line-height:1.1;font-weight:500}a{display:inline-block;color:#131b18;background:#dce8f3;padding:14px 24px;margin-top:20px;text-decoration:none}a:focus-visible{outline:3px solid #b9cd80;outline-offset:5px}</style><main><p>CREATE SOMETHING / PRIVATE</p><h1>Support session needs attention</h1><p>' +
            message +
            '</p><a href="/support-session">Return to administrator</a></main></html>',
          {
            status,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
          }
        )
  });
  try {
    if (!env || env.PCN_IMPERSONATION_ENABLED !== 'true' || !isReviewer(actor, env))
      return deny('Support session unavailable. Return to administrator.', 401);
    const session = await env.DB.prepare(
      'SELECT * FROM impersonation_sessions WHERE token_hash=? AND actor_subject=? AND revoked_at IS NULL AND expires_at>?'
    )
      .bind(await digest(token), actor!.subject, Math.floor(Date.now() / 1000))
      .first<SupportSession>();
    if (!session) return deny('Support session expired. Return to administrator.', 401);
    const target = await liveTarget(event, session.target_email);
    if (
      target.subject !== session.target_subject ||
      target.subject === actor!.subject ||
      isReviewer({ ...target, role: 'blocked' }, env)
    )
      return deny('Target is not eligible.');
    event.locals.impersonation = {
      id: session.id,
      email: target.email,
      expiresAt: session.expires_at,
      invalid: false
    };
    const id = crypto.randomUUID();
    // Write intent before access or mutation. A failed receipt prevents the operation.
    await env.DB.prepare(
      'INSERT INTO impersonation_requests(id,session_id,actor_subject,target_subject,method,path) VALUES(?,?,?,?,?,?)'
    )
      .bind(
        id,
        session.id,
        actor!.subject,
        target.subject,
        event.request.method,
        event.url.pathname
      )
      .run();
    if (
      !['GET', 'HEAD'].includes(event.request.method) &&
      event.request.headers.get('X-PCN-Support-Session') !== session.id
    ) {
      await env.DB.prepare('UPDATE impersonation_requests SET status=409 WHERE id=?')
        .bind(id)
        .run();
      return deny('Account context changed. Reload before making changes.', 409);
    }
    if (
      (event.locals.network?.kind === 'support' &&
        !['GET', 'HEAD'].includes(event.request.method) &&
        !event.url.pathname.endsWith('/playback')) ||
      !supportActionAllowed(event.url.pathname, event.request.method) ||
      (!['GET', 'HEAD'].includes(event.request.method) && !isSameOrigin(event.request))
    ) {
      await env.DB.prepare('UPDATE impersonation_requests SET status=403 WHERE id=?')
        .bind(id)
        .run();
      return deny('This action requires the account holder or your administrator session.');
    }
    const role = event.locals.network
      ? await networkRole(env.DB, event.locals.network, target, false)
      : 'blocked';
    event.locals.identity = { ...target, role: role || 'blocked' };
    return { auditId: id };
  } catch {
    return deny('Support session verification unavailable. Return to administrator.', 503);
  }
}

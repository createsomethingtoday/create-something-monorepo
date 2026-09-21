import { error, redirect } from '@sveltejs/kit';
import { isReviewer } from '$lib/server/admission';
import { supportCookie } from '$lib/server/impersonation';
export const load = async ({ locals, platform, cookies }) => {
  const active = !!cookies.get(supportCookie);
  if (
    active &&
    (!locals.identity ||
      !platform?.env ||
      !isReviewer(locals.identity, platform.env) ||
      platform.env.PCN_IMPERSONATION_ENABLED !== 'true')
  )
    return { active: true, sessions: [] };
  if (!locals.identity) redirect(303, '/login?next=/support-session');
  if (!platform?.env || !isReviewer(locals.identity, platform.env))
    error(403, 'Administrator access required.');
  if (platform.env.PCN_IMPERSONATION_ENABLED !== 'true')
    error(503, 'Support sessions are not enabled.');
  const { results } = await platform.env.DB.prepare(
    'SELECT actor_email,target_email,reason,created_at,expires_at,revoked_at FROM impersonation_sessions ORDER BY created_at DESC LIMIT 30'
  ).all();
  return { active: !!cookies.get(supportCookie), sessions: results };
};

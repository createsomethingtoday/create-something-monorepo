import { json, type RequestHandler } from '@sveltejs/kit';
import { isReviewer } from '$lib/server/admission';
import { boundedText } from '$lib/server/body';
import { isSameOrigin, normalizeEmail } from '$lib/server/policy';
import { digest, liveTarget, supportCookie } from '$lib/server/impersonation';
export const POST: RequestHandler = async (event) => {
  const { locals, platform, request, cookies } = event;
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  let body;
  try {
    body = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return json({ error: 'Invalid request.' }, { status: 400 });
  const env = platform?.env,
    actor = locals.identity;
  if (body.action === 'stop') {
    const token = cookies.get(supportCookie);
    if (token && env && actor) {
      try {
        await env.DB.prepare(
          'UPDATE impersonation_sessions SET revoked_at=? WHERE token_hash=? AND actor_subject=? AND revoked_at IS NULL'
        )
          .bind(Math.floor(Date.now() / 1000), await digest(token), actor.subject)
          .run();
      } catch {
        return json({ error: 'Could not close support session. Try again.' }, { status: 503 });
      }
    }
    cookies.delete(supportCookie, { path: '/' });
    return json({ stopped: true });
  }
  if (!env || env.PCN_IMPERSONATION_ENABLED !== 'true')
    return json({ error: 'Support sessions are unavailable.' }, { status: 503 });
  if (!isReviewer(actor, env))
    return json({ error: 'Administrator access required.' }, { status: 403 });
  if (cookies.get(supportCookie))
    return json(
      { error: 'Return to administrator before starting another session.' },
      { status: 409 }
    );
  const email = normalizeEmail(body.email),
    reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!email || reason.length < 10 || reason.length > 500)
    return json(
      { error: 'Enter an account email and a support reason of 10–500 characters.' },
      { status: 400 }
    );
  if (isReviewer({ subject: '', email, role: 'blocked' }, env))
    return json({ error: 'Administrator accounts cannot be impersonated.' }, { status: 403 });
  // Only identities already participating in this Private deployment are eligible.
  const known = await env.DB.prepare(
    'SELECT email FROM creator_applications WHERE email=? UNION SELECT email FROM members WHERE email=? LIMIT 1'
  )
    .bind(email, email)
    .first();
  if (!known) return json({ error: 'Private account not found.' }, { status: 404 });
  try {
    const target = await liveTarget(event, email);
    if (target.subject === actor!.subject)
      return json({ error: 'Choose another account.' }, { status: 400 });
    const id = crypto.randomUUID(),
      token = crypto.randomUUID() + crypto.randomUUID(),
      expires = Math.floor(Date.now() / 1000) + 900;
    await env.DB.batch([
      env.DB.prepare(
        'UPDATE impersonation_sessions SET revoked_at=? WHERE actor_subject=? AND revoked_at IS NULL'
      ).bind(Math.floor(Date.now() / 1000), actor!.subject),
      env.DB.prepare(
        'INSERT INTO impersonation_sessions(id,token_hash,actor_subject,actor_email,target_subject,target_email,reason,expires_at) VALUES(?,?,?,?,?,?,?,?)'
      ).bind(
        id,
        await digest(token),
        actor!.subject,
        actor!.email,
        target.subject,
        email,
        reason,
        expires
      )
    ]);
    cookies.set(supportCookie, token, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 900
    });
    return json({ email, expiresAt: expires }, { status: 201 });
  } catch {
    return json(
      { error: 'Support session could not be started. Verify the active account and try again.' },
      { status: 503 }
    );
  }
};

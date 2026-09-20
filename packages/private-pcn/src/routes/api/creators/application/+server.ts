import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { boundedText } from '$lib/server/body';
import { isSameOrigin } from '$lib/server/policy';
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.identity)
    return json({ error: 'Sign in to view your application.' }, { status: 401 });
  if (!platform?.env.DB)
    return json({ error: 'Applications are temporarily unavailable.' }, { status: 503 });
  const application = await platform.env.DB.prepare(
    'SELECT display_name,credentials,teaching_video_url,status,review_note,created_at,updated_at FROM creator_applications WHERE subject=?'
  )
    .bind(locals.identity.subject)
    .first();
  return json({ application: application || null });
};
export const POST: RequestHandler = async ({ locals, platform, request }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  if (!locals.identity) return json({ error: 'Sign in to apply.' }, { status: 401 });
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Applications are temporarily unavailable.' }, { status: 503 });
  let body;
  try {
    body = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid application.' }, { status: 400 });
  }
  const name = typeof body?.display_name === 'string' ? body.display_name.trim() : '';
  const credentials = typeof body?.credentials === 'string' ? body.credentials.trim() : '';
  const video = typeof body?.teaching_video_url === 'string' ? body.teaching_video_url.trim() : '';
  let validVideo = false;
  try {
    const u = new URL(video);
    validVideo = u.protocol === 'https:' && !u.username && !u.password && video.length <= 2000;
  } catch {}
  if (
    !name ||
    name.length > 80 ||
    credentials.length < 30 ||
    credentials.length > 6000 ||
    !validVideo
  )
    return json(
      {
        error:
          'Add your name, professional experience (30–6000 characters), and an HTTPS link to a video teaching an agentic engineering technique.'
      },
      { status: 400 }
    );
  const result = await db
    .prepare(
      `INSERT INTO creator_applications(subject,email,display_name,credentials,teaching_video_url)
    VALUES(?,?,?,?,?) ON CONFLICT(subject) DO UPDATE SET display_name=excluded.display_name,credentials=excluded.credentials,
    teaching_video_url=excluded.teaching_video_url,status='pending',revision=creator_applications.revision+1,review_note='',reviewed_by=NULL,reviewed_at=NULL,updated_at=CURRENT_TIMESTAMP
    WHERE creator_applications.status='rejected'`
    )
    .bind(locals.identity.subject, locals.identity.email, name, credentials, video)
    .run();
  if (result.meta.changes !== 1)
    return json(
      { error: 'Your application is already submitted. Check its review status.' },
      { status: 409 }
    );
  return json({ status: 'pending' }, { status: 201 });
};

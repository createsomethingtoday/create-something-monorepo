import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isReviewer } from '$lib/server/admission';
import { isSameOrigin } from '$lib/server/policy';
import { boundedText } from '$lib/server/body';
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!platform?.env || !isReviewer(locals.identity, platform.env))
    return json({ error: 'Reviewer access required.' }, { status: 403 });
  const { results } = await platform.env.DB.prepare(
    'SELECT * FROM creator_applications ORDER BY updated_at DESC LIMIT 200'
  ).all();
  return json({ applications: results });
};
export const POST: RequestHandler = async ({ locals, platform, request }) => {
  if (!isSameOrigin(request) || !platform?.env || !isReviewer(locals.identity, platform.env))
    return json({ error: 'Reviewer access required.' }, { status: 403 });
  let body;
  try {
    body = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid decision.' }, { status: 400 });
  }
  if (
    !body ||
    typeof body.subject !== 'string' ||
    !['approved', 'rejected', 'suspended'].includes(body.status) ||
    !Number.isInteger(body.revision) ||
    body.revision < 0 ||
    typeof body.review_note !== 'string' ||
    body.review_note.trim().length < 5 ||
    body.review_note.length > 2000
  )
    return json({ error: 'Choose a decision and add a specific review note.' }, { status: 400 });
  const result = await platform.env.DB.prepare(
    `UPDATE creator_applications SET status=?,review_note=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,revision=revision+1 WHERE subject=? AND revision=?`
  )
    .bind(
      body.status,
      body.review_note.trim(),
      locals.identity!.subject,
      body.subject,
      body.revision
    )
    .run();
  if (result.meta.changes !== 1)
    return json({ error: 'This application changed. Refresh before reviewing.' }, { status: 409 });
  return json({ success: true });
};

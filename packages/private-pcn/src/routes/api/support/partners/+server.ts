import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isReviewer } from '$lib/server/admission';
import { isSameOrigin } from '$lib/server/policy';
import { boundedText } from '$lib/server/body';
export const POST: RequestHandler = async ({ locals, platform, request }) => {
  if (!isSameOrigin(request) || !platform?.env || !isReviewer(locals.identity, platform.env))
    return json({ error: 'Reviewer access required.' }, { status: 403 });
  let b;
  try {
    b = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid partner decision.' }, { status: 400 });
  }
  if (
    typeof b?.subject !== 'string' ||
    typeof b.approved !== 'boolean' ||
    typeof b.note !== 'string' ||
    b.note.trim().length < 5 ||
    b.note.length > 2000
  )
    return json({ error: 'Provide a partner and specific review note.' }, { status: 400 });
  const result = await platform.env.DB.prepare(
    `INSERT INTO support_partners(subject,approved,review_note,reviewed_by)
 SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM creator_applications WHERE subject=? AND (status='approved' OR ?=0))
 ON CONFLICT(subject) DO UPDATE SET approved=excluded.approved,review_note=excluded.review_note,reviewed_by=excluded.reviewed_by,updated_at=CURRENT_TIMESTAMP`
  )
    .bind(
      b.subject,
      b.approved ? 1 : 0,
      b.note.trim(),
      locals.identity!.subject,
      b.subject,
      b.approved ? 1 : 0
    )
    .run();
  if (result.meta.changes !== 1)
    return json(
      { error: 'Approve the creator before granting support-partner access.' },
      { status: 409 }
    );
  return json({ success: true });
};

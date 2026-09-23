import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isReviewer } from '$lib/server/admission';
import { isSameOrigin } from '$lib/server/policy';
import { boundedText } from '$lib/server/body';
type Introduction = {
  id: string;
  email: string;
  display_name: string;
  intent: string;
  practice: string;
  work_url: string;
  referral: string;
  status: string;
  review_note: string;
  revision: number;
  created_at: string;
};
export const load: PageServerLoad = async ({ locals, platform, url, setHeaders }) => {
  if (!locals.identity) redirect(303, '/login?next=/review');
  if (!platform?.env || locals.impersonation || !isReviewer(locals.identity, platform.env))
    error(403, 'Reviewer access required.');
  setHeaders({ 'Cache-Control': 'private, no-store' });
  const status = ['new', 'reviewed', 'closed'].includes(url.searchParams.get('status') || '')
    ? url.searchParams.get('status')!
    : 'new';
  const { results } = await platform.env.DB.prepare(
    'SELECT * FROM invitation_requests WHERE status=? ORDER BY created_at ASC LIMIT 200'
  )
    .bind(status)
    .all<Introduction>();
  const counts = await platform.env.DB.prepare(
    'SELECT status, COUNT(*) AS count FROM invitation_requests GROUP BY status'
  ).all<{ status: string; count: number }>();
  return { introductions: results, status, counts: counts.results };
};
export const actions = {
  default: async ({ locals, platform, request }) => {
    if (
      !isSameOrigin(request) ||
      !platform?.env ||
      locals.impersonation ||
      !isReviewer(locals.identity, platform.env)
    )
      error(403, 'Reviewer access required.');
    let fields: FormData;
    try {
      fields = await new Request(request.url, {
        method: 'POST',
        headers: { 'content-type': request.headers.get('content-type') || '' },
        body: await boundedText(request)
      }).formData();
    } catch {
      return fail(400, { error: 'Invalid review.' });
    }
    const id = fields.get('id'),
      status = fields.get('status'),
      note = fields.get('note'),
      rawRevision = fields.get('revision');
    const revision = Number(rawRevision);
    if (
      typeof id !== 'string' ||
      id.length > 80 ||
      typeof status !== 'string' ||
      !['new', 'reviewed', 'closed'].includes(status) ||
      typeof note !== 'string' ||
      note.trim().length < 5 ||
      note.length > 2000 ||
      rawRevision === null ||
      !Number.isInteger(revision) ||
      revision < 0
    )
      return fail(400, {
        error: 'Choose a status and write a specific review note (5–2,000 characters).'
      });
    const result = await platform.env.DB.prepare(
      'UPDATE invitation_requests SET status=?,review_note=?,reviewed_by=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=?'
    )
      .bind(status, note.trim(), locals.identity!.subject, id, revision)
      .run();
    if (!result.meta.changes)
      return fail(409, { error: 'This introduction changed. Refresh before reviewing.' });
    return { success: true, error: '' };
  }
} satisfies Actions;

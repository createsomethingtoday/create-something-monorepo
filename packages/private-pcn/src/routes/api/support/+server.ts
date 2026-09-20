import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { boundedText } from '$lib/server/body';
import { isSameOrigin } from '$lib/server/policy';
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!platform?.env.DB) return json({ error: 'Support unavailable.' }, { status: 503 });
  const db = platform.env.DB;
  const { results: partners } = await db
    .prepare(
      "SELECT p.subject,a.display_name FROM support_partners p JOIN creator_applications a ON a.subject=p.subject WHERE p.approved=1 AND a.status='approved'"
    )
    .all();
  const workspaces = locals.identity
    ? (
        await db
          .prepare(
            `SELECT s.*,n.slug FROM support_workspaces s JOIN networks n ON n.id=s.network_id
 WHERE s.owner_id=? OR (s.partner_id=? AND EXISTS(SELECT 1 FROM support_partners p JOIN creator_applications a ON a.subject=p.subject WHERE p.subject=s.partner_id AND p.approved=1 AND a.status='approved')) ORDER BY s.created_at DESC`
          )
          .bind(locals.identity.subject, locals.identity.subject)
          .all()
      ).results
    : [];
  return json({ partners, workspaces });
};
export const POST: RequestHandler = async ({ locals, platform, request }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  if (!locals.identity) return json({ error: 'Sign in to request support.' }, { status: 401 });
  if (!platform?.env.DB) return json({ error: 'Support unavailable.' }, { status: 503 });
  const db = platform.env.DB,
    subject = locals.identity.subject;
  let b;
  try {
    b = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid support request.' }, { status: 400 });
  }
  if (b?.action === 'accept' || b?.action === 'decline') {
    const result = await db
      .prepare(
        `UPDATE support_workspaces SET status=?,accepted_at=CURRENT_TIMESTAMP WHERE network_id=? AND partner_id=? AND status='requested'
   AND EXISTS(SELECT 1 FROM support_partners p JOIN creator_applications a ON a.subject=p.subject WHERE p.subject=? AND p.approved=1 AND a.status='approved')`
      )
      .bind(
        b.action === 'accept' ? 'agreed' : 'declined',
        typeof b.network === 'string' ? b.network : '',
        subject,
        subject
      )
      .run();
    return result.meta.changes === 1
      ? json({ success: true })
      : json({ error: 'This request is unavailable or already decided.' }, { status: 409 });
  }
  if (
    b?.action !== 'request' ||
    typeof b.partner !== 'string' ||
    typeof b.company !== 'string' ||
    b.company.trim().length < 2 ||
    b.company.length > 100 ||
    typeof b.workflow !== 'string' ||
    b.workflow.trim().length < 30 ||
    b.workflow.length > 4000
  )
    return json(
      { error: 'Choose an approved partner, company name and one workflow to support.' },
      { status: 400 }
    );
  if (b.partner === subject)
    return json({ error: 'Choose a different delivery partner.' }, { status: 400 });
  const approved = await db
    .prepare(
      "SELECT p.subject FROM support_partners p JOIN creator_applications a ON a.subject=p.subject WHERE p.subject=? AND p.approved=1 AND a.status='approved'"
    )
    .bind(b.partner)
    .first();
  if (!approved)
    return json(
      { error: 'Only approved CREATE SOMETHING partners can offer support.' },
      { status: 409 }
    );
  const existing = await db
    .prepare(
      'SELECT n.id,n.slug FROM support_workspaces s JOIN networks n ON n.id=s.network_id WHERE s.owner_id=?'
    )
    .bind(subject)
    .first();
  if (existing) return json({ workspace: existing });
  const id = crypto.randomUUID(),
    slug = `company-${id.slice(0, 8)}`;
  try {
    await db.batch([
      db
        .prepare(
          "INSERT INTO networks(id,slug,owner_id,name,format,access_model,kind) VALUES(?,?,?,?,'research','members','support')"
        )
        .bind(id, slug, subject, b.company.trim()),
      db
        .prepare(
          'INSERT INTO support_workspaces(network_id,owner_id,partner_id,company,workflow) VALUES(?,?,?,?,?)'
        )
        .bind(id, subject, b.partner, b.company.trim(), b.workflow.trim())
    ]);
  } catch {
    return json(
      { error: 'A support request already exists. Refresh to continue.' },
      { status: 409 }
    );
  }
  return json({ workspace: { id, slug } }, { status: 201 });
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { boundedText } from '$lib/server/body';
import { isSameOrigin } from '$lib/server/policy';
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  if (!locals.identity || !locals.network || locals.network.owner_id !== locals.identity.subject)
    return json({ error: 'Network owner access required.' }, { status: 403 });
  if (!platform?.env.DB) return json({ error: 'Service unavailable.' }, { status: 503 });
  let body;
  try {
    body = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (
    !body ||
    typeof body.name !== 'string' ||
    !body.name.trim() ||
    body.name.length > 80 ||
    typeof body.description !== 'string' ||
    body.description.length > 500 ||
    !['members', 'preview'].includes(body.access_model)
  )
    return json({ error: 'Check the name, description, and access model.' }, { status: 400 });
  if (locals.network.kind === 'support' && body.access_model !== 'members')
    return json({ error: 'Company support workspaces remain private.' }, { status: 403 });
  const db = platform.env.DB;
  await db.batch([
    db
      .prepare(
        'UPDATE networks SET name=?,description=?,access_model=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND owner_id=?'
      )
      .bind(
        body.name.trim(),
        body.description,
        body.access_model,
        locals.network.id,
        locals.identity.subject
      ),
    // Switching to members-only closes existing public previews in the same transaction.
    db
      .prepare("UPDATE videos SET access='members' WHERE network_id=? AND ?='members'")
      .bind(locals.network.id, body.access_model),
    db
      .prepare('INSERT INTO receipts(id,actor,action,target,network_id) VALUES(?,?,?,?,?)')
      .bind(
        crypto.randomUUID(),
        locals.identity.subject,
        'network.settings',
        locals.network.id,
        locals.network.id
      )
  ]);
  return json({ success: true });
};

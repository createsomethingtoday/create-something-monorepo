import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supportWorkspace } from '$lib/server/support';
import { paidAccess } from '$lib/server/billing';
import { boundedText } from '$lib/server/body';
import { isSameOrigin } from '$lib/server/policy';
import type { Network } from '$lib/server/networks';
export const GET: RequestHandler = async ({ locals, platform, params }) => {
  if (!locals.identity || !platform?.env.DB)
    return json({ error: 'Sign in to view support.' }, { status: 401 });
  const workspace = await supportWorkspace(platform.env.DB, params.id, locals.identity.subject);
  if (!workspace) return json({ error: 'Workspace not found.' }, { status: 404 });
  const { results } = await platform.env.DB.prepare(
    'SELECT id,author,body,created_at FROM support_updates WHERE network_id=? ORDER BY created_at DESC,id DESC LIMIT 100'
  )
    .bind(workspace.network_id)
    .all();
  return json({ workspace, updates: results });
};
export const POST: RequestHandler = async ({ locals, platform, params, request }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  if (!locals.identity || !platform?.env.DB)
    return json({ error: 'Sign in to update support.' }, { status: 401 });
  const workspace = await supportWorkspace(platform.env.DB, params.id, locals.identity.subject);
  if (!workspace) return json({ error: 'Workspace not found.' }, { status: 404 });
  const network = await platform.env.DB.prepare('SELECT * FROM networks WHERE id=?')
    .bind(workspace.network_id)
    .first<Network>();
  try {
    if (workspace.status !== 'agreed' || !network || !(await paidAccess(platform.env, network)))
      return json(
        { error: 'An agreed scope and active support subscription are required.' },
        { status: 403 }
      );
  } catch {
    return json(
      { error: 'Subscription verification is temporarily unavailable.' },
      { status: 503 }
    );
  }
  let b;
  try {
    b = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid update.' }, { status: 400 });
  }
  if (typeof b?.body !== 'string' || b.body.trim().length < 5 || b.body.length > 6000)
    return json({ error: 'Write an update of 5–6000 characters.' }, { status: 400 });
  await platform.env.DB.prepare(
    'INSERT INTO support_updates(id,network_id,author,body) VALUES(?,?,?,?)'
  )
    .bind(crypto.randomUUID(), workspace.network_id, locals.identity.subject, b.body.trim())
    .run();
  return json({ success: true }, { status: 201 });
};

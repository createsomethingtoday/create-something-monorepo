import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { boundedText } from '$lib/server/body';
import { isSameOrigin } from '$lib/server/policy';
import { publicNetwork, validSlug, type Network } from '$lib/server/networks';
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.identity) return json({ error: 'Sign in to manage your networks.' }, { status: 401 });
  if (!platform?.env.DB) return json({ error: 'Network setup is unavailable.' }, { status: 503 });
  const { results } = await platform.env.DB.prepare(
    "SELECT * FROM networks WHERE owner_id = ? AND kind <> 'support' ORDER BY created_at DESC"
  )
    .bind(locals.identity.subject)
    .all<Network>();
  return json({ networks: results.map(publicNetwork) });
};
export const POST: RequestHandler = async ({ locals, platform, request }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  if (!locals.identity) return json({ error: 'Sign in to create your network.' }, { status: 401 });
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Network setup is unavailable.' }, { status: 503 });
  const approval = await db
    .prepare('SELECT status FROM creator_applications WHERE subject=?')
    .bind(locals.identity.subject)
    .first<{ status: string }>();
  if (approval?.status !== 'approved')
    return json(
      {
        error:
          'Creator approval is required. Submit your credentials and teaching video for review.'
      },
      { status: 403 }
    );
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return json({ error: 'Invalid request.' }, { status: 400 });
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slug = body.slug;
  const format = body.format || 'academy';
  const access = body.access_model || 'members';
  if (
    !name ||
    name.length > 80 ||
    !validSlug(slug) ||
    !['academy', 'collective', 'research'].includes(String(format)) ||
    !['members', 'preview'].includes(String(access))
  )
    return json(
      { error: 'Choose a name and a URL of 3–48 lowercase letters, numbers, or hyphens.' },
      { status: 400 }
    );
  const existing = await db
    .prepare('SELECT * FROM networks WHERE slug = ?')
    .bind(slug)
    .first<Network>();
  if (existing)
    return existing.owner_id === locals.identity.subject
      ? json({ network: publicNetwork(existing) })
      : json({ error: 'That network URL is already taken.' }, { status: 409 });
  const id = crypto.randomUUID();
  try {
    const result = await db
      .prepare(
        "INSERT INTO networks(id,slug,owner_id,name,format,access_model) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM networks WHERE owner_id = ?) < 3 AND EXISTS(SELECT 1 FROM creator_applications WHERE subject=? AND status='approved')"
      )
      .bind(
        id,
        slug,
        locals.identity.subject,
        name,
        format,
        access,
        locals.identity.subject,
        locals.identity.subject
      )
      .run();
    if (result.meta.changes !== 1)
      return json(
        { error: 'You can have up to three networks. Manage an existing network to continue.' },
        { status: 409 }
      );
  } catch {
    return json({ error: 'That URL could not be reserved. Try another address.' }, { status: 409 });
  }
  const network = await db.prepare('SELECT * FROM networks WHERE id = ?').bind(id).first<Network>();
  return json({ network: publicNetwork(network!) }, { status: 201 });
};

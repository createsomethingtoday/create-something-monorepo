import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateAssetDraft } from '$lib/assets';
import { boundedText } from '$lib/server/body';
import { isSameOrigin } from '$lib/server/policy';
import { requireOwner } from '$lib/server/builder-assets';
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  requireOwner(locals);
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Asset management unavailable.' }, { status: 503 });
  let body;
  try {
    body = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Check the asset details.' }, { status: 400 });
  }
  const draft = validateAssetDraft(body);
  if (!draft)
    return json(
      {
        error: 'Add a name, asset type, description, audience and a USD price (free or $1–$9,999).'
      },
      { status: 400 }
    );
  const id = crypto.randomUUID();
  try {
    await db.batch([
      db
        .prepare(
          'INSERT INTO builder_assets(id,network_id,title,kind,summary,price_cents,audience) VALUES(?,?,?,?,?,?,?)'
        )
        .bind(
          id,
          locals.network!.id,
          draft.title,
          draft.kind,
          draft.summary,
          draft.price_cents,
          draft.audience
        ),
      db
        .prepare('INSERT INTO receipts(id,actor,action,target,network_id) VALUES(?,?,?,?,?)')
        .bind(crypto.randomUUID(), locals.identity!.subject, 'asset.draft', id, locals.network!.id)
    ]);
  } catch (e) {
    if (String(e).includes('asset_capacity'))
      return json({ error: 'This network has reached its 50-asset limit.' }, { status: 409 });
    throw e;
  }
  return json({ id }, { status: 201 });
};

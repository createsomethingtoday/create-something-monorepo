import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateAssetDraft } from '$lib/assets';
import { findAsset, requireOwner } from '$lib/server/builder-assets';
import { boundedText } from '$lib/server/body';
import { isSameOrigin } from '$lib/server/policy';
export const POST: RequestHandler = async ({ request, locals, platform, params }) => {
  if (!isSameOrigin(request))
    return json({ error: 'Same-origin request required.' }, { status: 403 });
  requireOwner(locals);
  const db = platform?.env.DB;
  if (!db) return json({ error: 'Asset management unavailable.' }, { status: 503 });
  let input;
  try {
    input = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid asset details.' }, { status: 400 });
  }
  const draft = validateAssetDraft(input);
  if (!draft || !['draft', 'archived'].includes(input.visibility))
    return json(
      { error: 'Check the asset details. Publishing is not available yet.' },
      { status: 400 }
    );
  const asset = await findAsset(db, locals.network!, params.id);
  if (!asset) return json({ error: 'Asset not found.' }, { status: 404 });
  await db.batch([
    db
      .prepare(
        'UPDATE builder_assets SET title=?,kind=?,summary=?,price_cents=?,audience=?,visibility=?,updated_at=CURRENT_TIMESTAMP WHERE network_id=? AND id=?'
      )
      .bind(
        draft.title,
        draft.kind,
        draft.summary,
        draft.price_cents,
        draft.audience,
        input.visibility,
        asset.network_id,
        asset.id
      ),
    db
      .prepare('INSERT INTO receipts(id,actor,action,target,network_id) VALUES(?,?,?,?,?)')
      .bind(
        crypto.randomUUID(),
        locals.identity!.subject,
        'asset.settings',
        asset.id,
        asset.network_id
      )
  ]);
  return json({ success: true });
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { paidAccess } from '$lib/server/billing';
import { assetAcquisitionEnabled } from '$lib/server/asset-orders';
import { syncSeller } from '$lib/server/seller-accounts';
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
  if (!draft || !['draft', 'archived', 'published'].includes(input.visibility))
    return json(
      { error: 'Check the asset details. Publishing is not available yet.' },
      { status: 400 }
    );
  const asset = await findAsset(db, locals.network!, params.id);
  if (!asset) return json({ error: 'Asset not found.' }, { status: 404 });
  if (input.visibility === 'published') {
    try {
      if (
        !assetAcquisitionEnabled(platform!.env, draft.price_cents) ||
        !platform!.env.ASSET_PACKAGES ||
        !(await paidAccess(platform!.env, locals.network!))
      )
        return json(
          { error: 'Publishing is awaiting activation and delivery acceptance.' },
          { status: 503 }
        );
      const release = await db
        .prepare(
          'SELECT object_key,size_bytes,sha256 FROM asset_releases WHERE network_id=? AND asset_id=? ORDER BY rowid DESC LIMIT 1'
        )
        .bind(asset.network_id, asset.id)
        .first<{ object_key: string; size_bytes: number; sha256: string }>();
      if (!release)
        return json({ error: 'Add a complete release before publishing.' }, { status: 409 });
      const object = await platform!.env.ASSET_PACKAGES.head(release.object_key);
      if (
        !object ||
        object.size !== release.size_bytes ||
        object.customMetadata?.sha256 !== release.sha256
      )
        return json(
          { error: 'The release package must be recovered before publishing.' },
          { status: 409 }
        );
      if (draft.price_cents > 0) {
        const ready = await syncSeller(platform!.env, locals.identity!.subject);
        if (!ready.chargesReady || !ready.payoutsReady)
          return json(
            { error: 'Complete seller payment and payout requirements before publishing.' },
            { status: 409 }
          );
      }
    } catch {
      return json(
        { error: 'Publishing checks are unavailable. Your draft is unchanged.' },
        { status: 503 }
      );
    }
  }
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

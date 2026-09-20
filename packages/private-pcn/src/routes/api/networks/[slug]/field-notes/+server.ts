import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ownsNetwork } from '$lib/server/builder-assets';
import { boundedText } from '$lib/server/body';
import { isSameOrigin } from '$lib/server/policy';
import { paidAccess } from '$lib/server/billing';
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.network || !platform?.env.DB)
    return json({ error: 'Network unavailable.' }, { status: 404 });
  const owner = ownsNetwork(locals),
    member = locals.identity?.role === 'member';
  const { results } = await platform.env.DB.prepare(
    `SELECT id,title,context,implementation,evaluation,result,evidence_url,visibility,updated_at FROM field_notes
 WHERE network_id=? AND (?=1 OR (?=1 AND visibility<>'archived' AND (?=1 OR (visibility='public' AND ?=1)))) ORDER BY updated_at DESC LIMIT 100`
  )
    .bind(
      locals.network.id,
      Number(owner),
      Number(locals.network.status === 'active'),
      Number(member),
      Number(locals.network.access_model === 'preview')
    )
    .all();
  return json({ notes: results, evidenceStatus: 'creator_reported', canEdit: owner });
};
export const POST: RequestHandler = async ({ locals, platform, request }) => {
  if (!isSameOrigin(request) || !ownsNetwork(locals))
    return json({ error: 'Creator network owner access required.' }, { status: 403 });
  if (!platform?.env.DB) return json({ error: 'Field notes unavailable.' }, { status: 503 });
  let b;
  try {
    b = JSON.parse(await boundedText(request));
  } catch {
    return json({ error: 'Invalid field note.' }, { status: 400 });
  }
  const db = platform.env.DB,
    network = locals.network!;
  if (b?.action === 'archive' && typeof b.id === 'string') {
    const saved = await db
      .prepare(
        "UPDATE field_notes SET visibility='archived',updated_at=CURRENT_TIMESTAMP WHERE network_id=? AND id=?"
      )
      .bind(network.id, b.id)
      .run();
    return saved.meta.changes === 1
      ? json({ success: true })
      : json({ error: 'Field note not found.' }, { status: 404 });
  }
  if (
    !b ||
    typeof b.title !== 'string' ||
    b.title.trim().length < 3 ||
    b.title.length > 160 ||
    !['context', 'implementation', 'evaluation', 'result'].every(
      (k) => typeof b[k] === 'string' && b[k].trim().length >= 20 && b[k].length <= 3000
    ) ||
    !['members', 'public'].includes(b.visibility)
  )
    return json(
      {
        error:
          'Add a title and 20–3000 characters each for context, implementation, evaluation and result.'
      },
      { status: 400 }
    );
  try {
    const u = new URL(b.evidence_url);
    if (u.protocol !== 'https:' || u.username || u.password || b.evidence_url.length > 2000)
      throw new Error();
  } catch {
    return json(
      { error: 'Add an HTTPS link to evidence you are authorized to share.' },
      { status: 400 }
    );
  }
  if (b.visibility === 'public') {
    if (network.access_model !== 'preview' || b.publishConsent !== true)
      return json(
        { error: 'Enable public previews and confirm permission before publishing evidence.' },
        { status: 403 }
      );
    try {
      if (!(await paidAccess(platform.env, network)))
        return json(
          { error: 'An approved, active creator network is required for public evidence.' },
          { status: 403 }
        );
    } catch {
      return json({ error: 'Publication checks unavailable.' }, { status: 503 });
    }
  }
  if (b.id !== undefined && (typeof b.id !== 'string' || !/^[a-f0-9-]{36}$/.test(b.id)))
    return json({ error: 'Invalid field note.' }, { status: 400 });
  const id = b.id || crypto.randomUUID();
  const existing = b.id
    ? await db
        .prepare('SELECT id FROM field_notes WHERE network_id=? AND id=?')
        .bind(network.id, id)
        .first()
    : null;
  if (b.id && !existing) return json({ error: 'Field note not found.' }, { status: 404 });
  if (existing)
    await db
      .prepare(
        'UPDATE field_notes SET title=?,context=?,implementation=?,evaluation=?,result=?,evidence_url=?,visibility=?,updated_at=CURRENT_TIMESTAMP WHERE network_id=? AND id=?'
      )
      .bind(
        b.title.trim(),
        b.context.trim(),
        b.implementation.trim(),
        b.evaluation.trim(),
        b.result.trim(),
        b.evidence_url,
        b.visibility,
        network.id,
        id
      )
      .run();
  else {
    const saved = await db
      .prepare(
        'INSERT INTO field_notes(id,network_id,title,context,implementation,evaluation,result,evidence_url,visibility) SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM field_notes WHERE network_id=?)<100'
      )
      .bind(
        id,
        network.id,
        b.title.trim(),
        b.context.trim(),
        b.implementation.trim(),
        b.evaluation.trim(),
        b.result.trim(),
        b.evidence_url,
        b.visibility,
        network.id
      )
      .run();
    if (saved.meta.changes !== 1)
      return json({ error: 'This network has reached its 100 field-note limit.' }, { status: 409 });
  }
  return json({ id, evidenceStatus: 'creator_reported' }, { status: existing ? 200 : 201 });
};

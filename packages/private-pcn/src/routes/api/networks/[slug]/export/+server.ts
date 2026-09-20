import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { publicNetwork } from '$lib/server/networks';
export const GET: RequestHandler = async ({ locals, platform }) => {
  if (!locals.identity || !locals.network || locals.network.owner_id !== locals.identity.subject)
    return json({ error: 'Network owner access required.' }, { status: 403 });
  if (!platform?.env.DB) return json({ error: 'Export unavailable.' }, { status: 503 });
  const db = platform.env.DB;
  const id = locals.network.id;
  const [videos, members, receipts] = await Promise.all([
    db
      .prepare(
        'SELECT id,title,description,series,visibility,access,ingest_status,duration,created_at,updated_at FROM videos WHERE network_id=? ORDER BY created_at'
      )
      .bind(id)
      .all(),
    db
      .prepare(
        'SELECT email,active,created_at,updated_at FROM members WHERE network_id=? ORDER BY email'
      )
      .bind(id)
      .all(),
    db
      .prepare(
        'SELECT action,target,created_at FROM receipts WHERE network_id=? ORDER BY created_at'
      )
      .bind(id)
      .all()
  ]);
  return json(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      network: publicNetwork(locals.network),
      sessions: videos.results,
      members: members.results,
      activity: receipts.results,
      media:
        'This export contains metadata and membership records. Keep your original video files as your media backup.'
    },
    {
      headers: {
        'Content-Disposition': `attachment; filename="${locals.network.slug}-network.json"`,
        'Cache-Control': 'private, no-store'
      }
    }
  );
};

import { jsonNoStore } from '../../../../lib/server/responses';
import { getUserFromRequest } from '../../../../lib/server/session';
import { getServerAirtable } from '../../../../lib/server/airtable';

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string; excludeId?: string };
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return jsonNoStore({ error: 'Missing required parameter: name' }, { status: 400 });
  }

  try {
    const airtable = await getServerAirtable();
    const result = await airtable.checkAssetNameUniqueness(body.name.trim(), body.excludeId);
    return jsonNoStore({
      available: result.unique,
      existingId: result.existingId
    });
  } catch (error) {
    console.error('[Assets Check Name] Error:', error);
    return jsonNoStore({ error: 'Failed to check asset name' }, { status: 500 });
  }
}

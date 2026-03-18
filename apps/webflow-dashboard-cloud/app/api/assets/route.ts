import { jsonNoStore } from '../../../lib/server/responses';
import { getUserFromRequest } from '../../../lib/server/session';
import { getServerAirtable } from '../../../lib/server/airtable';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const airtable = await getServerAirtable();
    const assets = await airtable.getAssetsByEmail(user.email);
    return jsonNoStore({ assets });
  } catch (error) {
    console.error('[Assets] Error fetching assets:', error);
    return jsonNoStore({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

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
    const keys = await airtable.listApiKeys(user.email);
    const stats = keys.reduce(
      (accumulator, key) => {
        accumulator.total += 1;
        if (key.status === 'Active') accumulator.active += 1;
        if (key.status === 'Revoked') accumulator.revoked += 1;
        if (key.status === 'Expired') accumulator.expired += 1;
        return accumulator;
      },
      { total: 0, active: 0, revoked: 0, expired: 0 }
    );

    return jsonNoStore({ keys, ...stats });
  } catch (error) {
    console.error('[Keys GET] Error:', error);
    return jsonNoStore({ error: 'Failed to list API keys' }, { status: 500 });
  }
}

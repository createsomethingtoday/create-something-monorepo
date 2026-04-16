import { jsonNoStore } from '../../../../../lib/server/responses';
import { getUserFromRequest } from '../../../../../lib/server/session';
import { getServerAirtable } from '../../../../../lib/server/airtable';

async function getRouteParams(context: { params: Promise<{ id: string }> }) {
  return context.params;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await getRouteParams(context);
  const airtable = await getServerAirtable();
  const isOwner = await airtable.verifyAssetOwnership(id, user.email);
  if (!isOwner) {
    return jsonNoStore(
      { error: 'Forbidden', message: 'You do not have permission to view this asset' },
      { status: 403 }
    );
  }

  const versions = await airtable.getAssetVersions(id);
  return jsonNoStore({ versions });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await getRouteParams(context);
  const airtable = await getServerAirtable();
  const isOwner = await airtable.verifyAssetOwnership(id, user.email);
  if (!isOwner) {
    return jsonNoStore(
      { error: 'Forbidden', message: 'You do not have permission to modify this asset' },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    changes?: Record<string, unknown> | string;
  };

  if (!body.changes) {
    return jsonNoStore({ error: 'Changes are required' }, { status: 400 });
  }

  const version = await airtable.createAssetVersion(id, user.email, body.changes);
  if (!version) {
    return jsonNoStore({ error: 'Failed to create version' }, { status: 500 });
  }

  return jsonNoStore({ version });
}

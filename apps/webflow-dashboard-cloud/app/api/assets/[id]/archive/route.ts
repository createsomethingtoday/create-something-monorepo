import { jsonNoStore } from '../../../../../lib/server/responses';
import { getUserFromRequest } from '../../../../../lib/server/session';
import { getServerAirtable } from '../../../../../lib/server/airtable';

async function archiveAsset(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const airtable = await getServerAirtable();
  const isOwner = await airtable.verifyAssetOwnership(id, user.email);

  if (!isOwner) {
    return jsonNoStore(
      { error: 'Forbidden', message: 'You do not have permission to archive this asset' },
      { status: 403 }
    );
  }

  const result = await airtable.archiveAsset(id);
  if (!result.success) {
    return jsonNoStore({ error: result.error || 'Failed to archive asset' }, { status: 500 });
  }

  return jsonNoStore({ success: true });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return archiveAsset(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return archiveAsset(request, context);
}

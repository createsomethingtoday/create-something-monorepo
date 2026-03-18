import { jsonNoStore } from '../../../../lib/server/responses';
import { getUserFromRequest } from '../../../../lib/server/session';
import { getServerAirtable } from '../../../../lib/server/airtable';

async function revokeKey(request: Request, keyId?: string) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  let resolvedKeyId = keyId;
  if (!resolvedKeyId) {
    const body = (await request.json().catch(() => ({}))) as { keyId?: string };
    resolvedKeyId = body.keyId;
  }

  if (!resolvedKeyId) {
    return jsonNoStore({ error: 'Key ID is required' }, { status: 400 });
  }

  const airtable = await getServerAirtable();
  const success = await airtable.revokeApiKey(resolvedKeyId, user.email);

  if (!success) {
    return jsonNoStore(
      { error: 'API key not found or you do not have permission to revoke it' },
      { status: 404 }
    );
  }

  return jsonNoStore({ success: true });
}

export async function POST(request: Request) {
  return revokeKey(request);
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  return revokeKey(request, url.searchParams.get('keyId') || undefined);
}

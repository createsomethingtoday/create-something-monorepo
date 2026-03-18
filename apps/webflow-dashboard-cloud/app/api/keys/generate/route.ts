import { jsonNoStore } from '../../../../lib/server/responses';
import { getUserFromRequest } from '../../../../lib/server/session';
import { getServerAirtable } from '../../../../lib/server/airtable';

const VALID_SCOPES = ['read:assets', 'read:profile'] as const;

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    keyName?: string;
    scopes?: string[];
  };

  if (!body.keyName || typeof body.keyName !== 'string' || !body.keyName.trim()) {
    return jsonNoStore({ error: 'Key name is required' }, { status: 400 });
  }

  if (!Array.isArray(body.scopes) || body.scopes.length === 0) {
    return jsonNoStore({ error: 'At least one scope is required' }, { status: 400 });
  }

  const invalidScopes = body.scopes.filter((scope) => !VALID_SCOPES.includes(scope as (typeof VALID_SCOPES)[number]));
  if (invalidScopes.length > 0) {
    return jsonNoStore({ error: `Invalid scopes: ${invalidScopes.join(', ')}` }, { status: 400 });
  }

  try {
    const airtable = await getServerAirtable();
    const result = await airtable.generateApiKey(user.email, body.keyName.trim(), body.scopes);
    return jsonNoStore({
      apiKey: result.key,
      keyName: result.apiKey.name,
      keyId: result.apiKey.id,
      expiresAt: result.apiKey.expiresAt,
      scopes: result.apiKey.scopes
    });
  } catch (error) {
    console.error('[Keys Generate] Error:', error);
    return jsonNoStore({ error: 'Failed to generate API key' }, { status: 500 });
  }
}

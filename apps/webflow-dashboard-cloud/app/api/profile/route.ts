import { jsonNoStore } from '../../../lib/server/responses';
import { getUserFromRequest } from '../../../lib/server/session';
import { getServerAirtable } from '../../../lib/server/airtable';

type ProfileUpdateBody = {
  name?: string;
  biography?: string;
  legalName?: string;
  avatarUrl?: string | null;
};

async function updateProfile(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ProfileUpdateBody;
  const payload = {
    ...body,
    avatarUrl: body.avatarUrl ?? undefined
  };
  const airtable = await getServerAirtable();
  const creator = await airtable.getCreatorByEmail(user.email);

  if (!creator) {
    return jsonNoStore({ error: 'Profile not found' }, { status: 404 });
  }

  const updated = await airtable.updateCreator(creator.id, payload);
  if (!updated) {
    return jsonNoStore({ error: 'Failed to update profile' }, { status: 500 });
  }

  return jsonNoStore(updated);
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const airtable = await getServerAirtable();
    const creator = await airtable.getCreatorByEmail(user.email);
    if (!creator) {
      return jsonNoStore({ error: 'Profile not found' }, { status: 404 });
    }

    return jsonNoStore(creator);
  } catch (error) {
    console.error('[Profile GET] Error:', error);
    return jsonNoStore({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  return updateProfile(request);
}

export async function PUT(request: Request) {
  return updateProfile(request);
}

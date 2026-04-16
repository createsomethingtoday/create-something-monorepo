import {
  normalizeOptionalHttpUrl,
  normalizeOptionalTrimmedString
} from '@create-something/webflow-dashboard-core/forms';
import { jsonNoStore } from '../../../lib/server/responses';
import { getUserFromRequest } from '../../../lib/server/session';
import { getServerAirtable } from '../../../lib/server/airtable';

type ProfileUpdateBody = {
  name?: string;
  biography?: string;
  legalName?: string;
  websiteUrl?: string;
  avatarUrl?: string | null;
};

type ProfileUpdatePayload = {
  name?: string;
  biography?: string;
  legalName?: string;
  websiteUrl?: string;
  avatarUrl?: string;
};

async function updateProfile(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ProfileUpdateBody;
  let payload: ProfileUpdatePayload;
  try {
    payload = {
      name: normalizeOptionalTrimmedString(body.name, 'Name'),
      biography: normalizeOptionalTrimmedString(body.biography, 'Biography'),
      legalName: normalizeOptionalTrimmedString(body.legalName, 'Legal name'),
      websiteUrl: normalizeOptionalHttpUrl(body.websiteUrl, 'Personal website URL'),
      avatarUrl:
        body.avatarUrl === undefined
          ? undefined
          : body.avatarUrl === null
            ? ''
            : normalizeOptionalHttpUrl(body.avatarUrl, 'Avatar URL') || ''
    };
  } catch (validationError) {
    return jsonNoStore(
      {
        error:
          validationError instanceof Error
            ? validationError.message
            : 'Profile payload is invalid.'
      },
      { status: 400 }
    );
  }
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

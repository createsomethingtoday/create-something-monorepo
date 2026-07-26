import { isAllowedUploadUrl } from '@create-something/webflow-dashboard-core/uploads-url';
import { jsonNoStore } from '../../../lib/server/responses';
import { getUserFromRequest } from '../../../lib/server/session';
import { getServerAirtable } from '../../../lib/server/airtable';

type ProfileUpdateBody = {
  name?: unknown;
  biography?: unknown;
  legalName?: unknown;
  avatarUrl?: unknown;
};

/** Field limits mirror the signup intake so both entry points agree. */
const TEXT_LIMITS = {
  name: 100,
  legalName: 100,
  biography: 200
} as const;

class ValidationError extends Error {}

function normalizeRequiredText(
  value: unknown,
  label: string,
  maxLength: number
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new ValidationError(`${label} must be a string`);

  const trimmed = value.trim();
  if (!trimmed) throw new ValidationError(`${label} cannot be empty`);
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${label} must be ${maxLength} characters or fewer`);
  }

  return trimmed;
}

/**
 * Avatars land in an Airtable attachment field that Airtable fetches, so only
 * images uploaded through this dashboard are accepted — an arbitrary URL would
 * bypass the size/dimension checks enforced at upload time.
 */
function normalizeAvatarUrl(value: unknown, requestUrl: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ValidationError('Avatar URL must be a string or null');

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const origin = new URL(requestUrl).origin;
  if (!isAllowedUploadUrl(trimmed, origin)) {
    throw new ValidationError('Avatar must be an image uploaded through this dashboard');
  }

  return trimmed;
}

async function updateProfile(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ProfileUpdateBody;

  let payload: { name?: string; biography?: string; legalName?: string; avatarUrl?: string };
  try {
    payload = {
      name: normalizeRequiredText(body.name, 'Name', TEXT_LIMITS.name),
      legalName: normalizeRequiredText(body.legalName, 'Legal name', TEXT_LIMITS.legalName),
      biography: normalizeRequiredText(body.biography, 'Biography', TEXT_LIMITS.biography),
      avatarUrl: normalizeAvatarUrl(body.avatarUrl, request.url)
    };
  } catch (validationError) {
    if (validationError instanceof ValidationError) {
      return jsonNoStore({ error: validationError.message }, { status: 400 });
    }
    throw validationError;
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

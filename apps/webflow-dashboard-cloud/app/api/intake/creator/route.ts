import { validateEmail } from '@create-something/webflow-dashboard-core/airtable';
import { jsonNoStore } from '../../../../lib/server/responses';
import { getServerAirtable } from '../../../../lib/server/airtable';
import { isSupportedCountry } from '../../../../lib/intake/constants';
import { checkRemoteCreatorEmailAvailability } from '../../../../lib/intake/external';
import { verifyTurnstileToken } from '../../../../lib/server/turnstile';

type CreatorSubmissionBody = {
  country?: string;
  primaryEmail?: string;
  webflowEmail?: string;
  preferredName?: string;
  legalName?: string;
  websiteUrl?: string;
  biography?: string;
  avatarUrl?: string;
  agreedToTerms?: boolean;
  turnstileToken?: string;
};

function isValidOptionalUrl(value: string | undefined): boolean {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CreatorSubmissionBody;
    const turnstile = await verifyTurnstileToken(request, body.turnstileToken, 'creator-submit');
    if (!turnstile.valid) {
      return jsonNoStore(
        {
          error: turnstile.error || 'Bot verification failed.',
          errorCodes: turnstile.errorCodes
        },
        { status: 400 }
      );
    }

    const primaryEmail = validateEmail(body.primaryEmail || '');
    const webflowEmail = validateEmail(body.webflowEmail || '');
    const legalName = String(body.legalName || '').trim();
    const preferredName = String(body.preferredName || '').trim();
    const biography = String(body.biography || '').trim();
    const country = String(body.country || '').trim();
    const avatarUrl = String(body.avatarUrl || '').trim();

    if (!country) {
      return jsonNoStore({ error: 'Country is required.' }, { status: 400 });
    }

    if (!legalName) {
      return jsonNoStore({ error: 'Legal name is required.' }, { status: 400 });
    }

    if (!biography) {
      return jsonNoStore({ error: 'Biography is required.' }, { status: 400 });
    }

    if (biography.length > 200) {
      return jsonNoStore({ error: 'Biography must be 200 characters or fewer.' }, { status: 400 });
    }

    if (!avatarUrl) {
      return jsonNoStore({ error: 'Profile image is required.' }, { status: 400 });
    }

    if (!body.agreedToTerms) {
      return jsonNoStore({ error: 'You must agree to the creator terms.' }, { status: 400 });
    }

    if (!isValidOptionalUrl(body.websiteUrl)) {
      return jsonNoStore({ error: 'Personal website URL is invalid.' }, { status: 400 });
    }

    const airtable = await getServerAirtable();
    const [existingPrimary, existingWebflow] = await Promise.all([
      airtable.getCreatorByEmail(primaryEmail),
      airtable.getCreatorByEmail(webflowEmail)
    ]);

    if (existingPrimary || existingWebflow) {
      return jsonNoStore(
        {
          error: 'A creator profile already exists for one of these emails.',
          existingCreator: true
        },
        { status: 409 }
      );
    }

    const [primaryAvailability, webflowAvailability] = await Promise.all([
      checkRemoteCreatorEmailAvailability(primaryEmail).catch(() => ({
        emailExists: false,
        message: 'Remote email check unavailable.'
      })),
      checkRemoteCreatorEmailAvailability(webflowEmail).catch(() => ({
        emailExists: false,
        message: 'Remote email check unavailable.'
      }))
    ]);

    if (primaryAvailability.emailExists || webflowAvailability.emailExists) {
      return jsonNoStore(
        {
          error: 'One of these emails is already in use.',
          existingCreator: true
        },
        { status: 409 }
      );
    }

    const creator = await airtable.createCreator({
      email: primaryEmail,
      webflowEmail,
      name: preferredName || legalName,
      legalName,
      biography,
      avatarUrl
    });

    return jsonNoStore({
      creator,
      countrySupported: isSupportedCountry(country),
      websiteUrlCaptured: Boolean(body.websiteUrl)
    });
  } catch (error) {
    return jsonNoStore(
      {
        error: error instanceof Error ? error.message : 'Failed to create creator profile.'
      },
      { status: 400 }
    );
  }
}

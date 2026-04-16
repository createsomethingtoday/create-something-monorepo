import { validateEmail } from '@create-something/webflow-dashboard-core/airtable';
import {
  normalizeOptionalHttpUrl,
  normalizeOptionalTrimmedString,
  normalizeRequiredHttpUrl
} from '@create-something/webflow-dashboard-core/forms';
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
    const country = String(body.country || '').trim();
    let legalName = '';
    let preferredName = '';
    let biography = '';
    let avatarUrl = '';
    let websiteUrl: string | undefined;

    try {
      legalName = normalizeOptionalTrimmedString(body.legalName, 'Legal name') || '';
      preferredName = normalizeOptionalTrimmedString(body.preferredName, 'Preferred name') || '';
      biography = normalizeOptionalTrimmedString(body.biography, 'Biography') || '';
      avatarUrl = normalizeRequiredHttpUrl(body.avatarUrl, 'Profile image URL');
      websiteUrl = normalizeOptionalHttpUrl(body.websiteUrl, 'Personal website URL') || undefined;
    } catch (validationError) {
      return jsonNoStore(
        {
          error:
            validationError instanceof Error
              ? validationError.message
              : 'Creator profile payload is invalid.'
        },
        { status: 400 }
      );
    }

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

    if (!body.agreedToTerms) {
      return jsonNoStore({ error: 'You must agree to the creator terms.' }, { status: 400 });
    }

    const airtable = await getServerAirtable();
    const [existingPrimary, existingWebflow, existingPrimaryUser, existingWebflowUser] = await Promise.all([
      airtable.getCreatorByEmail(primaryEmail),
      airtable.getCreatorByEmail(webflowEmail),
      airtable.findUserByEmail(primaryEmail),
      primaryEmail === webflowEmail ? Promise.resolve(null) : airtable.findUserByEmail(webflowEmail)
    ]);

    if (existingPrimary || existingWebflow || existingPrimaryUser || existingWebflowUser) {
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
      avatarUrl,
      websiteUrl
    });

    return jsonNoStore({
      creator,
      countrySupported: isSupportedCountry(country),
      websiteUrlCaptured: Boolean(websiteUrl)
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

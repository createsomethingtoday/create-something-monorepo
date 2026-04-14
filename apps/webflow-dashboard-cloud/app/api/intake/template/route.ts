import { validateEmail } from '@create-something/webflow-dashboard-core/airtable';
import { jsonNoStore } from '../../../../lib/server/responses';
import { getServerAirtable } from '../../../../lib/server/airtable';
import { evaluateCreatorEligibility } from '../../../../lib/intake/creator-eligibility';
import { checkRemoteTemplateNameAvailability } from '../../../../lib/intake/external';
import { buildTemplateDetailsHtml, buildTemplateSummary } from '../../../../lib/intake/template-content';
import { runPublishedUrlValidation } from '../../../../lib/intake/published-url';
import { validateTemplateNameSyntax } from '../../../../lib/intake/template-name';
import { getEnvOrThrow } from '../../../../lib/server/env';
import { getUserFromRequest } from '../../../../lib/server/session';
import { verifyTemplateDraftAccessToken } from '../../../../lib/server/template-draft-access';
import { verifyTurnstileToken } from '../../../../lib/server/turnstile';

type TemplateSubmissionBody = {
  draftId?: string;
  draftAccessToken?: string;
  creatorName?: string;
  creatorEmail?: string;
  templateName?: string;
  publishedUrl?: string;
  previewUrl?: string;
  priceModel?: string;
  category?: string;
  tags?: string[];
  siteTypes?: string[];
  styleTags?: string[];
  featureFlags?: string[];
  shortDescription?: string;
  longDescription?: string;
  notes?: string;
  thumbnailUrl?: string;
  secondaryThumbnailUrl?: string;
  galleryUrls?: string[];
  checklistConfirmed?: boolean;
  agreementConfirmed?: boolean;
  turnstileToken?: string;
  utm?: Record<string, string>;
};

function normalizePreviewUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.includes('https://preview.webflow.com/preview/')) {
    throw new Error('Preview URL must contain https://preview.webflow.com/preview/.');
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    throw new Error('Preview URL is invalid.');
  }
}

function ensureArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

async function canSubmitDraft(
  request: Request,
  assetId: string,
  creatorEmail: string,
  draftAccessToken: string | undefined,
  airtable: Awaited<ReturnType<typeof getServerAirtable>>
): Promise<boolean> {
  const requestUser = await getUserFromRequest(request);
  if (requestUser && (await airtable.verifyAssetOwnership(assetId, requestUser.email))) {
    return true;
  }

  const env = await getEnvOrThrow();
  if (!verifyTemplateDraftAccessToken(assetId, creatorEmail, env.AIRTABLE_API_KEY || '', draftAccessToken)) {
    return false;
  }

  return airtable.verifyAssetOwnership(assetId, creatorEmail);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as TemplateSubmissionBody;
    const turnstile = await verifyTurnstileToken(request, body.turnstileToken, 'template-submit');
    if (!turnstile.valid) {
      return jsonNoStore(
        {
          error: turnstile.error || 'Bot verification failed.',
          errorCodes: turnstile.errorCodes
        },
        { status: 400 }
      );
    }

    const creatorEmail = validateEmail(body.creatorEmail || '');
    const creatorName = String(body.creatorName || '').trim();
    const templateName = String(body.templateName || '').trim();
    const shortDescription = String(body.shortDescription || '').trim();
    const longDescription = String(body.longDescription || '').trim();
    const notes = String(body.notes || '').trim();
    const thumbnailUrl = String(body.thumbnailUrl || '').trim();
    const secondaryThumbnailUrl = String(body.secondaryThumbnailUrl || '').trim();
    const galleryUrls = ensureArray(body.galleryUrls).slice(0, 5);
    const featureFlags = ensureArray(body.featureFlags);
    const tags = ensureArray(body.tags);
    const styleTags = ensureArray(body.styleTags);
    const siteTypes = ensureArray(body.siteTypes);
    const category = String(body.category || '').trim();
    const priceModel = String(body.priceModel || '').trim() || 'Free';

    if (!creatorName) {
      return jsonNoStore({ error: 'Creator name is required.' }, { status: 400 });
    }

    if (!templateName) {
      return jsonNoStore({ error: 'Template name is required.' }, { status: 400 });
    }

    if (!shortDescription) {
      return jsonNoStore({ error: 'Short description is required.' }, { status: 400 });
    }

    if (shortDescription.length > 250) {
      return jsonNoStore(
        { error: 'Short description must be 250 characters or fewer.' },
        { status: 400 }
      );
    }

    if (!longDescription) {
      return jsonNoStore({ error: 'Long description is required.' }, { status: 400 });
    }

    if (!thumbnailUrl) {
      return jsonNoStore({ error: 'Primary thumbnail is required.' }, { status: 400 });
    }

    if (galleryUrls.length === 0) {
      return jsonNoStore({ error: 'At least one gallery image is required.' }, { status: 400 });
    }

    if (!body.checklistConfirmed || !body.agreementConfirmed) {
      return jsonNoStore(
        { error: 'Submission checklist and agreement are required.' },
        { status: 400 }
      );
    }

    const airtable = await getServerAirtable();
    const creator = await airtable.getCreatorByEmail(creatorEmail);
    if (!creator) {
      return jsonNoStore(
        { error: 'Creator profile not found. Complete creator registration first.' },
        { status: 404 }
      );
    }

    let draftAssetId: string | undefined;
    if (body.draftId) {
      const existingDraft = await airtable.getAsset(body.draftId);
      if (!existingDraft) {
        return jsonNoStore({ error: 'Draft not found.' }, { status: 404 });
      }

      const draftOwnerEmail = validateEmail(existingDraft.creatorContactEmail || creatorEmail);
      if (draftOwnerEmail !== creatorEmail) {
        return jsonNoStore(
          { error: 'Draft owner email does not match the current creator email.' },
          { status: 409 }
        );
      }

      if (
        String(existingDraft.status || '')
          .trim()
          .toLowerCase() !== 'draft'
      ) {
        return jsonNoStore({ error: 'This draft is no longer editable.' }, { status: 409 });
      }

      if (!(await canSubmitDraft(request, existingDraft.id, creatorEmail, body.draftAccessToken, airtable))) {
        return jsonNoStore({ error: 'You do not have permission to submit this draft.' }, { status: 403 });
      }

      draftAssetId = existingDraft.id;
    }

    const eligibility = await evaluateCreatorEligibility(creatorEmail);
    if (!eligibility.allowed) {
      return jsonNoStore(
        {
          error: eligibility.message,
          eligibility
        },
        { status: 409 }
      );
    }

    const nameSyntax = validateTemplateNameSyntax(templateName);
    if (!nameSyntax.valid) {
      return jsonNoStore(
        {
          error: nameSyntax.errors[0],
          errors: nameSyntax.errors,
          matchedForbiddenTokens: nameSyntax.matchedForbiddenTokens
        },
        { status: 400 }
      );
    }

    const [nameUniqueness, remoteNameAvailability] = await Promise.all([
      airtable.checkAssetNameUniqueness(templateName, draftAssetId),
      checkRemoteTemplateNameAvailability(templateName).catch(() => null)
    ]);

    if (!nameUniqueness.unique || remoteNameAvailability?.taken) {
      return jsonNoStore({ error: 'Template name is already in use.' }, { status: 409 });
    }

    const publishedValidation = await runPublishedUrlValidation(body.publishedUrl || '');
    if (!publishedValidation.summary.passed) {
      return jsonNoStore(
        { error: 'Published URL validation failed.' },
        { status: 400 }
      );
    }

    const previewUrl = normalizePreviewUrl(body.previewUrl || '');
    const combinedFeatures = new Set(featureFlags);
    if (publishedValidation.summary.gsapDetected) {
      combinedFeatures.add('gsap');
    }

    const submissionInput = {
      creatorEmail,
      creatorWebflowEmail:
        creator.emails?.find((value) => value !== creatorEmail) || creatorEmail,
      name: templateName,
      description: buildTemplateSummary({
        category,
        tags,
        siteTypes,
        featureFlags: [...combinedFeatures],
        notes
      }),
      descriptionShort: shortDescription,
      descriptionLongHtml: buildTemplateDetailsHtml({
        longDescription,
        notes,
        category,
        tags,
        styleTags,
        siteTypes,
        featureFlags: [...combinedFeatures],
        publishedUrl: publishedValidation.normalizedUrl,
        gsapDetected: publishedValidation.summary.gsapDetected
      }),
      websiteUrl: publishedValidation.normalizedUrl,
      previewUrl,
      priceString: priceModel,
      thumbnailUrl,
      secondaryThumbnailUrl: secondaryThumbnailUrl || undefined,
      carouselImages: galleryUrls,
      metadata: {
        creatorName,
        category,
        tags,
        siteTypes,
        styleTags,
        featureFlags: [...combinedFeatures],
        publishedUrl: publishedValidation.normalizedUrl,
        previewUrl,
        notes,
        utm: body.utm || {}
      }
    };

    const submission = draftAssetId
      ? await airtable.submitTemplateDraft(draftAssetId, submissionInput)
      : await airtable.createTemplateSubmission(submissionInput);

    if (!submission) {
      return jsonNoStore({ error: 'Failed to submit template.' }, { status: 500 });
    }

    return jsonNoStore({
      asset: submission.asset,
      versionId: submission.versionId,
      warning: submission.warning,
      publishedValidation: {
        normalizedUrl: publishedValidation.normalizedUrl,
        gsapDetected: publishedValidation.summary.gsapDetected,
        siteResults: publishedValidation.summary.siteResults
      }
    });
  } catch (error) {
    return jsonNoStore(
      {
        error: error instanceof Error ? error.message : 'Failed to submit template.'
      },
      { status: 400 }
    );
  }
}

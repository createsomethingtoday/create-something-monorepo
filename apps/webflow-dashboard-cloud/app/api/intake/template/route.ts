import { validateEmail } from '@create-something/webflow-dashboard-core/airtable';
import { normalizeStringArray } from '@create-something/webflow-dashboard-core/forms';
import {
  TEMPLATE_CATEGORY_OPTIONS,
  TEMPLATE_FEATURE_OPTIONS,
  TEMPLATE_PRIMARY_TAGS,
  TEMPLATE_PRICE_OPTIONS,
  TEMPLATE_SITE_TYPE_OPTIONS,
  buildTemplateDetailsHtml,
  buildTemplateMetadataDescription,
  findInvalidValues,
  isTemplatePriceOption,
  normalizeTemplatePreviewUrl,
  validateTemplateNameSyntax
} from '@create-something/webflow-dashboard-core/template-intake';
import { jsonNoStore } from '../../../../lib/server/responses';
import { getServerAirtable } from '../../../../lib/server/airtable';
import { evaluateCreatorEligibility } from '../../../../lib/intake/creator-eligibility';
import { checkRemoteTemplateNameAvailability } from '../../../../lib/intake/external';
import { runPublishedUrlValidation } from '../../../../lib/intake/published-url';
import { verifyTurnstileToken } from '../../../../lib/server/turnstile';

type TemplateSubmissionBody = {
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
    const galleryUrls = normalizeStringArray(body.galleryUrls).slice(0, 5);
    const featureFlags = normalizeStringArray(body.featureFlags);
    const tags = normalizeStringArray(body.tags);
    const styleTags = normalizeStringArray(body.styleTags);
    const siteTypes = normalizeStringArray(body.siteTypes);
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

    if (!isTemplatePriceOption(priceModel)) {
      return jsonNoStore(
        { error: `Price model must be one of: ${TEMPLATE_PRICE_OPTIONS.join(', ')}.` },
        { status: 400 }
      );
    }

    if (category && !(TEMPLATE_CATEGORY_OPTIONS as readonly string[]).includes(category)) {
      return jsonNoStore(
        { error: 'Category must match the supported template categories.' },
        { status: 400 }
      );
    }

    if (findInvalidValues(tags, TEMPLATE_PRIMARY_TAGS).length > 0) {
      return jsonNoStore(
        { error: 'Primary tags must match the supported template tags.' },
        { status: 400 }
      );
    }

    if (
      findInvalidValues(
        siteTypes,
        TEMPLATE_SITE_TYPE_OPTIONS.map((option) => option.id)
      ).length > 0
    ) {
      return jsonNoStore(
        { error: 'Site types must match the supported template options.' },
        { status: 400 }
      );
    }

    if (
      findInvalidValues(
        featureFlags,
        TEMPLATE_FEATURE_OPTIONS.map((option) => option.id)
      ).length > 0
    ) {
      return jsonNoStore(
        { error: 'Feature flags must match the supported template options.' },
        { status: 400 }
      );
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
      airtable.checkAssetNameUniqueness(templateName),
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

    const previewUrl = normalizeTemplatePreviewUrl(body.previewUrl || '');
    const combinedFeatures = new Set(featureFlags);
    if (publishedValidation.summary.gsapDetected) {
      combinedFeatures.add('gsap');
    }
    const normalizedFeatures = [...combinedFeatures];
    const detailsHtml = buildTemplateDetailsHtml({
      category,
      tags,
      styleTags,
      siteTypes,
      featureFlags: normalizedFeatures,
      longDescription,
      notes,
      publishedUrl: publishedValidation.normalizedUrl
    });

    const submission = await airtable.createTemplateSubmission({
      creatorEmail,
      creatorWebflowEmail:
        creator.emails?.find((value) => value !== creatorEmail) || creatorEmail,
      name: templateName,
      description: buildTemplateMetadataDescription({
        category,
        tags,
        siteTypes,
        featureFlags: normalizedFeatures,
        notes
      }),
      descriptionShort: shortDescription,
      descriptionLongHtml: detailsHtml,
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
        featureFlags: normalizedFeatures,
        publishedUrl: publishedValidation.normalizedUrl,
        previewUrl,
        notes,
        utm: body.utm || {}
      }
    });

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

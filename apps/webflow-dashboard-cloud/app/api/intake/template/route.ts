import { validateEmail } from '@create-something/webflow-dashboard-core/airtable';
import { jsonNoStore } from '../../../../lib/server/responses';
import { getServerAirtable } from '../../../../lib/server/airtable';
import { evaluateCreatorEligibility } from '../../../../lib/intake/creator-eligibility';
import { checkRemoteTemplateNameAvailability } from '../../../../lib/intake/external';
import { runPublishedUrlValidation } from '../../../../lib/intake/published-url';
import { validateTemplateNameSyntax } from '../../../../lib/intake/template-name';
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toParagraphs(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

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

    const previewUrl = normalizePreviewUrl(body.previewUrl || '');
    const combinedFeatures = new Set(featureFlags);
    if (publishedValidation.summary.gsapDetected) {
      combinedFeatures.add('gsap');
    }

    const detailsHtml = [
      `<h2>Submission notes</h2>${toParagraphs(longDescription)}`,
      notes ? `<h3>Internal notes</h3>${toParagraphs(notes)}` : '',
      '<h3>Metadata</h3>',
      '<ul>',
      category ? `<li>Category: ${escapeHtml(category)}</li>` : '',
      tags.length > 0 ? `<li>Tags: ${escapeHtml(tags.join(', '))}</li>` : '',
      styleTags.length > 0 ? `<li>Style tags: ${escapeHtml(styleTags.join(', '))}</li>` : '',
      siteTypes.length > 0 ? `<li>Site types: ${escapeHtml(siteTypes.join(', '))}</li>` : '',
      combinedFeatures.size > 0
        ? `<li>Feature flags: ${escapeHtml([...combinedFeatures].join(', '))}</li>`
        : '',
      `<li>Published URL verified: ${escapeHtml(publishedValidation.normalizedUrl)}</li>`,
      publishedValidation.summary.gsapDetected
        ? '<li>GSAP detected during published-site crawl.</li>'
        : '',
      '</ul>'
    ]
      .filter(Boolean)
      .join('');

    const submission = await airtable.createTemplateSubmission({
      creatorEmail,
      creatorWebflowEmail:
        creator.emails?.find((value) => value !== creatorEmail) || creatorEmail,
      name: templateName,
      description: [
        category ? `Category: ${category}` : '',
        tags.length > 0 ? `Tags: ${tags.join(', ')}` : '',
        siteTypes.length > 0 ? `Site types: ${siteTypes.join(', ')}` : '',
        combinedFeatures.size > 0 ? `Features: ${[...combinedFeatures].join(', ')}` : '',
        notes ? `Notes: ${notes}` : ''
      ]
        .filter(Boolean)
        .join('\n'),
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
        featureFlags: [...combinedFeatures],
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

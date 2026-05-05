import { validateEmail } from '../../../../vendor/core/airtable';
import {
  buildTemplateEnvelope,
  postMarketplaceWebhook,
  type PageCount,
  type PaymentType,
} from '../../../../vendor/core/marketplace-webhook';
import { jsonNoStore } from '../../../../lib/server/responses';
import { getServerAirtable } from '../../../../lib/server/airtable';
import { getPricingTiers, WEBFLOW_FEATURES } from '../../../../lib/intake/constants';
import { evaluateCreatorEligibility } from '../../../../lib/intake/creator-eligibility';
import { runPublishedUrlValidation } from '../../../../lib/intake/published-url';
import { validateTemplateNameSyntax } from '../../../../lib/intake/template-name';
import { checkTemplateNameAvailability } from '../../../../lib/server/template-name-availability';
import { verifyTurnstileToken } from '../../../../lib/server/turnstile';

type TemplateSubmissionBody = {
  creatorName?: string;
  creatorEmail?: string;
  templateName?: string;
  publishedUrl?: string;
  previewUrl?: string;
  priceModel?: string;
  category?: string;
  categories?: string[];
  tags?: string[];
  siteTypes?: string[];
  pageCount?: string;
  typeCms?: boolean;
  typeEcommerce?: boolean;
  price?: number | string | null;
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

const FEATURE_FLAG_TO_WEBFLOW_FEATURE = Object.freeze({
  gsap: 'GSAP',
  'responsive-design': 'Responsive Design',
  'responsive design': 'Responsive Design',
  'responsive-navigation': 'Responsive Navigation',
  'responsive navigation': 'Responsive Navigation',
  'responsive-slider': 'Responsive Slider',
  'responsive slider': 'Responsive Slider',
  'media-lightbox': 'Media Lightbox',
  'media lightbox': 'Media Lightbox',
  'background-video': 'Background Video',
  'background video': 'Background Video',
  '3d-transforms': '3D Transforms',
  '3d transforms': '3D Transforms',
  interactions: 'Interactions',
  forms: 'Forms',
  components: 'Symbols',
  symbols: 'Symbols',
  'css-grid': 'CSS Grid',
  'css grid': 'CSS Grid',
  'custom-404': 'Custom 404 Page',
  'custom 404 page': 'Custom 404 Page',
  'web-fonts': 'Web Fonts',
  'web fonts': 'Web Fonts',
  'retina-ready': 'Retina Ready',
  'retina ready': 'Retina Ready',
} satisfies Record<string, string>);

const STYLE_TAG_TO_WEBFLOW_STYLE: Record<string, string> = {
  bold: 'Bold',
  corporate: 'Corporate',
  dark: 'Dark',
  illustration: 'Illustration',
  light: 'Light',
  minimal: 'Minimal',
  modern: 'Modern',
  playful: 'Playful',
  retro: 'Retro',
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

function coercePageCount(value: string | undefined): PageCount | null {
  if (value === 'One' || value === 'Multi' || value === 'Multi-layout') {
    return value;
  }

  return null;
}

function coerceOptionalPrice(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function derivePageCount(siteTypes: string[]): PageCount {
  if (siteTypes.includes('multi-layout')) return 'Multi-layout';
  const nonStatic = siteTypes.filter((type) => type !== 'static');
  return nonStatic.length > 1 ? 'Multi' : 'One';
}

function mapStyleTags(styleTags: string[]): string[] {
  return styleTags
    .map((tag) => STYLE_TAG_TO_WEBFLOW_STYLE[tag.toLowerCase()])
    .filter((value): value is string => Boolean(value));
}

function mapFeatureFlags(featureFlags: string[]): string[] {
  const mapped = new Set<string>();

  for (const flag of featureFlags) {
    const normalized = flag.trim().toLowerCase();
    const mappedValue = FEATURE_FLAG_TO_WEBFLOW_FEATURE[
      normalized as keyof typeof FEATURE_FLAG_TO_WEBFLOW_FEATURE
    ];
    if (mappedValue) {
      mapped.add(mappedValue);
    }
  }

  return WEBFLOW_FEATURES
    .map((feature) => (feature.label === 'Components' ? 'Symbols' : feature.label))
    .filter((feature) => mapped.has(feature));
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
    const requestedCategories = ensureArray(body.categories).slice(0, 2);
    const category = String(body.category || '').trim();
    const priceModelRaw = String(body.priceModel || '').trim();
    const paymentType: PaymentType = priceModelRaw === 'Paid' ? 'Paid' : 'Free';
    const requestedPageCount = coercePageCount(
      typeof body.pageCount === 'string' ? body.pageCount.trim() : undefined
    );
    const requestedPrice = coerceOptionalPrice(body.price);

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

    const airtable = await getServerAirtable();

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

    const templateNameAvailability = await checkTemplateNameAvailability(templateName, {
      airtable
    });

    if (!templateNameAvailability.available) {
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

    const pageCount = requestedPageCount ?? derivePageCount(siteTypes);
    const templateTypeCms =
      body.typeCms === true || siteTypes.includes('cms') || combinedFeatures.has('cms');
    const templateTypeEcommerce =
      body.typeEcommerce === true ||
      siteTypes.includes('ecommerce') ||
      combinedFeatures.has('ecommerce');
    let price: number | undefined;
    if (paymentType === 'Paid') {
      const allowedPrices = getPricingTiers(pageCount, templateTypeCms).prices;
      if (requestedPrice === undefined || !allowedPrices.includes(requestedPrice)) {
        return jsonNoStore(
          { error: 'Paid templates require a selected valid price tier.' },
          { status: 400 }
        );
      }
      price = requestedPrice;
    }
    const mappedStyles = mapStyleTags(styleTags);
    const mappedFeatures = mapFeatureFlags([...combinedFeatures]);
    const categories =
      requestedCategories.length > 0
        ? requestedCategories
        : category
          ? [category]
          : [];

    const detailsHtml = [
      `<h2>Submission notes</h2>${toParagraphs(longDescription)}`,
      notes ? `<h3>Internal notes</h3>${toParagraphs(notes)}` : '',
      '<h3>Metadata</h3>',
      '<ul>',
      categories.length > 0 ? `<li>Category: ${escapeHtml(categories.join(', '))}</li>` : '',
      tags.length > 0 ? `<li>Tags: ${escapeHtml(tags.join(', '))}</li>` : '',
      styleTags.length > 0 ? `<li>Style tags: ${escapeHtml(styleTags.join(', '))}</li>` : '',
      pageCount ? `<li>Page count: ${escapeHtml(pageCount)}</li>` : '',
      templateTypeCms ? '<li>Uses CMS.</li>' : '',
      templateTypeEcommerce ? '<li>Uses Ecommerce.</li>' : '',
      paymentType === 'Paid' && price !== undefined
        ? `<li>Price: $${escapeHtml(String(price))}</li>`
        : '',
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

    const submissionId = crypto.randomUUID();
    const envelope = buildTemplateEnvelope(
      {
        creatorName,
        creatorEmail,
        isTemplateUserEmailValidated: true,
        templateName,
        isTemplateNameValidated: true,
        publishedUrl: publishedValidation.normalizedUrl,
        isPublishedUrlValidated: true,
        previewUrl,
        paymentType,
        pageCount,
        templateTypeCms,
        templateTypeEcommerce,
        price,
        categories,
        secondaryTags: tags,
        styles: mappedStyles,
        features: mappedFeatures,
        shortDescription,
        longDescription: detailsHtml,
        notes,
        thumbnailImageUrl: thumbnailUrl,
        thumbnailImageSecondaryUrl: secondaryThumbnailUrl,
        galleryImageUrls: galleryUrls,
        agreeToTerms: body.agreementConfirmed === true,
        acknowledgedChecklist: body.checklistConfirmed === true,
        utm: {
          source: body.utm?.utm_source,
          medium: body.utm?.utm_medium,
          campaign: body.utm?.utm_campaign,
          content: body.utm?.utm_content,
          term: body.utm?.utm_term,
        },
      },
      { submissionId },
    );

    const webhookResponse = await postMarketplaceWebhook(envelope);
    if (!webhookResponse.ok) {
      return jsonNoStore(
        { error: `Template submission webhook failed: ${webhookResponse.status}` },
        { status: 502 },
      );
    }

    return jsonNoStore({
      asset: {
        id: submissionId,
        name: templateName,
      },
      submissionId,
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

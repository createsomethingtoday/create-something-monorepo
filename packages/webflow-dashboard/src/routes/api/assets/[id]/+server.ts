import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient, type AssetUpdateData } from '$lib/server/airtable';
import {
  APP_CAPABILITY_OPTIONS,
  APP_CATEGORY_OPTIONS,
  APP_SCOPE_OPTIONS,
  APP_VISIBILITY_OPTIONS,
  PAYMENT_TYPE_OPTIONS
} from '$lib/intake/app';
import {
  TEMPLATE_CATEGORY_OPTIONS,
  TEMPLATE_FEATURE_OPTIONS,
  TEMPLATE_PRICE_OPTIONS,
  TEMPLATE_SITE_TYPE_OPTIONS,
  findInvalidValues,
  normalizeTemplatePreviewUrl,
  validateTemplateNameSyntax
} from '$lib/intake/template';

const TEMPLATE_DRAFT_STATUSES = new Set(['Draft', 'Upcoming', 'Scheduled']);

type AssetRecord = Awaited<ReturnType<ReturnType<typeof getAirtableClient>['getAsset']>>;

function assertOptionalString(
  value: unknown,
  message: string
): asserts value is string | undefined {
  if (value !== undefined && typeof value !== 'string') {
    throw error(400, message);
  }
}

function assertOptionalNullableString(
  value: unknown,
  message: string
): asserts value is string | null | undefined {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw error(400, message);
  }
}

function assertOptionalStringArray(
  value: unknown,
  message: string
): asserts value is string[] | undefined {
  if (value !== undefined) {
    if (!Array.isArray(value)) {
      throw error(400, message);
    }
    if (value.some((entry) => typeof entry !== 'string')) {
      throw error(400, message);
    }
  }
}

function assertOptionalBoolean(
  value: unknown,
  message: string
): asserts value is boolean | undefined {
  if (value !== undefined && typeof value !== 'boolean') {
    throw error(400, message);
  }
}

function hasAnyDefined(body: AssetUpdateData, fields: Array<keyof AssetUpdateData>): boolean {
  return fields.some((field) => body[field] !== undefined);
}

function assertAllowedString(
  value: string | undefined,
  allowed: readonly string[],
  message: string
): void {
  if (value !== undefined && !allowed.includes(value)) {
    throw error(400, message);
  }
}

function assertAllowedStringArray(
  value: string[] | undefined,
  allowed: readonly string[],
  message: string
): void {
  if (!value) return;
  if (findInvalidValues(value, allowed).length > 0) {
    throw error(400, message);
  }
}

function validateTemplateBody(body: AssetUpdateData, asset: NonNullable<AssetRecord>): void {
  const isDraftLikeStatus = TEMPLATE_DRAFT_STATUSES.has(asset.status);
  const nextName = body.name ?? asset.name;
  const nextShortDescription = body.descriptionShort ?? asset.descriptionShort ?? '';
  const nextPublishedUrl = body.websiteUrl ?? asset.websiteUrl ?? '';
  const nextPreviewUrl = body.previewUrl ?? asset.previewUrl ?? '';
  const nextPriceString = body.priceString ?? asset.priceString ?? '';
  const nextTemplateCategory =
    body.templateCategory ?? asset.templateCategory ?? asset.category ?? '';
  const nextTemplateLongDescription =
    body.templateLongDescription ?? asset.templateLongDescription ?? '';
  const nextCarouselImages = body.carouselImages ?? asset.carouselImages ?? [];
  const nextThumbnailUrl = body.thumbnailUrl === undefined ? asset.thumbnailUrl : body.thumbnailUrl;

  assertAllowedString(
    body.priceString,
    TEMPLATE_PRICE_OPTIONS,
    `Price model must be one of: ${TEMPLATE_PRICE_OPTIONS.join(', ')}`
  );
  if (
    body.templateCategory !== undefined &&
    !(TEMPLATE_CATEGORY_OPTIONS as readonly string[]).includes(body.templateCategory)
  ) {
    throw error(400, 'Category must match the template intake category list');
  }
  assertAllowedStringArray(
    body.templateSiteTypes,
    TEMPLATE_SITE_TYPE_OPTIONS.map((option) => option.id),
    'Site types must match the template intake options'
  );
  assertAllowedStringArray(
    body.templateFeatureFlags,
    TEMPLATE_FEATURE_OPTIONS.map((option) => option.id),
    'Feature flags must match the template intake options'
  );

  if (body.previewUrl !== undefined) {
    body.previewUrl = normalizeTemplatePreviewUrl(body.previewUrl);
  }

  if (body.name !== undefined) {
    const syntax = validateTemplateNameSyntax(body.name);
    if (!syntax.valid) {
      throw error(400, syntax.errors[0] || 'Template name failed validation');
    }
  }

  if (!isDraftLikeStatus) {
    return;
  }

  const nextNameSyntax = validateTemplateNameSyntax(nextName);
  if (!nextNameSyntax.valid) {
    throw error(400, nextNameSyntax.errors[0] || 'Template name failed validation');
  }

  if (!nextShortDescription.trim()) {
    throw error(400, 'Short description is required for template drafts');
  }

  if (nextShortDescription.length > 250) {
    throw error(400, 'Short description must be 250 characters or fewer');
  }

  if (!nextTemplateLongDescription.trim()) {
    throw error(400, 'Long description is required for template drafts');
  }

  if (!nextPublishedUrl.trim()) {
    throw error(400, 'Published URL is required for template drafts');
  }

  if (!nextPreviewUrl.trim()) {
    throw error(400, 'Preview URL is required for template drafts');
  }

  body.previewUrl = normalizeTemplatePreviewUrl(nextPreviewUrl);

  if (!nextPriceString.trim()) {
    throw error(400, 'Price model is required for template drafts');
  }

  if (
    !TEMPLATE_PRICE_OPTIONS.includes(nextPriceString as (typeof TEMPLATE_PRICE_OPTIONS)[number])
  ) {
    throw error(400, `Price model must be one of: ${TEMPLATE_PRICE_OPTIONS.join(', ')}`);
  }

  if (!nextTemplateCategory.trim()) {
    throw error(400, 'Category is required for template drafts');
  }

  if (!(TEMPLATE_CATEGORY_OPTIONS as readonly string[]).includes(nextTemplateCategory)) {
    throw error(400, 'Category must match the template intake category list');
  }

  if (!nextThumbnailUrl) {
    throw error(400, 'Primary thumbnail is required for template drafts');
  }

  if (nextCarouselImages.length === 0) {
    throw error(400, 'At least one gallery image is required for template drafts');
  }

  if (body.templateChecklistConfirmed !== true || body.templateAgreementConfirmed !== true) {
    throw error(400, 'Submission checklist and agreement are required for template drafts');
  }
}

function validateAppBody(body: AssetUpdateData, asset: NonNullable<AssetRecord>): void {
  const nextCapabilities = body.appCapabilities ?? asset.appCapabilities ?? '';
  const nextInstallUrl = body.appInstallUrl ?? asset.appInstallUrl ?? '';
  const nextThumbnailUrl = body.thumbnailUrl === undefined ? asset.thumbnailUrl : body.thumbnailUrl;
  const nextAvatarAltText = body.appAvatarAltText ?? asset.appAvatarAltText ?? '';
  const nextScreenshotAltTexts = body.appScreenshotAltTexts ?? asset.appScreenshotAltTexts ?? [];
  const nextCarouselImages = body.carouselImages ?? asset.carouselImages ?? [];

  assertAllowedString(
    body.appCapabilities,
    APP_CAPABILITY_OPTIONS,
    `App capabilities must be one of: ${APP_CAPABILITY_OPTIONS.join(', ')}`
  );
  assertAllowedStringArray(
    body.appScopes,
    APP_SCOPE_OPTIONS,
    'App scopes must match the supported scope options'
  );
  assertAllowedStringArray(
    body.paymentType,
    PAYMENT_TYPE_OPTIONS,
    `Payment types must be one of: ${PAYMENT_TYPE_OPTIONS.join(', ')}`
  );
  assertAllowedString(
    body.visibility,
    APP_VISIBILITY_OPTIONS,
    `Visibility must be one of: ${APP_VISIBILITY_OPTIONS.join(', ')}`
  );
  assertAllowedStringArray(
    body.appCategory,
    APP_CATEGORY_OPTIONS,
    'App categories must match the supported category options'
  );

  if (body.appCategory && body.appCategory.length > 2) {
    throw error(400, 'Select at most two app categories');
  }

  if (
    (nextCapabilities === 'Data Client v2' || nextCapabilities === 'Hybrid') &&
    !nextInstallUrl.trim()
  ) {
    throw error(400, 'Install URL is required for Data Client and Hybrid apps');
  }

  if (nextThumbnailUrl && !nextAvatarAltText.trim()) {
    throw error(400, 'App icon alt text is required when an icon is present');
  }

  if (nextCarouselImages.some((_, index) => !nextScreenshotAltTexts[index]?.trim())) {
    throw error(400, 'Provide alt text for each app screenshot');
  }
}

function validateAssetUpdateBody(body: AssetUpdateData, asset: NonNullable<AssetRecord>): void {
  assertOptionalString(body.name, 'Name must be a string');
  assertOptionalString(body.description, 'Description must be a string');
  assertOptionalString(body.descriptionShort, 'Short description must be a string');
  assertOptionalString(body.descriptionLongHtml, 'Long description must be a string');
  assertOptionalString(body.websiteUrl, 'Website URL must be a string');
  assertOptionalString(body.previewUrl, 'Preview URL must be a string');
  assertOptionalString(body.priceString, 'Price model must be a string');
  assertOptionalNullableString(body.thumbnailUrl, 'Thumbnail URL must be a string or null');
  assertOptionalNullableString(
    body.secondaryThumbnailUrl,
    'Secondary thumbnail URL must be a string or null'
  );
  assertOptionalStringArray(
    body.secondaryThumbnails,
    'Secondary thumbnails must be an array of strings'
  );
  assertOptionalStringArray(body.carouselImages, 'Carousel images must be an array of strings');
  assertOptionalString(body.templateCategory, 'Template category must be a string');
  assertOptionalStringArray(body.templateTags, 'Template tags must be an array of strings');
  assertOptionalStringArray(
    body.templateStyleTags,
    'Template style tags must be an array of strings'
  );
  assertOptionalStringArray(
    body.templateSiteTypes,
    'Template site types must be an array of strings'
  );
  assertOptionalStringArray(
    body.templateFeatureFlags,
    'Template feature flags must be an array of strings'
  );
  assertOptionalString(body.templateLongDescription, 'Template long description must be a string');
  assertOptionalString(body.templateNotes, 'Template notes must be a string');
  assertOptionalBoolean(
    body.templateChecklistConfirmed,
    'Template checklist confirmation must be a boolean'
  );
  assertOptionalBoolean(
    body.templateAgreementConfirmed,
    'Template agreement confirmation must be a boolean'
  );
  assertOptionalString(body.appCapabilities, 'App capabilities must be a string');
  assertOptionalString(body.appInstallUrl, 'App install URL must be a string');
  assertOptionalStringArray(body.appScopes, 'App scopes must be an array of strings');
  assertOptionalString(body.appAvatarAltText, 'App icon alt text must be a string');
  assertOptionalStringArray(body.paymentType, 'Payment types must be an array of strings');
  assertOptionalString(body.visibility, 'Visibility must be a string');
  assertOptionalStringArray(body.appCategory, 'App categories must be an array of strings');
  assertOptionalString(body.creatorName, 'Creator name must be a string');
  assertOptionalString(
    body.creatorWebflowEmailOverride,
    'Creator Webflow email override must be a string'
  );
  assertOptionalString(body.creatorContactEmail, 'Creator contact email must be a string');
  assertOptionalStringArray(body.appFeaturesOverview, 'App features must be an array of strings');
  assertOptionalString(body.appDeveloperNotes, 'Developer notes must be a string');
  assertOptionalString(body.appAccessCredentials, 'App access credentials must be a string');
  assertOptionalString(body.appVideoUrl, 'App promo video URL must be a string');
  assertOptionalString(body.appDemoVideoUrl, 'App demo video URL must be a string');
  assertOptionalString(body.appPrivacyPolicyUrl, 'Privacy policy URL must be a string');
  assertOptionalString(body.appSupportEmail, 'Support email must be a string');
  assertOptionalString(body.appSupportUrl, 'Support URL must be a string');
  assertOptionalString(body.appTermsUrl, 'Terms URL must be a string');
  assertOptionalStringArray(
    body.appScreenshotAltTexts,
    'App screenshot alt texts must be an array of strings'
  );

  if (asset.type === 'Template') {
    if (
      hasAnyDefined(body, [
        'appCapabilities',
        'appInstallUrl',
        'appScopes',
        'appAvatarAltText',
        'paymentType',
        'visibility',
        'appCategory',
        'creatorName',
        'creatorWebflowEmailOverride',
        'creatorContactEmail',
        'appFeaturesOverview',
        'appDeveloperNotes',
        'appAccessCredentials',
        'appVideoUrl',
        'appDemoVideoUrl',
        'appPrivacyPolicyUrl',
        'appSupportEmail',
        'appSupportUrl',
        'appTermsUrl',
        'appScreenshotAltTexts'
      ])
    ) {
      throw error(400, 'App fields cannot be updated on template assets');
    }
    validateTemplateBody(body, asset);
    return;
  }

  if (asset.type === 'App') {
    if (
      hasAnyDefined(body, [
        'priceString',
        'templateCategory',
        'templateTags',
        'templateStyleTags',
        'templateSiteTypes',
        'templateFeatureFlags',
        'templateLongDescription',
        'templateNotes',
        'templateChecklistConfirmed',
        'templateAgreementConfirmed'
      ])
    ) {
      throw error(400, 'Template fields cannot be updated on app assets');
    }
    validateAppBody(body, asset);
  }
}

// GET - Fetch single asset
export const GET: RequestHandler = async ({ params, locals, platform, url }) => {
  if (!locals.user?.email) {
    throw error(401, 'Unauthorized');
  }

  if (!platform?.env) {
    throw error(500, 'Platform environment not available');
  }

  const airtable = getAirtableClient(platform.env);

  // Verify ownership
  const debug = url.searchParams.get('debug') === '1';
  const isOwner = await airtable.verifyAssetOwnership(params.id, locals.user.email);
  if (!isOwner) {
    if (debug) {
      const details = await airtable.debugAssetOwnership(params.id, locals.user.email);
      console.error('[Asset API] Ownership denied', details.debug);
      return json(
        {
          error: 'Forbidden',
          message: 'You do not have permission to view this asset',
          debug: details.debug
        },
        { status: 403 }
      );
    }
    throw error(403, 'You do not have permission to view this asset');
  }

  const asset = await airtable.getAsset(params.id);
  if (!asset) {
    throw error(404, 'Asset not found');
  }

  return json({ asset });
};

// PATCH - Update asset (text fields only, legacy)
export const PATCH: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!locals.user?.email) {
    throw error(401, 'Unauthorized');
  }

  if (!platform?.env) {
    throw error(500, 'Platform environment not available');
  }

  const airtable = getAirtableClient(platform.env);

  // Verify ownership
  const isOwner = await airtable.verifyAssetOwnership(params.id, locals.user.email);
  if (!isOwner) {
    throw error(403, 'You do not have permission to edit this asset');
  }

  const body = (await request.json()) as AssetUpdateData;
  const currentAsset = await airtable.getAsset(params.id);
  if (!currentAsset) {
    throw error(404, 'Asset not found');
  }
  validateAssetUpdateBody(body, currentAsset);

  // Check name uniqueness if name is being changed
  if (body.name) {
    const nameCheck = await airtable.checkAssetNameUniqueness(body.name, params.id);
    if (!nameCheck.unique) {
      throw error(400, 'An asset with this name already exists');
    }
  }

  const updatedAsset = await airtable.updateAsset(params.id, body);
  if (!updatedAsset) {
    throw error(500, 'Failed to update asset');
  }

  return json({ asset: updatedAsset });
};

// PUT - Update asset with images
export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!locals.user?.email) {
    throw error(401, 'Unauthorized');
  }

  if (!platform?.env) {
    throw error(500, 'Platform environment not available');
  }

  const airtable = getAirtableClient(platform.env);

  // Verify ownership
  const isOwner = await airtable.verifyAssetOwnership(params.id, locals.user.email);
  if (!isOwner) {
    throw error(403, 'You do not have permission to edit this asset');
  }

  const body = (await request.json()) as AssetUpdateData;
  const currentAsset = await airtable.getAsset(params.id);
  if (!currentAsset) {
    throw error(404, 'Asset not found');
  }
  validateAssetUpdateBody(body, currentAsset);

  // Check name uniqueness if name is being changed
  if (body.name) {
    const nameCheck = await airtable.checkAssetNameUniqueness(body.name, params.id);
    if (!nameCheck.unique) {
      throw error(400, 'An asset with this name already exists');
    }
  }

  const updatedAsset = await airtable.updateAssetWithImages(params.id, body);
  if (!updatedAsset) {
    throw error(500, 'Failed to update asset');
  }

  return json({ asset: updatedAsset });
};

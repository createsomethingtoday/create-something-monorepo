import {
  APP_CAPABILITY_OPTIONS,
  APP_CATEGORY_OPTIONS,
  APP_SCOPE_OPTIONS,
  APP_VISIBILITY_OPTIONS,
  PAYMENT_TYPE_OPTIONS
} from './app-options';
import type { Asset, AssetUpdateData } from './airtable';
import { normalizeTemplatePreviewUrl, validateTemplateNameSyntax } from './template-intake';

function normalizeUrlString(value: string, fieldLabel: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${fieldLabel} is invalid.`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${fieldLabel} is invalid.`);
  }

  return parsed.toString();
}

function normalizeOptionalNullableHttpUrl(
  value: unknown,
  fieldLabel: string
): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldLabel} must be a string or null.`);
  }

  return normalizeUrlString(value, fieldLabel);
}

function normalizeStringArrayPreservingShape(
  value: unknown,
  fieldLabel: string
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fieldLabel} must be an array of strings.`);
  }

  if (value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`${fieldLabel} must be an array of strings.`);
  }

  return value.map((entry) => entry.trim());
}

export function normalizeOptionalTrimmedString(
  value: unknown,
  fieldLabel: string
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldLabel} must be a string.`);
  }

  return value.trim();
}

export function normalizeOptionalHttpUrl(value: unknown, fieldLabel: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldLabel} must be a string.`);
  }

  return normalizeUrlString(value, fieldLabel);
}

export function normalizeRequiredHttpUrl(value: unknown, fieldLabel: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldLabel} must be a string.`);
  }

  const normalized = normalizeUrlString(value, fieldLabel);
  if (!normalized) {
    throw new Error(`${fieldLabel} is required.`);
  }

  return normalized;
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
}

export function normalizeAssetUpdateData(body: AssetUpdateData): AssetUpdateData {
  const normalized: AssetUpdateData = { ...body };

  if (body.name !== undefined) normalized.name = normalizeOptionalTrimmedString(body.name, 'Name');
  if (body.description !== undefined) {
    normalized.description = normalizeOptionalTrimmedString(body.description, 'Description');
  }
  if (body.descriptionShort !== undefined) {
    normalized.descriptionShort = normalizeOptionalTrimmedString(
      body.descriptionShort,
      'Short description'
    );
  }
  if (body.descriptionLongHtml !== undefined) {
    normalized.descriptionLongHtml = normalizeOptionalTrimmedString(
      body.descriptionLongHtml,
      'Long description'
    );
  }
  if (body.websiteUrl !== undefined) {
    normalized.websiteUrl = normalizeOptionalHttpUrl(body.websiteUrl, 'Website URL');
  }
  if (body.previewUrl !== undefined) {
    normalized.previewUrl = normalizeOptionalHttpUrl(body.previewUrl, 'Preview URL');
  }
  if (body.thumbnailUrl !== undefined) {
    normalized.thumbnailUrl = normalizeOptionalNullableHttpUrl(body.thumbnailUrl, 'Thumbnail URL');
  }
  if (body.secondaryThumbnailUrl !== undefined) {
    normalized.secondaryThumbnailUrl = normalizeOptionalNullableHttpUrl(
      body.secondaryThumbnailUrl,
      'Secondary thumbnail URL'
    );
  }
  if (body.secondaryThumbnails !== undefined) {
    normalized.secondaryThumbnails = normalizeStringArray(body.secondaryThumbnails).map((entry) =>
      normalizeUrlString(entry, 'Secondary thumbnail URL')
    );
  }
  if (body.carouselImages !== undefined) {
    normalized.carouselImages = normalizeStringArray(body.carouselImages).map((entry) =>
      normalizeUrlString(entry, 'Carousel image URL')
    );
  }
  if (body.appCapabilities !== undefined) {
    normalized.appCapabilities = normalizeOptionalTrimmedString(
      body.appCapabilities,
      'App capabilities'
    );
  }
  if (body.appInstallUrl !== undefined) {
    normalized.appInstallUrl = normalizeOptionalHttpUrl(body.appInstallUrl, 'App install URL');
  }
  if (body.appScopes !== undefined) normalized.appScopes = normalizeStringArray(body.appScopes);
  if (body.appAvatarAltText !== undefined) {
    normalized.appAvatarAltText = normalizeOptionalTrimmedString(
      body.appAvatarAltText,
      'App icon alt text'
    );
  }
  if (body.paymentType !== undefined) normalized.paymentType = normalizeStringArray(body.paymentType);
  if (body.visibility !== undefined) {
    normalized.visibility = normalizeOptionalTrimmedString(body.visibility, 'Visibility');
  }
  if (body.appCategory !== undefined) normalized.appCategory = normalizeStringArray(body.appCategory);
  if (body.creatorName !== undefined) {
    normalized.creatorName = normalizeOptionalTrimmedString(body.creatorName, 'Creator name');
  }
  if (body.creatorWebsite !== undefined) {
    normalized.creatorWebsite = normalizeOptionalHttpUrl(body.creatorWebsite, 'Creator website URL');
  }
  if (body.creatorContactEmail !== undefined) {
    normalized.creatorContactEmail = normalizeOptionalTrimmedString(
      body.creatorContactEmail,
      'Creator contact email'
    );
  }
  if (body.appFeaturesOverview !== undefined) {
    normalized.appFeaturesOverview = normalizeStringArrayPreservingShape(
      body.appFeaturesOverview,
      'App features'
    );
  }
  if (body.appDeveloperNotes !== undefined) {
    normalized.appDeveloperNotes = normalizeOptionalTrimmedString(
      body.appDeveloperNotes,
      'Developer notes'
    );
  }
  if (body.appAccessCredentials !== undefined) {
    normalized.appAccessCredentials = normalizeOptionalTrimmedString(
      body.appAccessCredentials,
      'App access credentials'
    );
  }
  if (body.appVideoUrl !== undefined) {
    normalized.appVideoUrl = normalizeOptionalHttpUrl(body.appVideoUrl, 'App promo video URL');
  }
  if (body.appDemoVideoUrl !== undefined) {
    normalized.appDemoVideoUrl = normalizeOptionalHttpUrl(body.appDemoVideoUrl, 'App demo video URL');
  }
  if (body.appPrivacyPolicyUrl !== undefined) {
    normalized.appPrivacyPolicyUrl = normalizeOptionalHttpUrl(
      body.appPrivacyPolicyUrl,
      'Privacy policy URL'
    );
  }
  if (body.appSupportEmail !== undefined) {
    normalized.appSupportEmail = normalizeOptionalTrimmedString(
      body.appSupportEmail,
      'Support email'
    );
  }
  if (body.appSupportUrl !== undefined) {
    normalized.appSupportUrl = normalizeOptionalHttpUrl(body.appSupportUrl, 'Support URL');
  }
  if (body.appTermsUrl !== undefined) {
    normalized.appTermsUrl = normalizeOptionalHttpUrl(body.appTermsUrl, 'Terms URL');
  }
  if (body.appScreenshotAltTexts !== undefined) {
    normalized.appScreenshotAltTexts = normalizeStringArrayPreservingShape(
      body.appScreenshotAltTexts,
      'App screenshot alt texts'
    );
  }

  return normalized;
}

export function assertOptionalString(
  value: unknown,
  message: string
): asserts value is string | undefined {
  if (value !== undefined && typeof value !== 'string') {
    throw new Error(message);
  }
}

export function assertOptionalNullableString(
  value: unknown,
  message: string
): asserts value is string | null | undefined {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new Error(message);
  }
}

export function assertOptionalStringArray(
  value: unknown,
  message: string
): asserts value is string[] | undefined {
  if (value !== undefined) {
    if (!Array.isArray(value)) {
      throw new Error(message);
    }

    if (value.some((entry) => typeof entry !== 'string')) {
      throw new Error(message);
    }
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
  if (value !== undefined && value !== '' && !allowed.includes(value)) {
    throw new Error(message);
  }
}

function assertAllowedStringArray(
  value: string[] | undefined,
  allowed: readonly string[],
  message: string
): void {
  if (!value) return;
  const allowedSet = new Set(allowed);
  if (value.some((entry) => entry && !allowedSet.has(entry))) {
    throw new Error(message);
  }
}

const APP_ONLY_FIELDS: Array<keyof AssetUpdateData> = [
  'appCapabilities',
  'appInstallUrl',
  'appScopes',
  'appAvatarAltText',
  'paymentType',
  'visibility',
  'appCategory',
  'creatorName',
  'creatorWebsite',
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
];

export function validateAssetUpdateData(body: AssetUpdateData, asset?: Asset | null): void {
  assertOptionalString(body.name, 'Name must be a string');
  assertOptionalString(body.description, 'Description must be a string');
  assertOptionalString(body.descriptionShort, 'Short description must be a string');
  assertOptionalString(body.descriptionLongHtml, 'Long description must be a string');
  assertOptionalString(body.websiteUrl, 'Website URL must be a string');
  assertOptionalString(body.previewUrl, 'Preview URL must be a string');
  assertOptionalNullableString(body.thumbnailUrl, 'Thumbnail URL must be a string or null');
  assertOptionalNullableString(
    body.secondaryThumbnailUrl,
    'Secondary thumbnail URL must be a string or null'
  );
  assertOptionalStringArray(body.secondaryThumbnails, 'Secondary thumbnails must be an array of strings');
  assertOptionalStringArray(body.carouselImages, 'Carousel images must be an array of strings');
  assertOptionalString(body.appCapabilities, 'App capabilities must be a string');
  assertOptionalString(body.appInstallUrl, 'App install URL must be a string');
  assertOptionalStringArray(body.appScopes, 'App scopes must be an array of strings');
  assertOptionalString(body.appAvatarAltText, 'App icon alt text must be a string');
  assertOptionalStringArray(body.paymentType, 'Payment types must be an array of strings');
  assertOptionalString(body.visibility, 'Visibility must be a string');
  assertOptionalStringArray(body.appCategory, 'App categories must be an array of strings');
  assertOptionalString(body.creatorName, 'Creator name must be a string');
  assertOptionalString(body.creatorWebsite, 'Creator website must be a string');
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
    throw new Error('Select at most two app categories.');
  }

  if (body.name !== undefined) {
    const syntax = validateTemplateNameSyntax(body.name);
    if (!syntax.valid) {
      throw new Error(syntax.errors[0] || 'Asset name failed validation.');
    }
  }

  if (body.previewUrl !== undefined && body.previewUrl.trim()) {
    normalizeTemplatePreviewUrl(body.previewUrl);
  }

  if (asset && asset.type !== 'App' && hasAnyDefined(body, APP_ONLY_FIELDS)) {
    throw new Error('App fields cannot be updated on non-app assets.');
  }

  if (asset?.type === 'App') {
    const nextCapabilities = body.appCapabilities ?? asset.appCapabilities ?? '';
    const nextInstallUrl = body.appInstallUrl ?? asset.appInstallUrl ?? '';
    const nextThumbnailUrl = body.thumbnailUrl === undefined ? asset.thumbnailUrl : body.thumbnailUrl;
    const nextAvatarAltText = body.appAvatarAltText ?? asset.appAvatarAltText ?? '';
    const nextCarouselImages = body.carouselImages ?? asset.carouselImages ?? [];
    const nextScreenshotAltTexts = body.appScreenshotAltTexts ?? asset.appScreenshotAltTexts ?? [];

    if (
      (nextCapabilities === 'Data Client v2' || nextCapabilities === 'Hybrid') &&
      !nextInstallUrl.trim()
    ) {
      throw new Error('Install URL is required for Data Client and Hybrid apps.');
    }

    if (nextThumbnailUrl && !nextAvatarAltText.trim()) {
      throw new Error('App icon alt text is required when an icon is present.');
    }

    if (nextCarouselImages.some((_, index) => !nextScreenshotAltTexts[index]?.trim())) {
      throw new Error('Provide alt text for each app screenshot.');
    }
  }
}

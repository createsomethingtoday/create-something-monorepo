export const ASSET_DRAFT_TYPES = ['Template', 'App'] as const;
export type AssetDraftType = (typeof ASSET_DRAFT_TYPES)[number];

export const APP_CAPABILITY_OPTIONS = ['Data Client v2', 'Designer Extension', 'Hybrid'] as const;
export const APP_SCOPE_OPTIONS = [
  'app-subscriptions',
  'assets',
  'authorized-user',
  'cms',
  'comments',
  'components',
  'custom-code',
  'ecommerce',
  'forms',
  'pages',
  'sites',
  'site-activity',
  'site-config',
  'user-accounts',
  'workspace'
] as const;
export const APP_CATEGORY_OPTIONS = [
  'AI',
  'Analytics',
  'Asset Management',
  'Automation',
  'Compliance',
  'Content Management',
  'Customer Support',
  'Data Sync',
  'Design',
  'Development and Coding',
  'Ecommerce',
  'Forms and Surveys',
  'Icons',
  'Localization',
  'Marketing',
  'Scheduling',
  'SEO',
  'User Management',
  'Utilities'
] as const;
export const PAYMENT_TYPE_OPTIONS = ['Free', 'Paid'] as const;
export const VISIBILITY_OPTIONS = ['Public', 'Private'] as const;
export const APP_SCREENSHOT_RATIO = { width: 1280, height: 846 };
export const APP_FEATURE_LIMIT = 5;
export const APP_SCREENSHOT_ALT_LIMIT = 5;

export interface BaseAssetDraftData {
  assetType: AssetDraftType;
  name: string;
  descriptionShort: string;
  descriptionLong: string;
  thumbnailUrl: string;
  galleryUrls: string[];
}

export interface TemplateAssetDraftData extends BaseAssetDraftData {
  assetType: 'Template';
  publishedUrl: string;
  previewUrl: string;
  priceModel: 'Free' | 'Paid';
  category: string;
  tags: string[];
  styleTags: string[];
  siteTypes: string[];
  featureFlags: string[];
  notes: string;
  secondaryThumbnailUrl: string;
  creatorName: string;
  creatorEmail: string;
}

export interface AppAssetDraftData extends BaseAssetDraftData {
  assetType: 'App';
  websiteUrl: string;
  appCapabilities: string;
  appInstallUrl: string;
  appScopes: string[];
  appAvatarAltText: string;
  paymentType: string[];
  visibility: string;
  appCategory: string[];
  creatorName: string;
  creatorWebsite: string;
  creatorContactEmail: string;
  appFeaturesOverview: string[];
  appDeveloperNotes: string;
  appAccessCredentials: string;
  appVideoUrl: string;
  appDemoVideoUrl: string;
  appPrivacyPolicyUrl: string;
  appSupportEmail: string;
  appSupportUrl: string;
  appTermsUrl: string;
  appScreenshotAltTexts: string[];
}

export type AssetDraftData = TemplateAssetDraftData | AppAssetDraftData;

export interface AssetDraftRecord {
  id: string;
  userEmail: string;
  assetType: AssetDraftType;
  title: string;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
  data: AssetDraftData;
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmailLike(value: unknown, fallback = ''): string {
  const trimmed = trimString(value).toLowerCase();
  return trimmed || fallback.trim().toLowerCase();
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => normalizeStringList(entry))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,;]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

export function parseDraftListInput(value: string): string[] {
  return normalizeStringList(value);
}

export function joinDraftList(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(', ');
}

function normalizeFixedLengthList(value: unknown, length: number): string[] {
  const values = normalizeStringList(value);
  return Array.from({ length }, (_, index) => values[index] || '');
}

export function createEmptyTemplateDraft(ownerEmail = ''): TemplateAssetDraftData {
  return {
    assetType: 'Template',
    name: '',
    descriptionShort: '',
    descriptionLong: '',
    thumbnailUrl: '',
    galleryUrls: [],
    publishedUrl: '',
    previewUrl: '',
    priceModel: 'Free',
    category: '',
    tags: [],
    styleTags: [],
    siteTypes: [],
    featureFlags: [],
    notes: '',
    secondaryThumbnailUrl: '',
    creatorName: '',
    creatorEmail: ownerEmail.trim().toLowerCase()
  };
}

export function createEmptyAppDraft(ownerEmail = ''): AppAssetDraftData {
  return {
    assetType: 'App',
    name: '',
    descriptionShort: '',
    descriptionLong: '',
    thumbnailUrl: '',
    galleryUrls: [],
    websiteUrl: '',
    appCapabilities: '',
    appInstallUrl: '',
    appScopes: [],
    appAvatarAltText: '',
    paymentType: [],
    visibility: '',
    appCategory: [],
    creatorName: '',
    creatorWebsite: '',
    creatorContactEmail: ownerEmail.trim().toLowerCase(),
    appFeaturesOverview: Array.from({ length: APP_FEATURE_LIMIT }, () => ''),
    appDeveloperNotes: '',
    appAccessCredentials: '',
    appVideoUrl: '',
    appDemoVideoUrl: '',
    appPrivacyPolicyUrl: '',
    appSupportEmail: '',
    appSupportUrl: '',
    appTermsUrl: '',
    appScreenshotAltTexts: Array.from({ length: APP_SCREENSHOT_ALT_LIMIT }, () => '')
  };
}

export function normalizeTemplateDraftData(
  value: Partial<TemplateAssetDraftData> | undefined,
  ownerEmail = ''
): TemplateAssetDraftData {
  return {
    ...createEmptyTemplateDraft(ownerEmail),
    assetType: 'Template',
    name: trimString(value?.name),
    descriptionShort: trimString(value?.descriptionShort),
    descriptionLong: trimString(value?.descriptionLong),
    thumbnailUrl: trimString(value?.thumbnailUrl),
    galleryUrls: normalizeStringList(value?.galleryUrls),
    publishedUrl: trimString(value?.publishedUrl),
    previewUrl: trimString(value?.previewUrl),
    priceModel: value?.priceModel === 'Paid' ? 'Paid' : 'Free',
    category: trimString(value?.category),
    tags: normalizeStringList(value?.tags),
    styleTags: normalizeStringList(value?.styleTags),
    siteTypes: normalizeStringList(value?.siteTypes),
    featureFlags: normalizeStringList(value?.featureFlags),
    notes: trimString(value?.notes),
    secondaryThumbnailUrl: trimString(value?.secondaryThumbnailUrl),
    creatorName: trimString(value?.creatorName),
    creatorEmail: normalizeEmailLike(value?.creatorEmail, ownerEmail)
  };
}

export function normalizeAppDraftData(
  value: Partial<AppAssetDraftData> | undefined,
  ownerEmail = ''
): AppAssetDraftData {
  return {
    ...createEmptyAppDraft(ownerEmail),
    assetType: 'App',
    name: trimString(value?.name),
    descriptionShort: trimString(value?.descriptionShort),
    descriptionLong: trimString(value?.descriptionLong),
    thumbnailUrl: trimString(value?.thumbnailUrl),
    galleryUrls: normalizeStringList(value?.galleryUrls),
    websiteUrl: trimString(value?.websiteUrl),
    appCapabilities: trimString(value?.appCapabilities),
    appInstallUrl: trimString(value?.appInstallUrl),
    appScopes: normalizeStringList(value?.appScopes),
    appAvatarAltText: trimString(value?.appAvatarAltText),
    paymentType: normalizeStringList(value?.paymentType),
    visibility: trimString(value?.visibility),
    appCategory: normalizeStringList(value?.appCategory),
    creatorName: trimString(value?.creatorName),
    creatorWebsite: trimString(value?.creatorWebsite),
    creatorContactEmail: normalizeEmailLike(value?.creatorContactEmail, ownerEmail),
    appFeaturesOverview: normalizeFixedLengthList(value?.appFeaturesOverview, APP_FEATURE_LIMIT),
    appDeveloperNotes: trimString(value?.appDeveloperNotes),
    appAccessCredentials: trimString(value?.appAccessCredentials),
    appVideoUrl: trimString(value?.appVideoUrl),
    appDemoVideoUrl: trimString(value?.appDemoVideoUrl),
    appPrivacyPolicyUrl: trimString(value?.appPrivacyPolicyUrl),
    appSupportEmail: trimString(value?.appSupportEmail),
    appSupportUrl: trimString(value?.appSupportUrl),
    appTermsUrl: trimString(value?.appTermsUrl),
    appScreenshotAltTexts: normalizeFixedLengthList(
      value?.appScreenshotAltTexts,
      APP_SCREENSHOT_ALT_LIMIT
    )
  };
}

export function normalizeAssetDraftData(
  value: Partial<AssetDraftData> | Record<string, unknown> | undefined,
  ownerEmail = ''
): AssetDraftData {
  const assetType = trimString((value as { assetType?: unknown } | undefined)?.assetType);
  if (assetType === 'App') {
    return normalizeAppDraftData(value as Partial<AppAssetDraftData>, ownerEmail);
  }

  return normalizeTemplateDraftData(value as Partial<TemplateAssetDraftData>, ownerEmail);
}

export function getAssetDraftTitle(draft: AssetDraftData): string {
  return draft.name.trim() || 'Untitled Draft';
}

export function getAssetDraftThumbnailUrl(draft: AssetDraftData): string | null {
  return draft.thumbnailUrl.trim() || null;
}

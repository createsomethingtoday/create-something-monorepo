export interface TemplateDraftVerificationState {
  creatorEligibilityEmail: string;
  templateNameVerified: string;
  publishedUrlVerified: string;
  publishedUrlMessage: string;
  gsapDetected: boolean;
}

export interface TemplateDraftPayload {
  creatorName: string;
  creatorEmail: string;
  templateName: string;
  publishedUrl: string;
  previewUrl: string;
  priceModel: 'Free' | 'Paid';
  category: string;
  tags: string[];
  styleTags: string[];
  siteTypes: string[];
  featureFlags: string[];
  shortDescription: string;
  longDescription: string;
  notes: string;
  thumbnailUrl: string;
  secondaryThumbnailUrl: string;
  galleryUrls: string[];
  checklistConfirmed: boolean;
  agreementConfirmed: boolean;
  verification: TemplateDraftVerificationState;
  savedAt?: string;
}

export const TEMPLATE_DRAFT_STORAGE_KEY = 'webflow-dashboard-cloud.template-draft';

const TEMPLATE_DRAFT_MARKER_PREFIX = '<!-- cs-intake-draft:';
const TEMPLATE_DRAFT_MARKER_SUFFIX = ' -->';
const TEMPLATE_DRAFT_REGEX = /<!--\s*cs-intake-draft:([\s\S]*?)\s*-->/;

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry).trim())
    .filter(Boolean);
}

export function normalizeTemplateDraftVerificationState(
  value: Partial<TemplateDraftVerificationState> | undefined
): TemplateDraftVerificationState {
  return {
    creatorEligibilityEmail: String(value?.creatorEligibilityEmail || '').trim().toLowerCase(),
    templateNameVerified: String(value?.templateNameVerified || '').trim(),
    publishedUrlVerified: String(value?.publishedUrlVerified || '').trim(),
    publishedUrlMessage: String(value?.publishedUrlMessage || '').trim(),
    gsapDetected: Boolean(value?.gsapDetected)
  };
}

export function normalizeTemplateDraftPayload(
  value: Partial<TemplateDraftPayload>
): TemplateDraftPayload {
  return {
    creatorName: String(value.creatorName || '').trim(),
    creatorEmail: String(value.creatorEmail || '').trim().toLowerCase(),
    templateName: String(value.templateName || '').trim(),
    publishedUrl: String(value.publishedUrl || '').trim(),
    previewUrl: String(value.previewUrl || '').trim(),
    priceModel: value.priceModel === 'Paid' ? 'Paid' : 'Free',
    category: String(value.category || '').trim(),
    tags: normalizeStringArray(value.tags),
    styleTags: normalizeStringArray(value.styleTags),
    siteTypes: normalizeStringArray(value.siteTypes),
    featureFlags: normalizeStringArray(value.featureFlags),
    shortDescription: String(value.shortDescription || '').trim(),
    longDescription: String(value.longDescription || ''),
    notes: String(value.notes || ''),
    thumbnailUrl: String(value.thumbnailUrl || '').trim(),
    secondaryThumbnailUrl: String(value.secondaryThumbnailUrl || '').trim(),
    galleryUrls: normalizeStringArray(value.galleryUrls),
    checklistConfirmed: Boolean(value.checklistConfirmed),
    agreementConfirmed: Boolean(value.agreementConfirmed),
    verification: normalizeTemplateDraftVerificationState(value.verification),
    savedAt: value.savedAt ? String(value.savedAt) : undefined
  };
}

export function stripTemplateDraftMetadata(html: string | undefined): string {
  if (!html) return '';
  return html.replace(TEMPLATE_DRAFT_REGEX, '').trim();
}

export function appendTemplateDraftMetadata(
  html: string | undefined,
  payload: Partial<TemplateDraftPayload>
): string {
  const baseHtml = stripTemplateDraftMetadata(html);
  const normalized = normalizeTemplateDraftPayload(payload);
  const serialized = encodeURIComponent(JSON.stringify(normalized));
  const marker = `${TEMPLATE_DRAFT_MARKER_PREFIX}${serialized}${TEMPLATE_DRAFT_MARKER_SUFFIX}`;
  return baseHtml ? `${baseHtml}\n\n${marker}` : marker;
}

export function parseTemplateDraftMetadata(
  html: string | undefined
): TemplateDraftPayload | null {
  if (!html) return null;
  const match = html.match(TEMPLATE_DRAFT_REGEX);
  if (!match?.[1]) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as Partial<TemplateDraftPayload>;
    return normalizeTemplateDraftPayload(parsed);
  } catch {
    return null;
  }
}

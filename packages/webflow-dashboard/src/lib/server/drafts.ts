import {
  getAssetDraftThumbnailUrl,
  getAssetDraftTitle,
  normalizeAssetDraftData,
  type AssetDraftData,
  type AssetDraftRecord,
  type AssetDraftType,
  type AppAssetDraftData,
  type TemplateAssetDraftData
} from '$lib/drafts';
import {
  getAirtableClient,
  validateEmail,
  type Asset,
  type CreateAppAssetDraftInput,
  type CreateTemplateAssetDraftInput
} from '$lib/server/airtable';
import { buildTemplateDraftHtml, buildTemplateDraftSummary } from '$lib/server/template-draft-content';

type DraftRow = {
  id: string;
  user_email: string;
  asset_type: AssetDraftType;
  title: string;
  thumbnail_url: string | null;
  data_json: string;
  created_at: string;
  updated_at: string;
};

type SaveAssetDraftInput = {
  id?: string;
  draft: AssetDraftData | Record<string, unknown>;
};

const DRAFT_COLUMNS =
  'id, user_email, asset_type, title, thumbnail_url, data_json, created_at, updated_at';

function parseDraftPayload(dataJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(dataJson);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function mapDraftRow(row: DraftRow): AssetDraftRecord {
  const ownerEmail = String(row.user_email || '').trim().toLowerCase();
  const data = normalizeAssetDraftData(parseDraftPayload(row.data_json), ownerEmail);

  return {
    id: row.id,
    userEmail: ownerEmail,
    assetType: row.asset_type,
    title: row.title || getAssetDraftTitle(data),
    thumbnailUrl: row.thumbnail_url || getAssetDraftThumbnailUrl(data),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    data
  };
}

function serializeDraftRecord(draft: AssetDraftData): string {
  return JSON.stringify(draft);
}

function resolveContactEmail(candidate: string, fallback: string): string {
  try {
    return validateEmail(candidate || fallback);
  } catch {
    return validateEmail(fallback);
  }
}

function buildTemplatePromotionInput(
  draft: TemplateAssetDraftData,
  ownerEmail: string
): CreateTemplateAssetDraftInput {
  const creatorEmail = resolveContactEmail(draft.creatorEmail, ownerEmail);

  return {
    name: draft.name,
    description: buildTemplateDraftSummary({
      category: draft.category,
      tags: draft.tags,
      siteTypes: draft.siteTypes,
      featureFlags: draft.featureFlags,
      notes: draft.notes
    }),
    descriptionShort: draft.descriptionShort,
    descriptionLongHtml: buildTemplateDraftHtml({
      descriptionLong: draft.descriptionLong,
      notes: draft.notes,
      category: draft.category,
      tags: draft.tags,
      styleTags: draft.styleTags,
      siteTypes: draft.siteTypes,
      featureFlags: draft.featureFlags,
      publishedUrl: draft.publishedUrl
    }),
    websiteUrl: draft.publishedUrl,
    previewUrl: draft.previewUrl,
    priceString: draft.priceModel,
    thumbnailUrl: draft.thumbnailUrl || null,
    secondaryThumbnailUrl: draft.secondaryThumbnailUrl || null,
    secondaryThumbnails: draft.secondaryThumbnailUrl ? [draft.secondaryThumbnailUrl] : [],
    carouselImages: draft.galleryUrls,
    creatorEmail
  };
}

function buildAppPromotionInput(
  draft: AppAssetDraftData,
  ownerEmail: string
): CreateAppAssetDraftInput {
  return {
    name: draft.name,
    description: draft.descriptionShort || draft.descriptionLong,
    descriptionShort: draft.descriptionShort,
    descriptionLongHtml: draft.descriptionLong,
    websiteUrl: draft.websiteUrl,
    thumbnailUrl: draft.thumbnailUrl || null,
    carouselImages: draft.galleryUrls,
    appCapabilities: draft.appCapabilities,
    appInstallUrl: draft.appInstallUrl,
    appScopes: draft.appScopes,
    appAvatarAltText: draft.appAvatarAltText,
    paymentType: draft.paymentType,
    visibility: draft.visibility,
    appCategory: draft.appCategory,
    creatorName: draft.creatorName,
    creatorWebsite: draft.creatorWebsite,
    creatorContactEmail: resolveContactEmail(draft.creatorContactEmail, ownerEmail),
    appFeaturesOverview: draft.appFeaturesOverview,
    appDeveloperNotes: draft.appDeveloperNotes,
    appAccessCredentials: draft.appAccessCredentials,
    appVideoUrl: draft.appVideoUrl,
    appDemoVideoUrl: draft.appDemoVideoUrl,
    appPrivacyPolicyUrl: draft.appPrivacyPolicyUrl,
    appSupportEmail: draft.appSupportEmail,
    appSupportUrl: draft.appSupportUrl,
    appTermsUrl: draft.appTermsUrl,
    appScreenshotAltTexts: draft.appScreenshotAltTexts
  };
}

export async function listAssetDrafts(
  db: D1Database,
  userEmail: string
): Promise<AssetDraftRecord[]> {
  const ownerEmail = validateEmail(userEmail);
  const result = await db
    .prepare(`SELECT ${DRAFT_COLUMNS} FROM asset_drafts WHERE user_email = ? ORDER BY updated_at DESC`)
    .bind(ownerEmail)
    .all();

  return ((result.results || []) as DraftRow[]).map(mapDraftRow);
}

export async function getAssetDraft(
  db: D1Database,
  draftId: string,
  userEmail: string
): Promise<AssetDraftRecord | null> {
  const ownerEmail = validateEmail(userEmail);
  const row = await db
    .prepare(`SELECT ${DRAFT_COLUMNS} FROM asset_drafts WHERE id = ? AND user_email = ? LIMIT 1`)
    .bind(draftId, ownerEmail)
    .first();

  return row ? mapDraftRow(row as DraftRow) : null;
}

export async function saveAssetDraft(
  db: D1Database,
  userEmail: string,
  input: SaveAssetDraftInput
): Promise<AssetDraftRecord> {
  const ownerEmail = validateEmail(userEmail);
  const draft = normalizeAssetDraftData(input.draft, ownerEmail);
  const now = new Date().toISOString();
  const draftId = input.id?.trim() || crypto.randomUUID();
  const title = getAssetDraftTitle(draft);
  const thumbnailUrl = getAssetDraftThumbnailUrl(draft);
  const dataJson = serializeDraftRecord(draft);

  if (input.id) {
    await db
      .prepare(
        `UPDATE asset_drafts
         SET asset_type = ?, title = ?, thumbnail_url = ?, data_json = ?, updated_at = ?
         WHERE id = ? AND user_email = ?`
      )
      .bind(draft.assetType, title, thumbnailUrl, dataJson, now, draftId, ownerEmail)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO asset_drafts
         (id, user_email, asset_type, title, thumbnail_url, data_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(draftId, ownerEmail, draft.assetType, title, thumbnailUrl, dataJson, now, now)
      .run();
  }

  const saved = await getAssetDraft(db, draftId, ownerEmail);
  if (!saved) {
    throw new Error('Failed to save draft.');
  }

  return saved;
}

export async function deleteAssetDraft(
  db: D1Database,
  draftId: string,
  userEmail: string
): Promise<boolean> {
  const ownerEmail = validateEmail(userEmail);
  const result = await db
    .prepare('DELETE FROM asset_drafts WHERE id = ? AND user_email = ?')
    .bind(draftId, ownerEmail)
    .run();

  return Number(result.meta.changes || 0) > 0;
}

export async function promoteAssetDraft(
  db: D1Database,
  env: App.Platform['env'],
  userEmail: string,
  draftId: string
): Promise<{ draft: AssetDraftRecord; asset: Asset }> {
  const ownerEmail = validateEmail(userEmail);
  const draftRecord = await getAssetDraft(db, draftId, ownerEmail);

  if (!draftRecord) {
    throw new Error('Draft not found.');
  }

  const airtable = getAirtableClient(env);
  const nameCheck = await airtable.checkAssetNameUniqueness(draftRecord.data.name);
  if (!nameCheck.unique) {
    throw new Error('An asset with this name already exists.');
  }

  const asset =
    draftRecord.assetType === 'Template'
      ? await airtable.createTemplateAssetDraft(
          buildTemplatePromotionInput(draftRecord.data as TemplateAssetDraftData, ownerEmail)
        )
      : await airtable.createAppAssetDraft(
          buildAppPromotionInput(draftRecord.data as AppAssetDraftData, ownerEmail)
        );

  await deleteAssetDraft(db, draftId, ownerEmail);

  return {
    draft: draftRecord,
    asset
  };
}

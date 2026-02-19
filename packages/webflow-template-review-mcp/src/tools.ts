import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  AirtableClient,
  toAttachmentPayload,
  toSingleCollaboratorPayload,
} from './airtable.js';
import {
  ASSET_FIELDS,
  CANONICAL_FIELD_MAP,
  COMPUTED_FIELD_KEYS,
  STATUS_ENUMS,
  TABLE_IDS,
  VERSION_FIELDS,
  assertEnumValue,
  assertMultiEnumValues,
  getStatusOptions,
  isTemplateScopedAssetFields,
} from './schema.js';

export type ToolContext = {
  client: AirtableClient;
  authRequired: boolean;
  baseId: string;
};

type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
};

type TemplateAssetRecord = AirtableRecord;
type VersionRecord = AirtableRecord;

type QueueSnapshot = {
  generated_at: string;
  total: number;
  records: ReturnType<typeof mapQueueRecord>[];
};

type TemplateAssetMetadataInput = {
  asset_id?: string;
  template_name?: string;
  marketplace_status?: string;
  website_url?: string;
  preview_site_url?: string;
  category_record_ids?: string[];
  style_record_ids?: string[];
  tags_primary_record_ids?: string[];
  tags_multi_record_ids?: string[];
  type_cms?: boolean;
  type_ecommerce?: boolean;
  type_multi_layout?: boolean;
  multi_layout_grouping?: string;
  payment_types?: string[];
  thumbnail_image_urls?: string[];
  thumbnail_alt_text?: string;
  cms_slug?: string;
  mrp_id_overwrite?: string;
  latest_review_status?: string;
  days_in_current_review_stage?: number;
  release_date?: string;
};

function envelope(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, data }, null, 2) }],
  };
}

function errorEnvelope(code: string, message: string, details?: unknown) {
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            ok: false,
            error: {
              code,
              message,
              ...(details !== undefined ? { details } : {}),
            },
          },
          null,
          2,
        ),
      },
    ],
  };
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function asAttachmentUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (entry && typeof entry === 'object' && 'url' in entry) {
        const maybe = (entry as { url?: unknown }).url;
        return typeof maybe === 'string' ? maybe : null;
      }
      return null;
    })
    .filter((entry): entry is string => Boolean(entry));
}

function asSingleCollaborator(value: unknown): { id?: string; email?: string; name?: string } | null {
  if (!value) return null;
  const source =
    Array.isArray(value) && value.length > 0 && typeof value[0] === 'object'
      ? (value[0] as unknown)
      : value;
  if (!source || typeof source !== 'object') return null;
  const maybe = source as { id?: unknown; email?: unknown; name?: unknown };
  const id = typeof maybe.id === 'string' ? maybe.id : undefined;
  const email = typeof maybe.email === 'string' ? maybe.email : undefined;
  const name = typeof maybe.name === 'string' ? maybe.name : undefined;
  if (!id && !email && !name) return null;
  return { ...(id ? { id } : {}), ...(email ? { email } : {}), ...(name ? { name } : {}) };
}

function asIsoDateTime(value: string, fieldName: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid ISO datetime string.`);
  }
  return new Date(parsed).toISOString();
}

const TEMPLATE_ASSET_FIELD_IDS = [
  ASSET_FIELDS.name,
  ASSET_FIELDS.typeText,
  ASSET_FIELDS.marketplaceStatus,
  ASSET_FIELDS.latestReviewStatus,
  ASSET_FIELDS.latestReviewer,
  ASSET_FIELDS.latestReviewFeedback,
  ASSET_FIELDS.latestActionableReviewStatus,
  ASSET_FIELDS.daysInCurrentReviewStage,
  ASSET_FIELDS.versions,
  ASSET_FIELDS.creatorName,
  ASSET_FIELDS.creatorNameOverride,
  ASSET_FIELDS.websiteUrl,
  ASSET_FIELDS.previewSiteUrl,
  ASSET_FIELDS.openAdminUrl,
  ASSET_FIELDS.categories,
  ASSET_FIELDS.styles,
  ASSET_FIELDS.tagsPrimary,
  ASSET_FIELDS.tagsMulti,
  ASSET_FIELDS.typeCms,
  ASSET_FIELDS.typeEcommerce,
  ASSET_FIELDS.typeMultiLayout,
  ASSET_FIELDS.multiLayoutGrouping,
  ASSET_FIELDS.paymentTypes,
  ASSET_FIELDS.thumbnailImage,
  ASSET_FIELDS.thumbnailAltText,
  ASSET_FIELDS.cmsSlug,
  ASSET_FIELDS.mrpIdRollup,
  ASSET_FIELDS.mrpIdOverride,
];

const TEMPLATE_VERSION_FIELD_IDS = [
  VERSION_FIELDS.name,
  VERSION_FIELDS.reviewStatus,
  VERSION_FIELDS.reviewType,
  VERSION_FIELDS.reviewer,
  VERSION_FIELDS.reviewFeedback,
  VERSION_FIELDS.reviewChecklist,
  VERSION_FIELDS.qualityRating,
  VERSION_FIELDS.improvementAreas,
  VERSION_FIELDS.publishingChecklist,
  VERSION_FIELDS.releaseLinks,
  VERSION_FIELDS.releaseDate,
  VERSION_FIELDS.rejectionReason,
  VERSION_FIELDS.rejectionFeedback,
  VERSION_FIELDS.reviewLength,
  VERSION_FIELDS.submissionDatetime,
  VERSION_FIELDS.submissionDatetimeOverride,
  VERSION_FIELDS.versionNumber,
  VERSION_FIELDS.assetLink,
  VERSION_FIELDS.assetAdminUrl,
  VERSION_FIELDS.previewSiteUrlLookup,
  VERSION_FIELDS.websiteUrlLookup,
];

function assertTemplateAsset(asset: TemplateAssetRecord): void {
  if (!isTemplateScopedAssetFields(asset.fields)) {
    throw new Error('Record exists but is not in template scope.');
  }
}

function mapTemplateAssetRecord(record: TemplateAssetRecord) {
  const fields = record.fields;
  return {
    asset_id: record.id,
    template_name: asString(fields[ASSET_FIELDS.name]),
    template_type: asString(fields[ASSET_FIELDS.typeText]),
    creator_name: asString(fields[ASSET_FIELDS.creatorNameOverride]) || asString(fields[ASSET_FIELDS.creatorName]),
    marketplace_status: asString(fields[ASSET_FIELDS.marketplaceStatus]),
    latest_review_status: asStringArray(fields[ASSET_FIELDS.latestReviewStatus]),
    latest_actionable_review_status: asStringArray(fields[ASSET_FIELDS.latestActionableReviewStatus]),
    latest_reviewer: asStringArray(fields[ASSET_FIELDS.latestReviewer]),
    latest_review_feedback: asStringArray(fields[ASSET_FIELDS.latestReviewFeedback]),
    days_in_current_review_stage: asNumber(fields[ASSET_FIELDS.daysInCurrentReviewStage]),
    version_ids: asStringArray(fields[ASSET_FIELDS.versions]),
    website_url: asString(fields[ASSET_FIELDS.websiteUrl]),
    preview_site_url: asString(fields[ASSET_FIELDS.previewSiteUrl]),
    open_admin_url: asString(fields[ASSET_FIELDS.openAdminUrl]),
    categories: asStringArray(fields[ASSET_FIELDS.categories]),
    styles: asStringArray(fields[ASSET_FIELDS.styles]),
    tags_primary: asStringArray(fields[ASSET_FIELDS.tagsPrimary]),
    tags_multi: asStringArray(fields[ASSET_FIELDS.tagsMulti]),
    type_cms: asBoolean(fields[ASSET_FIELDS.typeCms]),
    type_ecommerce: asBoolean(fields[ASSET_FIELDS.typeEcommerce]),
    type_multi_layout: asBoolean(fields[ASSET_FIELDS.typeMultiLayout]),
    multi_layout_grouping: asString(fields[ASSET_FIELDS.multiLayoutGrouping]),
    payment_types: asStringArray(fields[ASSET_FIELDS.paymentTypes]),
    thumbnail_image_urls: asAttachmentUrls(fields[ASSET_FIELDS.thumbnailImage]),
    thumbnail_alt_text: asString(fields[ASSET_FIELDS.thumbnailAltText]),
    cms_slug: asString(fields[ASSET_FIELDS.cmsSlug]),
    mrp_id: asStringArray(fields[ASSET_FIELDS.mrpIdRollup]),
    mrp_id_overwrite: asString(fields[ASSET_FIELDS.mrpIdOverride]),
  };
}

function mapVersionRecord(record: VersionRecord) {
  const fields = record.fields;
  return {
    version_id: record.id,
    name: asString(fields[VERSION_FIELDS.name]),
    review_status: asString(fields[VERSION_FIELDS.reviewStatus]),
    review_type: asString(fields[VERSION_FIELDS.reviewType]),
    review_owner: asSingleCollaborator(fields[VERSION_FIELDS.reviewer]),
    quality_rating: asString(fields[VERSION_FIELDS.qualityRating]),
    improvement_areas: asStringArray(fields[VERSION_FIELDS.improvementAreas]),
    review_feedback: asString(fields[VERSION_FIELDS.reviewFeedback]),
    review_checklist: asString(fields[VERSION_FIELDS.reviewChecklist]),
    publishing_checklist: asString(fields[VERSION_FIELDS.publishingChecklist]),
    release_record_ids: asStringArray(fields[VERSION_FIELDS.releaseLinks]),
    release_date: asStringArray(fields[VERSION_FIELDS.releaseDate]),
    rejection_reason: asString(fields[VERSION_FIELDS.rejectionReason]),
    rejection_feedback: asString(fields[VERSION_FIELDS.rejectionFeedback]),
    review_length: asString(fields[VERSION_FIELDS.reviewLength]),
    submission_datetime: asString(fields[VERSION_FIELDS.submissionDatetime]),
    submission_datetime_override: asString(fields[VERSION_FIELDS.submissionDatetimeOverride]),
    version_number: asNumber(fields[VERSION_FIELDS.versionNumber]),
    asset_ids: asStringArray(fields[VERSION_FIELDS.assetLink]),
    website_urls: asStringArray(fields[VERSION_FIELDS.websiteUrlLookup]),
    preview_site_urls: asStringArray(fields[VERSION_FIELDS.previewSiteUrlLookup]),
    asset_admin_urls: asStringArray(fields[VERSION_FIELDS.assetAdminUrl]),
  };
}

function mapQueueRecord(record: TemplateAssetRecord) {
  const base = mapTemplateAssetRecord(record);
  return {
    asset_id: base.asset_id,
    template_name: base.template_name,
    creator_name: base.creator_name,
    latest_review_status: base.latest_review_status,
    latest_actionable_review_status: base.latest_actionable_review_status,
    latest_reviewer: base.latest_reviewer,
    days_in_current_review_stage: base.days_in_current_review_stage,
    marketplace_status: base.marketplace_status,
    website_url: base.website_url,
    preview_site_url: base.preview_site_url,
    open_admin_url: base.open_admin_url,
    version_count: base.version_ids.length,
  };
}

async function listTemplateAssets(ctx: ToolContext): Promise<TemplateAssetRecord[]> {
  const assets = await ctx.client.listAllRecords('assets', {
    fieldIds: TEMPLATE_ASSET_FIELD_IDS,
    pageSize: 100,
  });
  return assets.filter((asset) => isTemplateScopedAssetFields(asset.fields));
}

async function resolveTemplateAsset(
  ctx: ToolContext,
  assetId?: string,
  templateName?: string,
): Promise<TemplateAssetRecord> {
  if (!assetId && !templateName) {
    throw new Error('Provide asset_id or template_name.');
  }

  if (assetId) {
    const asset = await ctx.client.getRecord('assets', assetId, TEMPLATE_ASSET_FIELD_IDS);
    assertTemplateAsset(asset);
    return asset;
  }

  const allTemplates = await listTemplateAssets(ctx);
  const normalized = (templateName ?? '').trim().toLowerCase();
  const exact = allTemplates.find((asset) => asString(asset.fields[ASSET_FIELDS.name])?.toLowerCase() === normalized);
  if (exact) return exact;

  const fuzzy = allTemplates.find((asset) => asString(asset.fields[ASSET_FIELDS.name])?.toLowerCase().includes(normalized));
  if (fuzzy) return fuzzy;

  throw new Error(`Template asset not found for template_name: ${templateName}`);
}

function sortVersionsNewestFirst(versions: VersionRecord[]): VersionRecord[] {
  return [...versions].sort((a, b) => {
    const aDate = Date.parse(asString(a.fields[VERSION_FIELDS.submissionDatetime]) || a.createdTime || '1970-01-01');
    const bDate = Date.parse(asString(b.fields[VERSION_FIELDS.submissionDatetime]) || b.createdTime || '1970-01-01');
    return bDate - aDate;
  });
}

async function listVersionsForAsset(ctx: ToolContext, assetId: string): Promise<VersionRecord[]> {
  const versions = await ctx.client.listAllRecords('versions', {
    fieldIds: TEMPLATE_VERSION_FIELD_IDS,
    pageSize: 100,
  });

  return sortVersionsNewestFirst(
    versions.filter((version) => asStringArray(version.fields[VERSION_FIELDS.assetLink]).includes(assetId)),
  );
}

function firstAssetIdFromVersion(version: VersionRecord): string {
  const ids = asStringArray(version.fields[VERSION_FIELDS.assetLink]);
  if (ids.length === 0) {
    throw new Error('Version is missing linked asset.');
  }
  return ids[0];
}

function readOnlyWriteAttempts(input: TemplateAssetMetadataInput): string[] {
  const attempts: string[] = [];
  if (input.latest_review_status !== undefined) attempts.push('latest_review_status');
  if (input.days_in_current_review_stage !== undefined) attempts.push('days_in_current_review_stage');
  if (input.release_date !== undefined) attempts.push('release_date');
  return attempts;
}

export function detectReadOnlyWriteAttempts(input: TemplateAssetMetadataInput): string[] {
  return readOnlyWriteAttempts(input);
}

function buildAssetMetadataFields(input: TemplateAssetMetadataInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if (input.template_name !== undefined) fields[ASSET_FIELDS.name] = input.template_name;
  if (input.marketplace_status !== undefined) {
    assertEnumValue(input.marketplace_status, STATUS_ENUMS.marketplaceStatus, 'marketplace_status');
    fields[ASSET_FIELDS.marketplaceStatus] = input.marketplace_status;
  }
  if (input.website_url !== undefined) fields[ASSET_FIELDS.websiteUrl] = input.website_url;
  if (input.preview_site_url !== undefined) fields[ASSET_FIELDS.previewSiteUrl] = input.preview_site_url;
  if (input.category_record_ids !== undefined) fields[ASSET_FIELDS.categories] = input.category_record_ids;
  if (input.style_record_ids !== undefined) fields[ASSET_FIELDS.styles] = input.style_record_ids;
  if (input.tags_primary_record_ids !== undefined) fields[ASSET_FIELDS.tagsPrimary] = input.tags_primary_record_ids;
  if (input.tags_multi_record_ids !== undefined) fields[ASSET_FIELDS.tagsMulti] = input.tags_multi_record_ids;
  if (input.type_cms !== undefined) fields[ASSET_FIELDS.typeCms] = input.type_cms;
  if (input.type_ecommerce !== undefined) fields[ASSET_FIELDS.typeEcommerce] = input.type_ecommerce;
  if (input.type_multi_layout !== undefined) fields[ASSET_FIELDS.typeMultiLayout] = input.type_multi_layout;
  if (input.multi_layout_grouping !== undefined) {
    assertEnumValue(input.multi_layout_grouping, STATUS_ENUMS.multiLayoutGrouping, 'multi_layout_grouping');
    fields[ASSET_FIELDS.multiLayoutGrouping] = input.multi_layout_grouping;
  }
  if (input.payment_types !== undefined) {
    assertMultiEnumValues(input.payment_types, STATUS_ENUMS.paymentTypes, 'payment_types');
    fields[ASSET_FIELDS.paymentTypes] = input.payment_types;
  }
  if (input.thumbnail_image_urls !== undefined) {
    fields[ASSET_FIELDS.thumbnailImage] = toAttachmentPayload(input.thumbnail_image_urls);
  }
  if (input.thumbnail_alt_text !== undefined) fields[ASSET_FIELDS.thumbnailAltText] = input.thumbnail_alt_text;
  if (input.cms_slug !== undefined) fields[ASSET_FIELDS.cmsSlug] = input.cms_slug;
  if (input.mrp_id_overwrite !== undefined) fields[ASSET_FIELDS.mrpIdOverride] = input.mrp_id_overwrite;

  return fields;
}

function buildVersionReviewFields(params: {
  review_status?: string;
  review_type?: string;
  review_owner_email?: string;
  review_owner_user_id?: string;
  quality_rating?: string;
  improvement_areas?: string[];
  review_feedback?: string;
  review_checklist?: string;
  publishing_checklist?: string;
  release_record_ids?: string[];
  rejection_reason?: string;
  rejection_feedback?: string;
  review_length?: string;
  submission_datetime_override?: string;
}): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if (params.review_status !== undefined) {
    assertEnumValue(params.review_status, STATUS_ENUMS.reviewStatus, 'review_status');
    fields[VERSION_FIELDS.reviewStatus] = params.review_status;
  }

  if (params.review_type !== undefined) {
    assertEnumValue(params.review_type, STATUS_ENUMS.reviewType, 'review_type');
    fields[VERSION_FIELDS.reviewType] = params.review_type;
  }

  if (params.review_owner_email || params.review_owner_user_id) {
    fields[VERSION_FIELDS.reviewer] = toSingleCollaboratorPayload({
      email: params.review_owner_email,
      id: params.review_owner_user_id,
    });
  }

  if (params.quality_rating !== undefined) {
    assertEnumValue(params.quality_rating, STATUS_ENUMS.qualityRating, 'quality_rating');
    fields[VERSION_FIELDS.qualityRating] = params.quality_rating;
  }

  if (params.improvement_areas !== undefined) {
    assertMultiEnumValues(params.improvement_areas, STATUS_ENUMS.improvementAreas, 'improvement_areas');
    fields[VERSION_FIELDS.improvementAreas] = params.improvement_areas;
  }

  if (params.review_feedback !== undefined) fields[VERSION_FIELDS.reviewFeedback] = params.review_feedback;
  if (params.review_checklist !== undefined) fields[VERSION_FIELDS.reviewChecklist] = params.review_checklist;
  if (params.publishing_checklist !== undefined) fields[VERSION_FIELDS.publishingChecklist] = params.publishing_checklist;
  if (params.release_record_ids !== undefined) fields[VERSION_FIELDS.releaseLinks] = params.release_record_ids;

  if (params.rejection_reason !== undefined) {
    assertEnumValue(params.rejection_reason, STATUS_ENUMS.rejectionReason, 'rejection_reason');
    fields[VERSION_FIELDS.rejectionReason] = params.rejection_reason;
  }

  if (params.rejection_feedback !== undefined) fields[VERSION_FIELDS.rejectionFeedback] = params.rejection_feedback;

  if (params.review_length !== undefined) {
    assertEnumValue(params.review_length, STATUS_ENUMS.reviewLength, 'review_length');
    fields[VERSION_FIELDS.reviewLength] = params.review_length;
  }

  if (params.submission_datetime_override !== undefined) {
    fields[VERSION_FIELDS.submissionDatetimeOverride] = asIsoDateTime(
      params.submission_datetime_override,
      'submission_datetime_override',
    );
  }

  return fields;
}

export async function getQueueSnapshot(
  ctx: ToolContext,
  limit = 60,
  creatorNameContains?: string,
  latestReviewStatusContains?: string,
): Promise<QueueSnapshot> {
  const assets = await listTemplateAssets(ctx);

  const creatorFilter = creatorNameContains?.trim().toLowerCase();
  const statusFilter = latestReviewStatusContains?.trim().toLowerCase();

  const filtered = assets.filter((asset) => {
    const creator =
      asString(asset.fields[ASSET_FIELDS.creatorNameOverride]) || asString(asset.fields[ASSET_FIELDS.creatorName]) || '';
    const statuses = asStringArray(asset.fields[ASSET_FIELDS.latestReviewStatus]);

    const creatorMatch = creatorFilter ? creator.toLowerCase().includes(creatorFilter) : true;
    const statusMatch = statusFilter
      ? statuses.some((status) => status.toLowerCase().includes(statusFilter))
      : true;

    return creatorMatch && statusMatch;
  });

  const sorted = filtered.sort((a, b) => {
    const aDays = asNumber(a.fields[ASSET_FIELDS.daysInCurrentReviewStage]) ?? -1;
    const bDays = asNumber(b.fields[ASSET_FIELDS.daysInCurrentReviewStage]) ?? -1;
    return bDays - aDays;
  });

  const records = sorted.slice(0, Math.max(1, limit)).map(mapQueueRecord);

  return {
    generated_at: new Date().toISOString(),
    total: filtered.length,
    records,
  };
}

export function registerTools(server: McpServer, ctx: ToolContext): void {
  server.tool('template_review_health', 'Health status for Template Review MCP runtime and Airtable connectivity', {}, async () => {
    try {
      const ping = await ctx.client.ping();
      return envelope({
        server: 'webflow-template-review-mcp',
        healthy: true,
        auth: {
          bearer_required: ctx.authRequired,
        },
        airtable: {
          connected: ping.ok,
          base_id: ctx.baseId,
          scoped_tables: TABLE_IDS,
        },
        scope: {
          template_only: true,
          template_scope_field: ASSET_FIELDS.typeText,
        },
      });
    } catch (error) {
      return errorEnvelope('HEALTH_CHECK_FAILED', (error as Error).message);
    }
  });

  server.tool(
    'template_review_list_queue',
    'List template assets in review queue (apps excluded) with status, creator, and quick links',
    {
      limit: z.number().int().min(1).max(300).optional(),
      creator_name_contains: z.string().optional(),
      latest_review_status_contains: z.string().optional(),
    },
    async (params) => {
      try {
        const queue = await getQueueSnapshot(
          ctx,
          params.limit ?? 60,
          params.creator_name_contains,
          params.latest_review_status_contains,
        );
        return envelope(queue);
      } catch (error) {
        return errorEnvelope('LIST_QUEUE_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'template_review_get_asset',
    'Get one template asset payload by asset_id or template_name',
    {
      asset_id: z.string().optional(),
      template_name: z.string().optional(),
      include_versions: z.boolean().optional(),
    },
    async (params) => {
      try {
        const asset = await resolveTemplateAsset(ctx, params.asset_id, params.template_name);
        const includeVersions = params.include_versions !== false;
        const versions = includeVersions ? await listVersionsForAsset(ctx, asset.id) : [];

        return envelope({
          asset: mapTemplateAssetRecord(asset),
          versions: includeVersions ? versions.map(mapVersionRecord) : undefined,
          version_count: versions.length,
        });
      } catch (error) {
        return errorEnvelope('GET_ASSET_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'template_review_list_versions',
    'List all review versions for a template asset',
    {
      asset_id: z.string(),
    },
    async (params) => {
      try {
        const asset = await resolveTemplateAsset(ctx, params.asset_id, undefined);
        const versions = await listVersionsForAsset(ctx, asset.id);

        return envelope({
          asset_id: asset.id,
          template_name: asString(asset.fields[ASSET_FIELDS.name]),
          total_versions: versions.length,
          versions: versions.map(mapVersionRecord),
        });
      } catch (error) {
        return errorEnvelope('LIST_VERSIONS_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'template_review_get_version',
    'Get one template version payload by version_id',
    {
      version_id: z.string(),
    },
    async (params) => {
      try {
        const version = await ctx.client.getRecord('versions', params.version_id, TEMPLATE_VERSION_FIELD_IDS);
        const assetId = firstAssetIdFromVersion(version);
        const asset = await resolveTemplateAsset(ctx, assetId, undefined);

        return envelope({
          version: mapVersionRecord(version),
          asset: mapTemplateAssetRecord(asset),
        });
      } catch (error) {
        return errorEnvelope('GET_VERSION_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'template_review_update_review_form',
    'Update blue-hotspot review fields on a template version (owner/status/quality/improvements/feedback/checklists)',
    {
      version_id: z.string(),
      review_owner_email: z.string().optional(),
      review_owner_user_id: z.string().optional(),
      review_status: z.string().optional(),
      review_type: z.string().optional(),
      quality_rating: z.string().optional(),
      improvement_areas: z.array(z.string()).optional(),
      review_feedback: z.string().optional(),
      review_checklist: z.string().optional(),
      publishing_checklist: z.string().optional(),
      review_length: z.string().optional(),
      submission_datetime_override: z.string().optional(),
    },
    async (params) => {
      try {
        const current = await ctx.client.getRecord('versions', params.version_id, TEMPLATE_VERSION_FIELD_IDS);
        const assetId = firstAssetIdFromVersion(current);
        await resolveTemplateAsset(ctx, assetId, undefined);

        const fields = buildVersionReviewFields({
          review_status: params.review_status,
          review_type: params.review_type,
          review_owner_email: params.review_owner_email,
          review_owner_user_id: params.review_owner_user_id,
          quality_rating: params.quality_rating,
          improvement_areas: params.improvement_areas,
          review_feedback: params.review_feedback,
          review_checklist: params.review_checklist,
          publishing_checklist: params.publishing_checklist,
          review_length: params.review_length,
          submission_datetime_override: params.submission_datetime_override,
        });

        if (Object.keys(fields).length === 0) {
          return errorEnvelope('NO_UPDATES', 'No review form fields were provided.');
        }

        const updated = await ctx.client.updateRecord('versions', params.version_id, fields, true);

        return envelope({
          version: mapVersionRecord(updated),
          asset_id: assetId,
        });
      } catch (error) {
        return errorEnvelope('UPDATE_REVIEW_FORM_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'template_review_update_asset_metadata',
    'Update orange-hotspot template metadata fields (categories/styles/tags/type corrections/media/listing/admin fields)',
    {
      asset_id: z.string().optional(),
      template_name: z.string().optional(),
      marketplace_status: z.string().optional(),
      website_url: z.string().optional(),
      preview_site_url: z.string().optional(),
      category_record_ids: z.array(z.string()).optional(),
      style_record_ids: z.array(z.string()).optional(),
      tags_primary_record_ids: z.array(z.string()).optional(),
      tags_multi_record_ids: z.array(z.string()).optional(),
      type_cms: z.boolean().optional(),
      type_ecommerce: z.boolean().optional(),
      type_multi_layout: z.boolean().optional(),
      multi_layout_grouping: z.string().optional(),
      payment_types: z.array(z.string()).optional(),
      thumbnail_image_urls: z.array(z.string()).optional(),
      thumbnail_alt_text: z.string().optional(),
      cms_slug: z.string().optional(),
      mrp_id_overwrite: z.string().optional(),
      latest_review_status: z.string().optional(),
      days_in_current_review_stage: z.number().optional(),
      release_date: z.string().optional(),
    },
    async (params) => {
      try {
        const input = params as TemplateAssetMetadataInput;
        const readOnly = readOnlyWriteAttempts(input);
        if (readOnly.length > 0) {
          return errorEnvelope(
            'READ_ONLY_FIELDS',
            'Computed/read-only fields cannot be updated directly.',
            {
              rejected_fields: readOnly,
              guidance: 'Use template_review_update_review_form / approve / request_changes / reject to drive derived status fields.',
            },
          );
        }

        const asset = await resolveTemplateAsset(ctx, input.asset_id, input.template_name);
        const fields = buildAssetMetadataFields(input);

        if (Object.keys(fields).length === 0) {
          return errorEnvelope('NO_UPDATES', 'No template metadata fields were provided.');
        }

        await ctx.client.updateRecord('assets', asset.id, fields, true);
        const refreshed = await resolveTemplateAsset(ctx, asset.id, undefined);

        return envelope({
          asset: mapTemplateAssetRecord(refreshed),
          updated_fields: Object.keys(fields),
        });
      } catch (error) {
        return errorEnvelope('UPDATE_ASSET_METADATA_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'template_review_request_changes',
    'Request changes on a template version (response-to-review flow)',
    {
      version_id: z.string(),
      no_notification: z.boolean().optional(),
      review_feedback: z.string().optional(),
      review_checklist: z.string().optional(),
      improvement_areas: z.array(z.string()).optional(),
    },
    async (params) => {
      try {
        const current = await ctx.client.getRecord('versions', params.version_id, TEMPLATE_VERSION_FIELD_IDS);
        const assetId = firstAssetIdFromVersion(current);
        await resolveTemplateAsset(ctx, assetId, undefined);

        const fields = buildVersionReviewFields({
          review_status: params.no_notification
            ? '📤Changes Requested (No Notification)'
            : '📤Changes Requested',
          review_feedback: params.review_feedback,
          review_checklist: params.review_checklist,
          improvement_areas: params.improvement_areas,
        });

        const updated = await ctx.client.updateRecord('versions', params.version_id, fields, true);

        return envelope({
          version: mapVersionRecord(updated),
          flow: 'request_changes',
        });
      } catch (error) {
        return errorEnvelope('REQUEST_CHANGES_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'template_review_approve_version',
    'Approve a template version and apply required approval flow fields (publishing checklist/release links/MRP ID overwrite)',
    {
      version_id: z.string(),
      mrp_id_overwrite: z.string(),
      no_notification: z.boolean().optional(),
      publishing_checklist: z.string().optional(),
      release_record_ids: z.array(z.string()).optional(),
      review_feedback: z.string().optional(),
      review_checklist: z.string().optional(),
      thumbnail_image_urls: z.array(z.string()).optional(),
      thumbnail_alt_text: z.string().optional(),
    },
    async (params) => {
      try {
        const current = await ctx.client.getRecord('versions', params.version_id, TEMPLATE_VERSION_FIELD_IDS);
        const assetId = firstAssetIdFromVersion(current);
        const asset = await resolveTemplateAsset(ctx, assetId, undefined);

        const versionFields = buildVersionReviewFields({
          review_status: params.no_notification ? '✅Approved (No Notification)' : '✅Approved',
          publishing_checklist: params.publishing_checklist,
          release_record_ids: params.release_record_ids,
          review_feedback: params.review_feedback,
          review_checklist: params.review_checklist,
        });

        const updatedVersion = await ctx.client.updateRecord('versions', params.version_id, versionFields, true);

        const assetFields: Record<string, unknown> = {
          [ASSET_FIELDS.mrpIdOverride]: params.mrp_id_overwrite,
        };

        if (params.thumbnail_image_urls !== undefined) {
          assetFields[ASSET_FIELDS.thumbnailImage] = toAttachmentPayload(params.thumbnail_image_urls);
        }

        if (params.thumbnail_alt_text !== undefined) {
          assetFields[ASSET_FIELDS.thumbnailAltText] = params.thumbnail_alt_text;
        }

        await ctx.client.updateRecord('assets', asset.id, assetFields, true);
        const refreshedAsset = await resolveTemplateAsset(ctx, asset.id, undefined);

        return envelope({
          flow: 'approve',
          version: mapVersionRecord(updatedVersion),
          asset: mapTemplateAssetRecord(refreshedAsset),
        });
      } catch (error) {
        return errorEnvelope('APPROVE_VERSION_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'template_review_reject_version',
    'Reject a template version with rejection reason and rejection feedback (red-hotspot flow)',
    {
      version_id: z.string(),
      rejection_reason: z.string(),
      rejection_feedback: z.string(),
      no_notification: z.boolean().optional(),
      review_feedback: z.string().optional(),
      review_checklist: z.string().optional(),
    },
    async (params) => {
      try {
        const current = await ctx.client.getRecord('versions', params.version_id, TEMPLATE_VERSION_FIELD_IDS);
        const assetId = firstAssetIdFromVersion(current);
        await resolveTemplateAsset(ctx, assetId, undefined);

        const fields = buildVersionReviewFields({
          review_status: params.no_notification ? '❌Rejected (No Notification)' : '❌Rejected',
          rejection_reason: params.rejection_reason,
          rejection_feedback: params.rejection_feedback,
          review_feedback: params.review_feedback,
          review_checklist: params.review_checklist,
        });

        const updated = await ctx.client.updateRecord('versions', params.version_id, fields, true);

        return envelope({
          flow: 'reject',
          version: mapVersionRecord(updated),
        });
      } catch (error) {
        return errorEnvelope('REJECT_VERSION_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'template_review_get_field_map',
    'Get canonical Template Review field map with read/write flags and enum options',
    {},
    async () => {
      return envelope({
        base_id: ctx.baseId,
        tables: TABLE_IDS,
        fields: CANONICAL_FIELD_MAP,
        enums: getStatusOptions(),
        computed_fields: [...COMPUTED_FIELD_KEYS],
        scope_rule: {
          type_text_field: ASSET_FIELDS.typeText,
          template_label_fragment: 'Template',
        },
      });
    },
  );
}

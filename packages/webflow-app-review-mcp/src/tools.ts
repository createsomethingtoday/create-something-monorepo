import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  AirtableClient,
  AirtableClientError,
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
  getStatusOptions,
  isAppScopedAssetFields,
} from './schema.js';

export type ToolContext = {
  client: AirtableClient;
  authRequired: boolean;
  baseId: string;
};

type AssetRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
};

type VersionRecord = AssetRecord;

type VersionRoutingInput = {
  latest_review_status?: string;
  latest_review_type?: string;
  latest_reviewer_email?: string;
  latest_reviewer_id?: string;
  latest_rejection_reason?: string;
  latest_review_feedback?: string;
  latest_review_length?: string;
  latest_submission_datetime_override?: string;
};

type AssetMetadataInput = {
  asset_id?: string;
  app_id?: string;
  app_name?: string;
  marketplace_status?: string;
  app_capabilities?: string;
  client_id?: string;
  visibility_status?: string;
  relationships_status_email?: string;
  relationships_status_user_id?: string;
  features_text?: string;
  notes?: string;
  credentials?: string;
  description_short?: string;
  description_long?: string;
  install_url?: string;
  category_record_ids?: string[];
  icon_image_urls?: string[];
  icon_image_alt_text?: string;
  carousel_image_urls?: string[];
  carousel_image_alt_text?: string;
  payment_times?: string[];
  demo_video_url?: string;
  privacy_policy_url?: string;
  terms_conditions_url?: string;
  website_url?: string;
  support_email_url?: string;
  preview_site_url?: string;
  promo_video_url?: string;
  days_in_current_review_stage?: number;
  workspace_dashboard_url?: string;
  latest_review_status?: string;
  latest_review_type?: string;
  latest_reviewer_email?: string;
  latest_reviewer_id?: string;
  latest_rejection_reason?: string;
  latest_review_feedback?: string;
  latest_review_length?: string;
  latest_submission_datetime_override?: string;
};

type QueueSnapshot = {
  generated_at: string;
  total: number;
  records: ReturnType<typeof mapQueueRecord>[];
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

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }
  return [];
}

function asAttachmentUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (entry && typeof entry === 'object' && 'url' in entry) {
        const url = (entry as { url?: unknown }).url;
        return typeof url === 'string' ? url : null;
      }
      return null;
    })
    .filter((entry): entry is string => Boolean(entry));
}

function asSingleCollaborator(value: unknown): { id?: string; email?: string; name?: string } | null {
  if (!value || typeof value !== 'object') return null;
  const maybe = value as { id?: unknown; email?: unknown; name?: unknown };
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

function assertAppRecord(asset: AssetRecord): void {
  if (!isAppScopedAssetFields(asset.fields)) {
    throw new Error('Record exists but is not in app scope (missing app capability/client id/app id/visibility markers).');
  }
}

function getAppIdValue(fields: Record<string, unknown>): string | null {
  const lookup = asStringArray(fields[ASSET_FIELDS.appId]);
  return lookup[0] ?? null;
}

function mapAssetRecord(record: AssetRecord) {
  const fields = record.fields;
  return {
    asset_id: record.id,
    app_id: getAppIdValue(fields),
    app_name: asString(fields[ASSET_FIELDS.name]),
    marketplace_status: asString(fields[ASSET_FIELDS.marketplaceStatus]),
    latest_review_status: asStringArray(fields[ASSET_FIELDS.latestReviewStatus]),
    latest_reviewer: asStringArray(fields[ASSET_FIELDS.latestReviewer]),
    latest_review_feedback: asStringArray(fields[ASSET_FIELDS.latestReviewFeedback]),
    days_in_current_review_stage: asNumber(fields[ASSET_FIELDS.daysInCurrentReviewStage]),
    versions: asStringArray(fields[ASSET_FIELDS.versions]),
    app_capabilities: asString(fields[ASSET_FIELDS.capabilities]),
    client_id: asString(fields[ASSET_FIELDS.clientId]),
    visibility_status: asString(fields[ASSET_FIELDS.visibility]),
    relationships_status: asSingleCollaborator(fields[ASSET_FIELDS.relationshipOwner]),
    features_text: asString(fields[ASSET_FIELDS.featuresText]),
    notes: asString(fields[ASSET_FIELDS.notes]),
    credentials: asString(fields[ASSET_FIELDS.credentials]),
    description_short: asString(fields[ASSET_FIELDS.descriptionShort]),
    description_long: asString(fields[ASSET_FIELDS.descriptionLong]),
    install_url: asString(fields[ASSET_FIELDS.installUrl]),
    workspace_dashboard_url: asString(fields[ASSET_FIELDS.workspaceDashboardUrl]),
    categories: asStringArray(fields[ASSET_FIELDS.categories]),
    icon_image_urls: asAttachmentUrls(fields[ASSET_FIELDS.iconImage]),
    icon_image_alt_text: asString(fields[ASSET_FIELDS.iconImageAltText]),
    carousel_image_urls: asAttachmentUrls(fields[ASSET_FIELDS.carouselImages]),
    carousel_image_alt_text: asString(fields[ASSET_FIELDS.carouselImagesAltText]),
    payment_times: asStringArray(fields[ASSET_FIELDS.paymentTypes]),
    demo_video_url: asString(fields[ASSET_FIELDS.demoVideoUrl]),
    privacy_policy_url: asString(fields[ASSET_FIELDS.privacyPolicyUrl]),
    terms_conditions_url: asString(fields[ASSET_FIELDS.termsAndConditionsUrl]),
    website_url: asString(fields[ASSET_FIELDS.websiteUrl]),
    support_email_url: asString(fields[ASSET_FIELDS.supportEmailOrUrl]),
    preview_site_url: asString(fields[ASSET_FIELDS.previewSiteUrl]),
    promo_video_url: asString(fields[ASSET_FIELDS.promoVideoUrl]),
  };
}

function mapVersionRecord(record: VersionRecord) {
  const fields = record.fields;
  return {
    version_id: record.id,
    name: asString(fields[VERSION_FIELDS.name]),
    review_status: asString(fields[VERSION_FIELDS.reviewStatus]),
    review_type: asString(fields[VERSION_FIELDS.reviewType]),
    reviewer: asSingleCollaborator(fields[VERSION_FIELDS.reviewer]),
    review_feedback: asString(fields[VERSION_FIELDS.reviewFeedback]),
    rejection_reason: asString(fields[VERSION_FIELDS.rejectionReason]),
    submission_datetime: asString(fields[VERSION_FIELDS.submissionDatetime]),
    submission_datetime_override: asString(fields[VERSION_FIELDS.submissionDatetimeOverride]),
    version_number: asNumber(fields[VERSION_FIELDS.versionNumber]),
    review_length: asString(fields[VERSION_FIELDS.reviewLength]),
    days_in_current_stage: asNumber(fields[VERSION_FIELDS.daysInCurrentStage]),
    asset_ids: asStringArray(fields[VERSION_FIELDS.assetLink]),
  };
}

function mapQueueRecord(record: AssetRecord) {
  const base = mapAssetRecord(record);
  return {
    asset_id: base.asset_id,
    app_id: base.app_id,
    app_name: base.app_name,
    marketplace_status: base.marketplace_status,
    latest_review_status: base.latest_review_status,
    latest_reviewer: base.latest_reviewer,
    days_in_current_review_stage: base.days_in_current_review_stage,
    app_capabilities: base.app_capabilities,
    visibility_status: base.visibility_status,
    relationships_status: base.relationships_status,
    version_count: base.versions.length,
  };
}

async function resolveAsset(ctx: ToolContext, assetId?: string, appId?: string): Promise<AssetRecord> {
  if (!assetId && !appId) {
    throw new Error('Provide asset_id or app_id.');
  }

  const fieldIds = [
    ASSET_FIELDS.name,
    ASSET_FIELDS.marketplaceStatus,
    ASSET_FIELDS.latestReviewStatus,
    ASSET_FIELDS.latestReviewer,
    ASSET_FIELDS.latestReviewFeedback,
    ASSET_FIELDS.daysInCurrentReviewStage,
    ASSET_FIELDS.versions,
    ASSET_FIELDS.capabilities,
    ASSET_FIELDS.clientId,
    ASSET_FIELDS.appId,
    ASSET_FIELDS.visibility,
    ASSET_FIELDS.relationshipOwner,
    ASSET_FIELDS.featuresText,
    ASSET_FIELDS.notes,
    ASSET_FIELDS.credentials,
    ASSET_FIELDS.descriptionShort,
    ASSET_FIELDS.descriptionLong,
    ASSET_FIELDS.installUrl,
    ASSET_FIELDS.workspaceDashboardUrl,
    ASSET_FIELDS.categories,
    ASSET_FIELDS.iconImage,
    ASSET_FIELDS.iconImageAltText,
    ASSET_FIELDS.carouselImages,
    ASSET_FIELDS.carouselImagesAltText,
    ASSET_FIELDS.paymentTypes,
    ASSET_FIELDS.demoVideoUrl,
    ASSET_FIELDS.privacyPolicyUrl,
    ASSET_FIELDS.termsAndConditionsUrl,
    ASSET_FIELDS.websiteUrl,
    ASSET_FIELDS.supportEmailOrUrl,
    ASSET_FIELDS.previewSiteUrl,
    ASSET_FIELDS.promoVideoUrl,
  ];

  const asset = assetId
    ? await ctx.client.getRecord('assets', assetId, fieldIds)
    : await ctx.client.findAssetByAppId(appId ?? '', fieldIds);

  if (!asset) {
    throw new Error('Asset not found for the given identifier.');
  }

  assertAppRecord(asset);
  return asset;
}

function sortVersionsNewestFirst(versions: VersionRecord[]): VersionRecord[] {
  return [...versions].sort((a, b) => {
    const aDate = Date.parse(asString(a.fields[VERSION_FIELDS.submissionDatetime]) || a.createdTime || '1970-01-01');
    const bDate = Date.parse(asString(b.fields[VERSION_FIELDS.submissionDatetime]) || b.createdTime || '1970-01-01');
    return bDate - aDate;
  });
}

async function listVersionsForAsset(ctx: ToolContext, assetId: string): Promise<VersionRecord[]> {
  const fieldIds = [
    VERSION_FIELDS.name,
    VERSION_FIELDS.reviewStatus,
    VERSION_FIELDS.reviewType,
    VERSION_FIELDS.reviewer,
    VERSION_FIELDS.reviewFeedback,
    VERSION_FIELDS.rejectionReason,
    VERSION_FIELDS.submissionDatetime,
    VERSION_FIELDS.submissionDatetimeOverride,
    VERSION_FIELDS.versionNumber,
    VERSION_FIELDS.reviewLength,
    VERSION_FIELDS.assetLink,
    VERSION_FIELDS.daysInCurrentStage,
  ];

  const versions = await ctx.client.listAllRecords('versions', {
    fieldIds,
    pageSize: 100,
  });

  const filtered = versions.filter((record) => {
    const assets = asStringArray(record.fields[VERSION_FIELDS.assetLink]);
    return assets.includes(assetId);
  });

  return sortVersionsNewestFirst(filtered);
}

function assertAllComputedFieldWritesRoutable(input: AssetMetadataInput): void {
  if (input.days_in_current_review_stage !== undefined) {
    throw new Error('days_in_current_review_stage is computed and read-only.');
  }
  if (input.workspace_dashboard_url !== undefined) {
    throw new Error('workspace_dashboard_url is computed and read-only.');
  }
}

function buildVersionRoutingFields(input: VersionRoutingInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if (input.latest_review_status !== undefined) {
    assertEnumValue(input.latest_review_status, STATUS_ENUMS.reviewStatus, 'review_status');
    fields[VERSION_FIELDS.reviewStatus] = input.latest_review_status;
  }

  if (input.latest_review_type !== undefined) {
    assertEnumValue(input.latest_review_type, STATUS_ENUMS.reviewType, 'review_type');
    fields[VERSION_FIELDS.reviewType] = input.latest_review_type;
  }

  if (input.latest_reviewer_email || input.latest_reviewer_id) {
    fields[VERSION_FIELDS.reviewer] = toSingleCollaboratorPayload({
      email: input.latest_reviewer_email,
      id: input.latest_reviewer_id,
    });
  }

  if (input.latest_rejection_reason !== undefined) {
    assertEnumValue(input.latest_rejection_reason, STATUS_ENUMS.rejectionReason, 'rejection_reason');
    fields[VERSION_FIELDS.rejectionReason] = input.latest_rejection_reason;
  }

  if (input.latest_review_feedback !== undefined) {
    fields[VERSION_FIELDS.reviewFeedback] = input.latest_review_feedback;
  }

  if (input.latest_review_length !== undefined) {
    assertEnumValue(input.latest_review_length, STATUS_ENUMS.reviewLength, 'review_length');
    fields[VERSION_FIELDS.reviewLength] = input.latest_review_length;
  }

  if (input.latest_submission_datetime_override !== undefined) {
    fields[VERSION_FIELDS.submissionDatetimeOverride] = asIsoDateTime(
      input.latest_submission_datetime_override,
      'latest_submission_datetime_override',
    );
  }

  return fields;
}

export function planComputedFieldWriteRouting(input: AssetMetadataInput): {
  shouldRouteToVersion: boolean;
  rejectedComputedFields: string[];
} {
  const rejectedComputedFields: string[] = [];
  if (input.days_in_current_review_stage !== undefined) {
    rejectedComputedFields.push('days_in_current_review_stage');
  }
  if (input.workspace_dashboard_url !== undefined) {
    rejectedComputedFields.push('workspace_dashboard_url');
  }

  const shouldRouteToVersion =
    input.latest_review_status !== undefined ||
    input.latest_review_type !== undefined ||
    input.latest_reviewer_email !== undefined ||
    input.latest_reviewer_id !== undefined ||
    input.latest_rejection_reason !== undefined ||
    input.latest_review_feedback !== undefined ||
    input.latest_review_length !== undefined ||
    input.latest_submission_datetime_override !== undefined;

  return { shouldRouteToVersion, rejectedComputedFields };
}

function buildAssetMetadataFields(input: AssetMetadataInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if (input.app_name !== undefined) fields[ASSET_FIELDS.name] = input.app_name;
  if (input.marketplace_status !== undefined) {
    assertEnumValue(input.marketplace_status, STATUS_ENUMS.marketplaceStatus, 'marketplace_status');
    fields[ASSET_FIELDS.marketplaceStatus] = input.marketplace_status;
  }
  if (input.app_capabilities !== undefined) {
    assertEnumValue(input.app_capabilities, STATUS_ENUMS.capabilities, 'app_capabilities');
    fields[ASSET_FIELDS.capabilities] = input.app_capabilities;
  }
  if (input.client_id !== undefined) fields[ASSET_FIELDS.clientId] = input.client_id;
  if (input.visibility_status !== undefined) {
    assertEnumValue(input.visibility_status, STATUS_ENUMS.visibility, 'visibility_status');
    fields[ASSET_FIELDS.visibility] = input.visibility_status;
  }
  if (input.relationships_status_email || input.relationships_status_user_id) {
    fields[ASSET_FIELDS.relationshipOwner] = toSingleCollaboratorPayload({
      email: input.relationships_status_email,
      id: input.relationships_status_user_id,
    });
  }
  if (input.features_text !== undefined) fields[ASSET_FIELDS.featuresText] = input.features_text;
  if (input.notes !== undefined) fields[ASSET_FIELDS.notes] = input.notes;
  if (input.credentials !== undefined) fields[ASSET_FIELDS.credentials] = input.credentials;
  if (input.description_short !== undefined) fields[ASSET_FIELDS.descriptionShort] = input.description_short;
  if (input.description_long !== undefined) fields[ASSET_FIELDS.descriptionLong] = input.description_long;
  if (input.install_url !== undefined) fields[ASSET_FIELDS.installUrl] = input.install_url;
  if (input.category_record_ids !== undefined) fields[ASSET_FIELDS.categories] = input.category_record_ids;
  if (input.icon_image_urls !== undefined) fields[ASSET_FIELDS.iconImage] = toAttachmentPayload(input.icon_image_urls);
  if (input.icon_image_alt_text !== undefined) fields[ASSET_FIELDS.iconImageAltText] = input.icon_image_alt_text;
  if (input.carousel_image_urls !== undefined) {
    fields[ASSET_FIELDS.carouselImages] = toAttachmentPayload(input.carousel_image_urls);
  }
  if (input.carousel_image_alt_text !== undefined) {
    fields[ASSET_FIELDS.carouselImagesAltText] = input.carousel_image_alt_text;
  }
  if (input.payment_times !== undefined) fields[ASSET_FIELDS.paymentTypes] = input.payment_times;
  if (input.demo_video_url !== undefined) fields[ASSET_FIELDS.demoVideoUrl] = input.demo_video_url;
  if (input.privacy_policy_url !== undefined) fields[ASSET_FIELDS.privacyPolicyUrl] = input.privacy_policy_url;
  if (input.terms_conditions_url !== undefined) {
    fields[ASSET_FIELDS.termsAndConditionsUrl] = input.terms_conditions_url;
  }
  if (input.website_url !== undefined) fields[ASSET_FIELDS.websiteUrl] = input.website_url;
  if (input.support_email_url !== undefined) fields[ASSET_FIELDS.supportEmailOrUrl] = input.support_email_url;
  if (input.preview_site_url !== undefined) fields[ASSET_FIELDS.previewSiteUrl] = input.preview_site_url;
  if (input.promo_video_url !== undefined) fields[ASSET_FIELDS.promoVideoUrl] = input.promo_video_url;

  return fields;
}

async function buildQueueSnapshot(ctx: ToolContext, limit = 50): Promise<QueueSnapshot> {
  const fieldIds = [
    ASSET_FIELDS.name,
    ASSET_FIELDS.marketplaceStatus,
    ASSET_FIELDS.latestReviewStatus,
    ASSET_FIELDS.latestReviewer,
    ASSET_FIELDS.daysInCurrentReviewStage,
    ASSET_FIELDS.appId,
    ASSET_FIELDS.capabilities,
    ASSET_FIELDS.visibility,
    ASSET_FIELDS.relationshipOwner,
    ASSET_FIELDS.versions,
  ];

  const allAssets = await ctx.client.listAllRecords('assets', {
    fieldIds,
    pageSize: 100,
  });

  const scoped = allAssets.filter((asset) => isAppScopedAssetFields(asset.fields));

  const sorted = scoped.sort((a, b) => {
    const aDays = asNumber(a.fields[ASSET_FIELDS.daysInCurrentReviewStage]) ?? -1;
    const bDays = asNumber(b.fields[ASSET_FIELDS.daysInCurrentReviewStage]) ?? -1;
    return bDays - aDays;
  });

  const records = sorted.slice(0, Math.max(1, limit)).map(mapQueueRecord);

  return {
    generated_at: new Date().toISOString(),
    total: scoped.length,
    records,
  };
}

export async function getQueueSnapshot(ctx: ToolContext, limit = 50): Promise<QueueSnapshot> {
  return buildQueueSnapshot(ctx, limit);
}

function sortComputedKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => a.localeCompare(b));
}

export function registerTools(server: McpServer, ctx: ToolContext): void {
  server.tool('app_review_health', 'Health status for App Review MCP runtime and Airtable connectivity', {}, async () => {
    try {
      const airtable = await ctx.client.ping();
      return envelope({
        server: 'webflow-app-review-mcp',
        healthy: true,
        auth: {
          bearer_required: ctx.authRequired,
        },
        airtable: {
          connected: airtable.ok,
          base_id: ctx.baseId,
          scoped_tables: TABLE_IDS,
        },
      });
    } catch (error) {
      return errorEnvelope('AIRTABLE_HEALTH_CHECK_FAILED', (error as Error).message);
    }
  });

  server.tool(
    'app_review_list_queue',
    'List app assets in review queue with marketplace/review status fields (apps only)',
    {
      limit: z.number().int().min(1).max(300).optional(),
    },
    async (params) => {
      try {
        const snapshot = await buildQueueSnapshot(ctx, params.limit ?? 50);
        return envelope(snapshot);
      } catch (error) {
        return errorEnvelope('QUEUE_LIST_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'app_review_get_asset',
    'Get one app asset payload by asset_id or app_id (apps only)',
    {
      asset_id: z.string().optional(),
      app_id: z.string().optional(),
      include_versions: z.boolean().optional(),
    },
    async (params) => {
      try {
        const asset = await resolveAsset(ctx, params.asset_id, params.app_id);
        const includeVersions = params.include_versions !== false;

        const versions = includeVersions ? await listVersionsForAsset(ctx, asset.id) : [];

        return envelope({
          asset: mapAssetRecord(asset),
          versions: includeVersions ? versions.map(mapVersionRecord) : undefined,
          version_count: versions.length,
        });
      } catch (error) {
        return errorEnvelope('GET_ASSET_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'app_review_list_versions',
    'List all version submissions for an app asset',
    {
      asset_id: z.string().optional(),
      app_id: z.string().optional(),
    },
    async (params) => {
      try {
        const asset = await resolveAsset(ctx, params.asset_id, params.app_id);
        const versions = await listVersionsForAsset(ctx, asset.id);
        return envelope({
          asset_id: asset.id,
          app_id: getAppIdValue(asset.fields),
          total_versions: versions.length,
          versions: versions.map(mapVersionRecord),
        });
      } catch (error) {
        return errorEnvelope('LIST_VERSIONS_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'app_review_get_version',
    'Get one version by version_id (requires linked app-scope asset)',
    {
      version_id: z.string(),
    },
    async (params) => {
      try {
        const version = await ctx.client.getRecord('versions', params.version_id, [
          VERSION_FIELDS.name,
          VERSION_FIELDS.reviewStatus,
          VERSION_FIELDS.reviewType,
          VERSION_FIELDS.reviewer,
          VERSION_FIELDS.reviewFeedback,
          VERSION_FIELDS.rejectionReason,
          VERSION_FIELDS.submissionDatetime,
          VERSION_FIELDS.submissionDatetimeOverride,
          VERSION_FIELDS.versionNumber,
          VERSION_FIELDS.reviewLength,
          VERSION_FIELDS.assetLink,
          VERSION_FIELDS.daysInCurrentStage,
        ]);

        const assetIds = asStringArray(version.fields[VERSION_FIELDS.assetLink]);
        if (assetIds.length === 0) {
          throw new Error('Version has no linked asset record.');
        }

        const asset = await resolveAsset(ctx, assetIds[0], undefined);

        return envelope({
          version: mapVersionRecord(version),
          asset: {
            asset_id: asset.id,
            app_id: getAppIdValue(asset.fields),
            app_name: asString(asset.fields[ASSET_FIELDS.name]),
          },
        });
      } catch (error) {
        return errorEnvelope('GET_VERSION_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'app_review_update_version_review',
    'Update version review fields (status/type/reviewer/rejection reason/feedback/submission datetime override)',
    {
      version_id: z.string(),
      review_status: z.string().optional(),
      review_type: z.string().optional(),
      reviewer_email: z.string().optional(),
      reviewer_user_id: z.string().optional(),
      rejection_reason: z.string().optional(),
      review_feedback: z.string().optional(),
      submission_datetime_override: z.string().optional(),
      review_length: z.string().optional(),
    },
    async (params) => {
      try {
        const existing = await ctx.client.getRecord('versions', params.version_id, [
          VERSION_FIELDS.assetLink,
          VERSION_FIELDS.reviewStatus,
          VERSION_FIELDS.reviewType,
          VERSION_FIELDS.reviewer,
          VERSION_FIELDS.reviewFeedback,
          VERSION_FIELDS.rejectionReason,
          VERSION_FIELDS.submissionDatetimeOverride,
          VERSION_FIELDS.reviewLength,
          VERSION_FIELDS.submissionDatetime,
          VERSION_FIELDS.versionNumber,
          VERSION_FIELDS.name,
          VERSION_FIELDS.daysInCurrentStage,
        ]);

        const linkedAssets = asStringArray(existing.fields[VERSION_FIELDS.assetLink]);
        if (linkedAssets.length === 0) {
          throw new Error('Version is missing linked asset.');
        }

        await resolveAsset(ctx, linkedAssets[0], undefined);

        const updateFields: Record<string, unknown> = {};

        if (params.review_status !== undefined) {
          assertEnumValue(params.review_status, STATUS_ENUMS.reviewStatus, 'review_status');
          updateFields[VERSION_FIELDS.reviewStatus] = params.review_status;
        }

        if (params.review_type !== undefined) {
          assertEnumValue(params.review_type, STATUS_ENUMS.reviewType, 'review_type');
          updateFields[VERSION_FIELDS.reviewType] = params.review_type;
        }

        if (params.reviewer_email || params.reviewer_user_id) {
          updateFields[VERSION_FIELDS.reviewer] = toSingleCollaboratorPayload({
            email: params.reviewer_email,
            id: params.reviewer_user_id,
          });
        }

        if (params.rejection_reason !== undefined) {
          assertEnumValue(params.rejection_reason, STATUS_ENUMS.rejectionReason, 'rejection_reason');
          updateFields[VERSION_FIELDS.rejectionReason] = params.rejection_reason;
        }

        if (params.review_feedback !== undefined) {
          updateFields[VERSION_FIELDS.reviewFeedback] = params.review_feedback;
        }

        if (params.submission_datetime_override !== undefined) {
          updateFields[VERSION_FIELDS.submissionDatetimeOverride] = asIsoDateTime(
            params.submission_datetime_override,
            'submission_datetime_override',
          );
        }

        if (params.review_length !== undefined) {
          assertEnumValue(params.review_length, STATUS_ENUMS.reviewLength, 'review_length');
          updateFields[VERSION_FIELDS.reviewLength] = params.review_length;
        }

        if (Object.keys(updateFields).length === 0) {
          return errorEnvelope('NO_UPDATES', 'No version review fields provided for update.');
        }

        const updated = await ctx.client.updateRecord('versions', params.version_id, updateFields, true);

        return envelope({
          updated_version: mapVersionRecord(updated),
          linked_asset_id: linkedAssets[0],
        });
      } catch (error) {
        return errorEnvelope('UPDATE_VERSION_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'app_review_update_asset_metadata',
    'Update allowed app asset metadata fields. Computed review fields auto-route to latest version when provided.',
    {
      asset_id: z.string().optional(),
      app_id: z.string().optional(),
      app_name: z.string().optional(),
      marketplace_status: z.string().optional(),
      app_capabilities: z.string().optional(),
      client_id: z.string().optional(),
      visibility_status: z.string().optional(),
      relationships_status_email: z.string().optional(),
      relationships_status_user_id: z.string().optional(),
      features_text: z.string().optional(),
      notes: z.string().optional(),
      credentials: z.string().optional(),
      description_short: z.string().optional(),
      description_long: z.string().optional(),
      install_url: z.string().optional(),
      category_record_ids: z.array(z.string()).optional(),
      icon_image_urls: z.array(z.string()).optional(),
      icon_image_alt_text: z.string().optional(),
      carousel_image_urls: z.array(z.string()).optional(),
      carousel_image_alt_text: z.string().optional(),
      payment_times: z.array(z.string()).optional(),
      demo_video_url: z.string().optional(),
      privacy_policy_url: z.string().optional(),
      terms_conditions_url: z.string().optional(),
      website_url: z.string().optional(),
      support_email_url: z.string().optional(),
      preview_site_url: z.string().optional(),
      promo_video_url: z.string().optional(),
      days_in_current_review_stage: z.number().optional(),
      workspace_dashboard_url: z.string().optional(),
      latest_review_status: z.string().optional(),
      latest_review_type: z.string().optional(),
      latest_reviewer_email: z.string().optional(),
      latest_reviewer_id: z.string().optional(),
      latest_rejection_reason: z.string().optional(),
      latest_review_feedback: z.string().optional(),
      latest_review_length: z.string().optional(),
      latest_submission_datetime_override: z.string().optional(),
    },
    async (params) => {
      try {
        const input = params as AssetMetadataInput;
        const routingPlan = planComputedFieldWriteRouting(input);

        if (routingPlan.rejectedComputedFields.length > 0) {
          return errorEnvelope(
            'COMPUTED_FIELD_READ_ONLY',
            'One or more computed fields are read-only.',
            {
              rejected_fields: sortComputedKeys(routingPlan.rejectedComputedFields),
              routable_fields: ['latest_review_status', 'latest_review_type', 'latest_reviewer_*', 'latest_rejection_reason', 'latest_review_feedback'],
            },
          );
        }

        assertAllComputedFieldWritesRoutable(input);

        const asset = await resolveAsset(ctx, input.asset_id, input.app_id);
        const assetUpdateFields = buildAssetMetadataFields(input);

        let routedVersionUpdate: Record<string, unknown> | null = null;
        if (routingPlan.shouldRouteToVersion) {
          const routingFields = buildVersionRoutingFields({
            latest_review_status: input.latest_review_status,
            latest_review_type: input.latest_review_type,
            latest_reviewer_email: input.latest_reviewer_email,
            latest_reviewer_id: input.latest_reviewer_id,
            latest_rejection_reason: input.latest_rejection_reason,
            latest_review_feedback: input.latest_review_feedback,
            latest_review_length: input.latest_review_length,
            latest_submission_datetime_override: input.latest_submission_datetime_override,
          });

          if (Object.keys(routingFields).length > 0) {
            const versions = await listVersionsForAsset(ctx, asset.id);
            if (versions.length === 0) {
              throw new Error('Cannot route review updates: asset has no linked versions.');
            }

            const targetVersion = versions[0];
            const updatedVersion = await ctx.client.updateRecord('versions', targetVersion.id, routingFields, true);
            routedVersionUpdate = {
              version_id: updatedVersion.id,
              update: mapVersionRecord(updatedVersion),
            };
          }
        }

        let updatedAsset: AssetRecord | null = null;
        if (Object.keys(assetUpdateFields).length > 0) {
          updatedAsset = await ctx.client.updateRecord('assets', asset.id, assetUpdateFields, true);
        }

        if (!updatedAsset && !routedVersionUpdate) {
          return errorEnvelope('NO_UPDATES', 'No writable asset metadata fields or routed version fields were provided.');
        }

        const refreshed = await resolveAsset(ctx, asset.id, undefined);

        return envelope({
          asset: mapAssetRecord(refreshed),
          routed_version_update: routedVersionUpdate,
          updated_asset_fields: Object.keys(assetUpdateFields),
        });
      } catch (error) {
        return errorEnvelope('UPDATE_ASSET_METADATA_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'app_review_set_marketplace_status',
    'Set marketplace status on an app asset',
    {
      asset_id: z.string().optional(),
      app_id: z.string().optional(),
      marketplace_status: z.string(),
    },
    async (params) => {
      try {
        assertEnumValue(params.marketplace_status, STATUS_ENUMS.marketplaceStatus, 'marketplace_status');
        const asset = await resolveAsset(ctx, params.asset_id, params.app_id);
        await ctx.client.updateRecord('assets', asset.id, {
          [ASSET_FIELDS.marketplaceStatus]: params.marketplace_status,
        });
        const updated = await resolveAsset(ctx, asset.id, undefined);
        return envelope({
          asset_id: updated.id,
          marketplace_status: asString(updated.fields[ASSET_FIELDS.marketplaceStatus]),
        });
      } catch (error) {
        return errorEnvelope('SET_MARKETPLACE_STATUS_FAILED', (error as Error).message);
      }
    },
  );

  server.tool(
    'app_review_get_field_map',
    'Get canonical Airtable field map, read/write flags, and enum options',
    {},
    async () => {
      try {
        const writable = CANONICAL_FIELD_MAP.filter((field) => field.writable).map((field) => field.key);
        const readOnly = CANONICAL_FIELD_MAP.filter((field) => !field.writable).map((field) => field.key);

        return envelope({
          base_id: ctx.baseId,
          tables: TABLE_IDS,
          fields: CANONICAL_FIELD_MAP,
          enums: getStatusOptions(),
          writable_fields: writable,
          read_only_fields: readOnly,
          computed_fields: sortComputedKeys([...COMPUTED_FIELD_KEYS]),
          mapping_notes: [
            'Icon image -> Thumbnail Image (🖼️Thumbnail Image)',
            'Payment times -> Payment Types (ℹ️💲Payment Types)',
            'relationships status -> Relationship Owner (👤Relationship Owner)',
          ],
        });
      } catch (error) {
        if (error instanceof AirtableClientError) {
          return errorEnvelope('FIELD_MAP_FETCH_FAILED', error.message, {
            status: error.status,
            details: error.details,
          });
        }
        return errorEnvelope('FIELD_MAP_FETCH_FAILED', (error as Error).message);
      }
    },
  );
}

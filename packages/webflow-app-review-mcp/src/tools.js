import { z } from 'zod';
import { AirtableClientError } from './airtable.js';
import { APP_REVIEW_FIELD_MAP, CAPABILITIES_OPTIONS, MARKETPLACE_STATUS_OPTIONS, REJECTION_REASON_OPTIONS, REVIEW_STATUS_OPTIONS, REVIEW_TYPE_OPTIONS, VISIBILITY_OPTIONS, getReadOnlyAssetWriteHint, } from './schema.js';
const collaboratorRefSchema = z.object({
    id: z.string().min(1),
});
function jsonContent(value) {
    return {
        content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    };
}
function asSuccess(data) {
    return jsonContent({ ok: true, data });
}
function asError(error) {
    if (error instanceof AirtableClientError) {
        return jsonContent({
            ok: false,
            error: {
                code: error.code,
                message: error.message,
                status: error.status ?? 500,
                details: error.details,
            },
        });
    }
    if (error instanceof Error) {
        return jsonContent({
            ok: false,
            error: {
                code: 'UNEXPECTED_ERROR',
                message: error.message,
                status: 500,
            },
        });
    }
    return jsonContent({
        ok: false,
        error: {
            code: 'UNKNOWN_ERROR',
            message: String(error),
            status: 500,
        },
    });
}
async function requireAppAsset(client, assetId) {
    const asset = await client.getAssetById(assetId);
    if (!asset) {
        throw new AirtableClientError('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE', 'Asset not found or outside app-review scope.', 404, { assetId });
    }
    return asset;
}
async function requireAppVersion(client, versionId) {
    const version = await client.getVersionById(versionId);
    if (!version) {
        throw new AirtableClientError('VERSION_NOT_FOUND', 'Version not found.', 404, { versionId });
    }
    if (!version.assetId) {
        throw new AirtableClientError('VERSION_SCOPE_ERROR', 'Version is missing linked asset ID.', 400, { versionId });
    }
    await requireAppAsset(client, version.assetId);
    return version;
}
function cleanObject(value) {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    return Object.fromEntries(entries);
}
export function registerTools(server, getClient) {
    server.tool('app_review_health', 'Runtime health check for Webflow App Review MCP and Airtable connectivity.', {}, async () => {
        try {
            const health = await getClient().healthCheck();
            return asSuccess({
                ...health,
                auth: 'Bearer token required at worker boundary when MCP_API_KEY is configured.',
            });
        }
        catch (error) {
            return asError(error);
        }
    });
    server.tool('app_review_list_queue', 'List apps-only review queue with key status fields from Assets.', {
        limit: z.number().int().min(1).max(500).optional(),
    }, async (params) => {
        try {
            const queue = await getClient().listAssetQueue(params.limit ?? 100);
            return asSuccess({ count: queue.length, records: queue });
        }
        catch (error) {
            return asError(error);
        }
    });
    server.tool('app_review_get_asset', 'Get one app review payload by asset_id or app_id, including version history.', {
        asset_id: z.string().min(1).optional(),
        app_id: z.string().min(1).optional(),
        versions_limit: z.number().int().min(1).max(500).optional(),
    }, async (params) => {
        try {
            if (!params.asset_id && !params.app_id) {
                throw new AirtableClientError('INVALID_INPUT', 'Provide either asset_id or app_id.', 400);
            }
            const client = getClient();
            const asset = params.asset_id
                ? await client.getAssetById(params.asset_id)
                : await client.getAssetByAppId(params.app_id);
            if (!asset) {
                throw new AirtableClientError('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE', 'Asset not found in apps scope.', 404, {
                    asset_id: params.asset_id,
                    app_id: params.app_id,
                });
            }
            const versions = await client.listVersionsForAsset(asset.assetId, params.versions_limit ?? 100);
            return asSuccess({ asset, versions });
        }
        catch (error) {
            return asError(error);
        }
    });
    server.tool('app_review_list_versions', 'List all submission versions for an app asset.', {
        asset_id: z.string().min(1),
        limit: z.number().int().min(1).max(500).optional(),
    }, async (params) => {
        try {
            const client = getClient();
            await requireAppAsset(client, params.asset_id);
            const versions = await client.listVersionsForAsset(params.asset_id, params.limit ?? 100);
            return asSuccess({ asset_id: params.asset_id, count: versions.length, versions });
        }
        catch (error) {
            return asError(error);
        }
    });
    server.tool('app_review_get_version', 'Get one version record by version_id (apps-only scoped).', {
        version_id: z.string().min(1),
    }, async (params) => {
        try {
            const version = await requireAppVersion(getClient(), params.version_id);
            return asSuccess({ version });
        }
        catch (error) {
            return asError(error);
        }
    });
    server.tool('app_review_update_version_review', 'Update review fields on an Asset Version record.', {
        version_id: z.string().min(1),
        review_status: z.enum(REVIEW_STATUS_OPTIONS).optional(),
        review_type: z.enum(REVIEW_TYPE_OPTIONS).optional(),
        reviewer: z.union([collaboratorRefSchema, z.null()]).optional(),
        rejection_reason: z.enum(REJECTION_REASON_OPTIONS).optional(),
        review_feedback: z.string().optional(),
        submission_datetime_override: z.union([z.string().datetime(), z.null()]).optional(),
    }, async (params) => {
        try {
            const client = getClient();
            await requireAppVersion(client, params.version_id);
            const mutation = cleanObject({
                review_status: params.review_status,
                review_type: params.review_type,
                reviewer: params.reviewer,
                rejection_reason: params.rejection_reason,
                review_feedback: params.review_feedback,
                submission_datetime_override: params.submission_datetime_override,
            });
            if (Object.keys(mutation).length === 0) {
                throw new AirtableClientError('NO_MUTATION_FIELDS', 'No version review fields were provided.', 400);
            }
            const updated = await client.updateVersionReview(params.version_id, mutation);
            return asSuccess({ updated_version: updated });
        }
        catch (error) {
            return asError(error);
        }
    });
    server.tool('app_review_update_asset_metadata', 'Update writable app metadata fields on Assets. Read-only/computed fields are rejected or routed.', {
        asset_id: z.string().min(1),
        app_name: z.string().optional(),
        app_capabilities: z.enum(CAPABILITIES_OPTIONS).optional(),
        client_id: z.string().optional(),
        visibility_status: z.enum(VISIBILITY_OPTIONS).optional(),
        relationships_status: z.union([collaboratorRefSchema, z.null()]).optional(),
        features_text: z.string().optional(),
        notes: z.string().optional(),
        credentials: z.string().optional(),
        description_short: z.string().optional(),
        description_long_html: z.string().optional(),
        install_url: z.string().optional(),
        categories_record_ids: z.array(z.string()).optional(),
        icon_image_url: z.union([z.string().url(), z.null()]).optional(),
        icon_image_alt_text: z.string().optional(),
        carousel_image_urls: z.array(z.string().url()).optional(),
        carousel_image_alt_text: z.string().optional(),
        payment_times: z.array(z.string()).optional(),
        demo_video_url: z.string().url().optional(),
        privacy_policy_url: z.string().url().optional(),
        terms_and_conditions_url: z.string().url().optional(),
        website_url: z.string().url().optional(),
        support_email_or_url: z.string().optional(),
        preview_site_url: z.string().url().optional(),
        promo_video_url: z.string().url().optional(),
        marketplace_status: z.enum(MARKETPLACE_STATUS_OPTIONS).optional(),
        latest_review_status: z.enum(REVIEW_STATUS_OPTIONS).optional(),
        days_in_current_review_stage: z.number().optional(),
        workspace_dashboard_url: z.string().optional(),
        app_id: z.string().optional(),
    }, async (params) => {
        try {
            const client = getClient();
            await requireAppAsset(client, params.asset_id);
            if (params.days_in_current_review_stage !== undefined) {
                throw new AirtableClientError('READ_ONLY_FIELD', 'days_in_current_review_stage is read-only.', 400, getReadOnlyAssetWriteHint('days_in_current_review_stage'));
            }
            if (params.workspace_dashboard_url !== undefined) {
                throw new AirtableClientError('READ_ONLY_FIELD', 'workspace_dashboard_url is read-only.', 400, getReadOnlyAssetWriteHint('workspace_dashboard_url'));
            }
            if (params.app_id !== undefined) {
                throw new AirtableClientError('READ_ONLY_FIELD', 'app_id is read-only.', 400, getReadOnlyAssetWriteHint('app_id'));
            }
            const routedUpdates = {};
            if (params.latest_review_status !== undefined) {
                const versions = await client.listVersionsForAsset(params.asset_id, 100);
                const latestVersion = versions[0];
                if (!latestVersion) {
                    throw new AirtableClientError('ROUTING_FAILED', 'Unable to route latest_review_status: no versions found for this asset.', 400, getReadOnlyAssetWriteHint('latest_review_status'));
                }
                const routed = await client.updateVersionReview(latestVersion.versionId, {
                    review_status: params.latest_review_status,
                });
                routedUpdates.latest_review_status = {
                    routedToVersionId: latestVersion.versionId,
                    updatedVersion: routed,
                };
            }
            const metadataPayload = cleanObject({
                app_name: params.app_name,
                app_capabilities: params.app_capabilities,
                client_id: params.client_id,
                visibility_status: params.visibility_status,
                relationships_status: params.relationships_status,
                features_text: params.features_text,
                notes: params.notes,
                credentials: params.credentials,
                description_short: params.description_short,
                description_long_html: params.description_long_html,
                install_url: params.install_url,
                categories_record_ids: params.categories_record_ids,
                icon_image_url: params.icon_image_url,
                icon_image_alt_text: params.icon_image_alt_text,
                carousel_image_urls: params.carousel_image_urls,
                carousel_image_alt_text: params.carousel_image_alt_text,
                payment_times: params.payment_times,
                demo_video_url: params.demo_video_url,
                privacy_policy_url: params.privacy_policy_url,
                terms_and_conditions_url: params.terms_and_conditions_url,
                website_url: params.website_url,
                support_email_or_url: params.support_email_or_url,
                preview_site_url: params.preview_site_url,
                promo_video_url: params.promo_video_url,
                marketplace_status: params.marketplace_status,
            });
            let updatedAsset = null;
            if (Object.keys(metadataPayload).length > 0) {
                updatedAsset = await client.updateAssetMetadata(params.asset_id, metadataPayload);
            }
            else {
                updatedAsset = await client.getAssetById(params.asset_id);
            }
            if (!updatedAsset) {
                throw new AirtableClientError('ASSET_NOT_FOUND_OR_OUT_OF_SCOPE', 'Asset not found after update or outside app-review scope.', 404, { asset_id: params.asset_id });
            }
            if (Object.keys(metadataPayload).length === 0 && Object.keys(routedUpdates).length === 0) {
                throw new AirtableClientError('NO_MUTATION_FIELDS', 'No writable fields were provided for update.', 400);
            }
            return asSuccess({
                updated_asset: updatedAsset,
                routed_updates: routedUpdates,
            });
        }
        catch (error) {
            return asError(error);
        }
    });
    server.tool('app_review_set_marketplace_status', 'Set the Marketplace Status on an app asset.', {
        asset_id: z.string().min(1),
        marketplace_status: z.enum(MARKETPLACE_STATUS_OPTIONS),
    }, async (params) => {
        try {
            const client = getClient();
            await requireAppAsset(client, params.asset_id);
            const updated = await client.setMarketplaceStatus(params.asset_id, params.marketplace_status);
            return asSuccess({ updated_asset: updated });
        }
        catch (error) {
            return asError(error);
        }
    });
    server.tool('app_review_get_field_map', 'Return canonical Airtable field mappings, writability, and allowed status options.', {}, async () => asSuccess(APP_REVIEW_FIELD_MAP));
}

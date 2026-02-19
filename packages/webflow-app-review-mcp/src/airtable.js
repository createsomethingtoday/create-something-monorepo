import { CAPABILITIES_OPTIONS, DEFAULT_AIRTABLE_BASE_ID, FIELD_IDS, MARKETPLACE_STATUS_OPTIONS, REJECTION_REASON_OPTIONS, REVIEW_STATUS_OPTIONS, REVIEW_TYPE_OPTIONS, TABLE_IDS, VISIBILITY_OPTIONS, isAppLikeAsset, validateAssetMetadataWriteKeys, } from './schema.js';
const SCOPED_TABLE_IDS = new Set(Object.values(TABLE_IDS));
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const ASSET_QUEUE_FIELD_IDS = [
    FIELD_IDS.assets.name,
    FIELD_IDS.assets.type,
    FIELD_IDS.assets.marketplaceStatus,
    FIELD_IDS.assets.latestReviewStatus,
    FIELD_IDS.assets.daysInCurrentReviewStage,
    FIELD_IDS.assets.latestReviewer,
    FIELD_IDS.assets.latestReviewFeedback,
    FIELD_IDS.assets.openReviewStatus,
    FIELD_IDS.assets.capabilities,
    FIELD_IDS.assets.clientId,
    FIELD_IDS.assets.appId,
    FIELD_IDS.assets.visibility,
];
const ASSET_DETAIL_FIELD_IDS = [
    ...ASSET_QUEUE_FIELD_IDS,
    FIELD_IDS.assets.relationshipOwner,
    FIELD_IDS.assets.featuresText,
    FIELD_IDS.assets.notes,
    FIELD_IDS.assets.credentials,
    FIELD_IDS.assets.descriptionShort,
    FIELD_IDS.assets.descriptionLongHtml,
    FIELD_IDS.assets.installUrlDirect,
    FIELD_IDS.assets.installUrlFormula,
    FIELD_IDS.assets.workspaceDashboardUrl,
    FIELD_IDS.assets.categories,
    FIELD_IDS.assets.iconImage,
    FIELD_IDS.assets.iconImageAltText,
    FIELD_IDS.assets.carouselImages,
    FIELD_IDS.assets.carouselImagesAltText,
    FIELD_IDS.assets.paymentTypes,
    FIELD_IDS.assets.demoVideoUrl,
    FIELD_IDS.assets.privacyPolicyUrl,
    FIELD_IDS.assets.termsAndConditionsUrl,
    FIELD_IDS.assets.websiteUrl,
    FIELD_IDS.assets.supportEmailOrUrl,
    FIELD_IDS.assets.previewSiteUrl,
    FIELD_IDS.assets.promoVideoUrl,
];
const VERSION_FIELD_IDS = [
    FIELD_IDS.versions.versionNumber,
    FIELD_IDS.versions.reviewType,
    FIELD_IDS.versions.reviewer,
    FIELD_IDS.versions.reviewStatus,
    FIELD_IDS.versions.submissionDatetime,
    FIELD_IDS.versions.submissionDatetimeOverride,
    FIELD_IDS.versions.rejectionReason,
    FIELD_IDS.versions.reviewFeedback,
    FIELD_IDS.versions.daysInCurrentStage,
    FIELD_IDS.versions.assetLink,
    FIELD_IDS.versions.assetRecordIdRollup,
];
export class AirtableClientError extends Error {
    code;
    status;
    details;
    constructor(code, message, status, details) {
        super(message);
        this.name = 'AirtableClientError';
        this.code = code;
        this.status = status;
        this.details = details;
    }
}
function defaultSleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function escapeFormulaValue(value) {
    return value.replace(/'/g, "''");
}
function toStringValue(value) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    return undefined;
}
function toNumberValue(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    if (Array.isArray(value) && value.length > 0)
        return toNumberValue(value[0]);
    return undefined;
}
function toStringArray(value) {
    if (Array.isArray(value)) {
        return value
            .map((item) => {
            if (typeof item === 'string')
                return item;
            if (item && typeof item === 'object') {
                const maybeName = item.name;
                const maybeId = item.id;
                if (typeof maybeName === 'string')
                    return maybeName;
                if (typeof maybeId === 'string')
                    return maybeId;
            }
            return undefined;
        })
            .filter((item) => Boolean(item));
    }
    if (typeof value === 'string')
        return value.trim() ? [value] : [];
    return [];
}
function firstString(value) {
    if (Array.isArray(value) && value.length > 0) {
        return firstString(value[0]);
    }
    return toStringValue(value);
}
function toAttachmentUrls(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((item) => {
        if (!item || typeof item !== 'object')
            return undefined;
        const url = item.url;
        return typeof url === 'string' ? url : undefined;
    })
        .filter((item) => Boolean(item));
}
function toCollaborator(value) {
    if (!value)
        return null;
    if (Array.isArray(value)) {
        if (value.length === 0)
            return null;
        return toCollaborator(value[0]);
    }
    if (typeof value === 'object') {
        const raw = value;
        if (typeof raw.id === 'string') {
            const result = { id: raw.id };
            if (typeof raw.email === 'string')
                result.email = raw.email;
            if (typeof raw.name === 'string')
                result.name = raw.name;
            return result;
        }
    }
    return null;
}
function toDateTimeOrThrow(value) {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
        throw new AirtableClientError('INVALID_DATETIME', `Invalid datetime: ${value}`);
    }
    return new Date(parsed).toISOString();
}
function mapQueueRecord(record) {
    const fields = record.fields;
    return {
        assetId: record.id,
        appName: firstString(fields[FIELD_IDS.assets.name]) ?? '',
        assetType: firstString(fields[FIELD_IDS.assets.type]),
        marketplaceStatus: firstString(fields[FIELD_IDS.assets.marketplaceStatus]),
        latestReviewStatus: firstString(fields[FIELD_IDS.assets.latestReviewStatus]),
        daysInCurrentReviewStage: toNumberValue(fields[FIELD_IDS.assets.daysInCurrentReviewStage]),
        latestReviewer: firstString(fields[FIELD_IDS.assets.latestReviewer]),
        latestReviewFeedback: firstString(fields[FIELD_IDS.assets.latestReviewFeedback]),
        openReviewStatus: toStringArray(fields[FIELD_IDS.assets.openReviewStatus]),
        appCapabilities: firstString(fields[FIELD_IDS.assets.capabilities]),
        clientId: firstString(fields[FIELD_IDS.assets.clientId]),
        appId: firstString(fields[FIELD_IDS.assets.appId]),
        visibilityStatus: firstString(fields[FIELD_IDS.assets.visibility]),
    };
}
function mapAssetRecord(record) {
    const queue = mapQueueRecord(record);
    const fields = record.fields;
    return {
        ...queue,
        relationshipOwner: toCollaborator(fields[FIELD_IDS.assets.relationshipOwner]),
        featuresText: firstString(fields[FIELD_IDS.assets.featuresText]),
        notes: firstString(fields[FIELD_IDS.assets.notes]),
        credentials: firstString(fields[FIELD_IDS.assets.credentials]),
        descriptionShort: firstString(fields[FIELD_IDS.assets.descriptionShort]),
        descriptionLongHtml: firstString(fields[FIELD_IDS.assets.descriptionLongHtml]),
        installUrl: firstString(fields[FIELD_IDS.assets.installUrlDirect]),
        installUrlFormula: firstString(fields[FIELD_IDS.assets.installUrlFormula]),
        workspaceDashboardUrl: firstString(fields[FIELD_IDS.assets.workspaceDashboardUrl]),
        categoriesRecordIds: toStringArray(fields[FIELD_IDS.assets.categories]),
        iconImageUrl: toAttachmentUrls(fields[FIELD_IDS.assets.iconImage])[0],
        iconImageAltText: firstString(fields[FIELD_IDS.assets.iconImageAltText]),
        carouselImageUrls: toAttachmentUrls(fields[FIELD_IDS.assets.carouselImages]),
        carouselImageAltText: firstString(fields[FIELD_IDS.assets.carouselImagesAltText]),
        paymentTimes: toStringArray(fields[FIELD_IDS.assets.paymentTypes]),
        demoVideoUrl: firstString(fields[FIELD_IDS.assets.demoVideoUrl]),
        privacyPolicyUrl: firstString(fields[FIELD_IDS.assets.privacyPolicyUrl]),
        termsAndConditionsUrl: firstString(fields[FIELD_IDS.assets.termsAndConditionsUrl]),
        websiteUrl: firstString(fields[FIELD_IDS.assets.websiteUrl]),
        supportEmailOrUrl: firstString(fields[FIELD_IDS.assets.supportEmailOrUrl]),
        previewSiteUrl: firstString(fields[FIELD_IDS.assets.previewSiteUrl]),
        promoVideoUrl: firstString(fields[FIELD_IDS.assets.promoVideoUrl]),
    };
}
function mapVersionRecord(record) {
    const fields = record.fields;
    const linkedAssetIds = toStringArray(fields[FIELD_IDS.versions.assetLink]);
    const rollupAssetIds = toStringArray(fields[FIELD_IDS.versions.assetRecordIdRollup]);
    return {
        versionId: record.id,
        assetId: linkedAssetIds[0] ?? rollupAssetIds[0],
        versionNumber: toNumberValue(fields[FIELD_IDS.versions.versionNumber]),
        reviewType: firstString(fields[FIELD_IDS.versions.reviewType]),
        reviewer: toCollaborator(fields[FIELD_IDS.versions.reviewer]),
        reviewStatus: firstString(fields[FIELD_IDS.versions.reviewStatus]),
        submissionDatetime: firstString(fields[FIELD_IDS.versions.submissionDatetime]),
        submissionDatetimeOverride: firstString(fields[FIELD_IDS.versions.submissionDatetimeOverride]),
        rejectionReason: firstString(fields[FIELD_IDS.versions.rejectionReason]),
        reviewFeedback: firstString(fields[FIELD_IDS.versions.reviewFeedback]),
        daysInCurrentStage: toNumberValue(fields[FIELD_IDS.versions.daysInCurrentStage]),
        createdTime: record.createdTime,
    };
}
export function assertScopedTable(tableId) {
    if (!SCOPED_TABLE_IDS.has(tableId)) {
        throw new AirtableClientError('TABLE_SCOPE_VIOLATION', `Table ${tableId} is outside MCP scope.`);
    }
}
export class AirtableClient {
    apiKey;
    baseId;
    fetchFn;
    sleepFn;
    maxRetries;
    constructor(options) {
        this.apiKey = options.apiKey;
        this.baseId = options.baseId ?? DEFAULT_AIRTABLE_BASE_ID;
        // In Workers, unbound fetch can throw "Illegal invocation".
        this.fetchFn = options.fetchFn
            ? (input, init) => options.fetchFn.call(globalThis, input, init)
            : (input, init) => globalThis.fetch(input, init);
        this.sleepFn = options.sleepFn ?? defaultSleep;
        this.maxRetries = options.maxRetries ?? 3;
    }
    get tableBaseUrl() {
        return `https://api.airtable.com/v0/${this.baseId}`;
    }
    async requestJson(path, init, query) {
        const url = `${this.tableBaseUrl}${path}?${query.toString()}`;
        for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
            try {
                const response = await this.fetchFn(url, {
                    ...init,
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        ...(init.headers ?? {}),
                    },
                });
                if (response.ok) {
                    return (await response.json());
                }
                const body = await response.text();
                if (RETRYABLE_STATUS.has(response.status) && attempt < this.maxRetries) {
                    const waitMs = Math.min(200 * 2 ** attempt, 2000);
                    await this.sleepFn(waitMs);
                    continue;
                }
                throw new AirtableClientError('AIRTABLE_HTTP_ERROR', `Airtable request failed (${response.status})`, response.status, body);
            }
            catch (error) {
                if (error instanceof AirtableClientError)
                    throw error;
                if (attempt < this.maxRetries) {
                    const waitMs = Math.min(200 * 2 ** attempt, 2000);
                    await this.sleepFn(waitMs);
                    continue;
                }
                throw new AirtableClientError('AIRTABLE_NETWORK_ERROR', 'Airtable request failed after retries.', undefined, String(error));
            }
        }
        throw new AirtableClientError('AIRTABLE_UNKNOWN_ERROR', 'Unexpected Airtable request failure.');
    }
    async listRecords(args) {
        assertScopedTable(args.tableId);
        const all = [];
        let offset;
        while (true) {
            const query = new URLSearchParams();
            query.set('returnFieldsByFieldId', 'true');
            query.set('pageSize', '100');
            args.fieldIds.forEach((fieldId) => query.append('fields[]', fieldId));
            if (args.filterByFormula)
                query.set('filterByFormula', args.filterByFormula);
            if (offset)
                query.set('offset', offset);
            const data = await this.requestJson(`/${encodeURIComponent(args.tableId)}`, { method: 'GET' }, query);
            all.push(...data.records);
            if (args.limit && all.length >= args.limit) {
                return all.slice(0, args.limit);
            }
            if (!data.offset)
                return all;
            offset = data.offset;
        }
    }
    async getRecord(tableId, recordId, fieldIds) {
        assertScopedTable(tableId);
        const formula = `RECORD_ID() = '${escapeFormulaValue(recordId)}'`;
        const records = await this.listRecords({
            tableId,
            fieldIds,
            limit: 1,
            filterByFormula: formula,
        });
        return records[0] ?? null;
    }
    async updateRecord(tableId, recordId, fields) {
        assertScopedTable(tableId);
        const query = new URLSearchParams();
        query.set('returnFieldsByFieldId', 'true');
        query.set('typecast', 'true');
        const payload = JSON.stringify({ records: [{ id: recordId, fields }] });
        const data = await this.requestJson(`/${encodeURIComponent(tableId)}`, { method: 'PATCH', body: payload }, query);
        if (!data.records[0]) {
            throw new AirtableClientError('AIRTABLE_EMPTY_UPDATE', 'Airtable update returned no record.');
        }
        return data.records[0];
    }
    async healthCheck() {
        const records = await this.listRecords({
            tableId: TABLE_IDS.assets,
            fieldIds: [FIELD_IDS.assets.name],
            limit: 1,
        });
        return {
            ok: true,
            baseId: this.baseId,
            scopedTables: TABLE_IDS,
            sampleAssetsRead: records.length,
        };
    }
    async listAssetQueue(limit = 100) {
        const queue = [];
        let offset;
        while (queue.length < limit) {
            const query = new URLSearchParams();
            query.set('returnFieldsByFieldId', 'true');
            query.set('pageSize', '100');
            ASSET_QUEUE_FIELD_IDS.forEach((fieldId) => query.append('fields[]', fieldId));
            if (offset)
                query.set('offset', offset);
            const data = await this.requestJson(`/${encodeURIComponent(TABLE_IDS.assets)}`, { method: 'GET' }, query);
            for (const record of data.records) {
                if (!isAppLikeAsset(record.fields))
                    continue;
                queue.push(mapQueueRecord(record));
                if (queue.length >= limit) {
                    return queue;
                }
            }
            if (!data.offset) {
                return queue;
            }
            offset = data.offset;
        }
        return queue;
    }
    async getAssetById(assetId) {
        const record = await this.getRecord(TABLE_IDS.assets, assetId, ASSET_DETAIL_FIELD_IDS);
        if (!record)
            return null;
        if (!isAppLikeAsset(record.fields))
            return null;
        return mapAssetRecord(record);
    }
    async getAssetByAppId(appId) {
        const needle = appId.trim().toLowerCase();
        if (!needle)
            return null;
        let offset;
        while (true) {
            const query = new URLSearchParams();
            query.set('returnFieldsByFieldId', 'true');
            query.set('pageSize', '100');
            ASSET_DETAIL_FIELD_IDS.forEach((fieldId) => query.append('fields[]', fieldId));
            if (offset)
                query.set('offset', offset);
            const data = await this.requestJson(`/${encodeURIComponent(TABLE_IDS.assets)}`, { method: 'GET' }, query);
            for (const record of data.records) {
                if (!isAppLikeAsset(record.fields))
                    continue;
                const appIds = toStringArray(record.fields[FIELD_IDS.assets.appId]).map((value) => value.toLowerCase());
                if (appIds.includes(needle)) {
                    return mapAssetRecord(record);
                }
            }
            if (!data.offset) {
                return null;
            }
            offset = data.offset;
        }
    }
    async listVersionsForAsset(assetId, limit = 100) {
        const formula = `{${FIELD_IDS.versions.assetRecordIdRollup}} = '${escapeFormulaValue(assetId)}'`;
        const records = await this.listRecords({
            tableId: TABLE_IDS.assetVersions,
            fieldIds: VERSION_FIELD_IDS,
            limit,
            filterByFormula: formula,
        });
        return records
            .map((record) => mapVersionRecord(record))
            .sort((a, b) => (b.versionNumber ?? 0) - (a.versionNumber ?? 0));
    }
    async getVersionById(versionId) {
        const record = await this.getRecord(TABLE_IDS.assetVersions, versionId, VERSION_FIELD_IDS);
        return record ? mapVersionRecord(record) : null;
    }
    async updateVersionReview(versionId, input) {
        const fields = {};
        if (input.review_status !== undefined) {
            if (!REVIEW_STATUS_OPTIONS.includes(input.review_status)) {
                throw new AirtableClientError('INVALID_REVIEW_STATUS', 'Unsupported review status.', 400, {
                    value: input.review_status,
                    allowed: REVIEW_STATUS_OPTIONS,
                });
            }
            fields[FIELD_IDS.versions.reviewStatus] = input.review_status;
        }
        if (input.review_type !== undefined) {
            if (!REVIEW_TYPE_OPTIONS.includes(input.review_type)) {
                throw new AirtableClientError('INVALID_REVIEW_TYPE', 'Unsupported review type.', 400, {
                    value: input.review_type,
                    allowed: REVIEW_TYPE_OPTIONS,
                });
            }
            fields[FIELD_IDS.versions.reviewType] = input.review_type;
        }
        if (input.reviewer !== undefined) {
            fields[FIELD_IDS.versions.reviewer] = input.reviewer ? { id: input.reviewer.id } : null;
        }
        if (input.rejection_reason !== undefined) {
            if (!REJECTION_REASON_OPTIONS.includes(input.rejection_reason)) {
                throw new AirtableClientError('INVALID_REJECTION_REASON', 'Unsupported rejection reason.', 400, {
                    value: input.rejection_reason,
                    allowed: REJECTION_REASON_OPTIONS,
                });
            }
            fields[FIELD_IDS.versions.rejectionReason] = input.rejection_reason;
        }
        if (input.review_feedback !== undefined) {
            fields[FIELD_IDS.versions.reviewFeedback] = input.review_feedback;
        }
        if (input.submission_datetime_override !== undefined) {
            fields[FIELD_IDS.versions.submissionDatetimeOverride] = input.submission_datetime_override
                ? toDateTimeOrThrow(input.submission_datetime_override)
                : null;
        }
        if (Object.keys(fields).length === 0) {
            throw new AirtableClientError('NO_MUTATION_FIELDS', 'No version review fields were provided.', 400);
        }
        const updated = await this.updateRecord(TABLE_IDS.assetVersions, versionId, fields);
        return mapVersionRecord(updated);
    }
    async updateAssetMetadata(assetId, input) {
        const definedEntries = Object.entries(input).filter(([, value]) => value !== undefined);
        const keys = definedEntries.map(([key]) => key);
        const { invalidKeys, readOnlyKeys, writableKeys } = validateAssetMetadataWriteKeys(keys);
        if (invalidKeys.length > 0) {
            throw new AirtableClientError('INVALID_ASSET_FIELDS', 'Unsupported asset metadata fields.', 400, {
                invalidKeys,
            });
        }
        if (readOnlyKeys.length > 0) {
            throw new AirtableClientError('READ_ONLY_ASSET_FIELDS', 'One or more requested fields are read-only.', 400, {
                readOnlyKeys,
            });
        }
        const fields = {};
        for (const key of writableKeys) {
            const value = input[key];
            switch (key) {
                case 'app_name':
                case 'client_id':
                case 'features_text':
                case 'notes':
                case 'credentials':
                case 'description_short':
                case 'description_long_html':
                case 'install_url':
                case 'icon_image_alt_text':
                case 'carousel_image_alt_text':
                case 'demo_video_url':
                case 'privacy_policy_url':
                case 'terms_and_conditions_url':
                case 'website_url':
                case 'support_email_or_url':
                case 'preview_site_url':
                case 'promo_video_url':
                    fields[FIELD_IDS.assets[mapWritableKeyToAssetFieldName(key)]] = value ?? null;
                    break;
                case 'app_capabilities':
                    if (value !== null && value !== undefined && !CAPABILITIES_OPTIONS.includes(String(value))) {
                        throw new AirtableClientError('INVALID_CAPABILITY', 'Unsupported app capability.', 400, {
                            value,
                            allowed: CAPABILITIES_OPTIONS,
                        });
                    }
                    fields[FIELD_IDS.assets.capabilities] = value ?? null;
                    break;
                case 'visibility_status':
                    if (value !== null && value !== undefined && !VISIBILITY_OPTIONS.includes(String(value))) {
                        throw new AirtableClientError('INVALID_VISIBILITY', 'Unsupported visibility status.', 400, {
                            value,
                            allowed: VISIBILITY_OPTIONS,
                        });
                    }
                    fields[FIELD_IDS.assets.visibility] = value ?? null;
                    break;
                case 'marketplace_status':
                    if (value !== null && value !== undefined && !MARKETPLACE_STATUS_OPTIONS.includes(String(value))) {
                        throw new AirtableClientError('INVALID_MARKETPLACE_STATUS', 'Unsupported marketplace status.', 400, {
                            value,
                            allowed: MARKETPLACE_STATUS_OPTIONS,
                        });
                    }
                    fields[FIELD_IDS.assets.marketplaceStatus] = value ?? null;
                    break;
                case 'relationships_status':
                    if (value === null) {
                        fields[FIELD_IDS.assets.relationshipOwner] = null;
                        break;
                    }
                    if (!value || typeof value !== 'object' || typeof value.id !== 'string') {
                        throw new AirtableClientError('INVALID_RELATIONSHIP_OWNER', 'relationships_status must be null or { id: string }.', 400);
                    }
                    fields[FIELD_IDS.assets.relationshipOwner] = { id: value.id };
                    break;
                case 'categories_record_ids':
                    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
                        throw new AirtableClientError('INVALID_CATEGORIES', 'categories_record_ids must be an array of Airtable record IDs.', 400);
                    }
                    fields[FIELD_IDS.assets.categories] = value;
                    break;
                case 'icon_image_url':
                    if (value === null) {
                        fields[FIELD_IDS.assets.iconImage] = [];
                        break;
                    }
                    if (typeof value !== 'string') {
                        throw new AirtableClientError('INVALID_ICON_IMAGE', 'icon_image_url must be a URL string or null.', 400);
                    }
                    fields[FIELD_IDS.assets.iconImage] = [{ url: value }];
                    break;
                case 'carousel_image_urls':
                    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
                        throw new AirtableClientError('INVALID_CAROUSEL_IMAGES', 'carousel_image_urls must be an array of URL strings.', 400);
                    }
                    fields[FIELD_IDS.assets.carouselImages] = value.map((url) => ({ url }));
                    break;
                case 'payment_times':
                    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
                        throw new AirtableClientError('INVALID_PAYMENT_TYPES', 'payment_times must be an array of strings.', 400);
                    }
                    fields[FIELD_IDS.assets.paymentTypes] = value;
                    break;
                default:
                    break;
            }
        }
        if (Object.keys(fields).length === 0) {
            throw new AirtableClientError('NO_MUTATION_FIELDS', 'No writable asset fields were provided.', 400);
        }
        const updated = await this.updateRecord(TABLE_IDS.assets, assetId, fields);
        if (!isAppLikeAsset(updated.fields)) {
            throw new AirtableClientError('OUT_OF_SCOPE_ASSET', 'Updated asset is outside app-review scope.', 403);
        }
        return mapAssetRecord(updated);
    }
    async setMarketplaceStatus(assetId, marketplaceStatus) {
        return this.updateAssetMetadata(assetId, { marketplace_status: marketplaceStatus });
    }
}
function mapWritableKeyToAssetFieldName(key) {
    switch (key) {
        case 'app_name':
            return 'name';
        case 'client_id':
            return 'clientId';
        case 'features_text':
            return 'featuresText';
        case 'notes':
            return 'notes';
        case 'credentials':
            return 'credentials';
        case 'description_short':
            return 'descriptionShort';
        case 'description_long_html':
            return 'descriptionLongHtml';
        case 'install_url':
            return 'installUrlDirect';
        case 'icon_image_alt_text':
            return 'iconImageAltText';
        case 'carousel_image_alt_text':
            return 'carouselImagesAltText';
        case 'demo_video_url':
            return 'demoVideoUrl';
        case 'privacy_policy_url':
            return 'privacyPolicyUrl';
        case 'terms_and_conditions_url':
            return 'termsAndConditionsUrl';
        case 'website_url':
            return 'websiteUrl';
        case 'support_email_or_url':
            return 'supportEmailOrUrl';
        case 'preview_site_url':
            return 'previewSiteUrl';
        case 'promo_video_url':
            return 'promoVideoUrl';
    }
}

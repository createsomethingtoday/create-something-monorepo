import { describe, expect, it } from 'vitest';

import {
  APP_REVIEW_FIELD_MAP,
  FIELD_IDS,
  getReadOnlyAssetWriteHint,
  isAppLikeAsset,
  isCapability,
  isMarketplaceStatus,
  isReadOnlyAssetWriteKey,
  isRejectionReason,
  isReviewStatus,
  isReviewType,
  isVisibilityStatus,
  validateAssetMetadataWriteKeys,
} from './schema.js';

describe('schema helpers', () => {
  it('detects app-like assets from capabilities/client/app-id/visibility', () => {
    const appFields = {
      [FIELD_IDS.assets.capabilities]: 'Hybrid',
    };
    const nonAppFields = {
      [FIELD_IDS.assets.name]: 'Example asset',
    };

    expect(isAppLikeAsset(appFields)).toBe(true);
    expect(isAppLikeAsset(nonAppFields)).toBe(false);
  });

  it('classifies writable/read-only/invalid write keys', () => {
    const result = validateAssetMetadataWriteKeys([
      'app_name',
      'latest_review_status',
      'nonexistent_key',
    ]);

    expect(result.writableKeys).toEqual(['app_name']);
    expect(result.readOnlyKeys).toEqual(['latest_review_status']);
    expect(result.invalidKeys).toEqual(['nonexistent_key']);
  });

  it('returns routing hint for latest_review_status', () => {
    const hint = getReadOnlyAssetWriteHint('latest_review_status');
    expect(hint.routeTo).toContain('app_review_update_version_review');
  });

  it('recognizes known read-only keys', () => {
    expect(isReadOnlyAssetWriteKey('app_id')).toBe(true);
    expect(isReadOnlyAssetWriteKey('app_name')).toBe(false);
  });

  it('exposes source-map artifacts as read-only version context', () => {
    expect(APP_REVIEW_FIELD_MAP.versions.readOnly.source_map_artifact_url).toBe(FIELD_IDS.versions.sourceMapArtifactUrl);
  });

  it('validates known enum options', () => {
    expect(isMarketplaceStatus('3️⃣Published🚀')).toBe(true);
    expect(isCapability('Hybrid')).toBe(true);
    expect(isVisibilityStatus('Public')).toBe(true);
    expect(isReviewStatus('✅Approved')).toBe(true);
    expect(isReviewType('Meta Update')).toBe(true);
    expect(isRejectionReason('Other')).toBe(true);
  });
});

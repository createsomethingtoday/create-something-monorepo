import { describe, expect, it } from 'vitest';

import {
  FIELD_IDS,
  GOVERNANCE_FINDING_CATEGORY_OPTIONS,
  GOVERNANCE_FINDING_FIELD_NAMES,
  GOVERNANCE_FINDING_PRIORITY_OPTIONS,
  GOVERNANCE_FINDING_STATUS_OPTIONS,
  TABLE_IDS,
  getReadOnlyAssetWriteHint,
  isGovernanceFindingCategory,
  isGovernanceFindingPriority,
  isGovernanceFindingStatus,
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

  it('validates known enum options', () => {
    expect(isMarketplaceStatus('3️⃣Published🚀')).toBe(true);
    expect(isCapability('Hybrid')).toBe(true);
    expect(isVisibilityStatus('Public')).toBe(true);
    expect(isReviewStatus('✅Approved')).toBe(true);
    expect(isReviewType('Meta Update')).toBe(true);
    expect(isRejectionReason('Other')).toBe(true);
  });

  it('exposes governance finding table, field names, and enum options', () => {
    expect(TABLE_IDS.governanceFindings).toBe('App Review Governance Findings');
    expect(GOVERNANCE_FINDING_FIELD_NAMES.title).toBe('Title');
    expect(GOVERNANCE_FINDING_FIELD_NAMES.asset).toBe('Asset ID');
    expect(GOVERNANCE_FINDING_FIELD_NAMES.assetVersion).toBe('Asset Version ID');
    expect(isGovernanceFindingCategory('Runtime Integrity & Custom Code Governance')).toBe(true);
    expect(isGovernanceFindingStatus('Needs Decision')).toBe(true);
    expect(isGovernanceFindingPriority('P1')).toBe(true);
    expect(GOVERNANCE_FINDING_CATEGORY_OPTIONS).toContain('Documentation Overhaul & Tracking Hub');
    expect(GOVERNANCE_FINDING_STATUS_OPTIONS).toContain('Parking Lot');
    expect(GOVERNANCE_FINDING_PRIORITY_OPTIONS).toEqual(['P0', 'P1', 'P2', 'P3']);
  });
});

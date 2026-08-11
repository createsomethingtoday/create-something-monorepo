import { describe, expect, it } from 'vitest';

import {
  APP_REVIEW_FIELD_MAP,
  FIELD_IDS,
  GOVERNANCE_FINDING_CATEGORY_OPTIONS,
  GOVERNANCE_FINDING_FIELD_NAMES,
  GOVERNANCE_FINDING_PRIORITY_OPTIONS,
  GOVERNANCE_FINDING_STATUS_OPTIONS,
  TABLE_IDS,
  getReadOnlyAssetWriteHint,
  isExceptionStatus,
  isExceptionType,
  isGovernanceFindingCategory,
  isGovernanceFindingPriority,
  isGovernanceFindingStatus,
  isHoldReason,
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

  it('exposes exception table, fields, and enum options', () => {
    expect(TABLE_IDS.exceptions).toBe('tblnbaaIbIulWl0b7');
    expect(FIELD_IDS.exceptions.item).toBe('fldmJcVJCytD1VY1r');
    expect(FIELD_IDS.exceptions.status).toBe('fld0D5PoJAWhYeHiI');
    expect(FIELD_IDS.versions.exceptionStatus).toBe('fldQo0XS9zJp5PifI');
    expect(FIELD_IDS.versions.undecidedExceptionItems).toBe('fldiVQqWSw5shDkZS');
    expect(isExceptionStatus('🆕Requested')).toBe(true);
    expect(isExceptionStatus('Approved')).toBe(false);
    expect(isExceptionType('Custom Code / Scopes')).toBe(true);
    expect(isHoldReason('Pending Exception Decision')).toBe(true);
    expect(APP_REVIEW_FIELD_MAP.versions.writable.exception_status).toBe(FIELD_IDS.versions.exceptionStatus);
    expect(APP_REVIEW_FIELD_MAP.versions.readOnly.exception_slack_ts).toBe(FIELD_IDS.versions.exceptionSlackTs);
    expect(APP_REVIEW_FIELD_MAP.exceptions.writable.exception_status).toBe(FIELD_IDS.exceptions.status);
    expect(APP_REVIEW_FIELD_MAP.exceptions.writable).not.toHaveProperty('requested_by');
    expect(APP_REVIEW_FIELD_MAP.exceptions.writable).not.toHaveProperty('decision_by');
    expect(APP_REVIEW_FIELD_MAP.exceptions.readOnly.requested_by).toBe(FIELD_IDS.exceptions.requestedBy);
    expect(APP_REVIEW_FIELD_MAP.exceptions.readOnly.decision_by).toBe(FIELD_IDS.exceptions.decisionBy);
    expect(APP_REVIEW_FIELD_MAP.exceptions.readOnly.requested_datetime).toBe(FIELD_IDS.exceptions.requestedDatetime);
    expect(APP_REVIEW_FIELD_MAP.statusOptions.exceptionStatus).toContain('✅Approved');
    expect(APP_REVIEW_FIELD_MAP.statusOptions.holdReason).toContain('Pending Exception Decision');
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
    expect(GOVERNANCE_FINDING_CATEGORY_OPTIONS).toContain(
      'Bundle Review Precision — Library False-Positives & Dependency Declarations',
    );
    expect(GOVERNANCE_FINDING_STATUS_OPTIONS).toContain('Parking Lot');
    expect(GOVERNANCE_FINDING_PRIORITY_OPTIONS).toEqual(['P0', 'P1', 'P2', 'P3']);
  });
});

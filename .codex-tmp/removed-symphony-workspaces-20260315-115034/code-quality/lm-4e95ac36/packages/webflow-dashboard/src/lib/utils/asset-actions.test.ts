import { describe, expect, it } from 'vitest';

import { getAssetActionConfig, sortAssetStatuses } from './asset-actions';

describe('getAssetActionConfig', () => {
  it('maps published assets to view-first actions', () => {
    expect(getAssetActionConfig('Published')).toEqual({
      primary: { key: 'view', label: 'View', handler: 'view' },
      secondary: [
        { key: 'edit', label: 'Edit', handler: 'edit' },
        { key: 'archive', label: 'Archive', handler: 'archive' }
      ]
    });
  });

  it('maps scheduled assets to edit-first actions', () => {
    expect(getAssetActionConfig('Scheduled')).toEqual({
      primary: { key: 'edit', label: 'Edit', handler: 'edit' },
      secondary: [
        { key: 'view', label: 'View details', handler: 'view' },
        { key: 'archive', label: 'Archive', handler: 'archive' }
      ]
    });
  });

  it('maps rejected assets to review feedback first', () => {
    expect(getAssetActionConfig('Rejected')).toEqual({
      primary: { key: 'review-feedback', label: 'Review feedback', handler: 'view' },
      secondary: [
        { key: 'view', label: 'View details', handler: 'view' },
        { key: 'archive', label: 'Archive', handler: 'archive' }
      ]
    });
  });

  it('keeps delisted assets view-only', () => {
    expect(getAssetActionConfig('Delisted')).toEqual({
      primary: { key: 'view', label: 'View', handler: 'view' },
      secondary: []
    });
  });
});

describe('sortAssetStatuses', () => {
  it('orders statuses by action urgency', () => {
    expect(
      sortAssetStatuses(['Published', 'Delisted', 'Upcoming', 'Scheduled', 'Rejected'])
    ).toEqual(['Rejected', 'Upcoming', 'Scheduled', 'Published', 'Delisted']);
  });

  it('normalizes emoji-prefixed statuses before sorting', () => {
    expect(sortAssetStatuses(['3️⃣🚀Published', '1️⃣🆕Upcoming', '❌Rejected'])).toEqual([
      '❌Rejected',
      '1️⃣🆕Upcoming',
      '3️⃣🚀Published'
    ]);
  });
});

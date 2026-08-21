import { describe, expect, it } from 'vitest';

import {
  getActionableAssetWorkQueue,
  getAssetActionConfig,
  groupAssetsByTypeAndStatus,
  sortAssetStatuses,
  sortAssetTypes
} from './asset-actions';

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

describe('sortAssetTypes', () => {
  it('orders asset types alphabetically by default', () => {
    expect(sortAssetTypes(['Template', 'App', 'Library'])).toEqual(['App', 'Library', 'Template']);
  });

  it('supports reverse type ordering', () => {
    expect(sortAssetTypes(['Template', 'App', 'Library'], 'desc')).toEqual([
      'Template',
      'Library',
      'App'
    ]);
  });
});

describe('groupAssetsByTypeAndStatus', () => {
  it('nests assets under type first and normalized status second', () => {
    const grouped = groupAssetsByTypeAndStatus([
      {
        id: '1',
        name: 'Alpha Template',
        type: 'Template',
        status: 'Published'
      },
      {
        id: '2',
        name: 'Beta App',
        type: 'App',
        status: '❌Rejected'
      },
      {
        id: '3',
        name: 'Gamma Template',
        type: 'Template',
        status: '1️⃣🆕Upcoming'
      }
    ] as Parameters<typeof groupAssetsByTypeAndStatus>[0]);

    expect(sortAssetTypes(Object.keys(grouped))).toEqual(['App', 'Template']);
    expect(sortAssetStatuses(Object.keys(grouped.Template))).toEqual(['Upcoming', 'Published']);
    expect(grouped.App.Rejected.map((asset) => asset.id)).toEqual(['2']);
  });
});

describe('getActionableAssetWorkQueue', () => {
  it('puts rejected feedback ahead of upcoming, scheduled, and draft editing work', () => {
    const queue = getActionableAssetWorkQueue([
      { id: 'published', name: 'Published Asset', status: 'Published' },
      { id: 'draft', name: 'Zebra Draft', status: 'Draft' },
      { id: 'draft-earlier', name: 'Alpha Draft', status: 'Draft' },
      { id: 'scheduled', name: 'Scheduled Asset', status: 'Scheduled' },
      { id: 'rejected', name: 'Rejected Asset', status: '❌Rejected' },
      { id: 'upcoming', name: 'Upcoming Asset', status: '1️⃣🆕Upcoming' },
      { id: 'delisted', name: 'Delisted Asset', status: 'Delisted' }
    ] as Parameters<typeof getActionableAssetWorkQueue>[0]);

    expect(queue.map((item) => [item.asset.id, item.action.label, item.reason])).toEqual([
      ['rejected', 'Review feedback', 'Review the rejection feedback before changing this asset.'],
      ['upcoming', 'Edit', 'Prepare this asset before its upcoming release.'],
      ['scheduled', 'Edit', 'Confirm this asset is ready for its scheduled release.'],
      ['draft-earlier', 'Edit', 'Finish the remaining marketplace fields for this draft.'],
      ['draft', 'Edit', 'Finish the remaining marketplace fields for this draft.']
    ]);
  });

  it('returns no work when the portfolio only contains browse-only asset states', () => {
    const queue = getActionableAssetWorkQueue([
      { id: 'published', name: 'Published Asset', status: 'Published' },
      { id: 'delisted', name: 'Delisted Asset', status: 'Delisted' }
    ] as Parameters<typeof getActionableAssetWorkQueue>[0]);

    expect(queue).toEqual([]);
  });
});

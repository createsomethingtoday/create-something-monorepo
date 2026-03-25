import type { Asset } from '$lib/server/airtable';

export type AssetStatus = Asset['status'];
export type AssetActionKey = 'view' | 'edit' | 'review-feedback' | 'archive';
export type AssetActionHandler = 'view' | 'edit' | 'archive';
export type AssetTypeSortDirection = 'asc' | 'desc';

export interface AssetActionDescriptor {
  key: AssetActionKey;
  label: string;
  handler: AssetActionHandler;
}

const statusPriority: string[] = [
  'Rejected',
  'Upcoming',
  'Scheduled',
  'Draft',
  'Published',
  'Delisted'
];

function cleanStatus(value: string): string {
  return value
    .replace(/^\d[\uFE0F]?[\u20E3]?/u, '')
    .replace(/🆕|📅|🚀|☠️|❌/gu, '')
    .trim();
}

export function normalizeAssetStatus(status: string): string {
  return cleanStatus(status);
}

export function sortAssetStatuses(statuses: string[]): string[] {
  return [...statuses].sort((left, right) => {
    const normalizedLeft = normalizeAssetStatus(left);
    const normalizedRight = normalizeAssetStatus(right);
    const leftIndex = statusPriority.indexOf(normalizedLeft);
    const rightIndex = statusPriority.indexOf(normalizedRight);
    const normalizedLeftIndex = leftIndex === -1 ? statusPriority.length : leftIndex;
    const normalizedRightIndex = rightIndex === -1 ? statusPriority.length : rightIndex;

    if (normalizedLeftIndex !== normalizedRightIndex) {
      return normalizedLeftIndex - normalizedRightIndex;
    }

    return normalizedLeft.localeCompare(normalizedRight);
  });
}

export function sortAssetTypes(
  types: string[],
  direction: AssetTypeSortDirection = 'asc'
): string[] {
  return [...types].sort((left, right) => {
    const comparison = left.localeCompare(right, undefined, { sensitivity: 'base' });
    return direction === 'asc' ? comparison : -comparison;
  });
}

export function groupAssetsByTypeAndStatus(assets: Asset[]): Record<string, Record<string, Asset[]>> {
  const groups: Record<string, Record<string, Asset[]>> = {};

  for (const asset of assets) {
    const type = asset.type?.trim() || 'Other';
    const status = normalizeAssetStatus(asset.status);

    if (!groups[type]) {
      groups[type] = {};
    }

    if (!groups[type][status]) {
      groups[type][status] = [];
    }

    groups[type][status].push(asset);
  }

  return groups;
}

export function getAssetActionConfig(status: string): {
  primary: AssetActionDescriptor;
  secondary: AssetActionDescriptor[];
} {
  const normalizedStatus = normalizeAssetStatus(status);

  switch (normalizedStatus) {
    case 'Rejected':
      return {
        primary: {
          key: 'review-feedback',
          label: 'Review feedback',
          handler: 'view'
        },
        secondary: [
          {
            key: 'view',
            label: 'View details',
            handler: 'view'
          },
          {
            key: 'archive',
            label: 'Archive',
            handler: 'archive'
          }
        ]
      };
    case 'Upcoming':
    case 'Scheduled':
    case 'Draft':
      return {
        primary: {
          key: 'edit',
          label: 'Edit',
          handler: 'edit'
        },
        secondary: [
          {
            key: 'view',
            label: 'View details',
            handler: 'view'
          },
          {
            key: 'archive',
            label: 'Archive',
            handler: 'archive'
          }
        ]
      };
    case 'Published':
      return {
        primary: {
          key: 'view',
          label: 'View',
          handler: 'view'
        },
        secondary: [
          {
            key: 'edit',
            label: 'Edit',
            handler: 'edit'
          },
          {
            key: 'archive',
            label: 'Archive',
            handler: 'archive'
          }
        ]
      };
    case 'Delisted':
      return {
        primary: {
          key: 'view',
          label: 'View',
          handler: 'view'
        },
        secondary: []
      };
    default:
      return {
        primary: {
          key: 'view',
          label: 'View',
          handler: 'view'
        },
        secondary: []
      };
  }
}

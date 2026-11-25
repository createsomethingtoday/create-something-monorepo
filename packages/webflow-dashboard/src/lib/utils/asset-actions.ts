import type { Asset } from '$lib/server/airtable';

export type AssetStatus = Asset['status'];
export type AssetActionKey = 'view' | 'edit' | 'review-feedback' | 'archive';
export type AssetActionHandler = 'view' | 'edit' | 'archive';
export type AssetTypeSortDirection = 'asc' | 'desc';

/**
 * App listings change through the Marketplace submission form. There the
 * developer signs in with Webflow, the form checks that they own the app, and
 * the update reaches the review team as one version. The dashboard shows the
 * review progress and the conversation; it does not write app listings itself.
 */
export const APP_SUBMISSION_FORM_URL = 'https://developers.webflow.com/submit';
export const APP_UPDATE_GUIDANCE =
  'App updates go through the Marketplace submission form. Choose Update, sign in with Webflow, and enter your Client ID.';

export function isAppAssetType(type: string | undefined | null): boolean {
  return type === 'App';
}

export interface AssetActionDescriptor {
  key: AssetActionKey;
  label: string;
  handler: AssetActionHandler;
}

export interface AssetWorkQueueItem {
  asset: Asset;
  action: AssetActionDescriptor;
  reason: string;
}

const statusPriority: string[] = [
  'Rejected',
  'Upcoming',
  'Scheduled',
  'Draft',
  'Published',
  'Delisted'
];

const actionableAssetReasons: Record<string, string> = {
  Rejected: 'Review the rejection feedback before changing this asset.',
  Upcoming: 'Prepare this asset before its upcoming release.',
  Scheduled: 'Confirm this asset is ready for its scheduled release.',
  Draft: 'Finish the remaining marketplace fields for this draft.'
};

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

export function groupAssetsByTypeAndStatus(
  assets: Asset[]
): Record<string, Record<string, Asset[]>> {
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

/** Actions for an asset. For an app, "Edit" becomes "Update app": it opens the submission form. */
export function getAssetActionConfig(
  status: string,
  type?: string | null
): {
  primary: AssetActionDescriptor;
  secondary: AssetActionDescriptor[];
} {
  const config = actionConfigForStatus(status);
  if (!isAppAssetType(type)) return config;
  const forApp = (action: AssetActionDescriptor): AssetActionDescriptor =>
    action.key === 'edit' ? { ...action, label: 'Update app' } : action;
  return { primary: forApp(config.primary), secondary: config.secondary.map(forApp) };
}

function actionConfigForStatus(status: string): {
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

/**
 * Returns the small, operator-first work queue for the portfolio dashboard.
 * Published and delisted assets remain in the browseable portfolio because
 * they do not have a next action in this workflow.
 */
export function getActionableAssetWorkQueue(assets: Asset[]): AssetWorkQueueItem[] {
  return assets
    .flatMap((asset) => {
      const normalizedStatus = normalizeAssetStatus(asset.status);
      const reason = actionableAssetReasons[normalizedStatus];

      if (!reason) return [];

      return [{ asset, action: getAssetActionConfig(normalizedStatus, asset.type).primary, reason }];
    })
    .sort((left, right) => {
      const leftPriority = statusPriority.indexOf(normalizeAssetStatus(left.asset.status));
      const rightPriority = statusPriority.indexOf(normalizeAssetStatus(right.asset.status));

      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return left.asset.name.localeCompare(right.asset.name, undefined, { sensitivity: 'base' });
    });
}

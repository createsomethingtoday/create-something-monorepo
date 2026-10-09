export const MAX_MARKETPLACE_APP_CATEGORIES = 2;

export const MARKETPLACE_APP_CATEGORIES = [
  'AI',
  'Analytics',
  'Asset Management',
  'Automation',
  'Compliance',
  'Content Management',
  'Customer Support',
  'Data Sync',
  'Design',
  'Development and Coding',
  'Ecommerce',
  'Forms and Surveys',
  'Localization',
  'Marketing',
  'Scheduling',
  'SEO',
  'User Management',
  'Utilities',
];

const MARKETPLACE_APP_CATEGORY_SET = new Set(MARKETPLACE_APP_CATEGORIES);

export function normalizeMarketplaceAppCategories(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((category) => String(category).trim()).filter(Boolean))];
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

export function findInvalidMarketplaceAppCategories(value) {
  return normalizeMarketplaceAppCategories(value).filter(
    (category) => !MARKETPLACE_APP_CATEGORY_SET.has(category)
  );
}

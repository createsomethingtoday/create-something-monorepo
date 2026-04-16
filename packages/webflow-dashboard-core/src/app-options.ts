export const APP_CAPABILITY_OPTIONS = [
  'Data Client v1',
  'Data Client v2',
  'Designer Extension',
  'Hybrid'
] as const;

export const APP_SCOPE_OPTIONS = [
  'app-subscriptions',
  'assets',
  'authorized-user',
  'cms',
  'comments',
  'components',
  'custom-code',
  'ecommerce',
  'forms',
  'pages',
  'sites',
  'site-activity',
  'site-config',
  'user-accounts',
  'workspace'
] as const;

export const APP_CATEGORY_OPTIONS = [
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
  'Icons',
  'Localization',
  'Marketing',
  'Scheduling',
  'SEO',
  'User Management',
  'Utilities'
] as const;

export const PAYMENT_TYPE_OPTIONS = ['Free', 'Paid'] as const;

export const APP_VISIBILITY_OPTIONS = [
  'Public',
  'Private: Beta',
  'Private: Not Published',
  'Private: Ongoing'
] as const;

export type AppCapabilityOption = (typeof APP_CAPABILITY_OPTIONS)[number];
export type AppScopeOption = (typeof APP_SCOPE_OPTIONS)[number];
export type AppCategoryOption = (typeof APP_CATEGORY_OPTIONS)[number];
export type PaymentTypeOption = (typeof PAYMENT_TYPE_OPTIONS)[number];
export type AppVisibilityOption = (typeof APP_VISIBILITY_OPTIONS)[number];

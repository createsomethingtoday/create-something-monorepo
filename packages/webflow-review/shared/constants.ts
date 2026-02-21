// Shared constants for Webflow Review

export const SEVERITY_WEIGHTS = {
  critical: 10,
  warning: 5,
  info: 1,
} as const;

export const CHECK_TYPES = {
  seo: 'SEO',
  links: 'Links',
  a11y: 'Accessibility',
  performance: 'Performance',
  interactions: 'Interactions',
} as const;

export const REVIEW_TIMEOUT_MS = 60000; // 1 minute max per page
export const QUEUE_BATCH_SIZE = 10; // Process 10 pages at a time
export const KV_CACHE_TTL = 300; // 5 minutes

export const SCORE_THRESHOLDS = {
  excellent: 90,
  good: 75,
  needsWork: 60,
  poor: 0,
} as const;

export const SEO_CHECKS = {
  title: {
    minLength: 10,
    maxLength: 70,
    weight: 10,
  },
  metaDescription: {
    minLength: 50,
    maxLength: 160,
    weight: 8,
  },
  headings: {
    required: ['h1'],
    weight: 5,
  },
  images: {
    requireAlt: true,
    weight: 7,
  },
  structuredData: {
    recommended: true,
    weight: 3,
  },
  openGraph: {
    required: ['og:title', 'og:description', 'og:image'],
    weight: 5,
  },
} as const;

export const LINK_CHECKS = {
  timeout: 5000,
  maxRedirects: 3,
  checkExternal: true,
} as const;

export const A11Y_CHECKS = {
  wcagLevel: 'AA',
  rules: [
    'color-contrast',
    'image-alt',
    'label',
    'link-name',
    'button-name',
  ],
} as const;

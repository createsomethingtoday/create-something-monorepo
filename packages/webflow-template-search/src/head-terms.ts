import type { SearchHeadTermConceptBucketConfig, SearchHeadTermProfileConfig } from './types.js';

const DIRECTORY_CONCEPT_PHRASES = ['directory', 'directories', 'listing', 'listings', 'classified', 'classifieds'];

const JOBS_CONCEPT_PHRASES = [
  'job board',
  'job boards',
  'job portal',
  'job portals',
  'recruitment',
  'recruiting',
  'hiring',
  'career',
  'careers',
  'jobs',
  'hr',
];

const MARKETPLACE_CONCEPT_BUCKETS = [
  {
    id: 'directory',
    phrases: DIRECTORY_CONCEPT_PHRASES,
    structuredPhrases: ['marketplace'],
  },
  {
    id: 'job-directory',
    phrases: [...JOBS_CONCEPT_PHRASES, ...DIRECTORY_CONCEPT_PHRASES],
    structuredPhrases: [...JOBS_CONCEPT_PHRASES, ...DIRECTORY_CONCEPT_PHRASES],
    requiredPhraseGroups: [JOBS_CONCEPT_PHRASES, DIRECTORY_CONCEPT_PHRASES],
  },
  {
    id: 'jobs',
    phrases: JOBS_CONCEPT_PHRASES,
  },
  {
    id: 'retail',
    phrases: [
      'retail',
      'e commerce',
      'ecommerce',
      'online store',
      'store',
      'shop',
      'vendor',
      'vendors',
      'catalog',
      'catalogue',
      'product',
      'products',
    ],
    structuredPhrases: ['marketplace'],
  },
  {
    id: 'services',
    phrases: [
      'service marketplace',
      'service',
      'services',
      'freelance',
      'freelancer',
      'talent',
      'expert',
      'experts',
      'booking',
    ],
    structuredPhrases: ['marketplace'],
  },
  {
    id: 'digital-products',
    phrases: ['digital product', 'digital products', 'download', 'downloads', 'creator', 'creators'],
    structuredPhrases: ['marketplace'],
  },
] satisfies SearchHeadTermConceptBucketConfig[];

const MARKETPLACE_CORROBORATION_PHRASES = [
  'marketplace',
  'directory',
  'directories',
  'listing',
  'listings',
  'classified',
  'classifieds',
  'multi vendor',
  'multi-vendor',
  'vendor',
  'vendors',
  'retail',
  'e commerce',
  'ecommerce',
  'store',
  'shop',
  'catalog',
  'catalogue',
];

export const DEFAULT_SEARCH_CONCEPT_FIELD_WEIGHTS = {
  name: 3,
  descriptionShort: 1,
  descriptionLong: 0.5,
  categoryGroups: 5,
  childCategories: 7,
  tags: 6,
} as const;

export const DEFAULT_SEARCH_HEAD_TERM_PROFILES: SearchHeadTermProfileConfig[] = [
  {
    id: 'marketplace',
    triggers: ['marketplace', 'marketplaces'],
    ftsPhrases: ['marketplace', 'directory', 'job portal', 'classifieds', 'multi-vendor', 'e-commerce'],
    taxonomyPhrases: ['marketplace', 'directory', 'job portal', 'classifieds', 'retail & e-commerce', 'e-commerce'],
    conceptBuckets: MARKETPLACE_CONCEPT_BUCKETS,
    corroborationPhrases: MARKETPLACE_CORROBORATION_PHRASES,
    corroborationPenaltyConcepts: ['jobs', 'job-directory'],
    protectedSlotConceptCaps: { 'job-directory': 1, jobs: 1 },
    protectedSlotCount: 8,
  },
  {
    id: 'directory',
    triggers: ['directory', 'directories'],
    ftsPhrases: ['directory', 'listing', 'classifieds', 'job portal', 'marketplace'],
    taxonomyPhrases: ['directory', 'classifieds', 'job portal', 'retail & e-commerce'],
    conceptBuckets: MARKETPLACE_CONCEPT_BUCKETS,
    corroborationPhrases: [...DIRECTORY_CONCEPT_PHRASES, 'marketplace'],
    corroborationPenaltyConcepts: ['jobs', 'job-directory'],
    protectedSlotConceptCaps: { 'job-directory': 0, jobs: 0 },
    protectedSlotCount: 8,
  },
  {
    id: 'job-board',
    triggers: ['job board', 'job boards'],
    ftsPhrases: ['job board', 'job portal', 'recruitment', 'hiring', 'career'],
    taxonomyPhrases: ['job portal', 'hr & hiring', 'recruitment', 'career'],
  },
  {
    id: 'multi-vendor',
    triggers: ['multi vendor', 'multi-vendor', 'multivendor'],
    ftsPhrases: ['multi-vendor', 'marketplace', 'directory', 'e-commerce'],
    taxonomyPhrases: ['marketplace', 'directory', 'retail & e-commerce', 'e-commerce'],
    conceptBuckets: MARKETPLACE_CONCEPT_BUCKETS,
  },
  {
    id: 'ecommerce',
    triggers: ['ecommerce', 'e-commerce', 'online store', 'online shop'],
    ftsPhrases: ['e-commerce', 'ecommerce', 'marketplace', 'store', 'shop'],
    taxonomyPhrases: ['retail & e-commerce', 'e-commerce', 'marketplace'],
    conceptBuckets: MARKETPLACE_CONCEPT_BUCKETS,
  },
];

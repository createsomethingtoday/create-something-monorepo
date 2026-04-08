import { DEFAULT_SEARCH_CONCEPT_FIELD_WEIGHTS, DEFAULT_SEARCH_HEAD_TERM_PROFILES } from './head-terms.js';
import type {
  Env,
  SearchHeadTermConceptBucketConfig,
  SearchHeadTermProfileConfig,
  SearchRankingConfig,
} from './types.js';

function cloneConceptBucket(bucket: SearchHeadTermConceptBucketConfig): SearchHeadTermConceptBucketConfig {
  return {
    id: bucket.id,
    phrases: [...bucket.phrases],
    structuredPhrases: bucket.structuredPhrases ? [...bucket.structuredPhrases] : undefined,
    requiredPhraseGroups: bucket.requiredPhraseGroups?.map((group) => [...group]),
  };
}

function cloneHeadTermProfile(profile: SearchHeadTermProfileConfig): SearchHeadTermProfileConfig {
  return {
    id: profile.id,
    triggers: [...profile.triggers],
    ftsPhrases: [...profile.ftsPhrases],
    taxonomyPhrases: [...profile.taxonomyPhrases],
    conceptBuckets: profile.conceptBuckets?.map(cloneConceptBucket),
    corroborationPhrases: profile.corroborationPhrases ? [...profile.corroborationPhrases] : undefined,
    corroborationPenaltyConcepts: profile.corroborationPenaltyConcepts ? [...profile.corroborationPenaltyConcepts] : undefined,
    protectedSlotConceptCaps: profile.protectedSlotConceptCaps ? { ...profile.protectedSlotConceptCaps } : undefined,
    protectedSlotCount: profile.protectedSlotCount,
  };
}

const DEFAULT_SEARCH_RANKING_CONFIG: SearchRankingConfig = {
  textWeights: {
    name: 9,
    descriptionShort: 2,
    descriptionLong: 0.1,
    categoryGroups: 5,
    childCategories: 12,
    styles: 1.3,
    tags: 0.8,
  },
  conceptFieldWeights: {
    name: DEFAULT_SEARCH_CONCEPT_FIELD_WEIGHTS.name,
    descriptionShort: DEFAULT_SEARCH_CONCEPT_FIELD_WEIGHTS.descriptionShort,
    descriptionLong: DEFAULT_SEARCH_CONCEPT_FIELD_WEIGHTS.descriptionLong,
    categoryGroups: DEFAULT_SEARCH_CONCEPT_FIELD_WEIGHTS.categoryGroups,
    childCategories: DEFAULT_SEARCH_CONCEPT_FIELD_WEIGHTS.childCategories,
    tags: DEFAULT_SEARCH_CONCEPT_FIELD_WEIGHTS.tags,
  },
  headTermProfiles: DEFAULT_SEARCH_HEAD_TERM_PROFILES.map(cloneHeadTermProfile),
  signalWeights: {
    text: 4.5,
    popularity: 0,
    views: 0.05,
    purchases: 1.15,
    conversionRate: 0.95,
    revenue: 0.7,
    freshness: 0.35,
    creatorTrackRecord: 0.3,
    creatorDiversity: 0.4,
    exactTitle: 0.85,
    categoryMatch: 2.5,
    intentCoverage: 1.2,
    querySaturation: 0.35,
  },
  controls: {
    longDescriptionMaxChars: 350,
    reciprocalRankOffset: 20,
    conversionRateSmoothingViews: 50,
    conversionRateSmoothingPurchases: 1,
    taxonomyPrecedenceMinQueryLength: 5,
    shortQueryMaxTokens: 1,
    shortQueryMaxChars: 12,
    shortQueryTextWeightMultiplier: 0.2,
    shortQueryExactTitleWeightMultiplier: 2,
    shortQueryCategoryWeightMultiplier: 0.35,
    purchaseSmoothingViews: 1200,
    purchaseSmoothingPrior: 0.5,
    revenueSmoothingViews: 1200,
    revenueSmoothingPrior: 25,
    freshnessHalfLifeDays: 45,
    querySaturationThreshold: 3,
    creatorDiversityRerankWindowSize: 72,
    creatorDiversityRerankMaxPages: 2,
    creatorDiversityRerankPenalty: 0.25,
    creatorDiversityRerankScoreTolerance: 0.2,
    headTermConceptRerankWindowSize: 96,
    headTermConceptRerankMaxPages: 2,
    headTermConceptRerankPenalty: 1,
    headTermConceptRerankScoreTolerance: 0.5,
    headTermConceptProtectedSlots: 5,
    headTermCorroborationPenalty: 1.25,
    creatorTrackRecordMinTemplates: 2,
    relaxedQueryMinTokens: 3,
    relaxedQueryMaxTokens: 6,
    relaxedQueryResultThreshold: 12,
  },
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function sanitizeNumber(value: unknown, fallback: number, minimum = 0, maximum = 100_000): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}

function sanitizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function sanitizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const sanitized = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return sanitized.length > 0 ? Array.from(new Set(sanitized)) : [...fallback];
}

function sanitizeNumberRecord(
  value: unknown,
  fallback: Record<string, number> | undefined,
  minimum = 0,
  maximum = 100_000,
): Record<string, number> | undefined {
  const object = asObject(value);
  if (!object) return fallback ? { ...fallback } : undefined;

  const sanitizedEntries = Object.entries(object)
    .map(([key, entry]) => [key.trim(), sanitizeNumber(entry, Number.NaN, minimum, maximum)] as const)
    .filter(([key, entry]) => key.length > 0 && Number.isFinite(entry));

  if (sanitizedEntries.length === 0) return fallback ? { ...fallback } : undefined;
  return Object.fromEntries(sanitizedEntries);
}

function sanitizeHeadTermConceptBucket(
  value: unknown,
  fallback?: SearchHeadTermConceptBucketConfig,
): SearchHeadTermConceptBucketConfig | null {
  const object = asObject(value);
  if (!object) return fallback ? cloneConceptBucket(fallback) : null;

  const id = sanitizeString(object.id, fallback?.id ?? '');
  if (!id) return fallback ? cloneConceptBucket(fallback) : null;

  return {
    id,
    phrases: sanitizeStringArray(object.phrases, fallback?.phrases ?? []),
    structuredPhrases: sanitizeStringArray(object.structuredPhrases, fallback?.structuredPhrases ?? []),
    requiredPhraseGroups: Array.isArray(object.requiredPhraseGroups)
      ? object.requiredPhraseGroups
          .map((group) => sanitizeStringArray(group, []))
          .filter((group) => group.length > 0)
      : fallback?.requiredPhraseGroups?.map((group) => [...group]),
  };
}

function sanitizeHeadTermConceptBuckets(
  value: unknown,
  fallback: SearchHeadTermConceptBucketConfig[] | undefined,
): SearchHeadTermConceptBucketConfig[] | undefined {
  if (!Array.isArray(value)) return fallback?.map(cloneConceptBucket);

  const fallbackBuckets = fallback?.map(cloneConceptBucket) ?? [];
  const byId = new Map(fallbackBuckets.map((bucket) => [bucket.id, bucket]));
  const order = fallbackBuckets.map((bucket) => bucket.id);

  for (const entry of value) {
    const object = asObject(entry);
    const rawId = sanitizeString(object?.id, '');
    const sanitized = sanitizeHeadTermConceptBucket(entry, rawId ? byId.get(rawId) : undefined);
    if (!sanitized) continue;
    byId.set(sanitized.id, sanitized);
    if (!order.includes(sanitized.id)) order.push(sanitized.id);
  }

  return order.map((id) => byId.get(id)).filter((bucket): bucket is SearchHeadTermConceptBucketConfig => Boolean(bucket));
}

function sanitizeHeadTermProfile(
  value: unknown,
  fallback?: SearchHeadTermProfileConfig,
): SearchHeadTermProfileConfig | null {
  const object = asObject(value);
  if (!object) return fallback ? cloneHeadTermProfile(fallback) : null;

  const id = sanitizeString(object.id, fallback?.id ?? '');
  if (!id) return fallback ? cloneHeadTermProfile(fallback) : null;

  return {
    id,
    triggers: sanitizeStringArray(object.triggers, fallback?.triggers ?? []),
    ftsPhrases: sanitizeStringArray(object.ftsPhrases, fallback?.ftsPhrases ?? []),
    taxonomyPhrases: sanitizeStringArray(object.taxonomyPhrases, fallback?.taxonomyPhrases ?? []),
    conceptBuckets: sanitizeHeadTermConceptBuckets(object.conceptBuckets, fallback?.conceptBuckets),
    corroborationPhrases: sanitizeStringArray(object.corroborationPhrases, fallback?.corroborationPhrases ?? []),
    corroborationPenaltyConcepts: sanitizeStringArray(
      object.corroborationPenaltyConcepts,
      fallback?.corroborationPenaltyConcepts ?? [],
    ),
    protectedSlotConceptCaps: sanitizeNumberRecord(object.protectedSlotConceptCaps, fallback?.protectedSlotConceptCaps),
    protectedSlotCount:
      typeof object.protectedSlotCount === 'number'
        ? sanitizeNumber(object.protectedSlotCount, fallback?.protectedSlotCount ?? 0, 1, 100)
        : fallback?.protectedSlotCount,
  };
}

function sanitizeHeadTermProfiles(
  value: unknown,
  fallback: SearchHeadTermProfileConfig[],
): SearchHeadTermProfileConfig[] {
  const fallbackProfiles = fallback.map(cloneHeadTermProfile);
  if (!Array.isArray(value)) return fallbackProfiles;

  const byId = new Map(fallbackProfiles.map((profile) => [profile.id, profile]));
  const order = fallbackProfiles.map((profile) => profile.id);

  for (const entry of value) {
    const object = asObject(entry);
    const rawId = sanitizeString(object?.id, '');
    const sanitized = sanitizeHeadTermProfile(entry, rawId ? byId.get(rawId) : undefined);
    if (!sanitized) continue;
    byId.set(sanitized.id, sanitized);
    if (!order.includes(sanitized.id)) order.push(sanitized.id);
  }

  return order
    .map((id) => byId.get(id))
    .filter((profile): profile is SearchHeadTermProfileConfig => Boolean(profile));
}

export function getSearchRankingConfig(env: Pick<Env, 'SEARCH_RANKING_CONFIG_JSON'>): SearchRankingConfig {
  const raw = env.SEARCH_RANKING_CONFIG_JSON?.trim();
  if (!raw) return DEFAULT_SEARCH_RANKING_CONFIG;

  try {
    const parsed = JSON.parse(raw) as unknown;
    const object = asObject(parsed);
    if (!object) return DEFAULT_SEARCH_RANKING_CONFIG;

    const textWeights = asObject(object.textWeights);
    const conceptFieldWeights = asObject(object.conceptFieldWeights);
    const signalWeights = asObject(object.signalWeights);
    const controls = asObject(object.controls);

    return {
      textWeights: {
        name: sanitizeNumber(textWeights?.name, DEFAULT_SEARCH_RANKING_CONFIG.textWeights.name),
        descriptionShort: sanitizeNumber(
          textWeights?.descriptionShort,
          DEFAULT_SEARCH_RANKING_CONFIG.textWeights.descriptionShort,
        ),
        descriptionLong: sanitizeNumber(
          textWeights?.descriptionLong,
          DEFAULT_SEARCH_RANKING_CONFIG.textWeights.descriptionLong,
        ),
        categoryGroups: sanitizeNumber(
          textWeights?.categoryGroups,
          DEFAULT_SEARCH_RANKING_CONFIG.textWeights.categoryGroups,
        ),
        childCategories: sanitizeNumber(
          textWeights?.childCategories,
          DEFAULT_SEARCH_RANKING_CONFIG.textWeights.childCategories,
        ),
        styles: sanitizeNumber(textWeights?.styles, DEFAULT_SEARCH_RANKING_CONFIG.textWeights.styles),
        tags: sanitizeNumber(textWeights?.tags, DEFAULT_SEARCH_RANKING_CONFIG.textWeights.tags),
      },
      conceptFieldWeights: {
        name: sanitizeNumber(
          conceptFieldWeights?.name,
          DEFAULT_SEARCH_RANKING_CONFIG.conceptFieldWeights.name,
        ),
        descriptionShort: sanitizeNumber(
          conceptFieldWeights?.descriptionShort,
          DEFAULT_SEARCH_RANKING_CONFIG.conceptFieldWeights.descriptionShort,
        ),
        descriptionLong: sanitizeNumber(
          conceptFieldWeights?.descriptionLong,
          DEFAULT_SEARCH_RANKING_CONFIG.conceptFieldWeights.descriptionLong,
        ),
        categoryGroups: sanitizeNumber(
          conceptFieldWeights?.categoryGroups,
          DEFAULT_SEARCH_RANKING_CONFIG.conceptFieldWeights.categoryGroups,
        ),
        childCategories: sanitizeNumber(
          conceptFieldWeights?.childCategories,
          DEFAULT_SEARCH_RANKING_CONFIG.conceptFieldWeights.childCategories,
        ),
        tags: sanitizeNumber(
          conceptFieldWeights?.tags,
          DEFAULT_SEARCH_RANKING_CONFIG.conceptFieldWeights.tags,
        ),
      },
      headTermProfiles: sanitizeHeadTermProfiles(
        object.headTermProfiles,
        DEFAULT_SEARCH_RANKING_CONFIG.headTermProfiles,
      ),
      signalWeights: {
        text: sanitizeNumber(signalWeights?.text, DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.text),
        popularity: sanitizeNumber(signalWeights?.popularity, DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.popularity),
        views: sanitizeNumber(signalWeights?.views, DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.views),
        purchases: sanitizeNumber(signalWeights?.purchases, DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.purchases),
        conversionRate: sanitizeNumber(
          signalWeights?.conversionRate,
          DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.conversionRate,
        ),
        revenue: sanitizeNumber(signalWeights?.revenue, DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.revenue),
        freshness: sanitizeNumber(signalWeights?.freshness, DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.freshness),
        creatorTrackRecord: sanitizeNumber(
          signalWeights?.creatorTrackRecord,
          DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.creatorTrackRecord,
        ),
        creatorDiversity: sanitizeNumber(
          signalWeights?.creatorDiversity,
          DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.creatorDiversity,
        ),
        exactTitle: sanitizeNumber(signalWeights?.exactTitle, DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.exactTitle),
        categoryMatch: sanitizeNumber(signalWeights?.categoryMatch, DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.categoryMatch),
        intentCoverage: sanitizeNumber(
          signalWeights?.intentCoverage,
          DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.intentCoverage,
        ),
        querySaturation: sanitizeNumber(
          signalWeights?.querySaturation,
          DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.querySaturation,
        ),
      },
      controls: {
        longDescriptionMaxChars: sanitizeNumber(
          controls?.longDescriptionMaxChars,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.longDescriptionMaxChars,
          10,
        ),
        reciprocalRankOffset: sanitizeNumber(
          controls?.reciprocalRankOffset,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.reciprocalRankOffset,
          0,
          10_000,
        ),
        conversionRateSmoothingViews: sanitizeNumber(
          controls?.conversionRateSmoothingViews,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.conversionRateSmoothingViews,
          0,
          10_000,
        ),
        conversionRateSmoothingPurchases: sanitizeNumber(
          controls?.conversionRateSmoothingPurchases,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.conversionRateSmoothingPurchases,
          0,
          1_000,
        ),
        taxonomyPrecedenceMinQueryLength: sanitizeNumber(
          controls?.taxonomyPrecedenceMinQueryLength,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.taxonomyPrecedenceMinQueryLength,
          1,
          100,
        ),
        shortQueryMaxTokens: sanitizeNumber(
          controls?.shortQueryMaxTokens,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.shortQueryMaxTokens,
          1,
          10,
        ),
        shortQueryMaxChars: sanitizeNumber(
          controls?.shortQueryMaxChars,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.shortQueryMaxChars,
          1,
          100,
        ),
        shortQueryTextWeightMultiplier: sanitizeNumber(
          controls?.shortQueryTextWeightMultiplier,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.shortQueryTextWeightMultiplier,
          0,
          20,
        ),
        shortQueryExactTitleWeightMultiplier: sanitizeNumber(
          controls?.shortQueryExactTitleWeightMultiplier,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.shortQueryExactTitleWeightMultiplier,
          0,
          20,
        ),
        shortQueryCategoryWeightMultiplier: sanitizeNumber(
          controls?.shortQueryCategoryWeightMultiplier,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.shortQueryCategoryWeightMultiplier,
          0,
          20,
        ),
        purchaseSmoothingViews: sanitizeNumber(
          controls?.purchaseSmoothingViews,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.purchaseSmoothingViews,
          1,
          100_000,
        ),
        purchaseSmoothingPrior: sanitizeNumber(
          controls?.purchaseSmoothingPrior,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.purchaseSmoothingPrior,
          0,
          1_000,
        ),
        revenueSmoothingViews: sanitizeNumber(
          controls?.revenueSmoothingViews,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.revenueSmoothingViews,
          1,
          100_000,
        ),
        revenueSmoothingPrior: sanitizeNumber(
          controls?.revenueSmoothingPrior,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.revenueSmoothingPrior,
          0,
          100_000,
        ),
        freshnessHalfLifeDays: sanitizeNumber(
          controls?.freshnessHalfLifeDays,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.freshnessHalfLifeDays,
          1,
          10_000,
        ),
        querySaturationThreshold: sanitizeNumber(
          controls?.querySaturationThreshold,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.querySaturationThreshold,
          0,
          100,
        ),
        creatorDiversityRerankWindowSize: sanitizeNumber(
          controls?.creatorDiversityRerankWindowSize,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.creatorDiversityRerankWindowSize,
          1,
          500,
        ),
        creatorDiversityRerankMaxPages: sanitizeNumber(
          controls?.creatorDiversityRerankMaxPages,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.creatorDiversityRerankMaxPages,
          1,
          20,
        ),
        creatorDiversityRerankPenalty: sanitizeNumber(
          controls?.creatorDiversityRerankPenalty,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.creatorDiversityRerankPenalty,
          0,
          100,
        ),
        creatorDiversityRerankScoreTolerance: sanitizeNumber(
          controls?.creatorDiversityRerankScoreTolerance,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.creatorDiversityRerankScoreTolerance,
          0,
          10,
        ),
        headTermConceptRerankWindowSize: sanitizeNumber(
          controls?.headTermConceptRerankWindowSize,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.headTermConceptRerankWindowSize,
          1,
          500,
        ),
        headTermConceptRerankMaxPages: sanitizeNumber(
          controls?.headTermConceptRerankMaxPages,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.headTermConceptRerankMaxPages,
          1,
          20,
        ),
        headTermConceptRerankPenalty: sanitizeNumber(
          controls?.headTermConceptRerankPenalty,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.headTermConceptRerankPenalty,
          0,
          100,
        ),
        headTermConceptRerankScoreTolerance: sanitizeNumber(
          controls?.headTermConceptRerankScoreTolerance,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.headTermConceptRerankScoreTolerance,
          0,
          10,
        ),
        headTermConceptProtectedSlots: sanitizeNumber(
          controls?.headTermConceptProtectedSlots,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.headTermConceptProtectedSlots,
          1,
          50,
        ),
        headTermCorroborationPenalty: sanitizeNumber(
          controls?.headTermCorroborationPenalty,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.headTermCorroborationPenalty,
          0,
          100,
        ),
        creatorTrackRecordMinTemplates: sanitizeNumber(
          controls?.creatorTrackRecordMinTemplates,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.creatorTrackRecordMinTemplates,
          1,
          100,
        ),
        relaxedQueryMinTokens: sanitizeNumber(
          controls?.relaxedQueryMinTokens,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.relaxedQueryMinTokens,
          2,
          20,
        ),
        relaxedQueryMaxTokens: sanitizeNumber(
          controls?.relaxedQueryMaxTokens,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.relaxedQueryMaxTokens,
          2,
          20,
        ),
        relaxedQueryResultThreshold: sanitizeNumber(
          controls?.relaxedQueryResultThreshold,
          DEFAULT_SEARCH_RANKING_CONFIG.controls.relaxedQueryResultThreshold,
          1,
          500,
        ),
      },
    };
  } catch {
    return DEFAULT_SEARCH_RANKING_CONFIG;
  }
}

export function truncateSearchText(input: string, maxChars: number): string {
  const normalized = input.trim();
  if (!normalized) return '';
  if (normalized.length <= maxChars) return normalized;

  const slice = normalized.slice(0, maxChars);
  const lastBoundary = slice.lastIndexOf(' ');
  if (lastBoundary >= Math.floor(maxChars * 0.7)) {
    return slice.slice(0, lastBoundary).trim();
  }

  return slice.trim();
}

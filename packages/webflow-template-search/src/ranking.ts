import type { Env, SearchRankingConfig } from './types.js';

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

export function getSearchRankingConfig(env: Pick<Env, 'SEARCH_RANKING_CONFIG_JSON'>): SearchRankingConfig {
  const raw = env.SEARCH_RANKING_CONFIG_JSON?.trim();
  if (!raw) return DEFAULT_SEARCH_RANKING_CONFIG;

  try {
    const parsed = JSON.parse(raw) as unknown;
    const object = asObject(parsed);
    if (!object) return DEFAULT_SEARCH_RANKING_CONFIG;

    const textWeights = asObject(object.textWeights);
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

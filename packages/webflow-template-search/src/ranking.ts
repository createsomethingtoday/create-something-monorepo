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
    exactTitle: 0.85,
    categoryMatch: 2.5,
  },
  controls: {
    longDescriptionMaxChars: 350,
    reciprocalRankOffset: 20,
    conversionRateSmoothingViews: 50,
    taxonomyPrecedenceMinQueryLength: 5,
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
        exactTitle: sanitizeNumber(signalWeights?.exactTitle, DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.exactTitle),
        categoryMatch: sanitizeNumber(signalWeights?.categoryMatch, DEFAULT_SEARCH_RANKING_CONFIG.signalWeights.categoryMatch),
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
      taxonomyPrecedenceMinQueryLength: sanitizeNumber(
        controls?.taxonomyPrecedenceMinQueryLength,
        DEFAULT_SEARCH_RANKING_CONFIG.controls.taxonomyPrecedenceMinQueryLength,
        1,
        100,
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

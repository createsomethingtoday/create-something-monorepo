import { lookupPublicSlugMap, resolveAlias } from './db.js';
import { getSearchRankingConfig } from './ranking.js';
import type {
  DocumentCountRow,
  DocumentRow,
  Env,
  FacetStyleRow,
  FacetTypeRow,
  PillRow,
  SearchRankingConfig,
  SearchItem,
  SearchParams,
  SearchResponsePayload,
  TemplateSort,
} from './types.js';
import { parseJsonArray } from './utils.js';

const QUERY_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'best',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'site',
  'sites',
  'template',
  'templates',
  'the',
  'to',
  'top',
  'webflow',
  'website',
  'websites',
  'with',
]);

function placeholderList(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

function tokenizeQuery(input: string): string[] {
  return input.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function filterQueryTokens(tokens: string[]): string[] {
  const filtered = tokens.filter((token) => !QUERY_STOPWORDS.has(token));
  return filtered.length > 0 ? filtered : tokens;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildSingularTokenVariant(token: string): string | null {
  if (token.length < 5) return null;
  if (token.endsWith('ies') && token.length > 5) return `${token.slice(0, -3)}y`;
  if (/(ches|shes|sses|xes|zes)$/.test(token) && token.length > 5) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss') && !token.endsWith('us') && !token.endsWith('is')) {
    return token.slice(0, -1);
  }
  return null;
}

function buildPluralTokenVariant(token: string): string | null {
  if (token.length < 5 || token.endsWith('s')) return null;
  if (token.endsWith('y') && !/[aeiou]y$/.test(token)) return `${token.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(token)) return `${token}es`;
  return `${token}s`;
}

function buildTokenVariants(token: string): string[] {
  return uniqueStrings([token, buildSingularTokenVariant(token) ?? '', buildPluralTokenVariant(token) ?? '']);
}

function buildFtsTokenClause(token: string): string {
  const variants = buildTokenVariants(token).map((variant) => `${variant}*`);
  return variants.length === 1 ? variants[0]! : `(${variants.join(' OR ')})`;
}

function buildStrictFtsQueryFromTokens(tokens: string[]): string {
  if (tokens.length === 0) return '""';
  return tokens.map((token) => buildFtsTokenClause(token)).join(' AND ');
}

function buildRelaxedFtsQueryFromTokens(tokens: string[]): string {
  if (tokens.length <= 2) return buildStrictFtsQueryFromTokens(tokens);

  const subsetQueries = uniqueStrings(
    tokens.map((_, excludedIndex) => buildStrictFtsQueryFromTokens(tokens.filter((__, index) => index !== excludedIndex))),
  );

  if (subsetQueries.length === 0) return buildStrictFtsQueryFromTokens(tokens);
  return subsetQueries.length === 1 ? subsetQueries[0]! : subsetQueries.map((query) => `(${query})`).join(' OR ');
}

function buildFtsQuery(input: string): string {
  const tokens = filterQueryTokens(tokenizeQuery(input));
  return buildStrictFtsQueryFromTokens(tokens);
}

function sortClause(sort: TemplateSort): string {
  switch (sort) {
    case 'newest':
      return "COALESCE(d.published_date, '') DESC, COALESCE(d.popularity_score, 0) DESC, d.id ASC";
    case 'price_asc':
      return "CASE WHEN d.price IS NULL THEN 1 ELSE 0 END ASC, COALESCE(d.price, 0) ASC, COALESCE(d.popularity_score, 0) DESC, d.id ASC";
    case 'price_desc':
      return "CASE WHEN d.price IS NULL THEN 1 ELSE 0 END ASC, COALESCE(d.price, 0) DESC, COALESCE(d.popularity_score, 0) DESC, d.id ASC";
    case 'popular':
    default:
      return "COALESCE(d.cumulative_purchases, 0) DESC, COALESCE(d.cumulative_revenue, 0) DESC, COALESCE(d.unique_viewers, 0) DESC, COALESCE(d.popularity_score, 0) DESC, COALESCE(d.published_date, '') DESC, d.id ASC";
  }
}

interface FilterOptions {
  excludeStyles?: boolean;
  excludeTypes?: boolean;
  excludeChildCategory?: boolean;
  ftsQuery?: string | null;
}

interface SqlParts {
  fromClause: string;
  whereClause: string;
  binds: unknown[];
  queryMode: boolean;
}

interface QueryIntentProfile {
  isShortTitleQuery: boolean;
  preferTaxonomyBuckets: boolean;
  textWeight: number;
  exactTitleWeight: number;
  categoryMatchWeight: number;
  intentCoverageWeight: number;
}

interface DocumentQueryWindow {
  queryOffset: number;
  queryLimit: number;
  sliceOffset: number;
  applyPageLocalCreatorDiversity: boolean;
}

async function resolveAliases(env: Env, params: SearchParams): Promise<SearchParams> {
  return {
    ...params,
    childCategorySlug: await resolveAlias(env.DB, 'child_category', params.childCategorySlug),
  };
}

function buildSqlParts(params: SearchParams, options: FilterOptions = {}): SqlParts {
  const binds: unknown[] = [];
  const clauses: string[] = [];
  let fromClause = 'FROM template_documents d';
  let queryMode = false;

  if (params.q) {
    const ftsQuery = options.ftsQuery ?? buildFtsQuery(params.q);
    fromClause += ' JOIN template_documents_fts ON template_documents_fts.template_document_id = d.id';
    clauses.push('template_documents_fts MATCH ?');
    binds.push(ftsQuery);
    queryMode = true;
  }

  if (params.scope === 'featured') clauses.push('d.is_featured = 1');
  if (params.scope === 'free') clauses.push('d.is_free = 1');
  if (params.scope === 'landing_pages') clauses.push('d.is_landing_page = 1');
  if (params.freeOnly) clauses.push('d.is_free = 1');

  if (params.categoryGroupSlug) {
    clauses.push('EXISTS (SELECT 1 FROM json_each(d.category_group_slugs_json) WHERE json_each.value = ?)');
    binds.push(params.categoryGroupSlug);
  }

  if (params.childCategorySlug && !options.excludeChildCategory) {
    clauses.push(
      'EXISTS (SELECT 1 FROM template_child_categories tcc WHERE tcc.template_document_id = d.id AND tcc.child_category_slug = ?)',
    );
    binds.push(params.childCategorySlug);
  }

  if (!options.excludeStyles && params.styles.length > 0) {
    clauses.push(
      `EXISTS (SELECT 1 FROM template_styles ts WHERE ts.template_document_id = d.id AND ts.style_slug IN (${placeholderList(params.styles.length)}))`,
    );
    binds.push(...params.styles);
  }

  if (!options.excludeTypes && params.types.length > 0) {
    clauses.push(`d.template_type IN (${placeholderList(params.types.length)})`);
    binds.push(...params.types);
  }

  return {
    fromClause,
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    binds,
    queryMode,
  };
}

function queryOrderClause(params: SearchParams, queryMode: boolean): string {
  return queryMode ? `text_rank ASC, query_saturation ASC, ${sortClause(params.sort)}` : sortClause(params.sort);
}

function buildPresenceBucketExpression(column: string): string {
  return `CASE WHEN COALESCE(${column}, 0) > 0 THEN 1 ELSE 0 END`;
}

function queryBucketOrderClause(queryMode: boolean, queryIntent: QueryIntentProfile): string {
  if (!queryMode) return '';
  const buckets: string[] = [`${buildPresenceBucketExpression('exact_title_match')} DESC`];
  if (queryIntent.preferTaxonomyBuckets) buckets.push(`${buildPresenceBucketExpression('taxonomy_query_match')} DESC`);
  if (queryIntent.intentCoverageWeight > 0) buckets.push('intent_query_coverage DESC');
  buckets.push('name_query_match DESC');
  return buckets.length > 0 ? `${buckets.join(', ')}, ` : '';
}

function sqlNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : '0';
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function buildQueryLikePattern(query: string | null): string | null {
  const normalized = query?.trim().toLowerCase();
  if (!normalized) return null;
  return `%${escapeLikePattern(normalized)}%`;
}

function buildQueryPrefixPattern(query: string): string {
  return `${escapeLikePattern(query)}%`;
}

function normalizeQueryWhitespace(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

function buildWholeQueryVariants(query: string): string[] {
  const normalized = normalizeQueryWhitespace(query.toLowerCase());
  if (!normalized) return [];

  const tokens = filterQueryTokens(tokenizeQuery(normalized));
  if (tokens.length === 0) return [];
  if (tokens.length !== 1) {
    return [tokens.join(' ')];
  }

  return buildTokenVariants(tokens[0]!);
}

function buildQueryWordPattern(query: string): string {
  return `% ${escapeLikePattern(normalizeQueryWhitespace(query))} %`;
}

function buildAnyLikeCondition(column: string, count: number): string {
  if (count <= 0) return '0';
  const term = `lower(COALESCE(${column}, '')) LIKE ? ESCAPE '\\'`;
  return count === 1 ? term : `(${Array.from({ length: count }, () => term).join(' OR ')})`;
}

function buildAnyEqualsCondition(column: string, count: number): string {
  if (count <= 0) return '0';
  const term = `lower(COALESCE(${column}, '')) = ?`;
  return count === 1 ? term : `(${Array.from({ length: count }, () => term).join(' OR ')})`;
}

function buildTokenCoverageExpression(column: string, tokenPatternSets: string[][], matchedTokenWeight = 1): string {
  if (tokenPatternSets.length === 0) return '0';
  return tokenPatternSets
    .map((patterns) => `CASE WHEN ${buildAnyLikeCondition(column, patterns.length)} THEN ${sqlNumber(matchedTokenWeight)} ELSE 0 END`)
    .join(' + ');
}

function buildDistinctTokenCoverageExpression(columns: string[], tokenPatternSets: string[][], matchedTokenWeight = 1): string {
  if (columns.length === 0 || tokenPatternSets.length === 0) return '0';
  return tokenPatternSets
    .map((patterns) => {
      const conditions = columns.map((column) => buildAnyLikeCondition(column, patterns.length));
      return `CASE WHEN ${conditions.length === 1 ? conditions[0]! : `(${conditions.join(' OR ')})`} THEN ${sqlNumber(matchedTokenWeight)} ELSE 0 END`;
    })
    .join(' + ');
}

function buildQueryOccurrenceExpression(column: string, queryLength: number): string {
  return `(
    (length(lower(COALESCE(${column}, ''))) - length(replace(lower(COALESCE(${column}, '')), ?, ''))) * 1.0
    / ${sqlNumber(queryLength)}
  )`;
}

function buildNormalizedTitleExpression(column: string): string {
  return `' ' || trim(replace(replace(replace(replace(lower(${column}), '&', ' '), '-', ' '), '/', ' '), '''', '')) || ' '`;
}

function buildQueryIntentProfile(query: string, config: SearchRankingConfig): QueryIntentProfile {
  const normalizedQuery = normalizeQueryWhitespace(query.toLowerCase());
  const tokens = filterQueryTokens(tokenizeQuery(normalizedQuery));
  const queryFocus = tokens.join(' ');
  const isShortTitleQuery =
    tokens.length > 0 &&
    tokens.length <= config.controls.shortQueryMaxTokens &&
    queryFocus.length <= config.controls.shortQueryMaxChars;

  return {
    isShortTitleQuery,
    preferTaxonomyBuckets:
      !isShortTitleQuery &&
      (queryFocus.includes(' ') || queryFocus.length >= config.controls.taxonomyPrecedenceMinQueryLength),
    textWeight:
      config.signalWeights.text * (isShortTitleQuery ? config.controls.shortQueryTextWeightMultiplier : 1),
    exactTitleWeight:
      config.signalWeights.exactTitle *
      (isShortTitleQuery ? config.controls.shortQueryExactTitleWeightMultiplier : 1),
    categoryMatchWeight:
      config.signalWeights.categoryMatch *
      (isShortTitleQuery ? config.controls.shortQueryCategoryWeightMultiplier : 1),
    intentCoverageWeight: tokens.length > 1 ? config.signalWeights.intentCoverage : 0,
  };
}

function buildBm25Expression(config: SearchRankingConfig): string {
  const { textWeights } = config;
  return `bm25(template_documents_fts, ${sqlNumber(textWeights.name)}, ${sqlNumber(textWeights.descriptionShort)}, ${sqlNumber(
    textWeights.descriptionLong,
  )}, ${sqlNumber(textWeights.categoryGroups)}, ${sqlNumber(textWeights.childCategories)}, ${sqlNumber(
    textWeights.styles,
  )}, ${sqlNumber(textWeights.tags)})`;
}

function reciprocalRankExpression(weight: number, rankColumn: string, offset: number): string {
  if (weight <= 0) return '0';
  return `${sqlNumber(weight)} * (1.0 / (${rankColumn} + ${sqlNumber(offset)}))`;
}

function buildConversionRateExpression(config: SearchRankingConfig, valuePrefix: string): string {
  return `(
    (COALESCE(${valuePrefix}.cumulative_purchases, 0) + ${sqlNumber(config.controls.conversionRateSmoothingPurchases)}) * 1.0
    / (COALESCE(${valuePrefix}.unique_viewers, 0) + ${sqlNumber(config.controls.conversionRateSmoothingViews)})
  )`;
}

function buildSmoothedPurchaseExpression(config: SearchRankingConfig, valuePrefix: string): string {
  return `(
    (COALESCE(${valuePrefix}.cumulative_purchases, 0) + ${sqlNumber(config.controls.purchaseSmoothingPrior)}) * 1.0
    / (1.0 + (COALESCE(${valuePrefix}.unique_viewers, 0) * 1.0 / ${sqlNumber(config.controls.purchaseSmoothingViews)}))
  )`;
}

function buildSmoothedRevenueExpression(config: SearchRankingConfig, valuePrefix: string): string {
  return `(
    (COALESCE(${valuePrefix}.cumulative_revenue, 0) + ${sqlNumber(config.controls.revenueSmoothingPrior)}) * 1.0
    / (1.0 + (COALESCE(${valuePrefix}.unique_viewers, 0) * 1.0 / ${sqlNumber(config.controls.revenueSmoothingViews)}))
  )`;
}

function buildFreshnessExpression(config: SearchRankingConfig, valuePrefix: string): string {
  return `CASE
    WHEN COALESCE(${valuePrefix}.published_date, '') = '' THEN 0
    ELSE 1.0 / (
      1.0 + (
        MAX(0, julianday('now') - julianday(${valuePrefix}.published_date))
        / ${sqlNumber(config.controls.freshnessHalfLifeDays)}
      )
    )
  END`;
}

function buildCreatorPartitionExpression(valuePrefix: string): string {
  return `CASE
    WHEN trim(COALESCE(${valuePrefix}.creator_name, '')) = '' THEN ${valuePrefix}.id
    ELSE lower(trim(${valuePrefix}.creator_name))
  END`;
}

function buildNormalizedCreatorKeyExpression(valuePrefix: string): string {
  return `CASE
    WHEN trim(COALESCE(${valuePrefix}.creator_name, '')) = '' THEN NULL
    ELSE lower(trim(${valuePrefix}.creator_name))
  END`;
}

function buildQuerySaturationExpression(queryOccurrenceExpression: string, config: SearchRankingConfig): string {
  return `MAX(0, ${queryOccurrenceExpression} - ${sqlNumber(config.controls.querySaturationThreshold)})`;
}

function buildCreatorDiversityOrderClause(
  queryMode: boolean,
  preferTaxonomy: boolean,
  includeIntentCoverage: boolean,
  valuePrefix: string,
  conversionRateExpression: string,
  smoothedPurchaseExpression: string,
  smoothedRevenueExpression: string,
): string {
  const parts: string[] = [];
  if (queryMode) parts.push(`COALESCE(${valuePrefix}.exact_title_match, 0) DESC`);
  if (queryMode && preferTaxonomy) parts.push(`COALESCE(${valuePrefix}.taxonomy_query_match, 0) DESC`);
  if (queryMode && includeIntentCoverage) parts.push(`COALESCE(${valuePrefix}.intent_query_coverage, 0) DESC`);
  if (queryMode) {
    parts.push(
      `COALESCE(${valuePrefix}.name_query_match, 0) DESC`,
      `COALESCE(${valuePrefix}.query_saturation, 0) ASC`,
      `COALESCE(${valuePrefix}.text_rank, 1000000000) ASC`,
    );
  }
  parts.push(
    `${smoothedPurchaseExpression} DESC`,
    `${smoothedRevenueExpression} DESC`,
    `${conversionRateExpression} DESC`,
    `COALESCE(${valuePrefix}.unique_viewers, 0) DESC`,
    `COALESCE(${valuePrefix}.popularity_score, 0) DESC`,
    `COALESCE(${valuePrefix}.published_date, '') DESC`,
    `${valuePrefix}.id ASC`,
  );
  return parts.join(', ');
}

function buildDocumentQueryWindow(params: SearchParams, config: SearchRankingConfig): DocumentQueryWindow {
  const offset = (params.page - 1) * params.pageSize;
  const shouldApplyPageLocalCreatorDiversity =
    params.sort === 'popular' &&
    config.signalWeights.creatorDiversity > 0 &&
    params.page <= config.controls.creatorDiversityRerankMaxPages;

  if (!shouldApplyPageLocalCreatorDiversity) {
    return {
      queryOffset: offset,
      queryLimit: params.pageSize,
      sliceOffset: 0,
      applyPageLocalCreatorDiversity: false,
    };
  }

  const queryLimit = Math.max(
    params.page * params.pageSize,
    config.controls.creatorDiversityRerankWindowSize,
  );

  return {
    queryOffset: 0,
    queryLimit,
    sliceOffset: offset,
    applyPageLocalCreatorDiversity: true,
  };
}

function shouldUseRelaxedFtsQuery(
  queryTokens: string[],
  totalCount: number,
  config: SearchRankingConfig,
): boolean {
  return (
    queryTokens.length >= config.controls.relaxedQueryMinTokens &&
    queryTokens.length <= config.controls.relaxedQueryMaxTokens &&
    totalCount < config.controls.relaxedQueryResultThreshold
  );
}

function getCreatorDiversityKey(row: DocumentRow): string {
  const creatorName = row.creator_name?.trim().toLowerCase();
  return creatorName && creatorName.length > 0 ? creatorName : row.id;
}

function getPageLocalBucketKey(row: DocumentRow, queryIntent: QueryIntentProfile, queryMode: boolean): string {
  if (!queryMode) return 'browse';

  const exactTitle = row.exact_title_match && row.exact_title_match > 0 ? 1 : 0;
  const taxonomyMatch =
    queryIntent.preferTaxonomyBuckets && row.taxonomy_query_match && row.taxonomy_query_match > 0 ? 1 : 0;
  const nameMatch = row.name_query_match && row.name_query_match > 0 ? 1 : 0;

  return `${exactTitle}:${taxonomyMatch}:${nameMatch}`;
}

function getBaseDiversificationScore(row: DocumentRow, index: number): number {
  return typeof row.blended_rank === 'number' && Number.isFinite(row.blended_rank)
    ? row.blended_rank
    : 1 / (index + 1);
}

function rerankRowsForPageLocalCreatorDiversity(
  rows: DocumentRow[],
  params: SearchParams,
  queryIntent: QueryIntentProfile,
  config: SearchRankingConfig,
  sliceOffset: number,
): DocumentRow[] {
  if (rows.length <= 1) return rows.slice(sliceOffset, sliceOffset + params.pageSize);

  const visibleCount = rows.length;
  const selectedRows: DocumentRow[] = [];
  let cursor = 0;

  while (cursor < visibleCount) {
    const bucketKey = getPageLocalBucketKey(rows[cursor]!, queryIntent, Boolean(params.q));
    const bucketRows: Array<{ row: DocumentRow; baseScore: number; originalIndex: number }> = [];

    while (cursor < visibleCount && getPageLocalBucketKey(rows[cursor]!, queryIntent, Boolean(params.q)) === bucketKey) {
      bucketRows.push({
        row: rows[cursor]!,
        baseScore: getBaseDiversificationScore(rows[cursor]!, cursor),
        originalIndex: cursor,
      });
      cursor += 1;
    }

    const creatorCounts = new Map<string, number>();
    const remaining = bucketRows.slice();

    while (remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = Number.NEGATIVE_INFINITY;

      for (let index = 0; index < remaining.length; index += 1) {
        const candidate = remaining[index]!;
        const creatorKey = getCreatorDiversityKey(candidate.row);
        const repeatCount = creatorCounts.get(creatorKey) ?? 0;
        let adjustedScore = candidate.baseScore;

        if (repeatCount > 0) {
          const bestDifferentCreator = remaining.reduce<{
            baseScore: number;
            row: DocumentRow | null;
          }>(
            (best, entry) => {
              if (getCreatorDiversityKey(entry.row) === creatorKey) return best;
              if (entry.baseScore > best.baseScore) {
                return { baseScore: entry.baseScore, row: entry.row };
              }
              return best;
            },
            { baseScore: Number.NEGATIVE_INFINITY, row: null },
          );

          const competingPurchases = bestDifferentCreator.row?.cumulative_purchases ?? 0;
          const competingRevenue = bestDifferentCreator.row?.cumulative_revenue ?? 0;
          const candidatePurchases = candidate.row.cumulative_purchases ?? 0;
          const candidateRevenue = candidate.row.cumulative_revenue ?? 0;
          const isClearlyStronger =
            (candidatePurchases > 0 &&
              candidatePurchases >= competingPurchases * (1 + config.controls.creatorDiversityRerankScoreTolerance)) ||
            (candidateRevenue > 0 &&
              candidateRevenue >= competingRevenue * (1 + config.controls.creatorDiversityRerankScoreTolerance));

          const shouldApplyPenalty =
            Number.isFinite(bestDifferentCreator.baseScore) &&
            !isClearlyStronger &&
            candidate.baseScore <=
              bestDifferentCreator.baseScore * (1 + config.controls.creatorDiversityRerankScoreTolerance);

          if (shouldApplyPenalty) {
            adjustedScore = candidate.baseScore / (1 + repeatCount * config.controls.creatorDiversityRerankPenalty);
          }
        }

        if (
          adjustedScore > bestScore ||
          (adjustedScore === bestScore && candidate.originalIndex < remaining[bestIndex]!.originalIndex)
        ) {
          bestScore = adjustedScore;
          bestIndex = index;
        }
      }

      const [chosen] = remaining.splice(bestIndex, 1);
      if (!chosen) break;
      const creatorKey = getCreatorDiversityKey(chosen.row);
      creatorCounts.set(creatorKey, (creatorCounts.get(creatorKey) ?? 0) + 1);
      selectedRows.push(chosen.row);
    }
  }

  return selectedRows.slice(sliceOffset, sliceOffset + params.pageSize);
}

function buildPopularScoreExpression(
  config: SearchRankingConfig,
  queryMode: boolean,
  queryIntent: QueryIntentProfile,
): string {
  const offset = config.controls.reciprocalRankOffset;
  const parts = [
    queryMode ? reciprocalRankExpression(queryIntent.textWeight, 'ranked.text_rank_position', offset) : '0',
    reciprocalRankExpression(config.signalWeights.popularity, 'ranked.popularity_rank_position', offset),
    reciprocalRankExpression(config.signalWeights.views, 'ranked.views_rank_position', offset),
    reciprocalRankExpression(config.signalWeights.purchases, 'ranked.purchases_rank_position', offset),
    reciprocalRankExpression(config.signalWeights.conversionRate, 'ranked.conversion_rate_rank_position', offset),
    reciprocalRankExpression(config.signalWeights.revenue, 'ranked.revenue_rank_position', offset),
    reciprocalRankExpression(config.signalWeights.freshness, 'ranked.freshness_rank_position', offset),
    reciprocalRankExpression(config.signalWeights.creatorTrackRecord, 'ranked.creator_track_record_rank_position', offset),
    reciprocalRankExpression(config.signalWeights.creatorDiversity, 'ranked.creator_diversity_rank_position', offset),
    queryMode ? reciprocalRankExpression(queryIntent.exactTitleWeight, 'ranked.exact_title_rank_position', offset) : '0',
    queryMode ? reciprocalRankExpression(queryIntent.categoryMatchWeight, 'ranked.category_match_rank_position', offset) : '0',
    queryMode ? reciprocalRankExpression(queryIntent.intentCoverageWeight, 'ranked.intent_coverage_rank_position', offset) : '0',
    queryMode ? reciprocalRankExpression(config.signalWeights.querySaturation, 'ranked.query_saturation_rank_position', offset) : '0',
  ];

  const totalWeight =
    (queryMode ? queryIntent.textWeight : 0) +
    config.signalWeights.popularity +
    config.signalWeights.views +
    config.signalWeights.purchases +
    config.signalWeights.conversionRate +
    config.signalWeights.revenue +
    config.signalWeights.freshness +
    config.signalWeights.creatorTrackRecord +
    config.signalWeights.creatorDiversity +
    (queryMode ? queryIntent.exactTitleWeight : 0) +
    (queryMode ? queryIntent.categoryMatchWeight : 0) +
    (queryMode ? queryIntent.intentCoverageWeight : 0) +
    (queryMode ? config.signalWeights.querySaturation : 0);

  if (totalWeight <= 0) return '0';
  return `(${parts.join(' + ')}) / ${sqlNumber(totalWeight)}`;
}

async function loadDocumentRows(
  env: Env,
  sqlParts: SqlParts,
  params: SearchParams,
  queryWindow: DocumentQueryWindow,
  rankingConfig: SearchRankingConfig,
): Promise<{ results: DocumentRow[] }> {
  const rawNormalizedQuery = normalizeQueryWhitespace((params.q ?? '').toLowerCase());
  const normalizedQueryTokens = filterQueryTokens(tokenizeQuery(rawNormalizedQuery));
  const normalizedQuery = normalizedQueryTokens.join(' ');
  const queryTerms = buildWholeQueryVariants(rawNormalizedQuery);
  const queryLikePatterns = queryTerms
    .map((term) => buildQueryLikePattern(term))
    .filter((value): value is string => Boolean(value));
  const queryTokenLikePatternSets = normalizedQueryTokens
    .map((token) => buildTokenVariants(token))
    .map((variants) =>
      variants.map((variant) => buildQueryLikePattern(variant)).filter((value): value is string => Boolean(value)),
    );
  const queryPrefixPatterns = queryTerms.map((term) => buildQueryPrefixPattern(term));
  const queryWordPatterns = queryTerms.map((term) => buildQueryWordPattern(term));
  const queryHasText = normalizedQuery.length > 0;
  const queryIntent = buildQueryIntentProfile(rawNormalizedQuery, rankingConfig);
  const descriptionQueryOccurrenceExpression = queryHasText
    ? `(
        ${buildQueryOccurrenceExpression('d.description_short', normalizedQuery.length)}
        + ${buildQueryOccurrenceExpression('d.description_long_text', normalizedQuery.length)}
      )`
    : '0';
  const querySaturationExpression = queryHasText
    ? buildQuerySaturationExpression(descriptionQueryOccurrenceExpression, rankingConfig)
    : '0';
  const nameQueryMatchExpression = queryTokenLikePatternSets.length > 0
    ? buildTokenCoverageExpression('d.name', queryTokenLikePatternSets)
    : '0';
  const taxonomyQueryMatchExpression = queryTokenLikePatternSets.length > 0
    ? `(
        ${buildTokenCoverageExpression('d.category_groups_text', queryTokenLikePatternSets)}
        + ${buildTokenCoverageExpression('d.child_categories_text', queryTokenLikePatternSets, 2)}
      )`
    : '0';
  const intentQueryCoverageExpression = queryTokenLikePatternSets.length > 0
    ? buildDistinctTokenCoverageExpression(
        ['d.name', 'd.category_groups_text', 'd.child_categories_text'],
        queryTokenLikePatternSets,
      )
    : '0';
  const normalizedTitleExpression = buildNormalizedTitleExpression('d.name');
  const exactTitleMatchExpression = queryHasText
    ? `CASE
        WHEN ${buildAnyEqualsCondition('d.name', queryTerms.length)} THEN 4
        WHEN ${buildAnyLikeCondition('d.name', queryPrefixPatterns.length)} THEN 3
        WHEN ${buildAnyLikeCondition(normalizedTitleExpression, queryWordPatterns.length)} THEN 2
        WHEN ${buildAnyLikeCondition('d.name', queryLikePatterns.length)} THEN 1
        ELSE 0
      END`
    : '0';
  const queryMatchBinds: string[] = [];
  if (queryTokenLikePatternSets.length > 0) {
    const flatTokenPatterns = queryTokenLikePatternSets.flat();
    queryMatchBinds.push(
      ...flatTokenPatterns,
      ...flatTokenPatterns,
      ...flatTokenPatterns,
    );
  }
  if (queryHasText) {
    const intentCoverageTokenPatterns = queryTokenLikePatternSets.flatMap((patterns) => [
      ...patterns,
      ...patterns,
      ...patterns,
    ]);
    queryMatchBinds.push(
      ...queryTerms,
      ...queryPrefixPatterns,
      ...queryWordPatterns,
      ...queryLikePatterns,
      ...intentCoverageTokenPatterns,
      normalizedQuery,
      normalizedQuery,
    );
  }
  const bucketOrderClause = queryBucketOrderClause(sqlParts.queryMode, queryIntent);

  if (params.sort !== 'popular') {
    const textRankExpression = sqlParts.queryMode ? buildBm25Expression(rankingConfig) : 'NULL';
    return env.DB
      .prepare(`
        SELECT
          d.*,
          ${nameQueryMatchExpression} AS name_query_match,
          ${taxonomyQueryMatchExpression} AS taxonomy_query_match,
          ${exactTitleMatchExpression} AS exact_title_match,
          ${intentQueryCoverageExpression} AS intent_query_coverage,
          ${querySaturationExpression} AS query_saturation,
        ${textRankExpression} AS text_rank
        ${sqlParts.fromClause}
        ${sqlParts.whereClause}
        ORDER BY ${bucketOrderClause}${queryOrderClause(params, sqlParts.queryMode)}
        LIMIT ? OFFSET ?
      `)
      .bind(...queryMatchBinds, ...sqlParts.binds, queryWindow.queryLimit, queryWindow.queryOffset)
      .all<DocumentRow>();
  }

  const textRankExpression = sqlParts.queryMode ? buildBm25Expression(rankingConfig) : 'NULL';
  const popularScoreExpression = buildPopularScoreExpression(rankingConfig, sqlParts.queryMode, queryIntent);
  const conversionRateExpression = buildConversionRateExpression(rankingConfig, 'filtered');
  const smoothedPurchaseExpression = buildSmoothedPurchaseExpression(rankingConfig, 'filtered');
  const smoothedRevenueExpression = buildSmoothedRevenueExpression(rankingConfig, 'filtered');
  const freshnessExpression = buildFreshnessExpression(rankingConfig, 'filtered');
  const creatorPartitionExpression = buildCreatorPartitionExpression('filtered');
  const creatorStatsSmoothedPurchaseExpression = buildSmoothedPurchaseExpression(rankingConfig, 'creator_docs');
  const creatorDiversityOrderClause = buildCreatorDiversityOrderClause(
    sqlParts.queryMode,
    queryIntent.preferTaxonomyBuckets,
    queryIntent.intentCoverageWeight > 0,
    'filtered',
    conversionRateExpression,
    smoothedPurchaseExpression,
    smoothedRevenueExpression,
  );

  return env.DB
    .prepare(`
      WITH creator_stats AS (
        SELECT
          ${buildNormalizedCreatorKeyExpression('creator_docs')} AS creator_key,
          COUNT(*) AS creator_template_count,
          AVG(${creatorStatsSmoothedPurchaseExpression}) AS creator_avg_smoothed_purchase
        FROM template_documents creator_docs
        WHERE trim(COALESCE(creator_docs.creator_name, '')) != ''
        GROUP BY creator_key
      ),
      filtered AS (
        SELECT
          d.*,
        ${nameQueryMatchExpression} AS name_query_match,
        ${taxonomyQueryMatchExpression} AS taxonomy_query_match,
        ${exactTitleMatchExpression} AS exact_title_match,
        ${intentQueryCoverageExpression} AS intent_query_coverage,
        ${querySaturationExpression} AS query_saturation,
        CASE
          WHEN COALESCE(creator_stats.creator_template_count, 0) >= ${sqlNumber(rankingConfig.controls.creatorTrackRecordMinTemplates)}
          THEN COALESCE(creator_stats.creator_avg_smoothed_purchase, 0)
          ELSE 0
        END AS creator_track_record_score,
        ${textRankExpression} AS text_rank
        ${sqlParts.fromClause}
        LEFT JOIN creator_stats ON creator_stats.creator_key = ${buildNormalizedCreatorKeyExpression('d')}
        ${sqlParts.whereClause}
      ),
      ranked AS (
        SELECT
          filtered.*,
          ${sqlParts.queryMode ? 'ROW_NUMBER() OVER (ORDER BY COALESCE(filtered.text_rank, 1000000000) ASC, filtered.id ASC)' : 'NULL'} AS text_rank_position,
          ROW_NUMBER() OVER (ORDER BY COALESCE(filtered.popularity_score, 0) DESC, filtered.id ASC) AS popularity_rank_position,
          ROW_NUMBER() OVER (ORDER BY COALESCE(filtered.unique_viewers, 0) DESC, filtered.id ASC) AS views_rank_position,
          ROW_NUMBER() OVER (ORDER BY ${smoothedPurchaseExpression} DESC, filtered.id ASC) AS purchases_rank_position,
          ROW_NUMBER() OVER (ORDER BY ${conversionRateExpression} DESC, filtered.id ASC) AS conversion_rate_rank_position,
          ROW_NUMBER() OVER (ORDER BY ${smoothedRevenueExpression} DESC, filtered.id ASC) AS revenue_rank_position,
          DENSE_RANK() OVER (ORDER BY ${freshnessExpression} DESC) AS freshness_rank_position,
          DENSE_RANK() OVER (ORDER BY COALESCE(filtered.creator_track_record_score, 0) DESC) AS creator_track_record_rank_position,
          ROW_NUMBER() OVER (
            PARTITION BY ${creatorPartitionExpression}
            ORDER BY ${creatorDiversityOrderClause}
          ) AS creator_diversity_rank_position,
          DENSE_RANK() OVER (ORDER BY filtered.exact_title_match DESC) AS exact_title_rank_position,
          ${sqlParts.queryMode ? 'DENSE_RANK() OVER (ORDER BY COALESCE(filtered.taxonomy_query_match, 0) DESC)' : 'NULL'} AS category_match_rank_position,
          ${sqlParts.queryMode ? 'DENSE_RANK() OVER (ORDER BY COALESCE(filtered.intent_query_coverage, 0) DESC)' : 'NULL'} AS intent_coverage_rank_position,
          ${sqlParts.queryMode ? 'DENSE_RANK() OVER (ORDER BY COALESCE(filtered.query_saturation, 0) ASC)' : 'NULL'} AS query_saturation_rank_position
        FROM filtered
      )
      SELECT
        ranked.*,
        ${popularScoreExpression} AS blended_rank
      FROM ranked
      ORDER BY
        ${bucketOrderClause}
        blended_rank DESC,
        COALESCE(ranked.query_saturation, 0) ASC,
        COALESCE(ranked.cumulative_purchases, 0) DESC,
        COALESCE(ranked.cumulative_revenue, 0) DESC,
        COALESCE(ranked.unique_viewers, 0) DESC,
        COALESCE(ranked.popularity_score, 0) DESC,
        COALESCE(ranked.published_date, '') DESC,
        ranked.id ASC
      LIMIT ? OFFSET ?
    `)
    .bind(...queryMatchBinds, ...sqlParts.binds, queryWindow.queryLimit, queryWindow.queryOffset)
    .all<DocumentRow>();
}

async function getTotalCount(db: D1Database, sqlParts: SqlParts): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS total ${sqlParts.fromClause} ${sqlParts.whereClause}`)
    .bind(...sqlParts.binds)
    .first<DocumentCountRow>();
  return Number(row?.total ?? 0);
}

async function resolveCategoryGroupSlugForChild(env: Env, childCategorySlug: string): Promise<string | null> {
  const row = await env.DB
    .prepare(`
      SELECT json_each.value AS slug, COUNT(*) AS total
      FROM template_documents d, json_each(d.category_group_slugs_json)
      WHERE EXISTS (
        SELECT 1
        FROM template_child_categories tcc
        WHERE tcc.template_document_id = d.id
          AND tcc.child_category_slug = ?
      )
      GROUP BY json_each.value
      ORDER BY total DESC, json_each.value ASC
      LIMIT 1
    `)
    .bind(childCategorySlug)
    .first<{ slug: string }>();

  return row?.slug ?? null;
}

async function loadFacetStyles(env: Env, params: SearchParams, ftsQuery: string | null = null): Promise<FacetStyleRow[]> {
  const sqlParts = buildSqlParts(params, { excludeStyles: true, excludeTypes: true, ftsQuery });
  const result = await env.DB
    .prepare(`
      WITH filtered AS (
        SELECT d.id
        ${sqlParts.fromClause}
        ${sqlParts.whereClause}
      )
      SELECT ts.style_name AS name, ts.style_slug AS slug, COUNT(DISTINCT ts.template_document_id) AS count
      FROM filtered
      JOIN template_styles ts ON ts.template_document_id = filtered.id
      GROUP BY ts.style_slug, ts.style_name
      ORDER BY ts.style_name ASC
    `)
    .bind(...sqlParts.binds)
    .all<FacetStyleRow>();
  return result.results ?? [];
}

async function loadFacetTypes(env: Env, params: SearchParams, ftsQuery: string | null = null): Promise<FacetTypeRow[]> {
  const sqlParts = buildSqlParts(params, { excludeStyles: true, excludeTypes: true, ftsQuery });
  const result = await env.DB
    .prepare(`
      SELECT d.template_type AS value, COUNT(*) AS count
      ${sqlParts.fromClause}
      ${sqlParts.whereClause}
      GROUP BY d.template_type
      HAVING d.template_type IS NOT NULL
      ORDER BY d.template_type ASC
    `)
    .bind(...sqlParts.binds)
    .all<FacetTypeRow>();
  return result.results ?? [];
}

async function loadSubcategoryPills(
  env: Env,
  params: SearchParams,
  ftsQuery: string | null = null,
): Promise<Array<{ name: string; slug: string; count: number }>> {
  const groupSlug =
    params.categoryGroupSlug ?? (params.childCategorySlug ? await resolveCategoryGroupSlugForChild(env, params.childCategorySlug) : null);
  if (!groupSlug) return [];

  const scopedParams: SearchParams = {
    ...params,
    categoryGroupSlug: groupSlug,
    childCategorySlug: null,
    styles: [],
    types: [],
  };
  const sqlParts = buildSqlParts(scopedParams, {
    excludeChildCategory: true,
    excludeStyles: true,
    excludeTypes: true,
    ftsQuery,
  });

  const result = await env.DB
    .prepare(`
      WITH filtered AS (
        SELECT d.id
        ${sqlParts.fromClause}
        ${sqlParts.whereClause}
      )
      SELECT tcc.child_category_name AS name, tcc.child_category_slug AS slug, COUNT(DISTINCT tcc.template_document_id) AS count
      FROM filtered
      JOIN template_child_categories tcc ON tcc.template_document_id = filtered.id
      GROUP BY tcc.child_category_slug, tcc.child_category_name
      ORDER BY tcc.child_category_name ASC
    `)
    .bind(...sqlParts.binds)
    .all<PillRow>();

  return (result.results ?? []).map((row) => ({
    name: row.name,
    slug: row.slug,
    count: Number(row.count),
  }));
}

function toTemplateUrl(row: DocumentRow): string | null {
  return row.listing_url ?? `https://webflow.com/templates/html/${row.template_slug}`;
}

function buildCategoryGroups(names: string[], slugs: string[]): Array<{ name: string; slug: string; url: string }> {
  return names.map((name, index) => ({
    name,
    slug: slugs[index] ?? slugs[0] ?? '',
    url: `https://webflow.com/templates/category/${slugs[index] ?? slugs[0] ?? ''}`,
  }));
}

function buildStyles(names: string[], slugs: string[]): Array<{ name: string; slug: string }> {
  return names.map((name, index) => ({ name, slug: slugs[index] ?? '' }));
}

function buildTags(names: string[], slugs: string[]): Array<{ name: string; slug: string }> {
  return names.map((name, index) => ({ name, slug: slugs[index] ?? '' }));
}

function buildChildCategories(
  names: string[],
  slugs: string[],
  publicSlugMap: Record<string, string>,
): Array<{ name: string; slug: string; url: string }> {
  return names.map((name, index) => {
    const canonicalSlug = slugs[index] ?? '';
    const publicSlug = publicSlugMap[canonicalSlug] ?? canonicalSlug;
    return {
      name,
      slug: publicSlug,
      url: `https://webflow.com/templates/subcategory/${publicSlug}`,
    };
  });
}

export async function searchTemplates(env: Env, rawParams: SearchParams): Promise<SearchResponsePayload> {
  const params = await resolveAliases(env, rawParams);
  const rankingConfig = getSearchRankingConfig(env);
  const normalizedQuery = normalizeQueryWhitespace((params.q ?? '').toLowerCase());
  const queryTokens = filterQueryTokens(tokenizeQuery(normalizedQuery));
  let effectiveFtsQuery = params.q ? buildStrictFtsQueryFromTokens(queryTokens) : null;
  let sqlParts = buildSqlParts(params, effectiveFtsQuery ? { ftsQuery: effectiveFtsQuery } : {});
  let totalItems = await getTotalCount(env.DB, sqlParts);

  if (effectiveFtsQuery && shouldUseRelaxedFtsQuery(queryTokens, totalItems, rankingConfig)) {
    const relaxedFtsQuery = buildRelaxedFtsQueryFromTokens(queryTokens);
    if (relaxedFtsQuery !== effectiveFtsQuery) {
      effectiveFtsQuery = relaxedFtsQuery;
      sqlParts = buildSqlParts(params, { ftsQuery: effectiveFtsQuery });
      totalItems = await getTotalCount(env.DB, sqlParts);
    }
  }

  const queryWindow = buildDocumentQueryWindow(params, rankingConfig);
  const queryIntent = buildQueryIntentProfile(normalizedQuery, rankingConfig);

  const [rows, styleFacets, typeFacets, pills] = await Promise.all([
    loadDocumentRows(env, sqlParts, params, queryWindow, rankingConfig),
    loadFacetStyles(env, params, effectiveFtsQuery),
    loadFacetTypes(env, params, effectiveFtsQuery),
    loadSubcategoryPills(env, params, effectiveFtsQuery),
  ]);

  const loadedRows = rows.results ?? [];
  const rowResults = queryWindow.applyPageLocalCreatorDiversity
    ? rerankRowsForPageLocalCreatorDiversity(loadedRows, params, queryIntent, rankingConfig, queryWindow.sliceOffset)
    : loadedRows;
  const childSlugMap = await lookupPublicSlugMap(
    env.DB,
    'child_category',
    rowResults.flatMap((row) => parseJsonArray(row.child_category_slugs_json)).concat(pills.map((pill) => pill.slug)),
  );

  const items: SearchItem[] = rowResults.map((row) => {
    const categoryGroups = parseJsonArray(row.category_groups_json);
    const categoryGroupSlugs = parseJsonArray(row.category_group_slugs_json);
    const childCategories = parseJsonArray(row.child_categories_json);
    const childCategorySlugs = parseJsonArray(row.child_category_slugs_json);
    const styles = parseJsonArray(row.styles_json);
    const styleSlugs = parseJsonArray(row.style_slugs_json);
    const tags = parseJsonArray(row.tags_json);
    const tagSlugs = parseJsonArray(row.tag_slugs_json);

    return {
      id: row.id,
      template_slug: row.template_slug,
      name: row.name,
      url: toTemplateUrl(row),
      preview_url: row.preview_url,
      website_url: row.website_url,
      creator_name: row.creator_name,
      thumbnail_image_url: row.thumbnail_image_url,
      thumbnail_image_secondary_url: row.thumbnail_image_secondary_url,
      price: row.price,
      is_free: row.is_free === 1,
      is_featured: row.is_featured === 1,
      template_type: row.template_type,
      popularity_score: row.popularity_score,
      unique_viewers: row.unique_viewers,
      cumulative_purchases: row.cumulative_purchases,
      cumulative_revenue: row.cumulative_revenue,
      published_date: row.published_date,
      category_groups: buildCategoryGroups(categoryGroups, categoryGroupSlugs),
      child_categories: buildChildCategories(childCategories, childCategorySlugs, childSlugMap),
      styles: buildStyles(styles, styleSlugs),
      tags: buildTags(tags, tagSlugs),
    };
  });

  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / params.pageSize);

  return {
    items,
    pagination: {
      page: params.page,
      page_size: params.pageSize,
      total_items: totalItems,
      total_pages: totalPages,
      has_next_page: params.page < totalPages,
      has_previous_page: params.page > 1,
    },
    sort: params.sort,
    applied_filters: {
      q: params.q,
      scope: params.scope,
      category_group_slug: params.categoryGroupSlug,
      child_category_slug: params.childCategorySlug ? childSlugMap[params.childCategorySlug] ?? params.childCategorySlug : null,
      styles: params.styles,
      types: params.types,
      free_only: params.freeOnly,
    },
    available_facets: {
      styles: styleFacets.map((row) => ({ name: row.name, slug: row.slug, count: Number(row.count) })),
      types: typeFacets.map((row) => ({ value: row.value, count: Number(row.count) })),
    },
    subcategory_pills: pills.map((pill) => {
      const publicSlug = childSlugMap[pill.slug] ?? pill.slug;
      return {
        name: pill.name,
        slug: publicSlug,
        url: `https://webflow.com/templates/subcategory/${publicSlug}`,
        count: Number(pill.count),
        active: publicSlug === (params.childCategorySlug ? childSlugMap[params.childCategorySlug] ?? params.childCategorySlug : ''),
      };
    }),
  };
}

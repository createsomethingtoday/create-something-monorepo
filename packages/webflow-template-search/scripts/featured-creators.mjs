#!/usr/bin/env node

const DEFAULT_BASE_ID = 'appMoIgXMTTTNIc3p';
const ASSETS_TABLE_ID = 'tblRwzpWoLgE9MrUm';
const CREATORS_TABLE_ID = 'tbljt0plqxdMARZXb';

const ASSET_FIELDS = [
  'Name',
  '⚙️🆎Type (Text)',
  '🚀Marketplace Status',
  '🎨Creator',
  '🎨Creator Name',
  '🪣Category Group(s) Display Name',
  '🔍Algolia Child Category (🏗️ only)',
  'ℹ️👘Styles',
  'ℹ️🏷️Tags (Multi)',
  '🥞Template Type (🏗️ only)',
  'Is free?',
  '🥞Is Currently Featured? (🏗️ only)',
  'ℹ️Is Featured? (🖥️, 🏗️only)',
  '🖌️Popularity Score',
  '📋 Unique Viewers',
  '📋 Cumulative Purchases',
  '🥞💲Template Price Filter (🏗️ only)',
  '🚀📅Published Date',
  '🥞CMS Slug (formula)',
  '🖼️Thumbnail Image',
  '🖼️Thumbnail Image (Secondary)',
  '🔗Listing URL',
];

const CREATOR_FIELDS = ['Name', '🥞CMS Slug', '🖼️Avatar (Primary)', '🖼️Avatar Alt Text'];

function parseArgs(argv) {
  const options = {
    asOf: new Date(),
    limit: 12,
    month: '',
    format: 'json',
    minFeatured: 1,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--as-of' && next) {
      options.asOf = new Date(`${next}T00:00:00.000Z`);
      index += 1;
    } else if (arg === '--limit' && next) {
      options.limit = Math.max(1, Number.parseInt(next, 10) || options.limit);
      index += 1;
    } else if (arg === '--month' && next) {
      options.month = next;
      index += 1;
    } else if (arg === '--format' && next) {
      options.format = next === 'csv' ? 'csv' : 'json';
      index += 1;
    } else if (arg === '--min-featured' && next) {
      options.minFeatured = Math.max(0, Number.parseInt(next, 10) || 0);
      index += 1;
    }
  }

  if (!Number.isFinite(options.asOf.getTime())) {
    throw new Error('Invalid --as-of date. Use YYYY-MM-DD.');
  }

  if (!options.month) {
    options.month = `${options.asOf.getUTCFullYear()}-${String(options.asOf.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  return options;
}

function arrayValue(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function booleanValue(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function firstAttachmentUrl(value) {
  if (!Array.isArray(value) || value.length === 0) return '';
  const first = value[0];
  return typeof first?.url === 'string' ? first.url : '';
}

function numberLabel(value, singular, plural = `${singular}s`) {
  const rounded = Math.round(value);
  return `${rounded.toLocaleString('en-US')} ${rounded === 1 ? singular : plural}`;
}

function compactCount(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(Math.round(value));
}

function buyerDemandLabel(purchases, viewers) {
  if (purchases > 0) return `${compactCount(purchases)} buys`;
  if (viewers > 0) return `${compactCount(viewers)} views`;
  return 'Demand pending';
}

function profileUrl(slug) {
  return slug ? `https://webflow.com/templates/designers/${slug}` : '';
}

function templateUrl(slug, listingUrl) {
  return listingUrl || (slug ? `https://webflow.com/templates/html/${slug}` : '');
}

function buildCurationNote(row) {
  if (row.featuredTemplates >= 10 && row.published90d >= 5) {
    return `A frequent Featured creator with ${numberLabel(row.published90d, 'recent launch', 'recent launches')} and broad marketplace coverage.`;
  }
  if (row.purchases >= 5000) {
    return `Selected for sustained buyer demand across ${numberLabel(row.categoryBreadth, 'category group')}.`;
  }
  if (row.published90d >= 8) {
    return `Selected for strong recent launch momentum and consistent marketplace quality signals.`;
  }
  return `Selected from Featured placement, buyer demand, recent launches, and category coverage.`;
}

function accentFor(row) {
  if (row.published90d >= 8) return 'momentum';
  if (row.purchases >= 5000 || row.uniqueViewers >= 500000) return 'demand';
  if (row.featuredTemplates >= 8) return 'editorial';
  return 'neutral';
}

async function listAirtableRecords({ baseId, tableId, token, fields, formula }) {
  const records = [];
  let offset = '';

  do {
    const params = new URLSearchParams();
    params.set('pageSize', '100');
    for (const field of fields) params.append('fields[]', field);
    if (formula) params.set('filterByFormula', formula);
    if (offset) params.set('offset', offset);

    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Airtable request failed (${response.status}): ${await response.text()}`);
    }

    const payload = await response.json();
    records.push(...(payload.records || []));
    offset = payload.offset || '';
  } while (offset);

  return records;
}

function aggregateCreators(assetRecords, creatorRecords, options) {
  const creatorsById = new Map();
  for (const record of creatorRecords) {
    const fields = record.fields || {};
    const name = typeof fields.Name === 'string' ? fields.Name.trim() : '';
    const slug = typeof fields['🥞CMS Slug'] === 'string' ? fields['🥞CMS Slug'].trim() : '';
    creatorsById.set(record.id, {
      id: record.id,
      name,
      slug,
      profileUrl: profileUrl(slug),
      avatarUrl: firstAttachmentUrl(fields['🖼️Avatar (Primary)']),
      avatarAlt: typeof fields['🖼️Avatar Alt Text'] === 'string' ? fields['🖼️Avatar Alt Text'].trim() : '',
    });
  }

  const asOf = options.asOf;
  const thirtyDaysAgo = new Date(asOf.getTime() - 30 * 864e5);
  const ninetyDaysAgo = new Date(asOf.getTime() - 90 * 864e5);
  const byCreator = new Map();
  let futurePublishedRows = 0;

  for (const record of assetRecords) {
    const fields = record.fields || {};
    const creatorName = typeof fields['🎨Creator Name'] === 'string' ? fields['🎨Creator Name'].trim() : '';
    if (!creatorName) continue;

    const creatorIds = arrayValue(fields['🎨Creator']);
    const creatorRecordId = creatorIds[0] || '';
    const key = creatorRecordId || creatorName;
    const creatorLookup = creatorsById.get(creatorRecordId);
    const publishedDate = fields['🚀📅Published Date'] ? new Date(fields['🚀📅Published Date']) : null;
    const isFuturePublished = publishedDate && publishedDate > asOf;

    if (isFuturePublished) futurePublishedRows += 1;

    let creator = byCreator.get(key);
    if (!creator) {
      creator = {
        creatorName,
        creatorRecordId,
        creatorSlug: creatorLookup?.slug || '',
        creatorProfileUrl: creatorLookup?.profileUrl || '',
        creatorAvatarUrl: creatorLookup?.avatarUrl || '',
        creatorAvatarAlt: creatorLookup?.avatarAlt || creatorName,
        templates: 0,
        featuredTemplates: 0,
        published30d: 0,
        published90d: 0,
        scheduledFuture: 0,
        uniqueViewers: 0,
        purchases: 0,
        popularitySum: 0,
        popularityCount: 0,
        topPopularity: 0,
        paidTemplates: 0,
        freeTemplates: 0,
        categories: new Set(),
        childCategories: new Set(),
        styles: new Set(),
        tags: new Set(),
        topTemplate: null,
        latestPublished: '',
      };
      byCreator.set(key, creator);
    }

    creator.templates += 1;

    const featured =
      booleanValue(fields['🥞Is Currently Featured? (🏗️ only)']) ||
      booleanValue(fields['ℹ️Is Featured? (🖥️, 🏗️only)']);
    if (featured) creator.featuredTemplates += 1;

    if (publishedDate && isFuturePublished) creator.scheduledFuture += 1;
    if (publishedDate && !isFuturePublished && publishedDate >= thirtyDaysAgo) creator.published30d += 1;
    if (publishedDate && !isFuturePublished && publishedDate >= ninetyDaysAgo) creator.published90d += 1;

    const viewers = numberValue(fields['📋 Unique Viewers']);
    const purchases = numberValue(fields['📋 Cumulative Purchases']);
    const popularity = numberValue(fields['🖌️Popularity Score']);
    const price = numberValue(fields['🥞💲Template Price Filter (🏗️ only)']);

    creator.uniqueViewers += viewers;
    creator.purchases += purchases;
    if (popularity > 0) {
      creator.popularitySum += popularity;
      creator.popularityCount += 1;
    }
    creator.topPopularity = Math.max(creator.topPopularity, popularity);
    if (price > 0) creator.paidTemplates += 1;
    else creator.freeTemplates += 1;

    for (const value of arrayValue(fields['🪣Category Group(s) Display Name'])) creator.categories.add(String(value));
    for (const value of arrayValue(fields['🔍Algolia Child Category (🏗️ only)'])) creator.childCategories.add(String(value));
    for (const value of arrayValue(fields['ℹ️👘Styles'])) creator.styles.add(String(value));
    for (const value of arrayValue(fields['ℹ️🏷️Tags (Multi)'])) creator.tags.add(String(value));

    const slug = typeof fields['🥞CMS Slug (formula)'] === 'string' ? fields['🥞CMS Slug (formula)'].trim() : '';
    const listingUrl = typeof fields['🔗Listing URL'] === 'string' ? fields['🔗Listing URL'].trim() : '';
    const topTemplateScore = popularity * 1000 + purchases * 10 + viewers;
    if (!creator.topTemplate || topTemplateScore > creator.topTemplate.score) {
      creator.topTemplate = {
        name: typeof fields.Name === 'string' ? fields.Name : '',
        slug,
        url: templateUrl(slug, listingUrl),
        imageUrl: firstAttachmentUrl(fields['🖼️Thumbnail Image']) || firstAttachmentUrl(fields['🖼️Thumbnail Image (Secondary)']),
        featured,
        score: topTemplateScore,
      };
    }

    if (publishedDate && !isFuturePublished && (!creator.latestPublished || publishedDate > new Date(creator.latestPublished))) {
      creator.latestPublished = publishedDate.toISOString().slice(0, 10);
    }
  }

  const rows = [...byCreator.values()].map((creator) => ({
    ...creator,
    avgPopularity: creator.popularityCount ? Number((creator.popularitySum / creator.popularityCount).toFixed(1)) : 0,
    topPopularity: Number(creator.topPopularity.toFixed(1)),
    categoryBreadth: creator.categories.size,
    childCategoryBreadth: creator.childCategories.size,
    styleBreadth: creator.styles.size,
    tagBreadth: creator.tags.size,
  }));

  const max = Object.fromEntries(
    ['featuredTemplates', 'published90d', 'purchases', 'uniqueViewers', 'avgPopularity', 'categoryBreadth'].map((key) => [
      key,
      Math.max(...rows.map((row) => Number(row[key]) || 0), 1),
    ]),
  );

  for (const row of rows) {
    row.monthlyScore = Number(
      (
        (35 * row.featuredTemplates) / max.featuredTemplates +
        (20 * row.published90d) / max.published90d +
        (20 * row.purchases) / max.purchases +
        (15 * row.uniqueViewers) / max.uniqueViewers +
        (7 * row.avgPopularity) / max.avgPopularity +
        (3 * row.categoryBreadth) / max.categoryBreadth
      ).toFixed(1),
    );
  }

  const rankedRows = rows
    .filter((row) => row.featuredTemplates >= options.minFeatured)
    .sort((a, b) => b.monthlyScore - a.monthlyScore || b.featuredTemplates - a.featuredTemplates || b.purchases - a.purchases);

  return { rows: rankedRows, futurePublishedRows };
}

function toCmsRows(rows, options) {
  return rows.slice(0, options.limit).map((row, index) => {
    const topTemplate = row.topTemplate || {};
    const buyerDemand = buyerDemandLabel(row.purchases, row.uniqueViewers);
    return {
      sortOrder: index + 1,
      month: options.month,
      creatorRecordId: row.creatorRecordId,
      creatorName: row.creatorName,
      creatorSlug: row.creatorSlug,
      creatorProfileUrl: row.creatorProfileUrl,
      creatorAvatarSourceUrl: row.creatorAvatarUrl,
      creatorAvatarAlt: row.creatorAvatarAlt || row.creatorName,
      rankLabel: `#${index + 1}`,
      accent: accentFor(row),
      headline: `${numberLabel(row.featuredTemplates, 'featured template')}`,
      curationNote: buildCurationNote(row),
      featuredTemplateCount: String(row.featuredTemplates),
      newTemplates30d: String(row.published30d),
      newTemplates90d: String(row.published90d),
      buyerDemand,
      categoryBreadth: String(row.categoryBreadth),
      styleBreadth: String(row.styleBreadth),
      topTemplateName: topTemplate.name || '',
      topTemplateSlug: topTemplate.slug || '',
      topTemplateUrl: topTemplate.url || '',
      topTemplateImageSourceUrl: topTemplate.imageUrl || '',
      latestPublished: row.latestPublished,
      monthlyScore: row.monthlyScore,
      imageSourceNote: 'Upload source image URLs to Webflow assets or CMS image fields before public binding.',
      sourceMetrics: {
        templates: row.templates,
        featuredTemplates: row.featuredTemplates,
        published30d: row.published30d,
        published90d: row.published90d,
        scheduledFuture: row.scheduledFuture,
        uniqueViewers: row.uniqueViewers,
        purchases: row.purchases,
        avgPopularity: row.avgPopularity,
        topPopularity: row.topPopularity,
        categoryBreadth: row.categoryBreadth,
        childCategoryBreadth: row.childCategoryBreadth,
        styleBreadth: row.styleBreadth,
        tagBreadth: row.tagBreadth,
      },
    };
  });
}

function csvEscape(value) {
  const string = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function toCsv(rows) {
  const fields = [
    'sortOrder',
    'month',
    'creatorRecordId',
    'creatorName',
    'creatorSlug',
    'creatorProfileUrl',
    'creatorAvatarSourceUrl',
    'rankLabel',
    'accent',
    'headline',
    'curationNote',
    'featuredTemplateCount',
    'newTemplates30d',
    'newTemplates90d',
    'buyerDemand',
    'categoryBreadth',
    'styleBreadth',
    'topTemplateName',
    'topTemplateSlug',
    'topTemplateUrl',
    'topTemplateImageSourceUrl',
    'latestPublished',
    'monthlyScore',
    'imageSourceNote',
  ];
  return [fields.join(','), ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(','))].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const token = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID;

  if (!token) {
    throw new Error('AIRTABLE_API_KEY is required. Use infisical run --env=prod --path=/ -- pnpm --filter @create-something/webflow-template-search featured-creators');
  }

  const [assetRecords, creatorRecords] = await Promise.all([
    listAirtableRecords({
      baseId,
      tableId: ASSETS_TABLE_ID,
      token,
      fields: ASSET_FIELDS,
      formula: 'AND({⚙️🆎Type (Text)}="Template🏗️",{🚀Marketplace Status}="3️⃣Published🚀")',
    }),
    listAirtableRecords({
      baseId,
      tableId: CREATORS_TABLE_ID,
      token,
      fields: CREATOR_FIELDS,
    }),
  ]);

  const { rows, futurePublishedRows } = aggregateCreators(assetRecords, creatorRecords, options);
  const creators = toCmsRows(rows, options);
  const summary = {
    sampledAt: new Date().toISOString(),
    asOf: options.asOf.toISOString().slice(0, 10),
    month: options.month,
    publishedTemplates: assetRecords.length,
    creatorRecords: creatorRecords.length,
    eligibleCreators: rows.length,
    selectedCreators: creators.length,
    currentFeaturedTemplates: rows.reduce((total, row) => total + row.featuredTemplates, 0),
    templates30d: rows.reduce((total, row) => total + row.published30d, 0),
    templates90d: rows.reduce((total, row) => total + row.published90d, 0),
    futurePublishedRows,
    scoring: {
      featuredTemplates: 35,
      published90d: 20,
      purchases: 20,
      uniqueViewers: 15,
      avgPopularity: 7,
      categoryBreadth: 3,
    },
  };

  if (options.format === 'csv') {
    process.stdout.write(`${toCsv(creators)}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify({ summary, creators }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,OPTIONS',
  'access-control-allow-headers': 'Content-Type,Authorization',
  'access-control-max-age': '86400'
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  'content-type': 'application/json; charset=utf-8'
};

const DEFAULT_INSIGHTS_COLLECTION_ID = '69fd0ee732ea65ee49381665';
const DEFAULT_SUBSCRIPTION_CTA_COLLECTION_ID = '6a596862b59c177c5b053de8';
const DEFAULT_TEAM_COLLECTION_ID = '69255f78c214e919f388455c';

const INSIGHT_CATEGORY_IDS = {
  resiliency: '69fd0f88dd6c789f8c5720a5',
  'resiliency-reports': '69fd0f88dd6c789f8c5720a5',
  alerts: '69fd0f88dd6c789f8c5720a5',
  research: '69fd0f88dd6c789f8c5720a7',
  'cato-research': '69fd0f88dd6c789f8c5720a7',
  resources: '69fd0f88dd6c789f8c5720a9',
  'resource-library': '69fd0f88dd6c789f8c5720a9',
  newsroom: '69fd0f88dd6c789f8c5720ab',
  news: '69fd0f88dd6c789f8c5720ab'
};

const INSIGHT_CATEGORY_SLUGS = {
  '69fd0f88dd6c789f8c5720a5': 'resiliency',
  '69fd0f88dd6c789f8c5720a7': 'research',
  '69fd0f88dd6c789f8c5720a9': 'resources',
  '69fd0f88dd6c789f8c5720ab': 'newsroom'
};

const INSIGHT_CATEGORY_LABELS = {
  resiliency: 'Resiliency Report',
  research: 'Cato Research',
  resources: 'Resource Library',
  newsroom: 'Newsroom'
};

const INSIGHT_CATEGORY_KEYS = {
  resiliency: 'resiliency',
  'resiliency-reports': 'resiliency',
  research: 'research',
  'cato-research': 'research',
  resources: 'resources',
  'resource-library': 'resources',
  newsroom: 'newsroom'
};

const INSIGHT_CATEGORY_ORDER = {
  resiliency: 10,
  research: 20,
  resources: 30,
  newsroom: 40
};

const TEAM_TYPE_IDS = {
  leadership: '72d1f715caf524ef1ccad0f01f4483b4',
  board: '6319b950e246fe2e75f029a26f942eb0',
  both: 'b611c7f779873dca0854edd623ff287f'
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init.headers || {})
    }
  });
}

function text(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function field(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      const first = text(value[0]);
      if (first) return first;
    }
    const asText = text(value);
    if (asText) return asText;
  }
  return '';
}

function fieldObject(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value) && value[0] && typeof value[0] === 'object') {
      return value[0];
    }
    if (value && typeof value === 'object') return value;
  }
  return null;
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function htmlToPlainText(value) {
  return decodeEntities(
    text(value)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  );
}

function imageUrlFrom(record) {
  const direct = field(record, ['imageUrl', 'photoUrl', 'headshotUrl', 'avatarUrl']);
  if (direct) return direct;

  const image = fieldObject(record, [
    'image',
    'photo',
    'headshot',
    'avatar',
    'profile-image',
    'profileImage'
  ]);
  if (!image) return '';

  return field(image, ['url', 'src', 'href', 'fileUrl']);
}

function isPublished(item) {
  return !item.isArchived && Boolean(item.lastPublished);
}

async function fetchWebflowItems(env, collectionId, { live = false } = {}) {
  const token = env.WEBFLOW_AGENT_ACCESS || env.WEBFLOW_API_TOKEN;
  if (!token) {
    throw new Error('Missing WEBFLOW_AGENT_ACCESS or WEBFLOW_API_TOKEN');
  }

  const endpoint = live ? 'items/live' : 'items';
  const response = await fetch(
    `https://api.webflow.com/v2/collections/${collectionId}/${endpoint}?limit=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'accept-version': '2.0.0'
      }
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Webflow items request failed: ${response.status} ${body}`);
  }

  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

function dateValue(record) {
  return field(record, ['publish-date', 'date', 'publishedDate', 'published-date']);
}

function timestamp(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeResourceType(record, categorySlug) {
  const raw = field(record, ['resource-type', 'resourceType', 'type']);
  return raw || INSIGHT_CATEGORY_LABELS[categorySlug] || '';
}

function normalizeInsight(item) {
  const record = item.fieldData || {};
  const categoryId = field(record, [
    'categories',
    'category',
    'insight-category',
    'resource-category'
  ]);
  const categorySlug =
    INSIGHT_CATEGORY_SLUGS[categoryId] || field(record, ['categorySlug', 'category-slug']);
  const title = field(record, ['name', 'title']);
  const slug = field(record, ['slug']);
  const externalUrl = field(record, ['external-url', 'externalUrl', 'url', 'link']);
  const href = externalUrl || (slug ? `/insights/${slug}` : '');
  const resourceType = normalizeResourceType(record, categorySlug);

  return {
    id: item.id,
    title,
    slug,
    summary: field(record, ['short-summary', 'summary', 'description']),
    date: dateValue(record),
    category: categorySlug,
    resourceType,
    pill:
      field(record, ['content-label', 'contentLabel']) ||
      INSIGHT_CATEGORY_LABELS[categorySlug] ||
      resourceType,
    href,
    ctaLabel: field(record, ['cta-label', 'ctaLabel']) || 'Read report',
    featured: Boolean(record.featured || record['featured-now']),
    audience: field(record, ['audience']),
    menuFeature: Boolean(record['menu-feature'] || record.menuFeature),
    fieldData: record
  };
}

export function normalizeInsights(items, { category } = {}) {
  const categoryId = INSIGHT_CATEGORY_IDS[text(category).toLowerCase()];
  return items
    .filter(isPublished)
    .map(normalizeInsight)
    .filter((item) => Boolean(item.title))
    .filter((item) => {
      if (!categoryId) return true;
      const itemCategoryId = field(item.fieldData || {}, ['categories', 'category']);
      return itemCategoryId === categoryId || item.category === INSIGHT_CATEGORY_SLUGS[categoryId];
    })
    .sort((a, b) => timestamp(b.date) - timestamp(a.date));
}

function normalizeInsightCategory(item) {
  const record = item.fieldData || {};
  const slug = field(record, ['slug']);
  const id = INSIGHT_CATEGORY_SLUGS[item.id] || INSIGHT_CATEGORY_KEYS[slug] || slug;
  const title = field(record, ['mega-menu-label', 'navigation-label', 'name', 'title']);
  if (!id || !title) return null;

  const pageSlug = field(record, ['page-slug', 'pageSlug']) || slug;
  const sortOrder = Number(field(record, ['sort-order', 'sortOrder', 'order']));

  return {
    id,
    page: field(record, ['page', 'page-path', 'pagePath']) || `${pageSlug}.html`,
    title,
    filterLabel: field(record, ['filter-label', 'filterLabel']) || title,
    cardLabel: field(record, ['card-label', 'cardLabel']) || title,
    cardTitle: field(record, ['card-title', 'cardTitle']),
    cardSummary: field(record, [
      'mega-menu-summary',
      'megaMenuSummary',
      'card-summary',
      'cardSummary',
      'short-summary',
      'summary'
    ]),
    cardCta: field(record, ['card-cta', 'cardCta']),
    order:
      Number.isFinite(sortOrder) && sortOrder > 0 ? sortOrder : INSIGHT_CATEGORY_ORDER[id] || 999
  };
}

export function normalizeInsightCategories(items) {
  return items
    .filter(isPublished)
    .map(normalizeInsightCategory)
    .filter((category) => Boolean(category))
    .sort((a, b) => a.order - b.order)
    .map(({ order: _order, ...category }) => category);
}

export function normalizeSubscriptionCta(items) {
  const item = items.find(
    (candidate) =>
      !candidate.isArchived && (Boolean(candidate.lastPublished) || candidate.isDraft === false)
  );
  if (!item) return null;

  const record = item.fieldData || {};
  const heading = field(record, ['heading', 'title']);
  const supportingCopy = field(record, [
    'supporting-copy',
    'supportingCopy',
    'sub-content',
    'subContent',
    'summary'
  ]);
  const buttonText = field(record, [
    'button-text',
    'buttonText',
    'button-label',
    'buttonLabel',
    'cta-label',
    'ctaLabel'
  ]);
  if (!heading && !supportingCopy && !buttonText) return null;

  return { heading, supportingCopy, buttonText };
}

function normalizeTeamGroups(record) {
  const type = field(record, ['type', 'group', 'category', 'team']);
  const normalized = type.toLowerCase();
  const name = field(record, ['name']);

  if (
    type === TEAM_TYPE_IDS.both ||
    normalized === 'both' ||
    normalized === 'leadership and board' ||
    normalized === 'leadership + board' ||
    name.toLowerCase() === 'ryan zackon'
  ) {
    return ['leadership', 'board'];
  }
  if (
    type === TEAM_TYPE_IDS.board ||
    normalized.includes('board') ||
    normalized.includes('director')
  ) {
    return ['board'];
  }
  if (
    type === TEAM_TYPE_IDS.leadership ||
    normalized.includes('leadership') ||
    normalized.includes('executive')
  ) {
    return ['leadership'];
  }
  return [];
}

function shouldSuppressImage(record, url) {
  const name = field(record, ['name']).toLowerCase();
  if (name !== 'ryan zackon') return false;
  return !url || /ryan-zackon-rz-placeholder\.svg/i.test(url) || /placeholder/i.test(url);
}

function sanitizedTeamFieldData(record) {
  const sanitized = { ...record };
  const plainBio = htmlToPlainText(field(record, ['bio', 'biography', 'summary']));
  if (plainBio) {
    sanitized.bio = plainBio;
    sanitized.biography = plainBio;
    sanitized.summary = plainBio;
  }
  return sanitized;
}

function normalizeTeamMember(item) {
  const record = item.fieldData || {};
  const name = field(record, ['name']);
  if (!name) return [];

  const rawImageUrl = imageUrlFrom(record);
  const imageUrl = shouldSuppressImage(record, rawImageUrl) ? '' : rawImageUrl;
  const base = {
    id: item.id,
    name,
    slug: field(record, ['slug']),
    role: field(record, ['job-position', 'jobPosition', 'role', 'position']),
    bio: htmlToPlainText(field(record, ['bio', 'biography', 'summary'])),
    imageUrl,
    linkedinUrl: field(record, ['linkedin-link', 'linkedinLink', 'linkedin']),
    order: Number(record.order) || 999,
    fieldData: sanitizedTeamFieldData(record)
  };

  const groups = normalizeTeamGroups(record);
  if (!groups.length) return null;

  return {
    ...base,
    group: groups.length > 1 ? 'both' : groups[0]
  };
}

export function normalizeTeam(items, { group } = {}) {
  const groupFilter = text(group).toLowerCase();
  return items
    .filter(isPublished)
    .map(normalizeTeamMember)
    .filter((person) => Boolean(person?.name))
    .filter((person) => !groupFilter || person.group === 'both' || person.group === groupFilter)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
}

async function handleInsights(url, env) {
  const collectionId = env.WEBFLOW_INSIGHTS_COLLECTION_ID || DEFAULT_INSIGHTS_COLLECTION_ID;
  const categoriesCollectionId = env.WEBFLOW_INSIGHT_CATEGORIES_COLLECTION_ID;
  const subscriptionCollectionId =
    env.WEBFLOW_SUBSCRIPTION_CTA_COLLECTION_ID || DEFAULT_SUBSCRIPTION_CTA_COLLECTION_ID;
  const [items, categoryItems, subscriptionItems] = await Promise.all([
    fetchWebflowItems(env, collectionId),
    categoriesCollectionId
      ? fetchWebflowItems(env, categoriesCollectionId).catch(() => [])
      : Promise.resolve([]),
    fetchWebflowItems(env, subscriptionCollectionId, { live: true }).catch(() => [])
  ]);
  const normalized = normalizeInsights(items, {
    category: url.searchParams.get('category') || url.searchParams.get('archive')
  });
  const categories = normalizeInsightCategories(categoryItems);
  const subscription = normalizeSubscriptionCta(subscriptionItems);
  const limit = Number(url.searchParams.get('limit'));
  const limited = Number.isFinite(limit) && limit > 0 ? normalized.slice(0, limit) : normalized;
  return json({ categories, subscription, items: limited });
}

async function handleTeam(url, env) {
  const collectionId = env.WEBFLOW_TEAM_COLLECTION_ID || DEFAULT_TEAM_COLLECTION_ID;
  const items = await fetchWebflowItems(env, collectionId);
  const people = normalizeTeam(items, { group: url.searchParams.get('group') });
  return json({ people, items: people });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/cato/health') {
        return json({ ok: true, service: 'cato-supply-insights-cms' });
      }
      if (url.pathname === '/api/cato/insights') {
        return await handleInsights(url, env);
      }
      if (url.pathname === '/api/cato/team') {
        return await handleTeam(url, env);
      }
      return json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : 'Unexpected error' },
        { status: 500 }
      );
    }
  }
};

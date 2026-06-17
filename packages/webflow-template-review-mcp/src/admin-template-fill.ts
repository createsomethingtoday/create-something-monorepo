import type { TemplateReviewContext } from './airtable.js';

export interface AdminTemplateFillOptions {
  includeScript?: boolean;
  includeBookmarklet?: boolean;
}

export interface AdminTemplateCreateFormFields {
  name?: string;
  shortName?: string;
  description?: string;
  extDetailPageUrl?: string;
  extCategory?: string;
  extMainTag?: string;
  type?: string;
  cost?: string;
}

export interface AdminTemplateFillFormData {
  template_name?: string;
  uid?: string;
  detail_page_path?: string;
  recommended_type?: string;
  price_usd?: number;
  price_cents?: number;
  category_names?: string[];
  category_cms_slugs?: string[];
  category_display_name?: string;
  category_cms_slug?: string;
  short_description?: string;
  published_site_url?: string;
  preview_site_url?: string;
  thumbnail_image_url?: string;
  secondary_thumbnail_urls?: string[];
  carousel_image_urls?: string[];
  feature_names?: string[];
  features_highlighted?: string;
  admin_form: AdminTemplateCreateFormFields;
  admin_form_warnings?: string[];
}

export interface AdminTemplateFillBundle {
  schema_version: 'webflow_admin_template_fill.v0.1';
  source: {
    asset_id?: string;
    version_id: string;
    template_name?: string;
  };
  readiness: {
    review_status?: string;
    can_publish: boolean;
    warning?: string;
  };
  admin_url: 'https://webflow.com/admin/templates';
  form_data: AdminTemplateFillFormData;
  missing_fields: string[];
  manual_uploads: {
    thumbnail_image_url?: string;
    secondary_thumbnail_urls: string[];
    carousel_image_urls: string[];
  };
  safety_boundary: string[];
  console_script?: string;
  bookmarklet?: string;
}

const WEBFLOW_ADMIN_TEMPLATE_CATEGORIES = [
  'Design',
  'Business',
  'Technology',
  'Blog',
  'Marketing',
  'Photography & Video',
  'Entertainment',
  'Food & Drink',
  'Travel',
  'Education',
  'Sport',
  'Medical',
  'Nonprofit',
  'Beauty & Wellness',
  'Fashion',
  'Other',
] as const;

const REQUIRED_ADMIN_FORM_FIELDS: Array<keyof AdminTemplateCreateFormFields> = [
  'name',
  'shortName',
  'description',
  'extDetailPageUrl',
  'extCategory',
  'extMainTag',
  'type',
  'cost',
];

function firstValue(values: string[] | undefined): string | undefined {
  return values?.find((value) => value.trim().length > 0);
}

function priceUsd(context: TemplateReviewContext): number | undefined {
  const airtablePrice = context.asset?.templatePriceFilter;
  if (typeof airtablePrice === 'number' && Number.isFinite(airtablePrice)) return airtablePrice;

  const match = context.asset?.priceString?.match(/[\d,.]+/);
  if (!match) return undefined;
  const parsed = Number(match[0].replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalize(value: string | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function deriveAdminCategory(categoryNames: string[], categoryGroupNames: string[], categorySlugs: string[]): string | undefined {
  const candidates = [...categoryNames, ...categoryGroupNames, ...categorySlugs];
  for (const candidate of candidates) {
    const normalizedCandidate = normalize(candidate);
    const exact = WEBFLOW_ADMIN_TEMPLATE_CATEGORIES.find((category) => normalize(category) === normalizedCandidate);
    if (exact) return exact;
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalize(candidate);
    const prefix = WEBFLOW_ADMIN_TEMPLATE_CATEGORIES.find((category) => normalizedCandidate.startsWith(`${normalize(category)} `));
    if (prefix) return prefix;
  }

  const combined = normalize(candidates.join(' '));
  if (/\b(portfolio|agency|creative|design)\b/.test(combined)) return 'Design';
  if (/\b(ecommerce|startup|business|finance|accounting|consulting|retail|real estate|saas)\b/.test(combined)) return 'Business';
  if (/\b(technology|software|app|ai|it)\b/.test(combined)) return 'Technology';
  if (/\b(blog|magazine|news)\b/.test(combined)) return 'Blog';
  if (/\b(marketing|landing page)\b/.test(combined)) return 'Marketing';
  if (/\b(photo|photography|video)\b/.test(combined)) return 'Photography & Video';
  if (/\b(food|drink|restaurant)\b/.test(combined)) return 'Food & Drink';
  if (/\b(beauty|wellness)\b/.test(combined)) return 'Beauty & Wellness';
  return 'Other';
}

function tagFromCategoryName(value: string): string | undefined {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return undefined;
  if (/\bagency\b/.test(normalizedValue)) return 'Agency';
  if (/\bportfolio\b/.test(normalizedValue)) return 'Portfolio';

  for (const category of WEBFLOW_ADMIN_TEMPLATE_CATEGORIES) {
    const normalizedCategory = normalize(category);
    if (normalizedValue.startsWith(`${normalizedCategory} `)) {
      const suffix = normalizedValue.slice(normalizedCategory.length).trim();
      return suffix ? titleCase(suffix) : undefined;
    }
  }

  return titleCase(normalizedValue.replace(/\b(websites?|templates?)\b/g, '').trim());
}

function tagFromCategorySlug(value: string): string | undefined {
  const withoutSuffix = value.replace(/-?websites?$/i, '').replace(/-?templates?$/i, '').replace(/-/g, ' ');
  return tagFromCategoryName(withoutSuffix);
}

function derivePrimaryTag(categoryNames: string[], categorySlugs: string[], categoryGroupNames: string[]): string | undefined {
  const candidates = uniqueStrings([
    ...categoryNames.map(tagFromCategoryName),
    ...categorySlugs.map(tagFromCategorySlug),
    ...categoryGroupNames.map(tagFromCategoryName),
  ]);
  return candidates.find((candidate) => normalize(candidate) === 'agency') ?? candidates[0];
}

function normalizeAdminTemplateType(value: string | undefined): string | undefined {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return undefined;
  if (normalizedValue.includes('ecommerce')) return 'Ecommerce';
  if (normalizedValue.includes('cms')) return 'CMS';
  if (normalizedValue.includes('membership')) return 'Memberships';
  return 'basic';
}

function adminDescription(value: string | undefined): { value?: string; warning?: string } {
  if (!value) return {};
  if (value.length <= 250) return { value };
  return {
    value: `${value.slice(0, 247).trimEnd()}...`,
    warning: 'Short description exceeded the Webflow Admin 250 character limit and was truncated in admin_form.description.',
  };
}

function buildFormData(context: TemplateReviewContext): AdminTemplateFillFormData {
  const asset = context.asset;
  const price = priceUsd(context);
  const categoryNames = asset?.categoryNames ?? [];
  const categoryCmsSlugs = asset?.categoryCmsSlugs ?? [];
  const categoryGroupDisplayNames = asset?.categoryGroupDisplayNames ?? [];
  const adminCategory = deriveAdminCategory(categoryNames, categoryGroupDisplayNames, categoryCmsSlugs);
  const primaryTag = derivePrimaryTag(categoryNames, categoryCmsSlugs, categoryGroupDisplayNames);
  const normalizedType = normalizeAdminTemplateType(asset?.adminRecommendedType);
  const description = adminDescription(asset?.descriptionShort);
  const priceCents = price === undefined ? undefined : Math.round(price * 100);
  return {
    template_name: asset?.templateName || context.templateName,
    uid: asset?.uid,
    detail_page_path: asset?.adminDetailPagePath,
    recommended_type: asset?.adminRecommendedType,
    ...(price === undefined
      ? {}
      : {
          price_usd: price,
          price_cents: priceCents,
        }),
    category_names: categoryNames,
    category_cms_slugs: categoryCmsSlugs,
    category_display_name: firstValue(asset?.categoryGroupDisplayNames),
    category_cms_slug: firstValue(asset?.categoryGroupCmsSlugs),
    short_description: asset?.descriptionShort,
    published_site_url: asset?.websiteUrl,
    preview_site_url: asset?.previewSiteUrl,
    thumbnail_image_url: asset?.thumbnailImageUrl,
    secondary_thumbnail_urls: asset?.secondaryThumbnailUrls ?? [],
    carousel_image_urls: asset?.carouselImageUrls ?? [],
    feature_names: asset?.features?.map((feature) => feature.name).filter(Boolean),
    features_highlighted: asset?.featuresHighlighted,
    admin_form: {
      name: asset?.templateName || context.templateName,
      shortName: asset?.uid,
      description: description.value,
      extDetailPageUrl: asset?.adminDetailPagePath,
      extCategory: adminCategory,
      extMainTag: primaryTag,
      type: normalizedType,
      cost: priceCents === undefined ? undefined : String(priceCents),
    },
    ...(description.warning ? { admin_form_warnings: [description.warning] } : {}),
  };
}

function missingFields(formData: AdminTemplateFillFormData): string[] {
  return REQUIRED_ADMIN_FORM_FIELDS.filter((field) => {
    const value = formData.admin_form[field];
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    return false;
  }).map((field) => `admin_form.${field}`);
}

function compactForConsole(formData: AdminTemplateFillFormData): Record<string, string> {
  const adminForm = formData.admin_form;
  return {
    name: adminForm.name ?? '',
    shortName: adminForm.shortName ?? '',
    description: adminForm.description ?? '',
    extDetailPageUrl: adminForm.extDetailPageUrl ?? '',
    extCategory: adminForm.extCategory ?? '',
    extMainTag: adminForm.extMainTag ?? '',
    type: adminForm.type ?? '',
    cost: adminForm.cost ?? '',
  };
}

export function buildAdminTemplateFillConsoleScript(formData: AdminTemplateFillFormData): string {
  const data = JSON.stringify(compactForConsole(formData), null, 2);
  return `(() => {
  const data = ${data};
  const mappings = [
    ['name', data.name],
    ['shortName', data.shortName],
    ['description', data.description],
    ['extDetailPageUrl', data.extDetailPageUrl],
    ['extCategory', data.extCategory],
    ['extMainTag', data.extMainTag],
    ['type', data.type],
    ['cost', data.cost],
  ];
  const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const createTemplateForm = () =>
    document.querySelector('form[action="/admin/templates"]') ||
    Array.from(document.querySelectorAll('form')).find((form) => form.querySelector('[name="name"]') && form.querySelector('[name="shortName"]') && form.querySelector('[name="extDetailPageUrl"]'));
  const setNativeValue = (element, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
    if (descriptor && typeof descriptor.set === 'function') descriptor.set.call(element, value);
    else element.value = value;
  };
  const setControl = (element, value) => {
    if (!element || !value) return false;
    if (element instanceof HTMLSelectElement) {
      const normalizedValue = normalize(value);
      const option = Array.from(element.options).find((candidate) => {
        const optionText = normalize(candidate.textContent || candidate.value);
        return normalize(candidate.value) === normalizedValue || optionText === normalizedValue;
      });
      if (option) element.value = option.value;
      else return false;
    } else {
      setNativeValue(element, value);
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  const form = createTemplateForm();
  const report = mappings.map(([name, value]) => {
    const element = form?.querySelector(\`[name="\${name}"]\`) || document.querySelector(\`form[action="/admin/templates"] [name="\${name}"]\`);
    const filled = setControl(element, value);
    return {
      field: name,
      selector: \`form[action="/admin/templates"] [name="\${name}"]\`,
      expected: value,
      found: Boolean(element),
      filled,
      actual: element && 'value' in element ? element.value : undefined,
    };
  });
  console.table(report);
  if (!form) console.error('Template Review Admin fill helper: could not find the create-template form at /admin/templates.');
  console.warn('Template Review Admin fill helper: fill-only script. It does not submit the form, create an MRP, or write Airtable. Review all fields manually before taking any Admin action.');
})();`;
}

function bookmarkletFromScript(script: string): string {
  return `javascript:${encodeURIComponent(script.replace(/\s+/g, ' ').trim())}`;
}

export function prepareAdminTemplateFill(context: TemplateReviewContext, options: AdminTemplateFillOptions = {}): AdminTemplateFillBundle {
  const formData = buildFormData(context);
  const consoleScript = options.includeScript === false ? undefined : buildAdminTemplateFillConsoleScript(formData);
  const bundle: AdminTemplateFillBundle = {
    schema_version: 'webflow_admin_template_fill.v0.1',
    source: {
      asset_id: context.assetId,
      version_id: context.versionId,
      template_name: context.asset?.templateName || context.templateName,
    },
    readiness: {
      review_status: context.reviewStatus,
      can_publish: context.canPublish,
      ...(context.canPublish
        ? {}
        : {
            warning:
              'This bundle is for Admin form preparation only. The template version is not currently publish-ready according to MCP capability flags.',
          }),
    },
    admin_url: 'https://webflow.com/admin/templates',
    form_data: formData,
    missing_fields: missingFields(formData),
    manual_uploads: {
      thumbnail_image_url: formData.thumbnail_image_url,
      secondary_thumbnail_urls: formData.secondary_thumbnail_urls ?? [],
      carousel_image_urls: formData.carousel_image_urls ?? [],
    },
    safety_boundary: [
      'Read-only MCP tool: does not write Airtable.',
      'Generated browser script is fill-only: it does not submit the Admin form.',
      'Generated browser script does not create an MRP or complete publishing.',
      'Reviewer must verify Admin UI mappings and approval state before any final action.',
    ],
    ...(consoleScript ? { console_script: consoleScript } : {}),
  };

  if (options.includeBookmarklet !== false && consoleScript) {
    bundle.bookmarklet = bookmarkletFromScript(consoleScript);
  }

  return bundle;
}

export function prepareAdminTemplateFillBatch(contexts: TemplateReviewContext[], options: AdminTemplateFillOptions = {}) {
  const includeScript = options.includeScript ?? false;
  const includeBookmarklet = options.includeBookmarklet ?? false;
  return {
    schema_version: 'webflow_admin_template_fill_batch.v0.1' as const,
    count: contexts.length,
    include_scripts: includeScript,
    items: contexts.map((context) =>
      prepareAdminTemplateFill(context, {
        includeScript,
        includeBookmarklet,
      }),
    ),
  };
}

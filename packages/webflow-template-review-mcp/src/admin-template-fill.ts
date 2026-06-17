import type { TemplateReviewContext } from './airtable.js';

export interface AdminTemplateFillOptions {
  includeScript?: boolean;
  includeBookmarklet?: boolean;
}

export interface AdminTemplateFillFormData {
  template_name?: string;
  uid?: string;
  detail_page_path?: string;
  recommended_type?: string;
  price_usd?: number;
  price_cents?: number;
  category_display_name?: string;
  category_cms_slug?: string;
  short_description?: string;
  long_description_html?: string;
  published_site_url?: string;
  preview_site_url?: string;
  thumbnail_image_url?: string;
  secondary_thumbnail_urls?: string[];
  carousel_image_urls?: string[];
  feature_names?: string[];
  features_highlighted?: string;
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

const REQUIRED_FORM_FIELDS: Array<keyof AdminTemplateFillFormData> = [
  'template_name',
  'uid',
  'detail_page_path',
  'recommended_type',
  'price_usd',
  'category_display_name',
  'short_description',
  'long_description_html',
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

function buildFormData(context: TemplateReviewContext): AdminTemplateFillFormData {
  const asset = context.asset;
  const price = priceUsd(context);
  return {
    template_name: asset?.templateName || context.templateName,
    uid: asset?.uid,
    detail_page_path: asset?.adminDetailPagePath,
    recommended_type: asset?.adminRecommendedType,
    ...(price === undefined
      ? {}
      : {
          price_usd: price,
          price_cents: Math.round(price * 100),
        }),
    category_display_name: firstValue(asset?.categoryGroupDisplayNames),
    category_cms_slug: firstValue(asset?.categoryGroupCmsSlugs),
    short_description: asset?.descriptionShort,
    long_description_html: asset?.descriptionLongHtml,
    published_site_url: asset?.websiteUrl,
    preview_site_url: asset?.previewSiteUrl,
    thumbnail_image_url: asset?.thumbnailImageUrl,
    secondary_thumbnail_urls: asset?.secondaryThumbnailUrls ?? [],
    carousel_image_urls: asset?.carouselImageUrls ?? [],
    feature_names: asset?.features?.map((feature) => feature.name).filter(Boolean),
    features_highlighted: asset?.featuresHighlighted,
  };
}

function missingFields(formData: AdminTemplateFillFormData): string[] {
  return REQUIRED_FORM_FIELDS.filter((field) => {
    const value = formData[field];
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    return false;
  });
}

function compactForConsole(formData: AdminTemplateFillFormData): Record<string, string> {
  return {
    template_name: formData.template_name ?? '',
    uid: formData.uid ?? '',
    detail_page_path: formData.detail_page_path ?? '',
    recommended_type: formData.recommended_type ?? '',
    price_usd: formData.price_usd === undefined ? '' : String(formData.price_usd),
    category_display_name: formData.category_display_name ?? '',
    category_cms_slug: formData.category_cms_slug ?? '',
    short_description: formData.short_description ?? '',
    long_description_html: formData.long_description_html ?? '',
  };
}

export function buildAdminTemplateFillConsoleScript(formData: AdminTemplateFillFormData): string {
  const data = JSON.stringify(compactForConsole(formData), null, 2);
  return `(() => {
  const data = ${data};
  const mappings = [
    { key: 'template_name', labels: ['Template name', 'Template Name', 'Name'] },
    { key: 'uid', labels: ['UID', 'Slug'] },
    { key: 'detail_page_path', labels: ['Detail Page Path', 'Template URL', 'Path'] },
    { key: 'recommended_type', labels: ['Recommended Type', 'Type'] },
    { key: 'price_usd', labels: ['Price', 'Template Price'] },
    { key: 'category_display_name', labels: ['Category', 'Category Group'] },
    { key: 'category_cms_slug', labels: ['Category Slug', 'CMS Slug'] },
    { key: 'short_description', labels: ['Short Description', 'Description Short'] },
    { key: 'long_description_html', labels: ['Long Description', 'Description Long', 'HTML'] },
  ];
  const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const controls = () => Array.from(document.querySelectorAll('input, textarea, select, [contenteditable="true"]'));
  const setNativeValue = (element, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
    if (descriptor && typeof descriptor.set === 'function') descriptor.set.call(element, value);
    else element.value = value;
  };
  const findForLabels = (labels) => {
    const needles = labels.map(normalize).filter(Boolean);
    for (const label of Array.from(document.querySelectorAll('label'))) {
      const text = normalize(label.textContent);
      if (!needles.some((needle) => text.includes(needle))) continue;
      if (label.htmlFor) {
        const byId = document.getElementById(label.htmlFor);
        if (byId) return byId;
      }
      const nested = label.querySelector('input, textarea, select, [contenteditable="true"]');
      if (nested) return nested;
      const row = label.closest('div, li, section, fieldset');
      const inRow = row?.querySelector('input, textarea, select, [contenteditable="true"]');
      if (inRow) return inRow;
    }
    return controls().find((control) => {
      const haystack = normalize([
        control.getAttribute('name'),
        control.getAttribute('aria-label'),
        control.getAttribute('placeholder'),
        control.id,
      ].filter(Boolean).join(' '));
      return needles.some((needle) => haystack.includes(needle));
    });
  };
  const setControl = (element, value, key) => {
    if (!element || !value) return false;
    if (element instanceof HTMLSelectElement) {
      const normalizedValue = normalize(value);
      const option = Array.from(element.options).find((candidate) => {
        const optionText = normalize(candidate.textContent || candidate.value);
        return optionText === normalizedValue || optionText.includes(normalizedValue) || normalizedValue.includes(optionText);
      });
      if (option) element.value = option.value;
      else return false;
    } else if (element.isContentEditable) {
      if (/html/i.test(key)) element.innerHTML = value;
      else element.textContent = value;
    } else {
      setNativeValue(element, value);
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  const report = mappings.map((mapping) => {
    const value = data[mapping.key];
    const element = findForLabels(mapping.labels);
    return { field: mapping.key, found: Boolean(element), filled: setControl(element, value, mapping.key) };
  });
  console.table(report);
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

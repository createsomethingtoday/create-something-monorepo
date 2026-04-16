const BLOCKED_AI_TOKEN = /\bai\b/i;
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

export const TEMPLATE_PREVIEW_URL_PREFIX = 'https://preview.webflow.com/preview/';
export const TEMPLATE_PRICE_OPTIONS = ['Free', 'Paid'] as const;
export const TEMPLATE_THUMBNAIL_DIMENSIONS = { width: 750, height: 995 } as const;
export const TEMPLATE_GALLERY_DIMENSIONS = { width: 1440, height: 900 } as const;
export const TEMPLATE_THUMBNAIL_MAX_SIZE = 300 * 1024;
export const TEMPLATE_GALLERY_MAX_SIZE = 250 * 1024;

export const TEMPLATE_PRIMARY_TAGS = [
  'Accessories',
  'Accounting',
  'Admin',
  'Agency',
  'Agriculture',
  'App',
  'Architecture',
  'Artist',
  'Attorney',
  'Automotive',
  'Band',
  'Bank',
  'Bar',
  'Barber',
  'Beauty',
  'Beauty & Wellness',
  'Blog',
  'Book',
  'Business',
  'Cafe',
  'Cars',
  'Charity',
  'Church',
  'Coaching',
  'Coffee Shop',
  'College',
  'Coming Soon',
  'Conference',
  'Construction',
  'Consulting',
  'Corporate',
  'Countdown',
  'Creative',
  'CV',
  'Dance',
  'Dashboard',
  'Delivery',
  'Dentist',
  'Design',
  'Designer',
  'Directory',
  'DJ',
  'Doctor',
  'Documentation',
  'Donation',
  'Education',
  'Entertainment',
  'Error',
  'Event',
  'Farm',
  'Fashion',
  'Film',
  'Finance',
  'Fitness',
  'Florist',
  'Food',
  'Food & Drink',
  'Furniture',
  'Game',
  'Guesthouse',
  'Gym',
  'Health',
  'Help center',
  'Homeware',
  'Hospital',
  'Hostel',
  'Hotel',
  'Inn',
  'Insurance',
  'Interior design',
  'Investment',
  'IT company',
  'Jewelry',
  'Job Portal',
  'Kids',
  'Landing page',
  'Law Firm',
  'Learning',
  'Lifestyle',
  'Logistics',
  'Magazine',
  'Marketing',
  'Marketplace',
  'Massage',
  'Medical',
  'Mobile',
  'Movie',
  'Multi Layout',
  'Music',
  'Musician',
  'News',
  'Newsletter',
  'Newspaper',
  'Nonprofit',
  'One Page',
  'Other',
  'Personal',
  'Pets',
  'Photography',
  'Photography & Video',
  'Podcast',
  'Political',
  'Portfolio',
  'Profile',
  'Radio',
  'Real Estate',
  'Recipe',
  'Recruitment',
  'Religion',
  'Restaurant',
  'Resume',
  'Retail',
  'SaaS',
  'Salon',
  'School',
  'Shop',
  'Small Business',
  'Soccer',
  'Social',
  'Software',
  'Spa',
  'Sports',
  'Startup',
  'Support',
  'Technology',
  'Therapy',
  'Tourism',
  'Transport',
  'Travel',
  'UI Kit',
  'Under Construction',
  'University',
  'Veterinary',
  'Video',
  'Wedding',
  'Wellness',
  'Winery'
] as const;

export const TEMPLATE_FORBIDDEN_CATEGORY_NAMES = [
  'Advocacy & Campaigns',
  'Agency',
  'Agriculture',
  'App',
  'Architecture',
  'Architecture & Design',
  'Art & Design Blog',
  'Arts & Crafts Store',
  'Bakery',
  'Banking & Investment',
  'Bar & Nightclub',
  'Beauty & Wellness Store',
  'Blog & Editorial',
  'Blockchain, Cryptocurrency & NFTs',
  'Book',
  'Books & Publishers Store',
  'Business & Finance Blog',
  'Cafe & Coffee Shop',
  'Cars',
  'Catering & Delivery',
  'Charity & Fundraising',
  'Chiropractor & Physiotherapist',
  'Classes & Courses',
  'Cleaning',
  'Clinic & Pharmacy',
  'College / University',
  'Coming Soon',
  'Community & Non-Profits',
  'Construction & Home Services',
  'Consulting & Coaching',
  'Creative Agency',
  'Creators & Influencers',
  'Culture, Performance & Entertainment',
  'Dance',
  'Dentist',
  'Design Portfolio',
  'Digital Products Store',
  'Documentation',
  'Documentation & Help Center',
  'Doctor',
  'Early Education',
  'Education',
  'Electronics Store',
  'Environment',
  'Event Production',
  'Events',
  'Events, Conferences & Meetups',
  'Fashion & Clothing Store',
  'Film & TV',
  'Finance & Accounting',
  'Fitness & Gym',
  'Florist & Plants Store',
  'Food & Drink',
  'Food & Drinks Store',
  'Food & Recipe Blog',
  'Foundations & NGO',
  'Freelancers & Consultants',
  'Furniture',
  'Gallery & Museum',
  'Gaming',
  'Government & Political',
  'Hair & Beauty',
  'Health & Nutrition',
  'Health & Wellness',
  'Home Construction',
  'Home Decor Store',
  'Home Services & Maintenance',
  'Hospital',
  'Hotels & Lodging',
  'HR & Recruiting',
  'Insurance',
  'Interior Design',
  'Jewelry & Accessories Store',
  'Job Portal',
  'Kids & Babies Store',
  'Landing',
  'Landscaping & Gardening',
  'Law Firm & Attorney',
  'Lifestyle Blog',
  'Magazine',
  'Makeup & Cosmetics',
  'Marketing & Advertising',
  'Medical',
  'Mobile App',
  'Music & Audio',
  'Music Events & Festivals',
  'Music Industry & Promotion',
  'Musicians & Bands',
  'Nature & Conservation',
  'News',
  'Newsletter',
  'Online Education',
  'Outdoor & Adventure',
  'Personal Blog',
  'Pets & Animals Store',
  'Photography & Video Portfolio',
  'Podcast & Radio',
  'Political',
  'Portfolio & Agency',
  'Product Launch / Coming Soon',
  'Professional Services',
  'Property Management & HOA',
  'Public services',
  'Real Estate',
  'Real Estate & Property Management',
  'Recruiting',
  'Religious & Spiritual',
  'Renewable energy',
  'Residential Design',
  'Restaurant',
  'Resume & Personal',
  'Resume & CV',
  'Retail & E-Commerce',
  'Salon & Barbershop',
  'Schools',
  'Software & SaaS',
  'Spa',
  'Sports',
  'Sports & Outdoors Store',
  'Startup',
  'Support/Help center',
  'Sustainability',
  'Tattoo',
  'Tech',
  'Technology',
  'Therapy & Psychology',
  'Tourism',
  'Transport',
  'Transportation & Automotive',
  'Travel & Hospitality',
  'Travel Blog',
  'UI Kit',
  'UI Kit & Landing Page Components',
  'Veterinary',
  'Volunteer & Community',
  'Vows',
  'Waitlist',
  'Weddings',
  'Weddings & Events',
  'Winery'
] as const;

export const TEMPLATE_SITE_TYPE_OPTIONS = [
  { id: 'static', label: 'Static pages' },
  { id: 'cms', label: 'CMS collections' },
  { id: 'ecommerce', label: 'Ecommerce' },
  { id: 'multi-layout', label: 'Multi layout' }
] as const;

export const TEMPLATE_FEATURE_OPTIONS = [
  { id: 'gsap', label: 'GSAP animations' },
  { id: 'cms', label: 'CMS' },
  { id: 'ecommerce', label: 'Ecommerce' },
  { id: 'interactions', label: 'Advanced interactions' },
  { id: 'components', label: 'Reusable components' },
  { id: 'memberships', label: 'Memberships' },
  { id: 'localization', label: 'Localization' },
  { id: 'dark-mode', label: 'Dark mode' }
] as const;

export const TEMPLATE_CATEGORY_OPTIONS = [...TEMPLATE_FORBIDDEN_CATEGORY_NAMES].sort(
  (left, right) => left.localeCompare(right)
);

export type TemplatePriceOption = (typeof TEMPLATE_PRICE_OPTIONS)[number];
export type TemplateSiteTypeOption = (typeof TEMPLATE_SITE_TYPE_OPTIONS)[number]['id'];
export type TemplateFeatureOption = (typeof TEMPLATE_FEATURE_OPTIONS)[number]['id'];

export interface TemplateNameSyntaxResult {
  valid: boolean;
  errors: string[];
  matchedForbiddenTokens: string[];
}

export interface ParsedTemplateDraftFields {
  category: string;
  tags: string[];
  styleTags: string[];
  siteTypes: string[];
  featureFlags: string[];
  longDescription: string;
  notes: string;
  priceModel: string;
}

export interface TemplateDetailsInput {
  category?: string;
  tags?: string[];
  styleTags?: string[];
  siteTypes?: string[];
  featureFlags?: string[];
  longDescription?: string;
  notes?: string;
  publishedUrl?: string;
}

export function normalizeCommaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinCommaList(values: string[]): string {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .join(', ');
}

export function findInvalidValues(values: string[], allowed: readonly string[]): string[] {
  const allowedSet = new Set(allowed);
  return values.filter((value) => !allowedSet.has(value));
}

export function isTemplatePriceOption(value: string): value is TemplatePriceOption {
  return (TEMPLATE_PRICE_OPTIONS as readonly string[]).includes(value);
}

export function isTemplateSiteTypeOption(value: string): value is TemplateSiteTypeOption {
  return TEMPLATE_SITE_TYPE_OPTIONS.some((option) => option.id === value);
}

export function isTemplateFeatureOption(value: string): value is TemplateFeatureOption {
  return TEMPLATE_FEATURE_OPTIONS.some((option) => option.id === value);
}

export function normalizeTemplatePreviewUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.includes(TEMPLATE_PREVIEW_URL_PREFIX)) {
    throw new Error(`Preview URL must contain ${TEMPLATE_PREVIEW_URL_PREFIX}.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Preview URL is invalid.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Preview URL is invalid.');
  }

  return parsed.toString();
}

export function validateTemplateNameSyntax(value: string): TemplateNameSyntaxResult {
  const name = value.trim();
  const errors: string[] = [];

  if (!name) {
    return {
      valid: false,
      errors: ['Template name is required.'],
      matchedForbiddenTokens: []
    };
  }

  if (!firstWordStartsWithCapital(name)) {
    errors.push('The first word must start with a capital letter.');
  }

  if (EMOJI_REGEX.test(name)) {
    errors.push('Template names cannot contain emoji.');
  }

  if (BLOCKED_AI_TOKEN.test(name) && !/\bair\b/i.test(name)) {
    errors.push('Template names cannot use the standalone term "AI".');
  }

  const normalized = name.toLowerCase();
  const forbiddenTokens = [...TEMPLATE_PRIMARY_TAGS, ...TEMPLATE_FORBIDDEN_CATEGORY_NAMES].filter(
    (token) => normalized.includes(token.toLowerCase())
  );

  if (forbiddenTokens.length > 0) {
    errors.push('Template names cannot contain category or tag labels.');
  }

  return {
    valid: errors.length === 0,
    errors,
    matchedForbiddenTokens: [...new Set(forbiddenTokens)]
  };
}

export function buildTemplateMetadataDescription(input: TemplateDetailsInput): string {
  const featureFlags = uniqueValues(input.featureFlags || []);
  const siteTypes = uniqueValues(input.siteTypes || []);
  const tags = uniqueValues(input.tags || []);
  const lines = [
    input.category?.trim() ? `Category: ${input.category.trim()}` : '',
    tags.length > 0 ? `Tags: ${tags.join(', ')}` : '',
    siteTypes.length > 0 ? `Site types: ${siteTypes.join(', ')}` : '',
    featureFlags.length > 0 ? `Features: ${featureFlags.join(', ')}` : '',
    input.notes?.trim() ? `Notes: ${input.notes.trim()}` : ''
  ];

  return lines.filter(Boolean).join('\n');
}

export function buildTemplateDetailsHtml(input: TemplateDetailsInput): string {
  const featureFlags = uniqueValues(input.featureFlags || []);
  const siteTypes = uniqueValues(input.siteTypes || []);
  const tags = uniqueValues(input.tags || []);
  const styleTags = uniqueValues(input.styleTags || []);

  return [
    `<h2>Submission notes</h2>${toParagraphs(input.longDescription || '')}`,
    input.notes?.trim() ? `<h3>Internal notes</h3>${toParagraphs(input.notes)}` : '',
    '<h3>Metadata</h3>',
    '<ul>',
    input.category?.trim() ? `<li>Category: ${escapeHtml(input.category.trim())}</li>` : '',
    tags.length > 0 ? `<li>Tags: ${escapeHtml(tags.join(', '))}</li>` : '',
    styleTags.length > 0 ? `<li>Style tags: ${escapeHtml(styleTags.join(', '))}</li>` : '',
    siteTypes.length > 0 ? `<li>Site types: ${escapeHtml(siteTypes.join(', '))}</li>` : '',
    featureFlags.length > 0 ? `<li>Feature flags: ${escapeHtml(featureFlags.join(', '))}</li>` : '',
    input.publishedUrl?.trim()
      ? `<li>Published URL verified: ${escapeHtml(input.publishedUrl.trim())}</li>`
      : '',
    featureFlags.includes('gsap') ? '<li>GSAP detected during published-site crawl.</li>' : '',
    '</ul>'
  ]
    .filter(Boolean)
    .join('');
}

export function parseTemplateDraftFields(input: {
  category?: string;
  description?: string;
  descriptionLongHtml?: string;
  priceString?: string;
}): ParsedTemplateDraftFields {
  const summaryFields = parseLabelledLines(input.description || '');
  const metadataFields = parseMetadataListItems(input.descriptionLongHtml || '');

  return {
    category: summaryFields.get('Category') || input.category?.trim() || '',
    tags: normalizeCommaList(summaryFields.get('Tags') || ''),
    styleTags: normalizeCommaList(metadataFields.get('Style tags') || ''),
    siteTypes: normalizeCommaList(summaryFields.get('Site types') || ''),
    featureFlags: normalizeCommaList(summaryFields.get('Features') || ''),
    longDescription: extractSectionText(input.descriptionLongHtml || '', '<h2>Submission notes</h2>', [
      '<h3>Internal notes</h3>',
      '<h3>Metadata</h3>'
    ]),
    notes:
      extractSectionText(input.descriptionLongHtml || '', '<h3>Internal notes</h3>', [
        '<h3>Metadata</h3>'
      ]) ||
      summaryFields.get('Notes') ||
      '',
    priceModel: isTemplatePriceOption(input.priceString?.trim() || '')
      ? (input.priceString?.trim() as TemplatePriceOption)
      : ''
  };
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function firstWordStartsWithCapital(value: string): boolean {
  const firstWord = value.trim().split(/\s+/)[0] || '';
  const firstCharacter = firstWord.charAt(0);
  if (!firstCharacter) return false;
  return (
    firstCharacter === firstCharacter.toUpperCase() &&
    firstCharacter !== firstCharacter.toLowerCase()
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function toParagraphs(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function parseLabelledLines(value: string): Map<string, string> {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((fields, line) => {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        fields.set(match[1].trim(), match[2].trim());
      }
      return fields;
    }, new Map<string, string>());
}

function parseMetadataListItems(html: string): Map<string, string> {
  const items = new Map<string, string>();
  for (const match of html.matchAll(/<li>([^:<]+):\s*([\s\S]*?)<\/li>/gi)) {
    const label = decodeHtmlEntities(stripTags(match[1]).trim());
    const value = decodeHtmlEntities(stripTags(match[2]).trim());
    if (label) {
      items.set(label, value);
    }
  }
  return items;
}

function extractSectionText(html: string, startMarker: string, endMarkers: string[]): string {
  const startIndex = html.indexOf(startMarker);
  if (startIndex === -1) return '';

  const sectionStart = startIndex + startMarker.length;
  let sectionEnd = html.length;
  for (const marker of endMarkers) {
    const index = html.indexOf(marker, sectionStart);
    if (index !== -1 && index < sectionEnd) {
      sectionEnd = index;
    }
  }

  return htmlToText(html.slice(sectionStart, sectionEnd));
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<\/li>\s*<li>/gi, '\n')
      .replace(/<\/?p>/gi, '')
      .replace(/<\/?ul>/gi, '')
      .replace(/<\/?li>/gi, '')
      .replace(/<[^>]+>/g, '')
  ).trim();
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, '');
}

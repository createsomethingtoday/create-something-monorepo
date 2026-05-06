// Contract for the Airtable Automation webhook that ingests Webflow form submissions
// from https://webflow.com/templates/submit-a-template.
//
// Airtable branches on `payload.name`:
//   - "Marketplace Creator Submission" → creator onboarding
//   - "Marketplace Template Submission" → template submission
//
// All `data` values are emitted as strings — booleans are serialized "true" / "false",
// numbers as their decimal representation, multi-select groups as JSON-stringified arrays.

export const MARKETPLACE_WEBHOOK_URL =
  'https://hooks.airtable.com/workflows/v1/genericWebhook/appMoIgXMTTTNIc3p/wflrLKII59WwoyKbW/wtrvX1lGRKcax51UY';

export type MarketplaceFormName =
  | 'Marketplace Creator Submission'
  | 'Marketplace Template Submission';

export interface MarketplaceWebhookEnvelope<
  TData extends Record<string, string> = Record<string, string>,
> {
  triggerType: 'form_submission';
  payload: MarketplaceWebhookPayload<TData>;
}

export interface MarketplaceWebhookPayload<
  TData extends Record<string, string> = Record<string, string>,
> {
  name: MarketplaceFormName;
  siteId: string;
  data: TData;
  submittedAt: string;
  id: string;
  formId: string;
  formElementId: string;
  pageId: string;
  publishedPath: string;
  pageUrl: string;
  schema?: MarketplaceFieldSchema[];
}

export interface MarketplaceFieldSchema {
  fieldName: string;
  fieldType: string;
  fieldElementId: string;
}

export const MARKETPLACE_WEBFLOW_SITE_ID = '5e593fb060cf87bbaf75dd20';
export const MARKETPLACE_FORM_ID = '65df88773ce2f2aa0b00bc47';
export const MARKETPLACE_PAGE_ID = '654a57c9583f8111cb371d48';
export const MARKETPLACE_PUBLISHED_PATH = '/submit-a-template';
export const MARKETPLACE_PAGE_URL =
  'https://webflow.com/templates/submit-a-template?section=submit-today';

export const CREATOR_FORM_ELEMENT_ID = '9486b88a-babb-e405-3638-e41885173b65';
export const TEMPLATE_FORM_ELEMENT_ID = 'af623992-b800-91e3-0c96-60996cad3ade';

// -----------------------------------------------------------------------------
// Creator form
// -----------------------------------------------------------------------------

export interface CreatorSubmissionInput {
  selectedCountry: string;
  primaryEmail: string;
  webflowEmail: string;
  preferredName?: string;
  legalName: string;
  personalWebsiteUrl?: string;
  creatorBio: string;
  profileImageUrl: string;
  agreeToWebflowTerms: boolean;
  isCreatorEmailValidated: boolean;
  isWebflowEmailValidated: boolean;
  utm?: UtmParams;
}

export type CreatorSubmissionData = Record<string, string> & {
  'Selected Country': string;
  'Primary Email': string;
  'Is Creator Email Validated?': string;
  'Webflow Email': string;
  'Is Webflow Email Validated?': string;
  'Preferred Name': string;
  'Legal Name': string;
  'Personal Website URL': string;
  'Creator Bio': string;
  'Agree To Webflow Terms': string;
  'Profile Image': string;
};

// -----------------------------------------------------------------------------
// Template form
// -----------------------------------------------------------------------------

export type PageCount = 'One' | 'Multi' | 'Multi-layout';
export type PaymentType = 'Free' | 'Paid';

export const TEMPLATE_CATEGORIES = [
  'Advocacy & Campaigns', 'Agriculture', 'Architecture', 'AI', 'Art & Design Blog',
  'Arts & Crafts Store', 'Bakery', 'Banking & Investment', 'Bar & Nightclub',
  'Beauty & Wellness Store', 'Blockchain', 'Book', 'Books & Publishers Store',
  'Business & Finance Blog', 'Cafe & Coffee Shop', 'Cars', 'Catering & Delivery',
  'Charity & Fundraising', 'Chiropractor & Physiotherapist', 'Classes & Courses',
  'Cleaning', 'Clinic & Pharmacy', 'College / University', 'Coming Soon',
  'Consulting & Coaching', 'Creative Agency', 'Creators & Influencers',
  'Cryptocurrency & NFTs', 'Dance', 'Dentist', 'Design Portfolio',
  'Digital Products Store', 'Doctor', 'Documentation', 'Early Education',
  'Electronics Store', 'Event Production', 'Events', 'Fashion & Clothing Store',
  'Film & TV', 'Finance & Accounting', 'Fitness & Gym', 'Florist & Plants Store',
  'Food & Drinks Store', 'Food & Recipe Blog', 'Foundations & NGO',
  'Freelancers & Consultants', 'Gallery & Museum', 'Gaming', 'Health & Nutrition',
  'Home Construction', 'Home Decor Store', 'Home Services & Maintenance', 'Hospital',
  'Hotels & Lodging', 'Insurance', 'Interior Design', 'IT company',
  'Jewelry & Accessories Store', 'Job Portal', 'Kids & Babies Store',
  'Landscaping & Gardening', 'Law Firm & Attorney', 'Lifestyle Blog', 'Magazine',
  'Makeup & Cosmetics', 'Marketing & Advertising', 'Mobile App',
  'Music Events & Festivals', 'Music Industry & Promotion', 'Musicians & Bands',
  'Nature & Conservation', 'News', 'Newsletter', 'Online Education',
  'Outdoor & Adventure', 'Personal Blog', 'Pets & Animals Store',
  'Photography & Video Portfolio', 'Podcast & Radio', 'Political',
  'Property Management & HOA', 'Public services', 'Real Estate', 'Recruiting',
  'Religious & Spiritual', 'Renewable energy', 'Restaurant', 'Resume & CV',
  'Residential Design', 'Salon & Barbershop', 'Schools', 'Software & SaaS', 'Spa',
  'Sports', 'Sports & Outdoors Store', 'Startup', 'Support/Help center',
  'Sustainability', 'Tattoo', 'Therapy & Psychology',
  'Transportation & Logistics', 'Travel & Tourism', 'Travel Blog', 'UI Kit',
  'Veterinary', 'Volunteer & Community', 'Waitlist', 'Weddings', 'Winery',
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_STYLES = [
  'Bold', 'Corporate', 'Dark', 'Illustration', 'Light',
  'Minimal', 'Modern', 'Playful', 'Retro',
] as const;
export type TemplateStyle = (typeof TEMPLATE_STYLES)[number];

export const TEMPLATE_FEATURES = [
  'GSAP', 'Responsive Design', 'Responsive Navigation', 'Responsive Slider',
  'Media Lightbox', 'Background Video', '3D Transforms', 'Interactions', 'Forms',
  'Symbols', 'CSS Grid', 'Custom 404 Page', 'Web Fonts', 'Retina Ready',
] as const;
export type TemplateFeature = (typeof TEMPLATE_FEATURES)[number];

export interface TemplateSubmissionInput {
  creatorName: string;
  creatorEmail: string;
  isTemplateUserEmailValidated: boolean;

  templateName: string;
  isTemplateNameValidated: boolean;
  publishedUrl: string;
  isPublishedUrlValidated: boolean;
  previewUrl: string;

  paymentType: PaymentType;
  pageCount: PageCount;

  templateTypeCms: boolean;
  templateTypeEcommerce: boolean;

  price?: number;

  categories: readonly string[];
  styles: readonly string[];
  features: readonly string[];

  shortDescription: string;
  longDescription: string;
  notes?: string;

  thumbnailImageUrl: string;
  thumbnailImageSecondaryUrl: string;
  galleryImageUrls: readonly string[];

  agreeToTerms: boolean;
  acknowledgedChecklist: boolean;

  utm?: UtmParams;
}

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

// -----------------------------------------------------------------------------
// Builders
// -----------------------------------------------------------------------------

const bool = (v: boolean) => (v ? 'true' : 'false');
const str = (v: string | undefined) => v ?? '';

function utmFields(utm: UtmParams | undefined) {
  return {
    'UTM Source': str(utm?.source),
    'UTM Medium': str(utm?.medium),
    'UTM Campaign': str(utm?.campaign),
    'UTM Content': str(utm?.content),
    'UTM Term': str(utm?.term),
  };
}

export function buildCreatorData(input: CreatorSubmissionInput): CreatorSubmissionData {
  return {
    ...utmFields(input.utm),
    'Selected Country': input.selectedCountry,
    'Primary Email': input.primaryEmail,
    'Is Creator Email Validated?': bool(input.isCreatorEmailValidated),
    'Webflow Email': input.webflowEmail,
    'Is Webflow Email Validated?': bool(input.isWebflowEmailValidated),
    'Preferred Name': str(input.preferredName),
    'Legal Name': input.legalName,
    'Personal Website URL': str(input.personalWebsiteUrl),
    'Creator Bio': input.creatorBio,
    'Agree To Webflow Terms': bool(input.agreeToWebflowTerms),
    'Profile Image': input.profileImageUrl,
  };
}

export function buildTemplateData(input: TemplateSubmissionInput): Record<string, string> {
  const gallery = [0, 1, 2, 3, 4].map((i) => input.galleryImageUrls[i] ?? '');
  const priceString = input.price === undefined ? '' : String(input.price);
  const categorySet = new Set(input.categories);
  const styleSet = new Set(input.styles);
  const featureSet = new Set(input.features);

  const data: Record<string, string> = {
    ...utmFields(input.utm),
    'Creator Name': input.creatorName,
    'Creator Email': input.creatorEmail,
    'Is Template User Email Validated?': bool(input.isTemplateUserEmailValidated),
    'Template Name': input.templateName,
    'Is Template Name Validated?': bool(input.isTemplateNameValidated),
    'Published URL': input.publishedUrl,
    'Is Published URL Validated?': bool(input.isPublishedUrlValidated),
    'Preview URL': input.previewUrl,
    'Free or Paid?': input.paymentType,
    'Selected Categories': JSON.stringify(input.categories),
    'Static': input.pageCount,
    'Selected Types': '',
    'Type CMS': bool(input.templateTypeCms),
    'Type Ecommerce': bool(input.templateTypeEcommerce),
    'Selected-Price': priceString,
    'Price': priceString,
    'Template': 'false',
    'Price Estimate 2': '',
    'Selected Styles': JSON.stringify(input.styles.map((s) => s.toLowerCase())),
    'Content Management System': bool(input.templateTypeCms),
    'Ecommerce': bool(input.templateTypeEcommerce),
    'Selected Features': JSON.stringify(input.features),
    'Short Description': input.shortDescription,
    'Field 305': '',
    'Field 306': '',
    'Long-Description': input.longDescription,
    'Field 308': 'true',
    'Notes': str(input.notes),
    'Agree To Webflow Terms Of Service 2': bool(input.agreeToTerms),
    'Template Submission Checklist': bool(input.acknowledgedChecklist),
    'Thumbnail Image': input.thumbnailImageUrl,
    'Thumbnail Image Secondary': input.thumbnailImageSecondaryUrl,
    'Gallery Image 1': gallery[0],
    'Gallery Image 2': gallery[1],
    'Gallery Image 3': gallery[2],
    'Gallery Image 4': gallery[3],
    'Gallery Image 5': gallery[4],
  };

  for (const category of TEMPLATE_CATEGORIES) {
    data[`Category ${category}`] = bool(categorySet.has(category));
  }
  for (const style of TEMPLATE_STYLES) {
    data[`Styles ${style}`] = bool(styleSet.has(style));
  }
  for (const feature of TEMPLATE_FEATURES) {
    data[`Features ${feature}`] = bool(featureSet.has(feature));
  }

  return data;
}

export interface BuildEnvelopeOptions {
  submissionId: string;
  submittedAt?: Date;
}

export function buildCreatorEnvelope(
  input: CreatorSubmissionInput,
  options: BuildEnvelopeOptions,
): MarketplaceWebhookEnvelope<CreatorSubmissionData> {
  return {
    triggerType: 'form_submission',
    payload: {
      name: 'Marketplace Creator Submission',
      siteId: MARKETPLACE_WEBFLOW_SITE_ID,
      data: buildCreatorData(input),
      submittedAt: (options.submittedAt ?? new Date()).toISOString(),
      id: options.submissionId,
      formId: MARKETPLACE_FORM_ID,
      formElementId: CREATOR_FORM_ELEMENT_ID,
      pageId: MARKETPLACE_PAGE_ID,
      publishedPath: MARKETPLACE_PUBLISHED_PATH,
      pageUrl: MARKETPLACE_PAGE_URL,
    },
  };
}

export function buildTemplateEnvelope(
  input: TemplateSubmissionInput,
  options: BuildEnvelopeOptions,
): MarketplaceWebhookEnvelope {
  return {
    triggerType: 'form_submission',
    payload: {
      name: 'Marketplace Template Submission',
      siteId: MARKETPLACE_WEBFLOW_SITE_ID,
      data: buildTemplateData(input),
      submittedAt: (options.submittedAt ?? new Date()).toISOString(),
      id: options.submissionId,
      formId: MARKETPLACE_FORM_ID,
      formElementId: TEMPLATE_FORM_ELEMENT_ID,
      pageId: MARKETPLACE_PAGE_ID,
      publishedPath: MARKETPLACE_PUBLISHED_PATH,
      pageUrl: MARKETPLACE_PAGE_URL,
    },
  };
}

export async function postMarketplaceWebhook(
  envelope: MarketplaceWebhookEnvelope,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  return fetchImpl(MARKETPLACE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
  });
}

// -----------------------------------------------------------------------------
// Normalized asset schema — what the Airtable "Run a script" step emits.
// Useful for first-party code that wants the already-reshaped payload.
// -----------------------------------------------------------------------------

export interface NormalizedAssetPayload {
  creatorEmail: string;
  creatorName: string;
  assetType: 'Template🏗️' | string;
  assetUID: string;
  assetName: string;
  assetCategories: string[];
  assetDescriptionLong: string;
  assetDescriptionShort: string;
  assetFeatures: string[];
  assetImagesCarousel1: string;
  assetImagesCarousel2: string;
  assetImagesCarousel3: string;
  assetImagesCarousel4: string;
  assetImagesCarousel5: string;
  assetImagesThumbnail: string;
  assetImagesThumbnailSecondary: string;
  assetPageCount: PageCount;
  assetPaymentType: PaymentType;
  assetPreviewURL: string;
  assetStyles: string[];
  assetSupportType: string;
  assetTagsFreeform: string;
  assetTagsPrimary: string;
  assetTagsSecondary: string[];
  assetTemplateTypeCMS: boolean;
  assetTemplateTypeEcommerce: boolean;
  assetTemplateTypeMultiLayout: boolean;
  assetWebsiteURL: string;
  staticPrice: number;
  creatorNotes: string;
}

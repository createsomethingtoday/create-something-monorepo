'use client';

import Script from 'next/script';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { appPath } from '../lib/runtime-paths';
import { CountryPicker } from './country-picker';
import { QuillEditor } from './quill-editor';
import {
  ALL_COUNTRIES,
  CATEGORY_OPTIONS,
  TEMPLATE_STYLES,
  WEBFLOW_FEATURES,
  getPricingTiers,
  isSupportedCountry,
  type PageCountOption
} from '../lib/intake/constants';
import {
  getWebPDimensions,
  validateMimeType,
  validateWebP
} from '../vendor/core/upload-validation';

const IMAGE_CONSTRAINTS = {
  avatar: { width: 256, height: 256, maxSize: 100 * 1024, label: 'Profile image' },
  thumbnail: { width: 750, height: 995, maxSize: 300 * 1024, label: 'Thumbnail' },
  'secondary-thumbnail': {
    width: 750,
    height: 995,
    maxSize: 300 * 1024,
    label: 'Secondary thumbnail'
  },
  gallery: { width: 1440, height: 900, maxSize: 250 * 1024, label: 'Gallery image' }
} as const;
const TEMPLATE_ANALYZER_API_BASE = (
  process.env.NEXT_PUBLIC_TEMPLATE_ANALYZER_API_BASE ||
  'https://webflow-template-analyzer.createsomething.workers.dev'
).replace(/\/$/, '');
const TEMPLATE_SEARCH_API_BASE = (
  process.env.NEXT_PUBLIC_TEMPLATE_SEARCH_API_BASE ||
  'https://webflow-template-search.createsomething.workers.dev'
).replace(/\/$/, '');
const TEMPLATE_SUGGESTIONS_TIMEOUT_MS = 90_000;
const ASSET_DASHBOARD_URL = 'https://webflow.com/templates/dashboard/assets';
const FEATURED_TEMPLATES_URL = 'https://webflow.com/templates/featured';
const FEATURED_QUALITY_VISIBLE_COUNT = 4;
const FEATURED_QUALITY_POOL_SIZE = 16;

type ImageKind = keyof typeof IMAGE_CONSTRAINTS;

async function validateImageClient(file: File, kind: ImageKind): Promise<string | null> {
  const c = IMAGE_CONSTRAINTS[kind];
  if (!validateMimeType(file.type)) return `${c.label} must be a WebP file (image/webp).`;
  if (file.size > c.maxSize) {
    return `${c.label} exceeds ${Math.round(c.maxSize / 1024)}KB (${Math.round(file.size / 1024)}KB).`;
  }
  const buf = await file.arrayBuffer();
  if (!validateWebP(buf)) return `${c.label} is not a valid WebP file.`;
  const dims = getWebPDimensions(buf);
  if (!dims) return `Could not read ${c.label.toLowerCase()} dimensions.`;
  if (dims.width !== c.width || dims.height !== c.height) {
    return `${c.label} must be exactly ${c.width}×${c.height} (got ${dims.width}×${dims.height}).`;
  }
  return null;
}

function feedbackClass(tone: Tone) {
  if (tone === 'success') return 'submission-field-feedback submission-field-feedback-success';
  if (tone === 'error') return 'submission-field-feedback submission-field-feedback-error';
  return 'submission-field-feedback submission-field-feedback-info';
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function fieldClassName(isAiUpdated: boolean, extraClassName?: string) {
  return classNames('submission-field', extraClassName, isAiUpdated && 'is-ai-updated');
}

function choiceClassName(
  isSelected: boolean,
  ...extraClassNames: Array<string | false | null | undefined>
) {
  return classNames('submission-choice', ...extraClassNames, isSelected && 'is-selected');
}

type Tone = 'success' | 'error' | 'info';

type StatusMessage = {
  tone: Tone;
  message: string;
  details?: string[];
};

type PublishedUrlValidationResponse = {
  passed?: boolean;
  message?: string;
  validationIssues?: string[];
  normalizedUrl?: string;
  gsapDetected?: boolean;
  legacyIx2Detected?: boolean;
  unicornStudioDetected?: boolean;
  autofill?: TemplateAutofillPayload;
  autofillWarning?: string;
  screenshotCount?: number;
  screenshotsDownloadUrl?: string;
  siteResults?: {
    passedCount?: number;
  };
  error?: string;
};

type RawTemplateAnalyzerPayload = {
  template_name?: string;
  short_description?: string;
  long_description?: string;
  categories?: string[];
  pricing?: string;
  page_type?: string;
  webflow_features_cms?: boolean;
  webflow_features_ecommerce?: boolean;
  styles?: string[];
  features?: string[];
  screenshots?: {
    primary?: string;
    secondary?: string;
    gallery?: string[];
  };
};

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeToken(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function dedupe<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function mapKnownValues(
  values: readonly string[] | undefined,
  allowedValues: readonly string[],
  maxCount?: number
) {
  if (!Array.isArray(values)) return [];

  const lookup = new Map(allowedValues.map((value) => [normalizeToken(value), value]));
  return dedupe(
    values
      .map((value) => lookup.get(normalizeToken(value)))
      .filter((value): value is string => Boolean(value))
  ).slice(0, maxCount);
}

function mapAnalyzerFeatures(values: readonly string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];

  const lookup = new Map<string, string>();
  for (const feature of WEBFLOW_FEATURES) {
    lookup.set(normalizeToken(feature.label), feature.id);
  }
  lookup.set(normalizeToken('Symbols'), 'symbols');
  lookup.set(normalizeToken('Components'), 'symbols');

  return dedupe(
    values
      .map((value) => lookup.get(normalizeToken(value)))
      .filter((value): value is string => Boolean(value))
  );
}

function analyzerLongDescriptionToHtml(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function mapAnalyzerPageCount(value: string | undefined): PageCountOption | undefined {
  if (value === 'one_page') return 'One';
  if (value === 'multi_page') return 'Multi';
  if (value === 'multi_layout') return 'Multi-layout';
  return undefined;
}

function countAnalyzerScreenshots(payload: RawTemplateAnalyzerPayload) {
  const screenshots = payload.screenshots;
  if (!screenshots) return 0;

  return [
    screenshots.primary ? 1 : 0,
    screenshots.secondary ? 1 : 0,
    Array.isArray(screenshots.gallery) ? screenshots.gallery.length : 0
  ].reduce((total, count) => total + count, 0);
}

function mapAnalyzerPayload(payload: RawTemplateAnalyzerPayload): TemplateAutofillPayload {
  return {
    templateName: payload.template_name?.trim() || undefined,
    shortDescription: payload.short_description?.trim() || undefined,
    longDescription: analyzerLongDescriptionToHtml(payload.long_description),
    categories: mapKnownValues(payload.categories, CATEGORY_OPTIONS, 2),
    priceModel:
      payload.pricing === 'Free' || payload.pricing === 'Paid' ? payload.pricing : undefined,
    pageCount: mapAnalyzerPageCount(payload.page_type),
    typeCms: payload.webflow_features_cms === true,
    typeEcommerce: payload.webflow_features_ecommerce === true,
    styles: mapKnownValues(payload.styles, TEMPLATE_STYLES, 2),
    featureIds: mapAnalyzerFeatures(payload.features)
  };
}

function suggestionsFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (/abort|timed out/i.test(message)) {
    return 'Template suggestions took longer than expected. Continue filling the remaining fields manually.';
  }
  return 'Template suggestions are temporarily unavailable. Continue filling the remaining fields manually.';
}

async function fetchTemplateSuggestions(url: string) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), TEMPLATE_SUGGESTIONS_TIMEOUT_MS);

  try {
    const response = await fetch(`${TEMPLATE_ANALYZER_API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });
    const payload = (await response.json().catch(() => ({}))) as RawTemplateAnalyzerPayload & {
      error?: string;
      detail?: string;
    };

    if (!response.ok) {
      throw new Error(
        payload.detail ||
          payload.error ||
          `Template analyzer request failed with status ${response.status}`
      );
    }

    const screenshotCount = countAnalyzerScreenshots(payload);
    return {
      autofill: mapAnalyzerPayload(payload),
      screenshotCount,
      screenshotsDownloadUrl:
        screenshotCount > 0 ? `${TEMPLATE_ANALYZER_API_BASE}/screenshots/download` : undefined
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

type ValidationFailurePayload = {
  validationIssues?: unknown;
  message?: unknown;
  error?: unknown;
};

function validationFailureIssues(data: ValidationFailurePayload) {
  if (!Array.isArray(data.validationIssues)) {
    return [];
  }

  return data.validationIssues
    .filter((issue): issue is string => typeof issue === 'string' && issue.trim().length > 0)
    .map((issue) => issue.trim());
}

function validationFailureMessage(
  response: Response,
  data: ValidationFailurePayload,
  issues = validationFailureIssues(data)
) {
  if (issues.length === 1) {
    return issues[0];
  }
  if (issues.length > 1) {
    return `Published URL validation found ${issues.length} blocking issues.`;
  }
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }
  if (typeof data.error === 'string' && data.error.trim()) {
    return data.error;
  }

  return response.ok
    ? 'Published URL validation failed.'
    : `Published URL validation request failed with HTTP ${response.status}.`;
}

function validationFailureStatus(
  response: Response,
  data: ValidationFailurePayload
): StatusMessage {
  const issues = validationFailureIssues(data);
  return {
    tone: 'error',
    message: validationFailureMessage(response, data, issues),
    details: issues.length > 1 ? issues : undefined
  };
}

type FeedbackAction = {
  label: string;
  onClick: () => void;
};

type TurnstileStep = 'creator' | 'template';

type TurnstileRenderOptions = {
  sitekey: string;
  action: string;
  theme?: 'light' | 'dark' | 'auto';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

type CreatorFormState = {
  country: string;
  primaryEmail: string;
  webflowEmail: string;
  preferredName: string;
  legalName: string;
  websiteUrl: string;
  biography: string;
  avatarFile: File | null;
  agreedToTerms: boolean;
};

type TemplateFormState = {
  creatorName: string;
  creatorEmail: string;
  templateName: string;
  publishedUrl: string;
  previewUrl: string;
  priceModel: '' | 'Free' | 'Paid';
  categories: string[];
  styles: string[];
  pageCount: PageCountOption | '';
  typeCms: boolean;
  typeEcommerce: boolean;
  selectedPrice: number | null;
  shortDescription: string;
  longDescription: string;
  notes: string;
  featureIds: string[];
  thumbnailFile: File | null;
  secondaryThumbnailFile: File | null;
  galleryFiles: File[];
  qualityBenchmarkConfirmed: boolean;
  checklistConfirmed: boolean;
  agreementConfirmed: boolean;
};

type SubmittedTemplateState = {
  name: string;
  warning?: string;
};

type FeaturedTemplateItem = {
  id: string;
  template_slug: string;
  name: string;
  url: string | null;
  creator_name: string | null;
  thumbnail_image_url: string | null;
  thumbnail_image_secondary_url: string | null;
  is_featured: boolean;
  is_free?: boolean;
  template_type?: string | null;
  category_groups?: Array<{ name: string; slug: string; url: string }>;
};

type FeaturedTemplateSearchResponse = {
  items?: FeaturedTemplateItem[];
  pagination?: {
    page?: number;
    total_pages?: number;
  };
};

type TemplateAutofillState = Partial<
  Pick<
    TemplateFormState,
    | 'templateName'
    | 'shortDescription'
    | 'longDescription'
    | 'priceModel'
    | 'pageCount'
    | 'typeCms'
    | 'typeEcommerce'
    | 'categories'
    | 'styles'
    | 'featureIds'
  >
>;

type TemplateAutofillFieldKey =
  | 'templateName'
  | 'shortDescription'
  | 'longDescription'
  | 'categories'
  | 'priceModel'
  | 'pageCount'
  | 'typeCms'
  | 'typeEcommerce'
  | 'styles'
  | 'featureIds';

type TemplateAutofillPayload = {
  templateName?: string;
  shortDescription?: string;
  longDescription?: string;
  categories?: string[];
  priceModel?: 'Free' | 'Paid';
  pageCount?: PageCountOption;
  typeCms?: boolean;
  typeEcommerce?: boolean;
  styles?: string[];
  featureIds?: string[];
};

type TemplateAutofillResult = {
  appliedFields: TemplateAutofillFieldKey[];
  suggestedFields: TemplateAutofillFieldKey[];
};

type TemplateAnalyzerSummary = {
  validationMessage: string;
  appliedFields: TemplateAutofillFieldKey[];
  suggestedFields: TemplateAutofillFieldKey[];
  screenshotCount: number;
  screenshotsDownloadUrl?: string;
  loading?: boolean;
  warning?: string;
};

type VerificationState = {
  primaryEmailVerified: string;
  webflowEmailVerified: string;
  creatorEligibilityEmail: string;
  templateNameVerified: string;
  publishedUrlVerified: string;
  publishedUrlMessage: string;
  gsapDetected: boolean;
};

type SubmissionParentMessage =
  | {
      type?: 'ts-submission:utm';
      params?: Record<string, string>;
    }
  | {
      type?: 'ts-submission:navigate';
      section?: 'join-today' | 'submit-today';
    };

type SubmissionChildMessage =
  | {
      type: 'ts-submission:resize';
      height: number;
    }
  | {
      type: 'ts-submission:scroll-to';
      section: 'join-today' | 'submit-today';
      offsetTop: number;
    };

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const initialCreatorState: CreatorFormState = {
  country: '',
  primaryEmail: '',
  webflowEmail: '',
  preferredName: '',
  legalName: '',
  websiteUrl: '',
  biography: '',
  avatarFile: null,
  agreedToTerms: false
};

const DEFAULT_FEATURE_IDS = WEBFLOW_FEATURES.filter((f) => f.defaultOn).map((f) => f.id);

const AUTOFILL_FIELD_LABELS: Record<TemplateAutofillFieldKey, string> = {
  templateName: 'Template name',
  shortDescription: 'Short description',
  longDescription: 'Long description',
  categories: 'Categories',
  priceModel: 'Price model',
  pageCount: 'Page count',
  typeCms: 'CMS',
  typeEcommerce: 'Ecommerce',
  styles: 'Styles',
  featureIds: 'Features'
};

const initialTemplateState: TemplateFormState = {
  creatorName: '',
  creatorEmail: '',
  templateName: '',
  publishedUrl: '',
  previewUrl: '',
  priceModel: '',
  categories: [],
  styles: [],
  pageCount: '',
  typeCms: false,
  typeEcommerce: false,
  selectedPrice: null,
  shortDescription: '',
  longDescription: '',
  notes: '',
  featureIds: [...DEFAULT_FEATURE_IDS],
  thumbnailFile: null,
  secondaryThumbnailFile: null,
  galleryFiles: [],
  qualityBenchmarkConfirmed: false,
  checklistConfirmed: false,
  agreementConfirmed: false
};

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function shouldAutofillText(current: string, previous?: string) {
  return current.trim() === '' || current === previous;
}

function normalizeRichText(value: string | undefined) {
  return (value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldAutofillRichText(current: string, previous?: string) {
  return (
    normalizeRichText(current) === '' || normalizeRichText(current) === normalizeRichText(previous)
  );
}

function shouldAutofillArray(current: readonly string[], previous?: readonly string[]) {
  return current.length === 0 || arraysEqual(current, previous ?? []);
}

function isAutofilledText(current: string, managed?: string) {
  return Boolean(managed) && current === managed;
}

function isAutofilledRichText(current: string, managed?: string) {
  return Boolean(managed) && normalizeRichText(current) === normalizeRichText(managed);
}

function isAutofilledArray(current: readonly string[], managed?: readonly string[]) {
  return Boolean(managed?.length) && arraysEqual(current, managed ?? []);
}

function isAutofilledBoolean(current: boolean, managed?: boolean) {
  return typeof managed === 'boolean' && current === managed;
}

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesSearch(label: string, query: string) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  const haystack = normalizeSearchValue(label);
  return normalizedQuery.split(/\s+/).every((term) => haystack.includes(term));
}

function sortSelectableLabels(
  options: readonly string[],
  selected: readonly string[],
  query: string
) {
  return [...options]
    .filter((option) => matchesSearch(option, query))
    .sort((left, right) => {
      const leftSelected = selected.includes(left);
      const rightSelected = selected.includes(right);
      if (leftSelected !== rightSelected) {
        return leftSelected ? -1 : 1;
      }
      return left.localeCompare(right);
    });
}

function sortSelectableObjects<T>(
  options: readonly T[],
  selectedIds: readonly string[],
  query: string,
  getLabel: (option: T) => string,
  getId: (option: T) => string
) {
  return [...options]
    .filter((option) => matchesSearch(getLabel(option), query))
    .sort((left, right) => {
      const leftSelected = selectedIds.includes(getId(left));
      const rightSelected = selectedIds.includes(getId(right));
      if (leftSelected !== rightSelected) {
        return leftSelected ? -1 : 1;
      }
      return getLabel(left).localeCompare(getLabel(right));
    });
}

function shouldAutofillPriceModel(
  current: TemplateFormState['priceModel'],
  previous?: TemplateFormState['priceModel']
) {
  return current === '' || current === previous;
}

function normalizeSelectedPrice(
  priceModel: TemplateFormState['priceModel'],
  pageCount: TemplateFormState['pageCount'],
  typeCms: TemplateFormState['typeCms'],
  selectedPrice: TemplateFormState['selectedPrice']
) {
  if (priceModel !== 'Paid') {
    return null;
  }

  if (!pageCount) {
    return null;
  }

  const allowedPrices = getPricingTiers(pageCount, typeCms).prices;
  return selectedPrice !== null && allowedPrices.includes(selectedPrice) ? selectedPrice : null;
}

function shouldAutofillPageCount(
  current: TemplateFormState['pageCount'],
  previous?: TemplateFormState['pageCount']
) {
  return current === '' || current === previous;
}

function shouldAutofillBoolean(current: boolean, previous?: boolean) {
  return current === false || current === previous;
}

function shouldAutofillFeatureIds(current: readonly string[], previous?: readonly string[]) {
  return (
    arraysEqual(current, DEFAULT_FEATURE_IDS) ||
    arraysEqual(current, previous ?? DEFAULT_FEATURE_IDS)
  );
}

async function uploadIntakeFile(
  file: File,
  kind: 'avatar' | 'thumbnail' | 'secondary-thumbnail' | 'gallery',
  email: string
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kind', kind);
  if (email) {
    formData.append('email', email);
  }

  const response = await fetch(appPath('/api/intake/upload'), {
    method: 'POST',
    body: formData
  });

  const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !data.url) {
    throw new Error(data.error || 'Failed to upload file.');
  }

  return data.url;
}

function statusClassName(tone: Tone) {
  if (tone === 'success') return 'submission-status submission-status-success';
  if (tone === 'error') return 'submission-status submission-status-error';
  return 'submission-status submission-status-info';
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileSignature(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function dedupeFiles(files: readonly File[]) {
  const seen = new Set<string>();
  return files.filter((file) => {
    const signature = fileSignature(file);
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function FieldFeedback({
  feedback,
  action
}: {
  feedback?: StatusMessage | null;
  action?: FeedbackAction;
}) {
  if (!feedback) return null;
  return (
    <div className={feedbackClass(feedback.tone)}>
      <span>{feedback.message}</span>
      {feedback.details?.length ? (
        <ul className="submission-field-feedback-list">
          {feedback.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {action ? (
        <>
          {' '}
          <button
            type="button"
            className="submission-inline-action submission-field-feedback-action"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        </>
      ) : null}
    </div>
  );
}

function InlineActionField({
  actionLabel,
  children,
  fieldClassName: fieldClassNameProp,
  feedback,
  feedbackAction,
  onAction
}: {
  actionLabel: string;
  children: ReactNode;
  fieldClassName?: string;
  feedback?: StatusMessage | null;
  feedbackAction?: FeedbackAction;
  onAction: () => void;
}) {
  return (
    <>
      <div className="submission-field-inline">
        <div className={classNames('submission-field', fieldClassNameProp)}>{children}</div>
        <div className="submission-field-inline-action-rail">
          <button
            className="button-sp cc-white submission-inline-verify-button"
            type="button"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        </div>
      </div>
      <FieldFeedback feedback={feedback} action={feedbackAction} />
    </>
  );
}

function AiUpdatedBadge() {
  return <span className="submission-autofill-badge">AI updated</span>;
}

type ChoiceToolbarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  shownCount: number;
  actionLabel?: string;
  onAction?: () => void;
};

function ChoiceToolbar({
  value,
  onChange,
  placeholder,
  ariaLabel,
  shownCount,
  actionLabel,
  onAction
}: ChoiceToolbarProps) {
  return (
    <div className="submission-choice-toolbar">
      <input
        className="field-input input w-input submission-choice-filter"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      <div className="submission-choice-toolbar-meta">
        <span className="field-help">{shownCount} shown</span>
        {actionLabel && onAction ? (
          <button className="submission-inline-action" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SelectedFilesSummary({
  files,
  emptyLabel,
  onRemove
}: {
  files: readonly File[];
  emptyLabel?: ReactNode;
  onRemove?: (signature: string) => void;
}) {
  if (files.length === 0) {
    return emptyLabel ? (
      <div className="field-help submission-selected-files-empty">{emptyLabel}</div>
    ) : null;
  }

  return (
    <div className="submission-selected-files" aria-live="polite">
      {files.map((file) => {
        const signature = fileSignature(file);
        return (
          <div className="submission-selected-file" key={signature}>
            <span className="submission-selected-file-name">{file.name}</span>
            <span className="submission-selected-file-size">{formatFileSize(file.size)}</span>
            {onRemove ? (
              <button
                className="submission-selected-file-remove"
                type="button"
                onClick={() => onRemove(signature)}
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function SelectedChoiceSummary({
  choices,
  onRemove
}: {
  choices: readonly { id: string; label: string }[];
  onRemove: (id: string) => void;
}) {
  if (choices.length === 0) return null;

  return (
    <div className="submission-selected-choices" aria-live="polite">
      {choices.map((choice) => (
        <button
          className="submission-selected-choice"
          type="button"
          key={choice.id}
          onClick={() => onRemove(choice.id)}
          aria-label={`Remove ${choice.label}`}
        >
          <span>{choice.label}</span>
          <span className="submission-selected-choice-remove" aria-hidden="true">
            ×
          </span>
        </button>
      ))}
    </div>
  );
}

function UploadSpecs({ chips }: { chips: readonly string[] }) {
  return (
    <div className="submission-upload-specs" aria-hidden="true">
      {chips.map((chip) => (
        <span className="submission-spec-chip" key={chip}>
          {chip}
        </span>
      ))}
    </div>
  );
}

type ReviewChecklistItem = {
  label: string;
  detail: string;
  complete: boolean;
};

function ReviewChecklistCard({
  title,
  copy,
  items
}: {
  title: string;
  copy: string;
  items: readonly ReviewChecklistItem[];
}) {
  const completeCount = items.filter((item) => item.complete).length;
  const remainingCount = items.length - completeCount;

  return (
    <div className="submission-review-card">
      <div className="submission-review-header">
        <div>
          <div className="submission-step-label submission-step-label-secondary">Final review</div>
          <h3 className="submission-review-title">{title}</h3>
        </div>
        <div className="submission-review-progress">
          {remainingCount === 0
            ? 'Ready to submit'
            : `${remainingCount} item${remainingCount === 1 ? '' : 's'} left`}
        </div>
      </div>
      <p className="field-help submission-review-copy">{copy}</p>
      <div className="submission-review-grid">
        {items.map((item) => (
          <div
            className={`submission-review-item ${item.complete ? 'is-complete' : 'is-pending'}`}
            key={item.label}
          >
            <div className="submission-review-indicator" aria-hidden="true">
              {item.complete ? '✓' : '•'}
            </div>
            <div className="submission-review-item-copy">
              <div className="submission-review-item-title">{item.label}</div>
              <div className="submission-review-item-detail">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateReadinessBanner({
  items,
  status
}: {
  items: readonly ReviewChecklistItem[];
  status?: StatusMessage | null;
}) {
  const pendingItems = items.filter((item) => !item.complete);
  const isBlocked = status?.tone === 'error';
  const isReady = !isBlocked && pendingItems.length === 0;
  const tone = isBlocked ? 'blocked' : isReady ? 'ready' : 'review';
  const title = isBlocked ? 'Blocked' : isReady ? 'Ready for handoff' : 'Needs review';
  const copy = isBlocked
    ? status?.message || 'Resolve the blocking validation issue before submitting.'
    : isReady
      ? 'Required checks are complete. Re-run validation after any Designer changes and publish before submitting.'
      : `${pendingItems.length} required item${pendingItems.length === 1 ? '' : 's'} still need attention before this can be submitted.`;

  return (
    <div className={`submission-readiness-banner is-${tone}`} aria-live="polite">
      <div className="submission-readiness-copy">
        <div className="submission-readiness-kicker">Submission outcome</div>
        <div className="submission-readiness-title">{title}</div>
        <p className="field-help submission-readiness-message">{copy}</p>
      </div>
      {!isReady && pendingItems.length > 0 ? (
        <div className="submission-readiness-list" aria-label="Remaining submission checks">
          {pendingItems.slice(0, 3).map((item) => (
            <span className="submission-readiness-chip" key={item.label}>
              {item.label}
            </span>
          ))}
          {pendingItems.length > 3 ? (
            <span className="submission-readiness-chip">+{pendingItems.length - 3} more</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function isUsableFeaturedImageUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return !url.hostname.endsWith('airtableusercontent.com') && url.hostname !== 'dl.airtable.com';
  } catch {
    return false;
  }
}

function featuredTemplateImage(item: FeaturedTemplateItem) {
  return (
    [item.thumbnail_image_url, item.thumbnail_image_secondary_url].find(
      (value): value is string => Boolean(value && isUsableFeaturedImageUrl(value))
    ) || ''
  );
}

function featuredTemplateDetail(item: FeaturedTemplateItem) {
  return item.category_groups?.[0]?.name || item.template_type || (item.is_free ? 'Free' : 'Featured');
}

function visibleFeaturedTemplates(templates: FeaturedTemplateItem[], offset: number) {
  if (templates.length <= FEATURED_QUALITY_VISIBLE_COUNT) return templates;
  return Array.from(
    { length: FEATURED_QUALITY_VISIBLE_COUNT },
    (_, index) => templates[(offset + index) % templates.length]
  );
}

function FeaturedQualityShowcase() {
  const [templates, setTemplates] = useState<FeaturedTemplateItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'refreshing' | 'fallback'>(
    'loading'
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [offset, setOffset] = useState(0);
  const requestRef = useRef<AbortController | null>(null);

  async function loadFeaturedTemplates(nextPage: number, mode: 'initial' | 'refresh' = 'initial') {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setStatus(mode === 'refresh' && templates.length > 0 ? 'refreshing' : 'loading');

    try {
      const url = new URL('/api/templates/search', TEMPLATE_SEARCH_API_BASE);
      url.searchParams.set('scope', 'featured');
      url.searchParams.set('page_size', String(FEATURED_QUALITY_POOL_SIZE));
      url.searchParams.set('page', String(nextPage));
      url.searchParams.set('sort', 'popular');

      const response = await fetch(url.toString(), {
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Failed to load featured templates.');

      const payload = (await response.json()) as FeaturedTemplateSearchResponse;
      const items = (payload.items ?? [])
        .filter((item) => item.name && featuredTemplateImage(item))
        .slice(0, FEATURED_QUALITY_POOL_SIZE);

      if (!controller.signal.aborted) {
        setTemplates(items);
        setOffset(0);
        setPage(payload.pagination?.page || nextPage);
        setTotalPages(Math.max(1, payload.pagination?.total_pages || 1));
        setStatus(items.length > 0 ? 'ready' : 'fallback');
      }
    } catch {
      if (!controller.signal.aborted) setStatus(templates.length > 0 ? 'ready' : 'fallback');
    }
  }

  useEffect(() => {
    void loadFeaturedTemplates(1);
    return () => requestRef.current?.abort();
  }, []);

  const isBusy = status === 'loading' || status === 'refreshing';
  const visibleTemplates = visibleFeaturedTemplates(templates, offset);
  const canCycle = templates.length > FEATURED_QUALITY_VISIBLE_COUNT || totalPages > 1;

  function cycleFeaturedTemplates() {
    if (isBusy) return;

    if (
      templates.length > FEATURED_QUALITY_VISIBLE_COUNT &&
      offset + FEATURED_QUALITY_VISIBLE_COUNT < templates.length
    ) {
      setOffset(offset + FEATURED_QUALITY_VISIBLE_COUNT);
      return;
    }

    const nextPage = totalPages > 1 && page < totalPages ? page + 1 : 1;
    void loadFeaturedTemplates(nextPage, 'refresh');
  }

  return (
    <section className="featured-quality-showcase" aria-labelledby="featured-quality-title">
      <div className="featured-quality-header">
        <div className="featured-quality-heading-row">
          <div className="submission-step-label submission-step-label-secondary">
            Quality benchmark
          </div>
          <button
            aria-label="Refresh Featured template examples"
            className={isBusy ? 'featured-quality-refresh is-refreshing' : 'featured-quality-refresh'}
            disabled={!canCycle || isBusy}
            onClick={cycleFeaturedTemplates}
            title="Refresh Featured template examples"
            type="button"
          >
            <span aria-hidden="true" className="featured-quality-refresh-icon">
              ↻
            </span>
            <span>Refresh</span>
          </button>
        </div>
        <h3 className="featured-quality-title" id="featured-quality-title">
          Build toward Featured quality
        </h3>
        <p className="featured-quality-copy">
          Featured templates set the bar for Marketplace-ready work: a sharp first impression,
          complete content, polished breakpoints, and category clarity.
        </p>
      </div>

      {visibleTemplates.length > 0 ? (
        <div
          aria-busy={isBusy}
          aria-label="Featured template examples"
          className="featured-quality-grid"
        >
          {visibleTemplates.map((item) => {
            const imageUrl = featuredTemplateImage(item);
            return (
              <a
                aria-label={`Review Featured templates like ${item.name}`}
                className="featured-quality-card"
                href={FEATURED_TEMPLATES_URL}
                key={item.id || item.template_slug}
                rel="noreferrer"
                target="_blank"
              >
                <span className="featured-quality-image-wrap">
                  <img
                    alt={`${item.name} template thumbnail`}
                    className="featured-quality-image"
                    loading="lazy"
                    onError={() => {
                      setTemplates((current) =>
                        current.filter((template) => template.id !== item.id)
                      );
                      setOffset(0);
                    }}
                    src={imageUrl}
                  />
                </span>
                <span className="featured-quality-card-copy">
                  <span className="featured-quality-card-title">{item.name}</span>
                  {item.creator_name ? (
                    <span className="featured-quality-card-meta">{item.creator_name}</span>
                  ) : null}
                  <span className="featured-quality-card-detail">
                    {featuredTemplateDetail(item)}
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      ) : (
        <div
          className="featured-quality-fallback"
          aria-live={status === 'loading' ? 'polite' : undefined}
        >
          {status === 'loading'
            ? 'Loading Featured examples...'
            : 'Review Featured templates before submitting, then compare your spacing, responsive behavior, content completeness, and category fit.'}
        </div>
      )}

      <div className="featured-quality-checks" aria-label="Quality signals">
        <span>Complete content</span>
        <span>Responsive polish</span>
        <span>Sharp first impression</span>
        <span>Review-ready assets</span>
      </div>

      <div className="featured-quality-actions">
        <a
          className="featured-quality-link"
          href={FEATURED_TEMPLATES_URL}
          rel="noreferrer"
          target="_blank"
        >
          <span>Review Featured templates</span>
          <span aria-hidden="true" className="featured-quality-link-icon">
            -&gt;
          </span>
        </a>
        {templates.length > FEATURED_QUALITY_VISIBLE_COUNT ? (
          <span className="featured-quality-count">
            {offset + 1}-{Math.min(offset + FEATURED_QUALITY_VISIBLE_COUNT, templates.length)} of{' '}
            {templates.length}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function TemplateSubmissionSuccessPanel({
  submission,
  onSubmitAnother
}: {
  submission: SubmittedTemplateState;
  onSubmitAnother: () => void;
}) {
  return (
    <div className="submission-form submission-success-panel" aria-live="polite">
      <div>
        <div className="submission-success-kicker">Submission received</div>
        <h3 className="submission-success-title">Template submitted for review</h3>
        <p className="submission-success-copy">
          Reviewers will process this submission next. The Asset Dashboard gives creators a place to
          review assets, track review activity, run validation checks, and see Marketplace Insights
          when available.
        </p>
      </div>

      <div className="submission-status submission-status-success">
        {submission.name
          ? `${submission.name} is now in the review queue.`
          : 'Your template is now in the review queue.'}
      </div>

      {submission.warning ? (
        <div className="submission-status submission-status-warning">{submission.warning}</div>
      ) : null}

      <div className="submission-dashboard-handoff">
        <div className="submission-dashboard-handoff-copy">
          <div className="submission-step-label submission-step-label-secondary">
            Creator workspace
          </div>
          <h4 className="submission-dashboard-title">Use the Asset Dashboard while reviewers work</h4>
          <p className="submission-dashboard-copy">
            It gives creators one place to follow review activity, prepare the next submission, and
            use the same quality tools our team references.
          </p>
        </div>
        <a className="submission-dashboard-cta" href={ASSET_DASHBOARD_URL} target="_top">
          <span>Open Asset Dashboard</span>
          <span aria-hidden="true" className="submission-dashboard-cta-icon">
            -&gt;
          </span>
        </a>
      </div>

      <div className="submission-success-tool-list" aria-label="Asset Dashboard tools">
        <div className="submission-success-tool">
          <span className="submission-success-tool-marker" aria-hidden="true">
            01
          </span>
          <div>
            <span className="submission-success-tool-label">Review status</span>
            <span className="submission-success-tool-copy">
              Check existing asset status and updates.
            </span>
          </div>
        </div>
        <div className="submission-success-tool">
          <span className="submission-success-tool-marker" aria-hidden="true">
            02
          </span>
          <div>
            <span className="submission-success-tool-label">Validator</span>
            <span className="submission-success-tool-copy">
              Run checks before the next submission.
            </span>
          </div>
        </div>
        <div className="submission-success-tool">
          <span className="submission-success-tool-marker" aria-hidden="true">
            03
          </span>
          <div>
            <span className="submission-success-tool-label">Insights</span>
            <span className="submission-success-tool-copy">
              See Marketplace signals when access is available.
            </span>
          </div>
        </div>
      </div>

      <div className="submission-actions">
        <button className="button-sp cc-white" type="button" onClick={onSubmitAnother}>
          Submit another template
        </button>
      </div>
    </div>
  );
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export function TemplateIntake() {
  const turnstileEnabled = Boolean(TURNSTILE_SITE_KEY);
  const [creator, setCreator] = useState<CreatorFormState>(initialCreatorState);
  const [template, setTemplate] = useState<TemplateFormState>(initialTemplateState);
  const [verification, setVerification] = useState<VerificationState>({
    primaryEmailVerified: '',
    webflowEmailVerified: '',
    creatorEligibilityEmail: '',
    templateNameVerified: '',
    publishedUrlVerified: '',
    publishedUrlMessage: '',
    gsapDetected: false
  });
  const [creatorStatus, setCreatorStatus] = useState<StatusMessage | null>(null);
  const [templateStatus, setTemplateStatus] = useState<StatusMessage | null>(null);
  const [submittedTemplate, setSubmittedTemplate] = useState<SubmittedTemplateState | null>(null);
  const [creatorSubmitting, setCreatorSubmitting] = useState(false);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [fieldFeedback, setFieldFeedback] = useState<Record<string, StatusMessage | null>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, string | null>>({});
  const [autofillManaged, setAutofillManaged] = useState<TemplateAutofillState>({});
  const [analyzerSummary, setAnalyzerSummary] = useState<TemplateAnalyzerSummary | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [optionSearch, setOptionSearch] = useState({
    categories: '',
    styles: '',
    featureIds: ''
  });

  const setFeedback = (field: string, feedback: StatusMessage | null) =>
    setFieldFeedback((current) => ({ ...current, [field]: feedback }));
  const [utm, setUtm] = useState<Record<string, string>>({});
  const [turnstileReady, setTurnstileReady] = useState(!turnstileEnabled);
  const [turnstileTokens, setTurnstileTokens] = useState<Record<TurnstileStep, string>>({
    creator: '',
    template: ''
  });
  const creatorTurnstileRef = useRef<HTMLDivElement | null>(null);
  const templateTurnstileRef = useRef<HTMLDivElement | null>(null);
  const creatorTurnstileWidgetId = useRef<string | null>(null);
  const templateTurnstileWidgetId = useRef<string | null>(null);
  const creatorSectionRef = useRef<HTMLElement | null>(null);
  const templateSectionRef = useRef<HTMLElement | null>(null);
  const analyzerSummaryRef = useRef<HTMLDivElement | null>(null);
  const analyzerRequestId = useRef(0);

  const hasAutofilledTemplateName = isAutofilledText(
    template.templateName,
    autofillManaged.templateName
  );
  const hasAutofilledShortDescription = isAutofilledText(
    template.shortDescription,
    autofillManaged.shortDescription
  );
  const hasAutofilledLongDescription = isAutofilledRichText(
    template.longDescription,
    autofillManaged.longDescription
  );
  const hasAutofilledCategories = isAutofilledArray(
    template.categories,
    autofillManaged.categories
  );
  const hasAutofilledPageCount =
    Boolean(autofillManaged.pageCount) && template.pageCount === autofillManaged.pageCount;
  const hasAutofilledTemplateType =
    isAutofilledBoolean(template.typeCms, autofillManaged.typeCms) ||
    isAutofilledBoolean(template.typeEcommerce, autofillManaged.typeEcommerce);
  const hasAutofilledStyles = isAutofilledArray(template.styles, autofillManaged.styles);
  const hasAutofilledFeatures = isAutofilledArray(template.featureIds, autofillManaged.featureIds);
  const hasAutofilledPriceModel =
    Boolean(autofillManaged.priceModel) && template.priceModel === autofillManaged.priceModel;
  const creatorEligibilityResolved =
    Boolean(template.creatorEmail.trim()) &&
    verification.creatorEligibilityEmail === template.creatorEmail.trim().toLowerCase();
  const visibleCategories = sortSelectableLabels(
    CATEGORY_OPTIONS,
    template.categories,
    optionSearch.categories
  );
  const visibleStyles = sortSelectableLabels(TEMPLATE_STYLES, template.styles, optionSearch.styles);
  const visibleFeatures = sortSelectableObjects(
    WEBFLOW_FEATURES.filter((feature) => !feature.hidden),
    template.featureIds,
    optionSearch.featureIds,
    (feature) => feature.label,
    (feature) => feature.id
  );
  const selectedCategoryChoices = template.categories.map((category) => ({
    id: category,
    label: category
  }));
  const selectedStyleChoices = template.styles.map((style) => ({
    id: style,
    label: style
  }));
  const selectedFeatureChoices = template.featureIds
    .map((featureId) => {
      const feature = WEBFLOW_FEATURES.find((option) => option.id === featureId);
      return feature ? { id: feature.id, label: feature.label } : null;
    })
    .filter((choice): choice is { id: string; label: string } => choice !== null);
  const creatorProfileExistsActionLabel = 'Go to Submit a template';

  function getCreatorProfileExistsAction(
    feedback?: StatusMessage | null
  ): FeedbackAction | undefined {
    if (
      feedback?.tone !== 'error' ||
      !feedback.message.toLowerCase().includes('attached to a creator profile')
    ) {
      return undefined;
    }

    return {
      label: creatorProfileExistsActionLabel,
      onClick: () => scrollToSubmissionSection('submit-today')
    };
  }

  function scrollToSubmissionSection(section: 'join-today' | 'submit-today') {
    const target =
      section === 'submit-today' ? templateSectionRef.current : creatorSectionRef.current;
    if (!target) return;

    if (window.parent !== window) {
      const message: SubmissionChildMessage = {
        type: 'ts-submission:scroll-to',
        section,
        offsetTop: target.offsetTop
      };
      window.parent.postMessage(message, '*');
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    setIsEmbedded(window.parent !== window);

    const captureParams = (searchLike: string | Record<string, string>) => {
      const params =
        typeof searchLike === 'string'
          ? new URLSearchParams(searchLike)
          : new URLSearchParams(Object.entries(searchLike || {}));
      const captured: Record<string, string> = {};
      for (const key of [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'gclid'
      ]) {
        const value = params.get(key);
        if (value) captured[key] = value;
      }
      return captured;
    };

    setUtm(captureParams(window.location.search));

    const initialParams = new URLSearchParams(window.location.search);
    const initialSection = initialParams.get('section');
    const initialHash = window.location.hash;

    if (initialSection === 'submit-today' || initialHash === '#submit-today') {
      requestAnimationFrame(() => {
        scrollToSubmissionSection('submit-today');
      });
    } else if (initialSection === 'join-today' || initialHash === '#join-today') {
      requestAnimationFrame(() => {
        scrollToSubmissionSection('join-today');
      });
    }

    const onParentMessage = (event: MessageEvent) => {
      const data = event.data as SubmissionParentMessage | null;
      if (!data) return;

      if (data.type === 'ts-submission:utm' && data.params) {
        setUtm((current) => ({ ...current, ...captureParams(data.params ?? {}) }));
        return;
      }

      if (
        data.type === 'ts-submission:navigate' &&
        (data.section === 'join-today' || data.section === 'submit-today')
      ) {
        const targetSection = data.section;
        requestAnimationFrame(() => {
          scrollToSubmissionSection(targetSection);
        });
      }
    };
    window.addEventListener('message', onParentMessage);

    return () => {
      window.removeEventListener('message', onParentMessage);
    };
  }, []);

  useEffect(() => {
    if (window.parent === window) return;

    let lastHeight = 0;
    const postHeight = () => {
      const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      if (height === lastHeight) return;
      lastHeight = height;
      const message: SubmissionChildMessage = { type: 'ts-submission:resize', height };
      window.parent.postMessage(message, '*');
    };

    postHeight();
    const observer = new ResizeObserver(() => postHeight());
    observer.observe(document.body);
    window.addEventListener('load', postHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('load', postHeight);
    };
  }, []);

  function setTurnstileToken(stepName: TurnstileStep, token: string) {
    setTurnstileTokens((current) => ({
      ...current,
      [stepName]: token
    }));
  }

  function clearTurnstileToken(stepName: TurnstileStep) {
    setTurnstileToken(stepName, '');
  }

  function getTurnstileWidgetId(stepName: TurnstileStep) {
    return stepName === 'creator'
      ? creatorTurnstileWidgetId.current
      : templateTurnstileWidgetId.current;
  }

  function setTurnstileWidgetId(stepName: TurnstileStep, widgetId: string | null) {
    if (stepName === 'creator') {
      creatorTurnstileWidgetId.current = widgetId;
    } else {
      templateTurnstileWidgetId.current = widgetId;
    }
  }

  function getTurnstileContainer(stepName: TurnstileStep) {
    return stepName === 'creator' ? creatorTurnstileRef.current : templateTurnstileRef.current;
  }

  function resetTurnstile(stepName: TurnstileStep) {
    if (!turnstileEnabled || typeof window === 'undefined' || !window.turnstile) {
      return;
    }

    const widgetId = getTurnstileWidgetId(stepName);
    if (!widgetId) {
      return;
    }

    window.turnstile.reset(widgetId);
    clearTurnstileToken(stepName);
  }

  function ensureTurnstile(stepName: TurnstileStep) {
    if (
      !turnstileEnabled ||
      !turnstileReady ||
      typeof window === 'undefined' ||
      !window.turnstile
    ) {
      return;
    }

    const container = getTurnstileContainer(stepName);
    if (!container || getTurnstileWidgetId(stepName)) {
      return;
    }

    const action = stepName === 'creator' ? 'creator-submit' : 'template-submit';
    const widgetId = window.turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      action,
      theme: 'light',
      callback: (token) => setTurnstileToken(stepName, token),
      'expired-callback': () => clearTurnstileToken(stepName),
      'error-callback': () => clearTurnstileToken(stepName)
    });

    setTurnstileWidgetId(stepName, widgetId);
  }

  useEffect(() => {
    if (!turnstileEnabled || !turnstileReady) {
      return;
    }

    ensureTurnstile('creator');
    ensureTurnstile('template');
  }, [turnstileEnabled, turnstileReady]);

  useEffect(() => {
    return () => {
      if (!turnstileEnabled || typeof window === 'undefined' || !window.turnstile) {
        return;
      }

      if (creatorTurnstileWidgetId.current) {
        window.turnstile.remove(creatorTurnstileWidgetId.current);
      }

      if (templateTurnstileWidgetId.current) {
        window.turnstile.remove(templateTurnstileWidgetId.current);
      }
    };
  }, [turnstileEnabled]);

  const creatorCountrySupported = creator.country ? isSupportedCountry(creator.country) : true;
  const previewUrlValue = template.previewUrl.trim();
  const previewUrlPresent = previewUrlValue !== '';
  const previewUrlValid =
    previewUrlValue === '' || previewUrlValue.includes('https://preview.webflow.com/preview/');
  const templateChecksPassed =
    template.templateName.trim() !== '' &&
    template.publishedUrl.trim() !== '' &&
    verification.templateNameVerified === template.templateName.trim() &&
    verification.publishedUrlVerified === template.publishedUrl.trim();
  const previewAndMetadataReady =
    previewUrlPresent &&
    previewUrlValid &&
    template.categories.length > 0 &&
    template.styles.length > 0 &&
    template.pageCount !== '';
  const pricingResolved =
    template.priceModel !== '' &&
    (template.priceModel === 'Free' || template.selectedPrice !== null);
  const galleryErrorMessages = Object.entries(imageErrors)
    .filter(([key, value]) => key.startsWith('gallery-') && value)
    .map(([, value]) => value as string);
  const reviewItems: ReviewChecklistItem[] = [
    {
      label: 'Creator verified',
      detail: creatorEligibilityResolved
        ? 'The creator identity is resolved and eligible to submit.'
        : 'Use Check creator to confirm the creator account first.',
      complete: creatorEligibilityResolved
    },
    {
      label: 'Template checks passed',
      detail: templateChecksPassed
        ? 'Template name and published site both passed validation.'
        : 'Run Check name and Validate template before submitting.',
      complete: templateChecksPassed
    },
    {
      label: 'Preview and metadata ready',
      detail: previewAndMetadataReady
        ? 'Preview URL, category, styles, and page count are all set.'
        : 'Add a valid preview URL plus the required taxonomy and page info.',
      complete: previewAndMetadataReady
    },
    {
      label: 'Pricing is resolved',
      detail: pricingResolved
        ? 'The template pricing setup is complete.'
        : 'Choose whether the template is free or paid, then pick a paid tier if needed.',
      complete: pricingResolved
    },
    {
      label: 'Assets are attached',
      detail:
        Boolean(template.thumbnailFile) &&
        !imageErrors.thumbnailFile &&
        template.galleryFiles.length > 0 &&
        galleryErrorMessages.length === 0
          ? 'Primary thumbnail and gallery images are ready for upload.'
          : 'Attach a valid primary thumbnail and at least one valid gallery image.',
      complete:
        Boolean(template.thumbnailFile) &&
        !imageErrors.thumbnailFile &&
        template.galleryFiles.length > 0 &&
        galleryErrorMessages.length === 0
    },
    {
      label: 'Quality benchmark reviewed',
      detail: template.qualityBenchmarkConfirmed
        ? 'Featured examples and the quality rubric have been reviewed.'
        : 'Review the Featured quality examples before confirming handoff.',
      complete: template.qualityBenchmarkConfirmed
    },
    {
      label: 'Agreements confirmed',
      detail:
        template.checklistConfirmed && template.agreementConfirmed
          ? 'Checklist and submission agreement are both confirmed.'
          : 'Confirm the checklist and submission agreement below.',
      complete: template.checklistConfirmed && template.agreementConfirmed
    }
  ];

  function updateCreator<K extends keyof CreatorFormState>(key: K, value: CreatorFormState[K]) {
    setCreator((current) => ({ ...current, [key]: value }));
    setCreatorStatus(null);

    if (key === 'primaryEmail') {
      setVerification((current) => ({
        ...current,
        primaryEmailVerified: ''
      }));
      setTemplate((current) => ({ ...current, creatorEmail: String(value) }));
    }

    if (key === 'webflowEmail') {
      setVerification((current) => ({
        ...current,
        webflowEmailVerified: ''
      }));
    }

    if (key === 'preferredName' || key === 'legalName') {
      const nextName =
        key === 'preferredName'
          ? String(value).trim() || creator.legalName
          : creator.preferredName.trim() || String(value);
      setTemplate((current) => ({ ...current, creatorName: nextName }));
    }
  }

  function updateTemplate<K extends keyof TemplateFormState>(key: K, value: TemplateFormState[K]) {
    setTemplate((current) => {
      const next = { ...current, [key]: value };

      if (
        key === 'priceModel' ||
        key === 'pageCount' ||
        key === 'typeCms' ||
        key === 'selectedPrice'
      ) {
        next.selectedPrice = normalizeSelectedPrice(
          next.priceModel,
          next.pageCount,
          next.typeCms,
          next.selectedPrice
        );
      }

      return next;
    });
    setTemplateStatus(null);

    if (key === 'creatorEmail') {
      setFeedback('creatorEmail', null);
      setVerification((current) => ({
        ...current,
        creatorEligibilityEmail: ''
      }));
    }

    if (key === 'templateName') {
      setVerification((current) => ({
        ...current,
        templateNameVerified: ''
      }));
    }

    if (key === 'publishedUrl') {
      setFeedback('publishedUrl', null);
      setAnalyzerSummary(null);
      setVerification((current) => ({
        ...current,
        publishedUrlVerified: '',
        publishedUrlMessage: '',
        gsapDetected: false
      }));
      setTemplate((current) => ({
        ...current,
        featureIds: current.featureIds.filter((item: string) => item !== 'gsap')
      }));
    }
  }

  function removeGalleryFile(signature: string) {
    setTemplate((current) => ({
      ...current,
      galleryFiles: current.galleryFiles.filter((file) => fileSignature(file) !== signature)
    }));
    setTemplateStatus(null);
  }

  function updateOptionSearch(key: keyof typeof optionSearch, value: string) {
    setOptionSearch((current) => ({ ...current, [key]: value }));
  }

  function clearCreatorEligibility() {
    setFeedback('creatorEmail', null);
    setVerification((current) => ({
      ...current,
      creatorEligibilityEmail: ''
    }));
  }

  function applyTemplateAutofill(
    autofill: TemplateAutofillPayload | undefined,
    options: { gsapDetected: boolean }
  ): TemplateAutofillResult {
    const managedNext: TemplateAutofillState = {};
    const appliedFields = new Set<TemplateAutofillFieldKey>();
    const suggestedFields = new Set<TemplateAutofillFieldKey>();

    const markSuggested = (field: TemplateAutofillFieldKey) => {
      suggestedFields.add(field);
    };

    const markApplied = (field: TemplateAutofillFieldKey) => {
      suggestedFields.add(field);
      appliedFields.add(field);
    };

    setTemplate((current) => {
      if (!autofill) {
        if (!options.gsapDetected || current.featureIds.includes('gsap')) {
          return current;
        }

        markSuggested('featureIds');
        markApplied('featureIds');
        return {
          ...current,
          featureIds: [...new Set([...current.featureIds, 'gsap'])]
        };
      }

      const next = { ...current };

      if (
        autofill.templateName &&
        autofill.templateName !== current.templateName &&
        shouldAutofillText(current.templateName, autofillManaged.templateName)
      ) {
        next.templateName = autofill.templateName;
        managedNext.templateName = autofill.templateName;
        markApplied('templateName');
      } else if (autofill.templateName) {
        markSuggested('templateName');
      }

      if (
        autofill.shortDescription &&
        autofill.shortDescription !== current.shortDescription &&
        shouldAutofillText(current.shortDescription, autofillManaged.shortDescription)
      ) {
        next.shortDescription = autofill.shortDescription;
        managedNext.shortDescription = autofill.shortDescription;
        markApplied('shortDescription');
      } else if (autofill.shortDescription) {
        markSuggested('shortDescription');
      }

      if (
        autofill.longDescription &&
        autofill.longDescription !== current.longDescription &&
        shouldAutofillRichText(current.longDescription, autofillManaged.longDescription)
      ) {
        next.longDescription = autofill.longDescription;
        managedNext.longDescription = autofill.longDescription;
        markApplied('longDescription');
      } else if (autofill.longDescription) {
        markSuggested('longDescription');
      }

      if (
        autofill.priceModel &&
        autofill.priceModel !== current.priceModel &&
        shouldAutofillPriceModel(current.priceModel, autofillManaged.priceModel)
      ) {
        next.priceModel = autofill.priceModel;
        managedNext.priceModel = autofill.priceModel;
        markApplied('priceModel');
      } else if (autofill.priceModel) {
        markSuggested('priceModel');
      }

      if (
        autofill.pageCount &&
        autofill.pageCount !== current.pageCount &&
        shouldAutofillPageCount(current.pageCount, autofillManaged.pageCount)
      ) {
        next.pageCount = autofill.pageCount;
        managedNext.pageCount = autofill.pageCount;
        markApplied('pageCount');
      } else if (autofill.pageCount) {
        markSuggested('pageCount');
      }

      if (
        typeof autofill.typeCms === 'boolean' &&
        autofill.typeCms !== current.typeCms &&
        shouldAutofillBoolean(current.typeCms, autofillManaged.typeCms)
      ) {
        next.typeCms = autofill.typeCms;
        managedNext.typeCms = autofill.typeCms;
        markApplied('typeCms');
      } else if (typeof autofill.typeCms === 'boolean') {
        markSuggested('typeCms');
      }

      if (
        typeof autofill.typeEcommerce === 'boolean' &&
        autofill.typeEcommerce !== current.typeEcommerce &&
        shouldAutofillBoolean(current.typeEcommerce, autofillManaged.typeEcommerce)
      ) {
        next.typeEcommerce = autofill.typeEcommerce;
        managedNext.typeEcommerce = autofill.typeEcommerce;
        markApplied('typeEcommerce');
      } else if (typeof autofill.typeEcommerce === 'boolean') {
        markSuggested('typeEcommerce');
      }

      if (
        autofill.categories?.length &&
        !arraysEqual(current.categories, autofill.categories) &&
        shouldAutofillArray(current.categories, autofillManaged.categories)
      ) {
        next.categories = autofill.categories;
        managedNext.categories = autofill.categories;
        markApplied('categories');
      } else if (autofill.categories?.length) {
        markSuggested('categories');
      }

      if (
        autofill.styles?.length &&
        !arraysEqual(current.styles, autofill.styles) &&
        shouldAutofillArray(current.styles, autofillManaged.styles)
      ) {
        next.styles = autofill.styles;
        managedNext.styles = autofill.styles;
        markApplied('styles');
      } else if (autofill.styles?.length) {
        markSuggested('styles');
      }

      const suggestedFeatureIds = [
        ...new Set([
          ...DEFAULT_FEATURE_IDS,
          ...(autofill.featureIds ?? []),
          ...(options.gsapDetected ? ['gsap'] : [])
        ])
      ];

      if (shouldAutofillFeatureIds(current.featureIds, autofillManaged.featureIds)) {
        if (!arraysEqual(current.featureIds, suggestedFeatureIds)) {
          next.featureIds = suggestedFeatureIds;
          managedNext.featureIds = suggestedFeatureIds;
          markApplied('featureIds');
        } else if (suggestedFeatureIds.length > 0) {
          markSuggested('featureIds');
        }
      } else if (options.gsapDetected && !next.featureIds.includes('gsap')) {
        next.featureIds = [...new Set([...next.featureIds, 'gsap'])];
        markApplied('featureIds');
      } else if ((autofill.featureIds?.length ?? 0) > 0 || options.gsapDetected) {
        markSuggested('featureIds');
      }

      next.selectedPrice = normalizeSelectedPrice(
        next.priceModel,
        next.pageCount,
        next.typeCms,
        next.selectedPrice
      );

      return next;
    });

    if (Object.keys(managedNext).length > 0) {
      setAutofillManaged((current) => ({ ...current, ...managedNext }));
    }

    return {
      appliedFields: [...appliedFields],
      suggestedFields: [...suggestedFields]
    };
  }

  async function loadTemplateSuggestions(
    url: string,
    validationMessage: string,
    gsapDetected: boolean,
    requestId: number
  ) {
    try {
      const suggestions = await fetchTemplateSuggestions(url);
      if (analyzerRequestId.current !== requestId) {
        return;
      }

      const autofillResult = applyTemplateAutofill(suggestions.autofill, { gsapDetected });
      setAnalyzerSummary({
        validationMessage,
        appliedFields: autofillResult.appliedFields,
        suggestedFields: autofillResult.suggestedFields,
        screenshotCount: suggestions.screenshotCount,
        screenshotsDownloadUrl: suggestions.screenshotsDownloadUrl
      });
      setFeedback('publishedUrl', {
        tone: 'success',
        message: [
          validationMessage,
          autofillResult.appliedFields.length > 0
            ? `Analyzer suggestions filled ${autofillResult.appliedFields.length} field${autofillResult.appliedFields.length === 1 ? '' : 's'}.`
            : 'Review the analyzer summary below.',
          gsapDetected ? 'GSAP was detected automatically.' : ''
        ]
          .filter(Boolean)
          .join(' ')
      });
    } catch (error) {
      if (analyzerRequestId.current !== requestId) {
        return;
      }

      const warning = suggestionsFailureMessage(error);
      setAnalyzerSummary((current) => ({
        validationMessage,
        appliedFields: current?.appliedFields ?? [],
        suggestedFields: current?.suggestedFields ?? [],
        screenshotCount: current?.screenshotCount ?? 0,
        screenshotsDownloadUrl: current?.screenshotsDownloadUrl,
        warning
      }));
      setFeedback('publishedUrl', {
        tone: 'success',
        message: [
          validationMessage,
          gsapDetected ? 'GSAP was detected automatically.' : '',
          warning
        ]
          .filter(Boolean)
          .join(' ')
      });
    }
  }

  async function verifyCreatorEmail(kind: 'primary' | 'webflow') {
    const field = kind === 'primary' ? 'primaryEmail' : 'webflowEmail';
    const email = (kind === 'primary' ? creator.primaryEmail : creator.webflowEmail).trim();
    if (!email) {
      setFeedback(field, { tone: 'error', message: 'Enter an email address first.' });
      return;
    }

    setFeedback(field, { tone: 'info', message: 'Verifying…' });

    const response = await fetch(appPath('/api/intake/check-email'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = (await response.json().catch(() => ({}))) as {
      available?: boolean;
      message?: string;
    };

    if (!response.ok || data.available === false) {
      setFeedback(field, {
        tone: 'error',
        message: data.message || 'Email verification failed.'
      });
      return;
    }

    setVerification((current) => ({
      ...current,
      [kind === 'primary' ? 'primaryEmailVerified' : 'webflowEmailVerified']: email.toLowerCase()
    }));
    setFeedback(field, { tone: 'success', message: 'Email verified and available.' });
  }

  async function verifyCreatorEligibility() {
    const email = template.creatorEmail.trim();
    if (!email) {
      setFeedback('creatorEmail', { tone: 'error', message: 'Enter the creator email first.' });
      return;
    }

    setFeedback('creatorEmail', {
      tone: 'info',
      message: 'Checking creator eligibility…'
    });

    const response = await fetch(appPath('/api/intake/check-creator'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = (await response.json().catch(() => ({}))) as {
      allowed?: boolean;
      message?: string;
    };

    if (!response.ok || !data.allowed) {
      setFeedback('creatorEmail', {
        tone: 'error',
        message: data.message || 'Creator is not eligible to submit.'
      });
      return;
    }

    setVerification((current) => ({
      ...current,
      creatorEligibilityEmail: email.toLowerCase()
    }));
    setFeedback('creatorEmail', {
      tone: 'success',
      message: data.message || 'Creator is eligible to submit.'
    });
  }

  async function verifyTemplateName() {
    const name = template.templateName.trim();
    if (!name) {
      setFeedback('templateName', { tone: 'error', message: 'Enter a template name first.' });
      return;
    }

    setFeedback('templateName', { tone: 'info', message: 'Checking name…' });

    const response = await fetch(appPath('/api/intake/check-template-name'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    const data = (await response.json().catch(() => ({}))) as {
      valid?: boolean;
      errors?: string[];
    };

    if (!response.ok || !data.valid) {
      setFeedback('templateName', {
        tone: 'error',
        message: data.errors?.[0] || 'Template name failed validation.'
      });
      return;
    }

    setVerification((current) => ({
      ...current,
      templateNameVerified: name
    }));
    setFeedback('templateName', {
      tone: 'success',
      message: 'Template name passed availability and naming checks.'
    });
  }

  async function verifyPublishedUrl() {
    const requestId = analyzerRequestId.current + 1;
    analyzerRequestId.current = requestId;
    const url = template.publishedUrl.trim();
    if (!url) {
      setFeedback('publishedUrl', {
        tone: 'error',
        message: 'Enter the published Webflow URL first.'
      });
      return;
    }

    setAnalyzerSummary(null);
    setFeedback('publishedUrl', {
      tone: 'info',
      message: 'Running the full published-site crawl. This can take a few minutes.'
    });

    const response = await fetch(appPath('/api/intake/validate-published-url'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const validationData = (await readJsonResponse(response)) as PublishedUrlValidationResponse;

    if (!response.ok || !validationData.passed || !validationData.normalizedUrl) {
      const status = validationFailureStatus(response, validationData);
      setTemplateStatus(status);
      setFeedback('publishedUrl', status);
      return;
    }

    const autofillResult = applyTemplateAutofill(validationData.autofill, {
      gsapDetected: Boolean(validationData.gsapDetected)
    });
    const validationMessage = validationData.message || 'Published site validated.';
    const gsapDetected = Boolean(validationData.gsapDetected);
    const shouldLoadSuggestions = Boolean(validationData.normalizedUrl && !validationData.autofill);

    const nextAnalyzerSummary: TemplateAnalyzerSummary | null =
      autofillResult.appliedFields.length > 0 ||
      autofillResult.suggestedFields.length > 0 ||
      Boolean(validationData.autofillWarning) ||
      Boolean(validationData.screenshotsDownloadUrl) ||
      shouldLoadSuggestions
        ? {
            validationMessage,
            appliedFields: autofillResult.appliedFields,
            suggestedFields: autofillResult.suggestedFields,
            screenshotCount: validationData.screenshotCount ?? 0,
            screenshotsDownloadUrl: validationData.screenshotsDownloadUrl,
            loading: shouldLoadSuggestions,
            warning: shouldLoadSuggestions ? undefined : validationData.autofillWarning
          }
        : null;

    setAnalyzerSummary(nextAnalyzerSummary);
    if (nextAnalyzerSummary) {
      requestAnimationFrame(() => {
        analyzerSummaryRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      });
    }

    setFeedback('publishedUrl', {
      tone: 'success',
      message: [
        validationMessage,
        autofillResult.appliedFields.length > 0
          ? `Analyzer suggestions filled ${autofillResult.appliedFields.length} field${autofillResult.appliedFields.length === 1 ? '' : 's'}.`
          : nextAnalyzerSummary
            ? shouldLoadSuggestions
              ? 'Template suggestions are generating and will fill in when ready.'
              : 'Review the analyzer summary below.'
            : '',
        gsapDetected ? 'GSAP was detected automatically.' : '',
        validationData.autofillWarning && !shouldLoadSuggestions
          ? 'Template suggestions were unavailable, so finish the remaining fields manually.'
          : ''
      ]
        .filter(Boolean)
        .join(' ')
    });
    setVerification((current) => ({
      ...current,
      publishedUrlVerified: validationData.normalizedUrl || '',
      publishedUrlMessage: validationMessage
    }));
    setTemplate((current) => ({
      ...current,
      publishedUrl: validationData.normalizedUrl || current.publishedUrl,
      featureIds: gsapDetected ? [...new Set([...current.featureIds, 'gsap'])] : current.featureIds
    }));
    setVerification((current) => ({
      ...current,
      gsapDetected
    }));
    setTemplateStatus({
      tone: 'success',
      message: validationMessage
    });
    if (shouldLoadSuggestions && validationData.normalizedUrl) {
      void loadTemplateSuggestions(
        validationData.normalizedUrl,
        validationMessage,
        gsapDetected,
        requestId
      );
    }
  }

  async function submitCreator(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatorSubmitting(true);
    setCreatorStatus(null);
    let shouldResetTurnstile = false;

    try {
      if (verification.primaryEmailVerified !== creator.primaryEmail.trim().toLowerCase()) {
        throw new Error('Verify the primary email before submitting.');
      }

      if (verification.webflowEmailVerified !== creator.webflowEmail.trim().toLowerCase()) {
        throw new Error('Verify the Webflow account email before submitting.');
      }

      if (!creator.avatarFile) {
        throw new Error('Upload the creator profile image before submitting.');
      }

      if (!creator.country.trim()) {
        throw new Error('Select a country from the list before submitting.');
      }

      if (turnstileEnabled && !turnstileTokens.creator) {
        throw new Error('Complete the bot check before creating the creator profile.');
      }

      const avatarUrl = await uploadIntakeFile(
        creator.avatarFile,
        'avatar',
        creator.primaryEmail.trim()
      );
      shouldResetTurnstile = turnstileEnabled;

      const response = await fetch(appPath('/api/intake/creator'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: creator.country,
          primaryEmail: creator.primaryEmail,
          webflowEmail: creator.webflowEmail,
          preferredName: creator.preferredName,
          legalName: creator.legalName,
          websiteUrl: creator.websiteUrl,
          biography: creator.biography,
          avatarUrl,
          agreedToTerms: creator.agreedToTerms,
          turnstileToken: turnstileTokens.creator,
          utm
        })
      });

      const data = (await response.json().catch(() => ({}))) as {
        creator?: {
          name?: string;
          email?: string;
        };
        error?: string;
      };

      if (!response.ok || !data.creator) {
        throw new Error(data.error || 'Failed to create creator profile.');
      }

      setTemplate((current) => ({
        ...current,
        creatorEmail: data.creator?.email || creator.primaryEmail,
        creatorName: data.creator?.name || creator.preferredName || creator.legalName
      }));
      setCreatorStatus({
        tone: 'success',
        message: 'Creator profile created. Continue to the template submission step.'
      });
      requestAnimationFrame(() => {
        scrollToSubmissionSection('submit-today');
      });
    } catch (error) {
      setCreatorStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Failed to create creator profile.'
      });
    } finally {
      if (shouldResetTurnstile) {
        resetTurnstile('creator');
      }
      setCreatorSubmitting(false);
    }
  }

  async function submitTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTemplateSubmitting(true);
    setTemplateStatus(null);
    setSubmittedTemplate(null);
    let shouldResetTurnstile = false;

    try {
      if (verification.creatorEligibilityEmail !== template.creatorEmail.trim().toLowerCase()) {
        throw new Error('Verify creator eligibility before submitting the template.');
      }

      if (verification.templateNameVerified !== template.templateName.trim()) {
        throw new Error('Verify the template name before submitting.');
      }

      if (verification.publishedUrlVerified !== template.publishedUrl.trim()) {
        throw new Error('Validate the published URL before submitting.');
      }

      if (!previewUrlPresent) {
        throw new Error('Add the preview URL before submitting.');
      }

      if (!template.thumbnailFile) {
        throw new Error('Upload the primary thumbnail before submitting.');
      }

      if (template.galleryFiles.length === 0) {
        throw new Error('Upload at least one gallery image before submitting.');
      }

      if (template.categories.length === 0 || template.styles.length === 0 || !template.pageCount) {
        throw new Error(
          'Add a category, at least one style, and the page count before submitting.'
        );
      }

      if (!template.priceModel) {
        throw new Error('Choose whether the template is free or paid before submitting.');
      }

      if (template.priceModel === 'Paid' && template.selectedPrice === null) {
        throw new Error('Choose a price tier before submitting a paid template.');
      }

      if (!previewUrlValid) {
        throw new Error('Preview URL must contain https://preview.webflow.com/preview/.');
      }

      if (!template.qualityBenchmarkConfirmed) {
        throw new Error('Review the Featured quality benchmark before submitting.');
      }

      if (turnstileEnabled && !turnstileTokens.template) {
        throw new Error('Complete the bot check before submitting the template.');
      }

      const creatorEmail = template.creatorEmail.trim();
      const [thumbnailUrl, secondaryThumbnailUrl, galleryUrls] = await Promise.all([
        uploadIntakeFile(template.thumbnailFile, 'thumbnail', creatorEmail),
        template.secondaryThumbnailFile
          ? uploadIntakeFile(template.secondaryThumbnailFile, 'secondary-thumbnail', creatorEmail)
          : Promise.resolve(''),
        Promise.all(
          template.galleryFiles.map((file) => uploadIntakeFile(file, 'gallery', creatorEmail))
        )
      ]);
      shouldResetTurnstile = turnstileEnabled;

      const mappedFeatureLabels = WEBFLOW_FEATURES.filter((f) =>
        template.featureIds.includes(f.id)
      ).map((f) => (f.label === 'Components' ? 'Symbols' : f.label));

      const response = await fetch(appPath('/api/intake/template'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorName: template.creatorName,
          creatorEmail: template.creatorEmail,
          templateName: template.templateName,
          publishedUrl: template.publishedUrl,
          previewUrl: template.previewUrl,
          priceModel: template.priceModel,
          category: template.categories[0] || '',
          categories: template.categories,
          styleTags: template.styles,
          siteTypes: [
            ...(template.pageCount === 'Multi-layout'
              ? ['multi-layout']
              : template.pageCount === 'Multi'
                ? ['static']
                : ['static']),
            ...(template.typeCms ? ['cms'] : []),
            ...(template.typeEcommerce ? ['ecommerce'] : [])
          ],
          pageCount: template.pageCount,
          typeCms: template.typeCms,
          typeEcommerce: template.typeEcommerce,
          price: template.selectedPrice,
          featureFlags: mappedFeatureLabels,
          shortDescription: template.shortDescription,
          longDescription: template.longDescription,
          notes: template.notes,
          thumbnailUrl,
          secondaryThumbnailUrl,
          galleryUrls,
          qualityBenchmarkConfirmed: template.qualityBenchmarkConfirmed,
          checklistConfirmed: template.checklistConfirmed,
          agreementConfirmed: template.agreementConfirmed,
          turnstileToken: turnstileTokens.template,
          utm
        })
      });

      const data = (await response.json().catch(() => ({}))) as {
        asset?: {
          id?: string;
          name?: string;
        };
        error?: string;
        validationIssues?: string[];
        warning?: string;
      };

      if (!response.ok || !data.asset) {
        const validationIssues = validationFailureIssues(data);
        setTemplateStatus({
          tone: 'error',
          message:
            validationIssues.length === 1
              ? validationIssues[0]
              : validationIssues.length > 1
                ? `Published URL validation found ${validationIssues.length} blocking issues.`
                : data.error || 'Failed to submit template.',
          details: validationIssues.length > 1 ? validationIssues : undefined
        });
        return;
      }

      setTemplateStatus({
        tone: 'success',
        message: data.warning
          ? `Template submitted. ${data.warning}`
          : 'Template submitted for review.'
      });
      setSubmittedTemplate({
        name: data.asset.name || template.templateName,
        warning: data.warning
      });
      setAutofillManaged({});
      setAnalyzerSummary(null);
      setTemplate((current) => ({
        ...initialTemplateState,
        creatorEmail: current.creatorEmail,
        creatorName: current.creatorName
      }));
      setVerification((current) => ({
        ...current,
        templateNameVerified: '',
        publishedUrlVerified: '',
        publishedUrlMessage: '',
        gsapDetected: false
      }));
    } catch (error) {
      setTemplateStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit template.'
      });
    } finally {
      if (shouldResetTurnstile) {
        resetTurnstile('template');
      }
      setTemplateSubmitting(false);
    }
  }

  function toggleCheckbox(values: string[], value: string) {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }

  function handleSubmitAnotherTemplate() {
    setSubmittedTemplate(null);
    setTemplateStatus(null);
    requestAnimationFrame(() => {
      templateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <main className={`submission-app${isEmbedded ? ' is-embedded' : ''}`}>
      {turnstileEnabled ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setTurnstileReady(true)}
        />
      ) : null}
      <section
        className="section cc-submission-wrapper cc-creator-wrap"
        id="join-today"
        ref={creatorSectionRef}
      >
        <div className="container">
          <div className="w-layout-grid submission_content-grid">
            <div className="cc-sticky submission-sidecar">
              <p className="submission-step-label">Step 1</p>
              <h2 className="submission-panel-title">Become a Creator</h2>
              <div className="rte w-richtext submission-panel-copy">
                <h3 className="h4">Step 1</h3>
                <p>
                  Start by filling out our Marketplace Creator form. These details will be used by
                  our review team to learn about you as a designer, and evaluate your experience
                  with Webflow. Remember that you only need to fill this out once!
                </p>
                <h3 className="h4">
                  <strong>Step 2</strong>
                </h3>
                <p>
                  Apply with your first template submission{' '}
                  <a
                    className="ts_link"
                    href="#submit-today"
                    onClick={(event) => {
                      event.preventDefault();
                      requestAnimationFrame(() => {
                        scrollToSubmissionSection('submit-today');
                      });
                    }}
                  >
                    here
                  </a>
                  ! We will evaluate the quality of your template, and publish those that meet our
                  standards. Once you have your first template approved, we will onboard you to the
                  Template Marketplace as a new designer.
                </p>
              </div>
            </div>

            <div className="submission-form-column">
              <div className="w-form">
                <form
                  className="form-2 cc-library-application-form submission-form"
                  id="wf-form-Marketplace-Creator-Submission"
                  name="wf-form-Marketplace-Creator-Submission"
                  onSubmit={submitCreator}
                >
                  <div className="submission-field">
                    <label
                      className="field-label template-application-form_field-label cc-with-desc"
                      htmlFor="country"
                    >
                      Country
                    </label>
                    <p className="field-help cc-library-application-form_field-desc">
                      Choose the country tied to your creator account. Some countries require
                      specific Stripe onboarding before payouts can continue.
                    </p>
                    <CountryPicker
                      id="country"
                      countries={ALL_COUNTRIES}
                      value={creator.country}
                      onChange={(v) => updateCreator('country', v)}
                      placeholder="Select or search for a country…"
                      required
                    />
                    {!creatorCountrySupported && creator.country ? (
                      <div className="submission-status submission-status-warning submission-country-onboarding-warning">
                        This country requires specific Stripe onboarding before payouts can
                        continue. Creators may need to meet Stripe requirements for another
                        supported country, including a valid tax ID or incorporation through a
                        service such as Doola or Stripe Atlas. Webflow cannot configure those
                        services on your behalf; contact Stripe Support with setup questions.
                      </div>
                    ) : null}
                  </div>

                  <div className="submission-field">
                    <label
                      className="field-label template-application-form_field-label cc-with-desc"
                      htmlFor="websiteUrl"
                    >
                      Personal website URL
                    </label>
                    <p className="field-help cc-library-application-form_field-desc">
                      Optional, but useful context for the review team.
                    </p>
                    <input
                      className="field-input input w-input"
                      id="websiteUrl"
                      type="url"
                      value={creator.websiteUrl}
                      onChange={(event) => updateCreator('websiteUrl', event.target.value)}
                      placeholder="https://"
                    />
                  </div>

                  <InlineActionField
                    actionLabel="Verify email"
                    feedback={fieldFeedback.primaryEmail}
                    feedbackAction={getCreatorProfileExistsAction(fieldFeedback.primaryEmail)}
                    onAction={() => verifyCreatorEmail('primary')}
                  >
                    <label
                      className="field-label template-application-form_field-label cc-with-desc"
                      htmlFor="primaryEmail"
                    >
                      Primary email
                    </label>
                    <p className="field-help cc-library-application-form_field-desc">
                      This email is used for creator correspondence and submission follow-up.
                    </p>
                    <input
                      className="field-input input w-input"
                      id="primaryEmail"
                      type="email"
                      value={creator.primaryEmail}
                      onChange={(event) => updateCreator('primaryEmail', event.target.value)}
                      required
                    />
                  </InlineActionField>

                  <InlineActionField
                    actionLabel="Verify email"
                    feedback={fieldFeedback.webflowEmail}
                    feedbackAction={getCreatorProfileExistsAction(fieldFeedback.webflowEmail)}
                    onAction={() => verifyCreatorEmail('webflow')}
                  >
                    <label
                      className="field-label template-application-form_field-label cc-with-desc"
                      htmlFor="webflowEmail"
                    >
                      Webflow account email
                    </label>
                    <p className="field-help cc-library-application-form_field-desc">
                      This must match the Webflow account used for the submitted template.
                    </p>
                    <input
                      className="field-input input w-input"
                      id="webflowEmail"
                      type="email"
                      value={creator.webflowEmail}
                      onChange={(event) => updateCreator('webflowEmail', event.target.value)}
                      required
                    />
                  </InlineActionField>

                  <div className="submission-grid-2">
                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label"
                        htmlFor="preferredName"
                      >
                        Preferred name
                      </label>
                      <input
                        className="field-input input w-input"
                        id="preferredName"
                        value={creator.preferredName}
                        onChange={(event) => updateCreator('preferredName', event.target.value)}
                      />
                    </div>

                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label"
                        htmlFor="legalName"
                      >
                        Legal name
                        <span className="submission-required"> *</span>
                      </label>
                      <input
                        className="field-input input w-input"
                        id="legalName"
                        value={creator.legalName}
                        onChange={(event) => updateCreator('legalName', event.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="submission-field">
                    <label
                      className="field-label template-application-form_field-label cc-with-desc"
                      htmlFor="biography"
                    >
                      Creator bio
                      <span className="submission-required"> *</span>
                    </label>
                    <p className="field-help cc-library-application-form_field-desc">
                      Keep it short and specific. This is used as the first pass of creator context.
                    </p>
                    <textarea
                      className="field-textarea input w-input submission-textarea"
                      id="biography"
                      value={creator.biography}
                      onChange={(event) => updateCreator('biography', event.target.value)}
                      maxLength={200}
                      required
                    />
                    <div className="field-help submission-counter">
                      {creator.biography.length}/200 characters
                    </div>
                  </div>

                  <div className="submission-field">
                    <label
                      className="field-label template-application-form_field-label cc-with-desc"
                      htmlFor="avatar"
                    >
                      Profile image
                      <span className="submission-required"> *</span>
                    </label>
                    <p className="field-help cc-library-application-form_field-desc">
                      Upload a WebP image that is exactly 256x256 and under 100KB.
                    </p>
                    <div className="submission-upload-card">
                      <UploadSpecs chips={['WebP', '256×256', '<100KB']} />
                      <input
                        className="submission-file-input"
                        id="avatar"
                        type="file"
                        accept="image/webp"
                        onChange={async (event) => {
                          const file = event.target.files?.[0] || null;
                          if (!file) {
                            setImageErrors((c) => ({ ...c, avatarFile: null }));
                            updateCreator('avatarFile', null);
                            return;
                          }
                          const err = await validateImageClient(file, 'avatar');
                          setImageErrors((c) => ({ ...c, avatarFile: err }));
                          updateCreator('avatarFile', err ? null : file);
                        }}
                      />
                      <SelectedFilesSummary
                        files={creator.avatarFile ? [creator.avatarFile] : []}
                        emptyLabel="No profile image selected yet."
                      />
                    </div>
                    {imageErrors.avatarFile ? (
                      <div className="submission-field-feedback submission-field-feedback-error">
                        {imageErrors.avatarFile}
                      </div>
                    ) : null}
                  </div>

                  <div className="submission-confirmation-card">
                    <div className="submission-confirmation-header">
                      <h3 className="submission-confirmation-title">Confirm profile submission</h3>
                      <p className="field-help submission-confirmation-copy">
                        One agreement and one bot check before the creator profile is created.
                      </p>
                    </div>
                    <div className="submission-confirmation-stack">
                      <label className="submission-choice submission-choice-checkbox w-checkbox input-block cc-check u-mb-0">
                        <input
                          type="checkbox"
                          checked={creator.agreedToTerms}
                          onChange={(event) => updateCreator('agreedToTerms', event.target.checked)}
                        />
                        <span className="submission-choice-copy">
                          I agree to the creator terms and marketplace policies.
                        </span>
                      </label>

                      {turnstileEnabled ? (
                        <div className="submission-field">
                          <span className="field-label template-application-form_field-label">
                            Bot check
                          </span>
                          <div className="turnstile-wrap" ref={creatorTurnstileRef} />
                          <div className="field-help">
                            Required before creating the creator profile.
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {creatorStatus ? (
                    <div className={statusClassName(creatorStatus.tone)}>
                      {creatorStatus.message}
                    </div>
                  ) : null}

                  <div className="submission-actions">
                    <button className="button-sp" type="submit" disabled={creatorSubmitting}>
                      {creatorSubmitting ? 'Creating profile...' : 'Create creator profile'}
                    </button>
                    <button
                      className="button-sp cc-white"
                      type="button"
                      onClick={() =>
                        requestAnimationFrame(() => {
                          scrollToSubmissionSection('submit-today');
                        })
                      }
                    >
                      I already have a creator profile
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="section cc-submission-wrapper cc-submit-wrap"
        id="submit-today"
        ref={templateSectionRef}
      >
        <div className="container">
          <div className="w-layout-grid submission_content-grid">
            <div className="cc-sticky submission-sidecar">
              <p className="submission-step-label">Step 2</p>
              <h2 className="submission-panel-title">Submit a template</h2>
              <div className="rte w-richtext submission-panel-copy">
                <p>
                  Once you've registered as a Marketplace Creator, you can submit templates for
                  review and publication in Webflow's Template Marketplace.
                </p>
                <p>
                  Remember to always reference our{' '}
                  <a
                    className="ts_link"
                    href="https://webflow.com/templates/grading-rubric"
                    rel="noreferrer"
                    target="_blank"
                  >
                    quality rubric
                  </a>{' '}
                  &amp;{' '}
                  <a
                    className="ts_link"
                    href="https://webflow.com/templates/submission-guidelines"
                    rel="noreferrer"
                    target="_blank"
                  >
                    submission guidelines
                  </a>
                  . Templates will only be published if all submission guidelines are met and a
                  score of "Good" is achieved on the quality rubric.
                </p>
                <p>
                  Published designers will be allowed concurrent submissions once they have had 5
                  templates published. Designers who have submitted 6 templates in 30 days will need
                  to wait before submitting new templates. All other designers will be limited to 1
                  active review at a time.
                </p>
                <p>
                  Our design reviewers will check your submission for quality, and get back to you
                  with any changes required.
                </p>
              </div>
              <FeaturedQualityShowcase />
            </div>

            <div className="submission-form-column">
              <div className="w-form">
                {submittedTemplate ? (
                  <TemplateSubmissionSuccessPanel
                    submission={submittedTemplate}
                    onSubmitAnother={handleSubmitAnotherTemplate}
                  />
                ) : (
                  <form
                    className="form-2 cc-library-application-form submission-form"
                    id="wf-form-Marketplace-Template-Submission"
                    name="wf-form-Marketplace-Template-Submission"
                    onSubmit={submitTemplate}
                  >
                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label"
                        htmlFor="templateCreatorName"
                      >
                        Creator name
                        <span className="submission-required"> *</span>
                      </label>
                      <input
                        className="field-input input w-input"
                        id="templateCreatorName"
                        value={template.creatorName}
                        onChange={(event) => updateTemplate('creatorName', event.target.value)}
                        required
                      />
                    </div>

                    {creatorEligibilityResolved ? (
                      <div className="submission-creator-resolved">
                        <div className="submission-creator-resolved-copy">
                          <div className="submission-creator-resolved-label">Creator verified</div>
                          <div className="submission-creator-resolved-email">
                            {template.creatorEmail}
                          </div>
                          <div className="submission-creator-resolved-help">
                            {fieldFeedback.creatorEmail?.message ||
                              'This creator can submit templates. You can keep filling the form below or switch creators.'}
                          </div>
                        </div>
                        <button
                          className="submission-inline-action submission-inline-action-strong"
                          type="button"
                          onClick={clearCreatorEligibility}
                        >
                          Change creator
                        </button>
                      </div>
                    ) : (
                      <>
                        <InlineActionField
                          actionLabel="Check creator"
                          feedback={fieldFeedback.creatorEmail}
                          onAction={verifyCreatorEligibility}
                        >
                          <label
                            className="field-label template-application-form_field-label cc-with-desc"
                            htmlFor="templateCreatorEmail"
                          >
                            Creator email
                            <span className="submission-required"> *</span>
                          </label>
                          <p className="field-help cc-library-application-form_field-desc">
                            Existing creators can enter their creator email here directly.
                          </p>
                          <input
                            className="field-input input w-input"
                            id="templateCreatorEmail"
                            type="email"
                            value={template.creatorEmail}
                            onChange={(event) => updateTemplate('creatorEmail', event.target.value)}
                            required
                          />
                        </InlineActionField>
                      </>
                    )}

                    <InlineActionField
                      actionLabel="Check name"
                      fieldClassName={hasAutofilledTemplateName ? 'is-ai-updated' : undefined}
                      feedback={fieldFeedback.templateName}
                      onAction={verifyTemplateName}
                    >
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="templateName"
                      >
                        Template name
                        <span className="submission-required"> *</span>
                        {hasAutofilledTemplateName ? <AiUpdatedBadge /> : null}
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        First word must be capitalized. Avoid emoji, category names, tag names, and
                        the standalone term &quot;AI&quot;.
                      </p>
                      <input
                        className="field-input input w-input"
                        id="templateName"
                        value={template.templateName}
                        onChange={(event) => updateTemplate('templateName', event.target.value)}
                        required
                      />
                    </InlineActionField>

                    <InlineActionField
                      actionLabel="Validate template"
                      feedback={fieldFeedback.publishedUrl}
                      onAction={verifyPublishedUrl}
                    >
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="publishedUrl"
                      >
                        Published URL
                        <span className="submission-required"> *</span>
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        Must be an HTTPS{' '}
                        <code className="submission-inline-code">*.webflow.io</code> URL. The full
                        site crawl can take a few minutes. As of May 1, 2026, legacy IX2
                        interactions are rejected; rebuild interactions with Webflow Interactions
                        powered by GSAP (IX3).
                      </p>
                      <input
                        className="field-input input w-input"
                        id="publishedUrl"
                        type="url"
                        value={template.publishedUrl}
                        onChange={(event) => updateTemplate('publishedUrl', event.target.value)}
                        required
                      />
                    </InlineActionField>

                    {analyzerSummary ? (
                      <div className="submission-analyzer-summary" ref={analyzerSummaryRef}>
                        <div className="submission-analyzer-header">
                          <div>
                            <div className="submission-step-label submission-step-label-secondary submission-analyzer-label">
                              AI validation
                            </div>
                            <h3 className="submission-analyzer-title">
                              Updates from the published site
                            </h3>
                          </div>
                        </div>
                        <p className="field-help submission-analyzer-copy">
                          {analyzerSummary.loading
                            ? 'The published-site crawl passed. Template suggestions are being generated and will fill in when ready.'
                            : analyzerSummary.appliedFields.length > 0
                              ? 'AI updated the highlighted fields below from the published site. You can still edit anything before submitting.'
                              : analyzerSummary.warning
                                ? 'The published-site crawl passed, but template suggestions were only partially available.'
                                : 'The published-site crawl passed. Review the suggestion summary below before submitting.'}
                        </p>

                        <div className="submission-analyzer-stage-grid">
                          <div className="submission-analyzer-stage">
                            <div className="submission-analyzer-stage-label">Validation</div>
                            <div className="submission-analyzer-stage-value">Passed</div>
                            <div className="submission-analyzer-stage-copy">
                              {analyzerSummary.validationMessage}
                            </div>
                          </div>
                          <div className="submission-analyzer-stage">
                            <div className="submission-analyzer-stage-label">AI updates</div>
                            <div className="submission-analyzer-stage-value">
                              {analyzerSummary.loading
                                ? 'Generating'
                                : analyzerSummary.appliedFields.length > 0
                                  ? `${analyzerSummary.appliedFields.length} field${analyzerSummary.appliedFields.length === 1 ? '' : 's'} applied`
                                  : analyzerSummary.warning
                                    ? 'Partial'
                                    : 'Suggestions ready'}
                            </div>
                            <div className="submission-analyzer-stage-copy">
                              {analyzerSummary.loading
                                ? 'You can continue filling the form while suggestions run separately.'
                                : analyzerSummary.appliedFields.length > 0
                                  ? 'The matching fields below were updated from the published site.'
                                  : analyzerSummary.warning
                                    ? 'Some fields still need manual input because suggestions were incomplete.'
                                    : 'Review the suggested fields below before submitting.'}
                            </div>
                          </div>
                          {analyzerSummary.screenshotsDownloadUrl ? (
                            <div className="submission-analyzer-stage">
                              <div className="submission-analyzer-stage-label">Screenshots</div>
                              <div className="submission-analyzer-stage-value">
                                {analyzerSummary.screenshotCount > 0
                                  ? `${analyzerSummary.screenshotCount} ready`
                                  : 'Ready'}
                              </div>
                              <div className="submission-analyzer-stage-copy">
                                Generated screenshots can be downloaded and reused for uploads.
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {analyzerSummary.appliedFields.length > 0 ? (
                          <div className="submission-analyzer-group">
                            <div className="submission-analyzer-group-title">AI updated fields</div>
                            <div className="submission-chip-list">
                              {analyzerSummary.appliedFields.map((field) => (
                                <span
                                  className="submission-chip submission-chip-success"
                                  key={field}
                                >
                                  {AUTOFILL_FIELD_LABELS[field]}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {analyzerSummary.suggestedFields.filter(
                          (field) => !analyzerSummary.appliedFields.includes(field)
                        ).length > 0 ? (
                          <div className="submission-analyzer-group">
                            <div className="submission-analyzer-group-title">
                              Still worth reviewing
                            </div>
                            <div className="submission-chip-list">
                              {analyzerSummary.suggestedFields
                                .filter((field) => !analyzerSummary.appliedFields.includes(field))
                                .map((field) => (
                                  <span
                                    className="submission-chip submission-chip-muted"
                                    key={field}
                                  >
                                    {AUTOFILL_FIELD_LABELS[field]}
                                  </span>
                                ))}
                            </div>
                          </div>
                        ) : null}

                        {analyzerSummary.warning ? (
                          <div className="submission-analyzer-callout submission-analyzer-callout-warning">
                            {analyzerSummary.warning}
                          </div>
                        ) : null}

                        {analyzerSummary.screenshotsDownloadUrl ? (
                          <div className="submission-analyzer-callout submission-analyzer-callout-info">
                            <div>
                              Generated screenshots are ready.
                              {analyzerSummary.screenshotCount > 0
                                ? ` ${analyzerSummary.screenshotCount} screenshot${analyzerSummary.screenshotCount === 1 ? '' : 's'} were prepared for upload.`
                                : ''}
                            </div>
                            <a
                              className="submission-status-link"
                              href={analyzerSummary.screenshotsDownloadUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Download generated screenshots (ZIP)
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="previewUrl"
                      >
                        Preview URL
                        <span className="submission-required"> *</span>
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        Must contain{' '}
                        <code className="submission-inline-code">
                          https://preview.webflow.com/preview/
                        </code>
                        .
                      </p>
                      <input
                        className="field-input input w-input"
                        id="previewUrl"
                        type="url"
                        value={template.previewUrl}
                        onChange={(event) => updateTemplate('previewUrl', event.target.value)}
                        required
                      />
                      {!previewUrlValid ? (
                        <div className="submission-error-text">
                          Preview URLs must contain https://preview.webflow.com/preview/.
                        </div>
                      ) : null}
                    </div>

                    <div
                      className={fieldClassName(hasAutofilledPriceModel, 'submission-select-field')}
                    >
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="priceModel"
                      >
                        Free or paid
                        {hasAutofilledPriceModel ? <AiUpdatedBadge /> : null}
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        Choose whether the template will be published as a free listing or a paid
                        marketplace template.
                      </p>
                      <select
                        className="field-select input w-select"
                        id="priceModel"
                        value={template.priceModel}
                        onChange={(event) =>
                          updateTemplate(
                            'priceModel',
                            event.target.value as TemplateFormState['priceModel']
                          )
                        }
                      >
                        <option value="">Select pricing</option>
                        <option value="Free">Free</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>

                    <div className={fieldClassName(hasAutofilledCategories)}>
                      <span className="field-label template-application-form_field-label cc-with-desc">
                        Category
                        <span className="submission-required"> *</span>
                        {hasAutofilledCategories ? <AiUpdatedBadge /> : null}
                      </span>
                      <p className="field-help cc-library-application-form_field-desc">
                        Select up to 2 options that best describe your template.
                      </p>
                      <ChoiceToolbar
                        value={optionSearch.categories}
                        onChange={(value) => updateOptionSearch('categories', value)}
                        placeholder="Search categories"
                        ariaLabel="Search categories"
                        shownCount={visibleCategories.length}
                        actionLabel={template.categories.length > 0 ? 'Clear all' : undefined}
                        onAction={
                          template.categories.length > 0
                            ? () => updateTemplate('categories', [])
                            : undefined
                        }
                      />
                      <SelectedChoiceSummary
                        choices={selectedCategoryChoices}
                        onRemove={(category) =>
                          updateTemplate(
                            'categories',
                            template.categories.filter((value) => value !== category)
                          )
                        }
                      />
                      <div className="submission-choice-grid submission-choice-grid-taxonomy is-scroll">
                        {visibleCategories.length === 0 ? (
                          <div className="submission-choice-empty">
                            No categories match your search.
                          </div>
                        ) : null}
                        {visibleCategories.map((category) => {
                          const checked = template.categories.includes(category);
                          const atMax = template.categories.length >= 2;
                          return (
                            <label
                              className={choiceClassName(
                                checked,
                                'submission-choice-taxonomy input-block cc-check cc-template-application-form-choice',
                                !checked && atMax && 'is-disabled'
                              )}
                              key={category}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!checked && atMax}
                                onChange={() =>
                                  updateTemplate(
                                    'categories',
                                    toggleCheckbox(template.categories, category)
                                  )
                                }
                              />
                              <span className="submission-choice-copy">{category}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="field-help submission-counter">
                        {template.categories.length} of 2 categories selected
                      </div>
                    </div>

                    <div className={fieldClassName(hasAutofilledPageCount)}>
                      <span className="field-label template-application-form_field-label cc-with-desc">
                        Page count
                        <span className="submission-required"> *</span>
                        {hasAutofilledPageCount ? <AiUpdatedBadge /> : null}
                      </span>
                      <p className="field-help cc-library-application-form_field-desc">
                        One page, multi page, or multi-layout.
                      </p>
                      <div className="submission-choice-grid submission-choice-grid-taxonomy">
                        {(['One', 'Multi', 'Multi-layout'] as const).map((option) => (
                          <label
                            className={choiceClassName(
                              template.pageCount === option,
                              'input-block cc-check cc-template-application-form-choice'
                            )}
                            key={option}
                          >
                            <input
                              type="radio"
                              name="pageCount"
                              checked={template.pageCount === option}
                              onChange={() => updateTemplate('pageCount', option)}
                            />
                            <span className="submission-choice-copy">
                              {option === 'One'
                                ? 'One page'
                                : option === 'Multi'
                                  ? 'Multi page'
                                  : 'Multi-layout (3+ layouts with 3+ pages)'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className={fieldClassName(hasAutofilledTemplateType)}>
                      <span className="field-label template-application-form_field-label cc-with-desc">
                        Template type
                        {hasAutofilledTemplateType ? <AiUpdatedBadge /> : null}
                      </span>
                      <p className="field-help cc-library-application-form_field-desc">
                        Check the Webflow product surfaces used by the template.
                      </p>
                      <div className="submission-choice-grid submission-choice-grid-template-type">
                        <label
                          className={choiceClassName(
                            template.typeCms,
                            'input-block cc-check cc-template-application-form-choice'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={template.typeCms}
                            onChange={(event) => updateTemplate('typeCms', event.target.checked)}
                          />
                          <span className="submission-choice-copy">CMS</span>
                        </label>
                        <label
                          className={choiceClassName(
                            template.typeEcommerce,
                            'input-block cc-check cc-template-application-form-choice'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={template.typeEcommerce}
                            onChange={(event) =>
                              updateTemplate('typeEcommerce', event.target.checked)
                            }
                          />
                          <span className="submission-choice-copy">Ecommerce</span>
                        </label>
                      </div>
                    </div>

                    {template.priceModel === 'Paid' && template.pageCount ? (
                      <div className="submission-field">
                        <span className="field-label template-application-form_field-label cc-with-desc">
                          Template price
                          <span className="submission-required"> *</span>
                        </span>
                        <p className="field-help cc-library-application-form_field-desc">
                          Available price points are determined by page count and CMS usage.
                        </p>
                        <div className="submission-choice-grid">
                          {getPricingTiers(
                            template.pageCount as PageCountOption,
                            template.typeCms
                          ).prices.map((price) => (
                            <label
                              className={choiceClassName(
                                template.selectedPrice === price,
                                'submission-choice-taxonomy input-block cc-check cc-template-application-form-choice'
                              )}
                              key={price}
                            >
                              <input
                                type="radio"
                                name="selectedPrice"
                                checked={template.selectedPrice === price}
                                onChange={() => updateTemplate('selectedPrice', price)}
                              />
                              <span className="submission-choice-copy">${price}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className={fieldClassName(hasAutofilledStyles)}>
                      <span className="field-label template-application-form_field-label cc-with-desc">
                        Styles
                        <span className="submission-required"> *</span>
                        {hasAutofilledStyles ? <AiUpdatedBadge /> : null}
                      </span>
                      <p className="field-help cc-library-application-form_field-desc">
                        Select up to 2 styles.
                      </p>
                      <ChoiceToolbar
                        value={optionSearch.styles}
                        onChange={(value) => updateOptionSearch('styles', value)}
                        placeholder="Search styles"
                        ariaLabel="Search styles"
                        shownCount={visibleStyles.length}
                        actionLabel={template.styles.length > 0 ? 'Clear all' : undefined}
                        onAction={
                          template.styles.length > 0
                            ? () => updateTemplate('styles', [])
                            : undefined
                        }
                      />
                      <SelectedChoiceSummary
                        choices={selectedStyleChoices}
                        onRemove={(style) =>
                          updateTemplate(
                            'styles',
                            template.styles.filter((value) => value !== style)
                          )
                        }
                      />
                      <div className="submission-choice-grid submission-choice-grid-taxonomy">
                        {visibleStyles.length === 0 ? (
                          <div className="submission-choice-empty">
                            No styles match your search.
                          </div>
                        ) : null}
                        {visibleStyles.map((style) => {
                          const checked = template.styles.includes(style);
                          const atMax = template.styles.length >= 2;
                          return (
                            <label
                              className={choiceClassName(
                                checked,
                                'input-block cc-check cc-template-application-form-choice',
                                !checked && atMax && 'is-disabled'
                              )}
                              key={style}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!checked && atMax}
                                onChange={() =>
                                  updateTemplate('styles', toggleCheckbox(template.styles, style))
                                }
                              />
                              <span className="submission-choice-copy">{style}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="field-help submission-counter">
                        {template.styles.length} of 2 styles selected
                      </div>
                    </div>

                    <div className={fieldClassName(hasAutofilledFeatures)}>
                      <span className="field-label template-application-form_field-label cc-with-desc">
                        Features
                        <span className="submission-required"> *</span>
                        {hasAutofilledFeatures ? <AiUpdatedBadge /> : null}
                      </span>
                      <p className="field-help cc-library-application-form_field-desc">
                        Choose the Webflow features used by the template.
                      </p>
                      <ChoiceToolbar
                        value={optionSearch.featureIds}
                        onChange={(value) => updateOptionSearch('featureIds', value)}
                        placeholder="Search features"
                        ariaLabel="Search features"
                        shownCount={visibleFeatures.length}
                        actionLabel={
                          !arraysEqual(template.featureIds, DEFAULT_FEATURE_IDS)
                            ? 'Reset defaults'
                            : undefined
                        }
                        onAction={
                          !arraysEqual(template.featureIds, DEFAULT_FEATURE_IDS)
                            ? () => updateTemplate('featureIds', [...DEFAULT_FEATURE_IDS])
                            : undefined
                        }
                      />
                      <SelectedChoiceSummary
                        choices={selectedFeatureChoices}
                        onRemove={(featureId) =>
                          updateTemplate(
                            'featureIds',
                            template.featureIds.filter((value) => value !== featureId)
                          )
                        }
                      />
                      <div className="submission-choice-grid">
                        {visibleFeatures.length === 0 ? (
                          <div className="submission-choice-empty">
                            No features match your search.
                          </div>
                        ) : null}
                        {visibleFeatures.map((option) => (
                          <label
                            className={choiceClassName(
                              template.featureIds.includes(option.id),
                              'submission-choice-taxonomy input-block cc-check cc-template-application-form-choice'
                            )}
                            key={option.id}
                          >
                            <input
                              type="checkbox"
                              checked={template.featureIds.includes(option.id)}
                              onChange={() =>
                                updateTemplate(
                                  'featureIds',
                                  toggleCheckbox(template.featureIds, option.id)
                                )
                              }
                            />
                            <span className="submission-choice-copy">{option.label}</span>
                          </label>
                        ))}
                      </div>
                      {verification.gsapDetected ? (
                        <div className="field-help">
                          GSAP was detected automatically during validation.
                        </div>
                      ) : null}
                    </div>

                    <div className={fieldClassName(hasAutofilledShortDescription)}>
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="shortDescription"
                      >
                        Short description
                        <span className="submission-required"> *</span>
                        {hasAutofilledShortDescription ? <AiUpdatedBadge /> : null}
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        Keep the short summary concise and reviewer-friendly.
                      </p>
                      <textarea
                        className="field-textarea input w-input submission-textarea submission-textarea-short"
                        id="shortDescription"
                        value={template.shortDescription}
                        onChange={(event) => updateTemplate('shortDescription', event.target.value)}
                        maxLength={250}
                        required
                      />
                      <div className="field-help submission-counter">
                        {template.shortDescription.length}/250 characters
                      </div>
                    </div>

                    <div className={fieldClassName(hasAutofilledLongDescription)}>
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="longDescription"
                      >
                        Long description
                        <span className="submission-required"> *</span>
                        {hasAutofilledLongDescription ? <AiUpdatedBadge /> : null}
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        Rich text is allowed for emphasis and lists. Image embeds are stripped.
                      </p>
                      <QuillEditor
                        id="longDescription"
                        value={template.longDescription}
                        onChange={(html) => updateTemplate('longDescription', html)}
                        placeholder="Write the Template Overview content..."
                      />
                    </div>

                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="notes"
                      >
                        Notes
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        Optional internal notes for the review queue.
                      </p>
                      <textarea
                        className="field-textarea input w-input submission-textarea submission-textarea-notes"
                        id="notes"
                        value={template.notes}
                        maxLength={400}
                        onChange={(event) => updateTemplate('notes', event.target.value)}
                      />
                      <div className="field-help">{template.notes.length}/400 characters</div>
                    </div>

                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="thumbnailFile"
                      >
                        Primary thumbnail
                        <span className="submission-required"> *</span>
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        WebP only, exactly 750x995, under 300KB.
                      </p>
                      <div className="submission-upload-card">
                        <UploadSpecs chips={['WebP', '750×995', '<300KB']} />
                        <input
                          className="submission-file-input"
                          id="thumbnailFile"
                          type="file"
                          accept="image/webp"
                          onChange={async (event) => {
                            const file = event.target.files?.[0] || null;
                            if (!file) {
                              setImageErrors((c) => ({ ...c, thumbnailFile: null }));
                              updateTemplate('thumbnailFile', null);
                              return;
                            }
                            const err = await validateImageClient(file, 'thumbnail');
                            setImageErrors((c) => ({ ...c, thumbnailFile: err }));
                            updateTemplate('thumbnailFile', err ? null : file);
                          }}
                        />
                        <SelectedFilesSummary
                          files={template.thumbnailFile ? [template.thumbnailFile] : []}
                          emptyLabel="No primary thumbnail selected yet."
                          onRemove={() => {
                            setImageErrors((current) => ({ ...current, thumbnailFile: null }));
                            updateTemplate('thumbnailFile', null);
                          }}
                        />
                      </div>
                      {imageErrors.thumbnailFile ? (
                        <div className="submission-field-feedback submission-field-feedback-error">
                          {imageErrors.thumbnailFile}
                        </div>
                      ) : null}
                    </div>

                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="secondaryThumbnailFile"
                      >
                        Secondary thumbnail
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        Optional. Same 750x995 WebP constraint as the primary thumbnail.
                      </p>
                      <div className="submission-upload-card">
                        <UploadSpecs chips={['WebP', '750×995', '<300KB']} />
                        <input
                          className="submission-file-input"
                          id="secondaryThumbnailFile"
                          type="file"
                          accept="image/webp"
                          onChange={async (event) => {
                            const file = event.target.files?.[0] || null;
                            if (!file) {
                              setImageErrors((c) => ({ ...c, secondaryThumbnailFile: null }));
                              updateTemplate('secondaryThumbnailFile', null);
                              return;
                            }
                            const err = await validateImageClient(file, 'secondary-thumbnail');
                            setImageErrors((c) => ({ ...c, secondaryThumbnailFile: err }));
                            updateTemplate('secondaryThumbnailFile', err ? null : file);
                          }}
                        />
                        <SelectedFilesSummary
                          files={
                            template.secondaryThumbnailFile ? [template.secondaryThumbnailFile] : []
                          }
                          emptyLabel="No secondary thumbnail selected."
                          onRemove={() => {
                            setImageErrors((current) => ({
                              ...current,
                              secondaryThumbnailFile: null
                            }));
                            updateTemplate('secondaryThumbnailFile', null);
                          }}
                        />
                      </div>
                      {imageErrors.secondaryThumbnailFile ? (
                        <div className="submission-field-feedback submission-field-feedback-error">
                          {imageErrors.secondaryThumbnailFile}
                        </div>
                      ) : null}
                    </div>

                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="galleryFiles"
                      >
                        Gallery images
                        <span className="submission-required"> *</span>
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        Upload 1 to 5 WebP images, each exactly 1440x900 and under 250KB.
                      </p>
                      <div className="submission-upload-card">
                        <UploadSpecs chips={['WebP', '1440×900', '<250KB each', '1–5 images']} />
                        <input
                          className="submission-file-input"
                          id="galleryFiles"
                          type="file"
                          accept="image/webp"
                          multiple
                          onChange={async (event) => {
                            const files = Array.from(event.target.files || []).slice(0, 5);
                            const validated: File[] = [];
                            const newErrors: Record<string, string | null> = {};
                            // Clear any prior gallery errors first.
                            setImageErrors((c) => {
                              const next = { ...c };
                              for (const key of Object.keys(next)) {
                                if (key.startsWith('gallery-')) next[key] = null;
                              }
                              return next;
                            });
                            for (let i = 0; i < files.length; i++) {
                              const err = await validateImageClient(files[i], 'gallery');
                              newErrors[`gallery-${i}`] = err;
                              if (!err) validated.push(files[i]);
                            }
                            setImageErrors((c) => ({ ...c, ...newErrors }));
                            setTemplate((current) => ({
                              ...current,
                              galleryFiles: dedupeFiles([
                                ...current.galleryFiles,
                                ...validated
                              ]).slice(0, 5)
                            }));
                            setTemplateStatus(null);
                            event.target.value = '';
                          }}
                        />
                        <SelectedFilesSummary
                          files={template.galleryFiles}
                          emptyLabel="No gallery images selected yet."
                          onRemove={removeGalleryFile}
                        />
                      </div>
                      {galleryErrorMessages.map((message, index) => (
                        <div
                          key={`${message}-${index}`}
                          className="submission-field-feedback submission-field-feedback-error"
                        >
                          {message}
                        </div>
                      ))}
                    </div>

                    <TemplateReadinessBanner items={reviewItems} status={templateStatus} />

                    <ReviewChecklistCard
                      title="Review the final handoff"
                      copy="This mirrors the final readiness checks the marketplace team will expect when your template hits the queue."
                      items={reviewItems}
                    />

                    <div className="submission-confirmation-card">
                      <div className="submission-confirmation-header">
                        <h3 className="submission-confirmation-title">Confirm and hand off</h3>
                        <p className="field-help submission-confirmation-copy">
                          These last checks mirror the reviewer handoff. Confirm them here before
                          you submit.
                        </p>
                      </div>
                      <div className="submission-confirmation-stack">
                        <label className="submission-choice submission-choice-checkbox w-checkbox input-block cc-check u-mb-0">
                          <input
                            type="checkbox"
                            checked={template.qualityBenchmarkConfirmed}
                            onChange={(event) =>
                              updateTemplate('qualityBenchmarkConfirmed', event.target.checked)
                            }
                          />
                          <span className="submission-choice-copy">
                            I reviewed the Featured quality benchmark and checked that this template
                            is ready for marketplace review.
                          </span>
                        </label>

                        <label className="submission-choice submission-choice-checkbox w-checkbox input-block cc-check u-mb-0">
                          <input
                            type="checkbox"
                            checked={template.checklistConfirmed}
                            onChange={(event) =>
                              updateTemplate('checklistConfirmed', event.target.checked)
                            }
                          />
                          <span className="submission-choice-copy">
                            I completed the submission checklist.
                          </span>
                        </label>

                        <label className="submission-choice submission-choice-checkbox w-checkbox input-block cc-check u-mb-0">
                          <input
                            type="checkbox"
                            checked={template.agreementConfirmed}
                            onChange={(event) =>
                              updateTemplate('agreementConfirmed', event.target.checked)
                            }
                          />
                          <span className="submission-choice-copy">
                            I agree to the marketplace submission agreement.
                          </span>
                        </label>

                        {turnstileEnabled ? (
                          <div className="submission-field">
                            <span className="field-label template-application-form_field-label">
                              Bot check
                            </span>
                            <div className="turnstile-wrap" ref={templateTurnstileRef} />
                            <div className="field-help">
                              Required before submitting the template.
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {templateStatus ? (
                      <div className={statusClassName(templateStatus.tone)}>
                        <span>{templateStatus.message}</span>
                        {templateStatus.details?.length ? (
                          <ul className="submission-status-list">
                            {templateStatus.details.map((detail) => (
                              <li key={detail}>{detail}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="submission-actions">
                      <button className="button-sp" type="submit" disabled={templateSubmitting}>
                        {templateSubmitting ? 'Submitting...' : 'Submit template'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

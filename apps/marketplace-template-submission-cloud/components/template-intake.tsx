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
  'secondary-thumbnail': { width: 750, height: 995, maxSize: 300 * 1024, label: 'Secondary thumbnail' },
  gallery: { width: 1440, height: 900, maxSize: 250 * 1024, label: 'Gallery image' }
} as const;

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

type Tone = 'success' | 'error' | 'info';

type StatusMessage = {
  tone: Tone;
  message: string;
};

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
  priceModel: 'Free' | 'Paid';
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
  checklistConfirmed: boolean;
  agreementConfirmed: boolean;
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
  featureIds: 'Features',
};

const initialTemplateState: TemplateFormState = {
  creatorName: '',
  creatorEmail: '',
  templateName: '',
  publishedUrl: '',
  previewUrl: '',
  priceModel: 'Free',
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
    normalizeRichText(current) === '' ||
    normalizeRichText(current) === normalizeRichText(previous)
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
  return current === 'Free' || current === previous;
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

function FieldFeedback({
  feedback,
  action,
}: {
  feedback?: StatusMessage | null;
  action?: FeedbackAction;
}) {
  if (!feedback) return null;
  return (
    <div className={feedbackClass(feedback.tone)}>
      <span>{feedback.message}</span>
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
  feedback,
  feedbackAction,
  onAction,
}: {
  actionLabel: string;
  children: ReactNode;
  feedback?: StatusMessage | null;
  feedbackAction?: FeedbackAction;
  onAction: () => void;
}) {
  return (
    <>
      <div className="submission-field-inline">
        <div className="submission-field">{children}</div>
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
  onAction,
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
}: {
  files: readonly File[];
  emptyLabel?: ReactNode;
}) {
  if (files.length === 0) {
    return emptyLabel ? <div className="field-help submission-selected-files-empty">{emptyLabel}</div> : null;
  }

  return (
    <div className="submission-selected-files" aria-live="polite">
      {files.map((file) => (
        <div className="submission-selected-file" key={`${file.name}-${file.size}-${file.lastModified}`}>
          <span className="submission-selected-file-name">{file.name}</span>
          <span className="submission-selected-file-size">{formatFileSize(file.size)}</span>
        </div>
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
  items,
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
          <div className="submission-step-label submission-step-label-secondary">
            Final review
          </div>
          <h3 className="submission-review-title">{title}</h3>
        </div>
        <div className="submission-review-progress">
          {remainingCount === 0 ? 'Ready to submit' : `${remainingCount} item${remainingCount === 1 ? '' : 's'} left`}
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
    featureIds: '',
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
  const hasAutofilledFeatures = isAutofilledArray(
    template.featureIds,
    autofillManaged.featureIds
  );
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
  const visibleStyles = sortSelectableLabels(
    TEMPLATE_STYLES,
    template.styles,
    optionSearch.styles
  );
  const visibleFeatures = sortSelectableObjects(
    WEBFLOW_FEATURES.filter((feature) => !feature.hidden),
    template.featureIds,
    optionSearch.featureIds,
    (feature) => feature.label,
    (feature) => feature.id
  );
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
      onClick: () => scrollToSubmissionSection('submit-today'),
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
        offsetTop: target.offsetTop,
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
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      if (height === lastHeight) return;
      lastHeight = height;
      window.parent.postMessage({ type: 'ts-submission:resize', height }, '*');
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
    if (!turnstileEnabled || !turnstileReady || typeof window === 'undefined' || !window.turnstile) {
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
  const previewUrlValid =
    template.previewUrl.trim() === '' ||
    template.previewUrl.trim().includes('https://preview.webflow.com/preview/');
  const galleryErrorMessages = Object.entries(imageErrors)
    .filter(([key, value]) => key.startsWith('gallery-') && value)
    .map(([, value]) => value as string);
  const reviewItems: ReviewChecklistItem[] = [
    {
      label: 'Creator verified',
      detail: creatorEligibilityResolved
        ? 'The creator identity is resolved and eligible to submit.'
        : 'Use Check creator to confirm the creator account first.',
      complete: creatorEligibilityResolved,
    },
    {
      label: 'Template checks passed',
      detail:
        verification.templateNameVerified === template.templateName.trim() &&
        verification.publishedUrlVerified === template.publishedUrl.trim()
          ? 'Template name and published site both passed validation.'
          : 'Run Check name and Validate template before submitting.',
      complete:
        verification.templateNameVerified === template.templateName.trim() &&
        verification.publishedUrlVerified === template.publishedUrl.trim(),
    },
    {
      label: 'Preview and metadata ready',
      detail:
        previewUrlValid &&
        template.previewUrl.trim() !== '' &&
        template.categories.length > 0 &&
        template.styles.length > 0 &&
        template.pageCount !== ''
          ? 'Preview URL, category, styles, and page count are all set.'
          : 'Add a valid preview URL plus the required taxonomy and page info.',
      complete:
        previewUrlValid &&
        template.previewUrl.trim() !== '' &&
        template.categories.length > 0 &&
        template.styles.length > 0 &&
        template.pageCount !== '',
    },
    {
      label: 'Pricing is resolved',
      detail:
        template.priceModel === 'Free' || template.selectedPrice !== null
          ? 'The template pricing setup is complete.'
          : 'Choose a paid price tier or switch the template to free.',
      complete: template.priceModel === 'Free' || template.selectedPrice !== null,
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
        galleryErrorMessages.length === 0,
    },
    {
      label: 'Agreements confirmed',
      detail:
        template.checklistConfirmed && template.agreementConfirmed
          ? 'Checklist and submission agreement are both confirmed.'
          : 'Confirm the checklist and submission agreement below.',
      complete: template.checklistConfirmed && template.agreementConfirmed,
    },
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
    setTemplate((current) => ({ ...current, [key]: value }));
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

  function updateOptionSearch(
    key: keyof typeof optionSearch,
    value: string
  ) {
    setOptionSearch((current) => ({ ...current, [key]: value }));
  }

  function clearCreatorEligibility() {
    setFeedback('creatorEmail', null);
    setVerification((current) => ({
      ...current,
      creatorEligibilityEmail: '',
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
        shouldAutofillRichText(
          current.longDescription,
          autofillManaged.longDescription
        )
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

      if (next.priceModel === 'Free') {
        next.selectedPrice = null;
      } else if (!next.pageCount) {
        next.selectedPrice = null;
      } else {
        const allowedPrices = getPricingTiers(next.pageCount, next.typeCms).prices;
        if (next.selectedPrice !== null && !allowedPrices.includes(next.selectedPrice)) {
          next.selectedPrice = null;
        }
      }

      return next;
    });

    if (Object.keys(managedNext).length > 0) {
      setAutofillManaged((current) => ({ ...current, ...managedNext }));
    }

    return {
      appliedFields: [...appliedFields],
      suggestedFields: [...suggestedFields],
    };
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
      message: 'Checking creator eligibility…',
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
    const url = template.publishedUrl.trim();
    if (!url) {
      setFeedback('publishedUrl', { tone: 'error', message: 'Enter the published Webflow URL first.' });
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

    const data = (await response.json().catch(() => ({}))) as {
      passed?: boolean;
      message?: string;
      normalizedUrl?: string;
      gsapDetected?: boolean;
      autofill?: TemplateAutofillPayload;
      autofillWarning?: string;
      screenshotCount?: number;
      screenshotsDownloadUrl?: string;
      siteResults?: {
        passedCount?: number;
      };
    };

    if (!response.ok || !data.passed || !data.normalizedUrl) {
      const message = data.message || 'Published URL validation failed.';
      setTemplateStatus({
        tone: 'error',
        message
      });
      setFeedback('publishedUrl', {
        tone: 'error',
        message
      });
      return;
    }

    const autofillResult = applyTemplateAutofill(data.autofill, {
      gsapDetected: Boolean(data.gsapDetected)
    });

    const nextAnalyzerSummary: TemplateAnalyzerSummary | null =
      autofillResult.appliedFields.length > 0 ||
      autofillResult.suggestedFields.length > 0 ||
      Boolean(data.autofillWarning) ||
      Boolean(data.screenshotsDownloadUrl)
        ? {
            validationMessage: data.message || 'Published site validated.',
            appliedFields: autofillResult.appliedFields,
            suggestedFields: autofillResult.suggestedFields,
            screenshotCount: data.screenshotCount ?? 0,
            screenshotsDownloadUrl: data.screenshotsDownloadUrl,
            warning: data.autofillWarning
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
        data.message || 'Published site validated.',
        autofillResult.appliedFields.length > 0
          ? `Analyzer suggestions filled ${autofillResult.appliedFields.length} field${autofillResult.appliedFields.length === 1 ? '' : 's'}.`
          : nextAnalyzerSummary
            ? 'Review the analyzer summary below.'
            : '',
        data.gsapDetected ? 'GSAP was detected automatically.' : '',
        data.autofillWarning
          ? 'Template suggestions were unavailable, so finish the remaining fields manually.'
          : ''
      ]
        .filter(Boolean)
        .join(' ')
    });
    setVerification((current) => ({
      ...current,
      publishedUrlVerified: data.normalizedUrl || '',
      publishedUrlMessage: data.message || 'Published site validated.'
    }));
    setTemplate((current) => ({
      ...current,
      publishedUrl: data.normalizedUrl || current.publishedUrl,
      featureIds: data.gsapDetected
        ? [...new Set([...current.featureIds, 'gsap'])]
        : current.featureIds
    }));
    setVerification((current) => ({
      ...current,
      gsapDetected: Boolean(data.gsapDetected)
    }));
    setTemplateStatus({
      tone: 'success',
      message: data.message || 'Published site validated.'
    });
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
    let shouldResetTurnstile = false;

    try {
      if (
        verification.creatorEligibilityEmail !== template.creatorEmail.trim().toLowerCase()
      ) {
        throw new Error('Verify creator eligibility before submitting the template.');
      }

      if (verification.templateNameVerified !== template.templateName.trim()) {
        throw new Error('Verify the template name before submitting.');
      }

      if (verification.publishedUrlVerified !== template.publishedUrl.trim()) {
        throw new Error('Validate the published URL before submitting.');
      }

      if (!template.thumbnailFile) {
        throw new Error('Upload the primary thumbnail before submitting.');
      }

      if (template.galleryFiles.length === 0) {
        throw new Error('Upload at least one gallery image before submitting.');
      }

      if (!previewUrlValid) {
        throw new Error('Preview URL must contain https://preview.webflow.com/preview/.');
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
        template.featureIds.includes(f.id),
      ).map((f) => f.label === 'Components' ? 'Symbols' : f.label);

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
            ...(template.pageCount === 'Multi-layout' ? ['multi-layout'] : template.pageCount === 'Multi' ? ['static'] : ['static']),
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
        warning?: string;
      };

      if (!response.ok || !data.asset) {
        throw new Error(data.error || 'Failed to submit template.');
      }

      setTemplateStatus({
        tone: 'success',
        message: data.warning
          ? `Template submitted. ${data.warning}`
          : 'Template submitted for review.'
      });
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
                  Start by filling out our Marketplace Creator form. These details will be used
                  by our review team to learn about you as a designer, and evaluate your
                  experience with Webflow. Remember that you only need to fill this out once!
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
                  standards. Once you have your first template approved, we will onboard you to
                  the Template Marketplace as a new designer.
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
                      Choose the country tied to your creator account. Unsupported payout
                      countries still behave as warnings, matching the live page.
                    </p>
                    <CountryPicker
                      id="country"
                      countries={ALL_COUNTRIES}
                      value={creator.country}
                      onChange={(v) => updateCreator('country', v)}
                      placeholder="Select or search for a country…"
                      required
                    />
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

                  {!creatorCountrySupported && creator.country ? (
                    <div className="submission-status submission-status-warning">
                      This country is not currently in the supported payout list. The submission
                      can continue, but this will need a follow-up review.
                    </div>
                  ) : null}

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
                      Keep it short and specific. This is used as the first pass of creator
                      context.
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
                        required
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
                    <div className={statusClassName(creatorStatus.tone)}>{creatorStatus.message}</div>
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
                  templates published. Designers who have submitted 6 templates in 30 days will
                  need to wait before submitting new templates. All other designers will be limited
                  to 1 active review at a time.
                </p>
                <p>
                  Our design reviewers will check your submission for quality, and get back to you
                  with any changes required.
                </p>
              </div>
            </div>

            <div className="submission-form-column">
              <div className="w-form">
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
                    feedback={fieldFeedback.templateName}
                    onAction={verifyTemplateName}
                  >
                    <label
                      className="field-label template-application-form_field-label cc-with-desc"
                      htmlFor="templateName"
                    >
                      Template name
                      <span className="submission-required"> *</span>
                      {hasAutofilledTemplateName ? (
                        <span className="submission-autofill-badge">Autofilled</span>
                      ) : null}
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
                      Must be an HTTPS <code className="submission-inline-code">*.webflow.io</code>{' '}
                      URL. The full site crawl can take a few minutes.
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
                            Analyzer summary
                          </div>
                          <h3 className="submission-analyzer-title">
                            Suggestions from the published site
                          </h3>
                        </div>
                      </div>
                      <p className="field-help submission-analyzer-copy">
                        {analyzerSummary.appliedFields.length > 0
                          ? 'These fields were populated automatically. You can still edit anything below before submitting.'
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
                          <div className="submission-analyzer-stage-label">Autofill</div>
                          <div className="submission-analyzer-stage-value">
                            {analyzerSummary.appliedFields.length > 0
                              ? `${analyzerSummary.appliedFields.length} field${analyzerSummary.appliedFields.length === 1 ? '' : 's'} applied`
                              : analyzerSummary.warning
                                ? 'Partial'
                                : 'Suggestions ready'}
                          </div>
                          <div className="submission-analyzer-stage-copy">
                            {analyzerSummary.appliedFields.length > 0
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
                          <div className="submission-analyzer-group-title">Applied automatically</div>
                          <div className="submission-chip-list">
                            {analyzerSummary.appliedFields.map((field) => (
                              <span className="submission-chip submission-chip-success" key={field}>
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
                          <div className="submission-analyzer-group-title">Still worth reviewing</div>
                          <div className="submission-chip-list">
                            {analyzerSummary.suggestedFields
                              .filter((field) => !analyzerSummary.appliedFields.includes(field))
                              .map((field) => (
                                <span className="submission-chip submission-chip-muted" key={field}>
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

                  <div className="submission-field submission-select-field">
                    <label
                      className="field-label template-application-form_field-label cc-with-desc"
                      htmlFor="priceModel"
                    >
                      Free or paid
                      {hasAutofilledPriceModel ? (
                        <span className="submission-autofill-badge">Autofilled</span>
                      ) : null}
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
                        updateTemplate('priceModel', event.target.value as 'Free' | 'Paid')
                      }
                    >
                      <option value="Free">Free</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>

                  <div className="submission-field">
                    <span className="field-label template-application-form_field-label cc-with-desc">
                      Category
                      <span className="submission-required"> *</span>
                      {hasAutofilledCategories ? (
                        <span className="submission-autofill-badge">Autofilled</span>
                      ) : null}
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
                    <div className="submission-choice-grid is-scroll">
                      {visibleCategories.length === 0 ? (
                        <div className="submission-choice-empty">No categories match your search.</div>
                      ) : null}
                      {visibleCategories.map((category) => {
                        const checked = template.categories.includes(category);
                        const atMax = template.categories.length >= 2;
                        return (
                          <label
                            className="submission-choice input-block cc-check cc-template-application-form-choice"
                            key={category}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!checked && atMax}
                              onChange={() =>
                                updateTemplate(
                                  'categories',
                                  toggleCheckbox(template.categories, category),
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

                  <div className="submission-field">
                    <span className="field-label template-application-form_field-label cc-with-desc">
                      Page count
                      <span className="submission-required"> *</span>
                      {hasAutofilledPageCount ? (
                        <span className="submission-autofill-badge">Autofilled</span>
                      ) : null}
                    </span>
                    <p className="field-help cc-library-application-form_field-desc">
                      One page, multi page, or multi-layout.
                    </p>
                    <div className="submission-choice-grid">
                      {(['One', 'Multi', 'Multi-layout'] as const).map((option) => (
                        <label
                          className="submission-choice input-block cc-check cc-template-application-form-choice"
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

                  <div className="submission-field">
                    <span className="field-label template-application-form_field-label cc-with-desc">
                      Template type
                      {hasAutofilledTemplateType ? (
                        <span className="submission-autofill-badge">Autofilled</span>
                      ) : null}
                    </span>
                    <p className="field-help cc-library-application-form_field-desc">
                      Check the Webflow product surfaces used by the template.
                    </p>
                    <div className="submission-choice-grid submission-choice-grid-template-type">
                      <label className="submission-choice input-block cc-check cc-template-application-form-choice">
                        <input
                          type="checkbox"
                          checked={template.typeCms}
                          onChange={(event) => updateTemplate('typeCms', event.target.checked)}
                        />
                        <span className="submission-choice-copy">CMS</span>
                      </label>
                      <label className="submission-choice input-block cc-check cc-template-application-form-choice">
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
                        {hasAutofilledPriceModel && template.priceModel === 'Paid' ? (
                          <span className="submission-autofill-badge">Autofilled</span>
                        ) : null}
                      </span>
                      <p className="field-help cc-library-application-form_field-desc">
                        Available price points are determined by page count and CMS usage.
                      </p>
                      <div className="submission-choice-grid">
                        {getPricingTiers(template.pageCount as PageCountOption, template.typeCms).prices.map((price) => (
                          <label
                            className="submission-choice input-block cc-check cc-template-application-form-choice"
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

                  <div className="submission-field">
                    <span className="field-label template-application-form_field-label cc-with-desc">
                      Styles
                      <span className="submission-required"> *</span>
                      {hasAutofilledStyles ? (
                        <span className="submission-autofill-badge">Autofilled</span>
                      ) : null}
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
                        template.styles.length > 0 ? () => updateTemplate('styles', []) : undefined
                      }
                    />
                    <div className="submission-choice-grid">
                      {visibleStyles.length === 0 ? (
                        <div className="submission-choice-empty">No styles match your search.</div>
                      ) : null}
                      {visibleStyles.map((style) => {
                        const checked = template.styles.includes(style);
                        const atMax = template.styles.length >= 2;
                        return (
                          <label
                            className="submission-choice input-block cc-check cc-template-application-form-choice"
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

                  <div className="submission-field">
                    <span className="field-label template-application-form_field-label cc-with-desc">
                      Features
                      <span className="submission-required"> *</span>
                      {hasAutofilledFeatures ? (
                        <span className="submission-autofill-badge">Autofilled</span>
                      ) : null}
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
                    <div className="submission-choice-grid">
                      {visibleFeatures.length === 0 ? (
                        <div className="submission-choice-empty">No features match your search.</div>
                      ) : null}
                      {visibleFeatures.map((option) => (
                        <label
                          className="submission-choice input-block cc-check cc-template-application-form-choice"
                          key={option.id}
                        >
                          <input
                            type="checkbox"
                            checked={template.featureIds.includes(option.id)}
                            onChange={() =>
                              updateTemplate(
                                'featureIds',
                                toggleCheckbox(template.featureIds, option.id),
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

                  <div className="submission-field">
                    <label
                      className="field-label template-application-form_field-label cc-with-desc"
                      htmlFor="shortDescription"
                    >
                      Short description
                      <span className="submission-required"> *</span>
                      {hasAutofilledShortDescription ? (
                        <span className="submission-autofill-badge">Autofilled</span>
                      ) : null}
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

                  <div className="submission-field">
                    <label
                      className="field-label template-application-form_field-label cc-with-desc"
                      htmlFor="longDescription"
                    >
                      Long description
                      <span className="submission-required"> *</span>
                      {hasAutofilledLongDescription ? (
                        <span className="submission-autofill-badge">Autofilled</span>
                      ) : null}
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

                  <ReviewChecklistCard
                    title="Review the final handoff"
                    copy="This mirrors the final readiness checks the marketplace team will expect when your template hits the queue."
                    items={reviewItems}
                  />

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
                        required
                      />
                      <SelectedFilesSummary
                        files={template.thumbnailFile ? [template.thumbnailFile] : []}
                        emptyLabel="No primary thumbnail selected yet."
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
                          updateTemplate('galleryFiles', validated);
                        }}
                        required
                      />
                      <SelectedFilesSummary
                        files={template.galleryFiles}
                        emptyLabel="No gallery images selected yet."
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
                          <div className="field-help">Required before submitting the template.</div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {templateStatus ? (
                    <div className={statusClassName(templateStatus.tone)}>{templateStatus.message}</div>
                  ) : null}

                  <div className="submission-actions">
                    <button className="button-sp" type="submit" disabled={templateSubmitting}>
                      {templateSubmitting ? 'Submitting...' : 'Submit template'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

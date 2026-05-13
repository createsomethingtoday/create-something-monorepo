'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
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
type StepState = 'complete' | 'active' | 'pending';

type StatusMessage = {
  tone: Tone;
  message: string;
};

function stepState(done: boolean, active: boolean): StepState {
  if (done) return 'complete';
  if (active) return 'active';
  return 'pending';
}

function sidecarStepClass(state: StepState) {
  return `submission-sidecar-step is-${state}`;
}

function sidecarBadgeClass(state: StepState) {
  return `submission-step-badge submission-step-badge-${state}`;
}

function sidecarBadgeLabel(state: StepState, activeLabel = 'In progress') {
  if (state === 'complete') return 'Complete';
  if (state === 'active') return activeLabel;
  return 'Pending';
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileSummary(file: File) {
  return `${file.name} · ${formatFileSize(file.size)}`;
}

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

type TemplateAutofillAssets = {
  screenshotCount: number;
  screenshotsDownloadUrl: string;
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

function shouldAutofillArray(current: readonly string[], previous?: readonly string[]) {
  return current.length === 0 || arraysEqual(current, previous ?? []);
}

function shouldAutofillPriceModel(
  current: TemplateFormState['priceModel'],
  previous?: TemplateFormState['priceModel'],
) {
  return current === 'Free' || current === previous;
}

function shouldAutofillPageCount(
  current: TemplateFormState['pageCount'],
  previous?: TemplateFormState['pageCount'],
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
  const [autofillAssets, setAutofillAssets] = useState<TemplateAutofillAssets | null>(null);

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
  const templateSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
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
      const data = event.data as { type?: string; params?: Record<string, string> } | null;
      if (!data || data.type !== 'ts-submission:utm' || !data.params) return;
      setUtm((current) => ({ ...current, ...captureParams(data.params ?? {}) }));
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
  const creatorPrimaryVerified =
    verification.primaryEmailVerified === creator.primaryEmail.trim().toLowerCase() &&
    creator.primaryEmail.trim() !== '';
  const creatorWebflowVerified =
    verification.webflowEmailVerified === creator.webflowEmail.trim().toLowerCase() &&
    creator.webflowEmail.trim() !== '';
  const creatorIdentityStarted = Boolean(
    creator.country ||
      creator.legalName ||
      creator.biography ||
      creator.avatarFile ||
      creator.agreedToTerms
  );
  const creatorIdentityComplete = Boolean(
    creator.country.trim() &&
      creator.legalName.trim() &&
      creator.biography.trim() &&
      creator.avatarFile &&
      creator.agreedToTerms
  );
  const creatorVerificationStarted = Boolean(
    creator.primaryEmail.trim() || creator.webflowEmail.trim()
  );
  const creatorVerificationComplete = creatorPrimaryVerified && creatorWebflowVerified;
  const creatorSubmitted = creatorStatus?.tone === 'success';
  const creatorReadyToSubmit =
    creatorIdentityComplete &&
    creatorVerificationComplete &&
    (!turnstileEnabled || Boolean(turnstileTokens.creator));
  const creatorIdentityState = stepState(
    creatorSubmitted || creatorIdentityComplete,
    creatorIdentityStarted
  );
  const creatorVerificationState = stepState(
    creatorSubmitted || creatorVerificationComplete,
    creatorVerificationStarted
  );
  const creatorReadyState = stepState(creatorSubmitted, creatorReadyToSubmit || creatorSubmitting);
  const templateCreatorEligible =
    verification.creatorEligibilityEmail === template.creatorEmail.trim().toLowerCase() &&
    template.creatorEmail.trim() !== '';
  const templateNameVerified =
    verification.templateNameVerified === template.templateName.trim() &&
    template.templateName.trim() !== '';
  const templatePublishedValidated =
    verification.publishedUrlVerified === template.publishedUrl.trim() &&
    template.publishedUrl.trim() !== '';
  const templateValidationStarted = Boolean(
    template.creatorEmail.trim() ||
      template.templateName.trim() ||
      template.publishedUrl.trim() ||
      template.previewUrl.trim()
  );
  const templateValidationComplete =
    templateCreatorEligible && templateNameVerified && templatePublishedValidated && previewUrlValid;
  const templatePriceReady = template.priceModel === 'Free' || template.selectedPrice !== null;
  const templateDetailsStarted = Boolean(
    template.creatorName.trim() ||
      template.categories.length ||
      template.styles.length ||
      template.shortDescription.trim() ||
      template.longDescription.trim() ||
      template.thumbnailFile ||
      template.galleryFiles.length ||
      template.checklistConfirmed ||
      template.agreementConfirmed
  );
  const templateDetailsComplete = Boolean(
    template.creatorName.trim() &&
      template.creatorEmail.trim() &&
      template.templateName.trim() &&
      template.publishedUrl.trim() &&
      template.previewUrl.trim() &&
      template.pageCount &&
      template.categories.length > 0 &&
      template.styles.length > 0 &&
      template.shortDescription.trim() &&
      template.longDescription.trim() &&
      template.thumbnailFile &&
      template.galleryFiles.length > 0 &&
      template.checklistConfirmed &&
      template.agreementConfirmed &&
      templatePriceReady
  );
  const templateSubmitted = templateStatus?.tone === 'success';
  const templateReadyToSubmit =
    templateValidationComplete &&
    templateDetailsComplete &&
    (!turnstileEnabled || Boolean(turnstileTokens.template));
  const templateValidationState = stepState(
    templateSubmitted || templateValidationComplete,
    templateValidationStarted
  );
  const templateDetailsState = stepState(
    templateSubmitted || templateDetailsComplete,
    templateDetailsStarted
  );
  const templateReadyState = stepState(
    templateSubmitted,
    templateReadyToSubmit || templateSubmitting
  );

  function updateCreator<K extends keyof CreatorFormState>(key: K, value: CreatorFormState[K]) {
    setCreator((current) => ({ ...current, [key]: value }));
    setCreatorStatus(null);

    if (key === 'primaryEmail') {
      setFeedback('primaryEmail', null);
      setVerification((current) => ({
        ...current,
        primaryEmailVerified: ''
      }));
      setTemplate((current) => ({ ...current, creatorEmail: String(value) }));
    }

    if (key === 'webflowEmail') {
      setFeedback('webflowEmail', null);
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

      if (key === 'priceModel' && value === 'Free') {
        next.selectedPrice = null;
      }

      if (
        (key === 'pageCount' || key === 'typeCms' || key === 'priceModel') &&
        next.priceModel === 'Paid'
      ) {
        if (!next.pageCount) {
          next.selectedPrice = null;
        } else {
          const allowedPrices = getPricingTiers(
            next.pageCount as PageCountOption,
            next.typeCms
          ).prices;

          if (
            next.selectedPrice !== null &&
            !allowedPrices.includes(next.selectedPrice)
          ) {
            next.selectedPrice = null;
          }
        }
      }

      return next;
    });
    setTemplateStatus(null);

    if (key === 'creatorEmail') {
      setFeedback('creatorEligibility', null);
      setVerification((current) => ({
        ...current,
        creatorEligibilityEmail: ''
      }));
    }

    if (key === 'templateName') {
      setFeedback('templateName', null);
      setVerification((current) => ({
        ...current,
        templateNameVerified: ''
      }));
    }

    if (key === 'publishedUrl') {
      setFeedback('publishedUrl', null);
      setAutofillAssets(null);
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

  function applyTemplateAutofill(
    autofill: TemplateAutofillPayload | undefined,
    options: { gsapDetected: boolean },
  ) {
    let detailsApplied = false;
    const managedNext: TemplateAutofillState = {};

    setTemplate((current) => {
      if (!autofill) {
        if (!options.gsapDetected || current.featureIds.includes('gsap')) {
          return current;
        }

        return {
          ...current,
          featureIds: [...new Set([...current.featureIds, 'gsap'])],
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
        detailsApplied = true;
      }

      if (
        autofill.shortDescription &&
        autofill.shortDescription !== current.shortDescription &&
        shouldAutofillText(
          current.shortDescription,
          autofillManaged.shortDescription,
        )
      ) {
        next.shortDescription = autofill.shortDescription;
        managedNext.shortDescription = autofill.shortDescription;
        detailsApplied = true;
      }

      if (
        autofill.longDescription &&
        autofill.longDescription !== current.longDescription &&
        shouldAutofillText(current.longDescription, autofillManaged.longDescription)
      ) {
        next.longDescription = autofill.longDescription;
        managedNext.longDescription = autofill.longDescription;
        detailsApplied = true;
      }

      if (
        autofill.priceModel &&
        autofill.priceModel !== current.priceModel &&
        shouldAutofillPriceModel(current.priceModel, autofillManaged.priceModel)
      ) {
        next.priceModel = autofill.priceModel;
        managedNext.priceModel = autofill.priceModel;
        detailsApplied = true;
      }

      if (
        autofill.pageCount &&
        autofill.pageCount !== current.pageCount &&
        shouldAutofillPageCount(current.pageCount, autofillManaged.pageCount)
      ) {
        next.pageCount = autofill.pageCount;
        managedNext.pageCount = autofill.pageCount;
        detailsApplied = true;
      }

      if (
        typeof autofill.typeCms === 'boolean' &&
        autofill.typeCms !== current.typeCms &&
        shouldAutofillBoolean(current.typeCms, autofillManaged.typeCms)
      ) {
        next.typeCms = autofill.typeCms;
        managedNext.typeCms = autofill.typeCms;
        detailsApplied = true;
      }

      if (
        typeof autofill.typeEcommerce === 'boolean' &&
        autofill.typeEcommerce !== current.typeEcommerce &&
        shouldAutofillBoolean(
          current.typeEcommerce,
          autofillManaged.typeEcommerce,
        )
      ) {
        next.typeEcommerce = autofill.typeEcommerce;
        managedNext.typeEcommerce = autofill.typeEcommerce;
        detailsApplied = true;
      }

      if (
        autofill.categories?.length &&
        !arraysEqual(current.categories, autofill.categories) &&
        shouldAutofillArray(current.categories, autofillManaged.categories)
      ) {
        next.categories = autofill.categories;
        managedNext.categories = autofill.categories;
        detailsApplied = true;
      }

      if (
        autofill.styles?.length &&
        !arraysEqual(current.styles, autofill.styles) &&
        shouldAutofillArray(current.styles, autofillManaged.styles)
      ) {
        next.styles = autofill.styles;
        managedNext.styles = autofill.styles;
        detailsApplied = true;
      }

      const suggestedFeatureIds = [
        ...new Set([
          ...DEFAULT_FEATURE_IDS,
          ...(autofill.featureIds ?? []),
          ...(options.gsapDetected ? ['gsap'] : []),
        ]),
      ];

      if (shouldAutofillFeatureIds(current.featureIds, autofillManaged.featureIds)) {
        if (!arraysEqual(current.featureIds, suggestedFeatureIds)) {
          next.featureIds = suggestedFeatureIds;
          managedNext.featureIds = suggestedFeatureIds;
          detailsApplied = true;
        }
      } else if (options.gsapDetected && !next.featureIds.includes('gsap')) {
        next.featureIds = [...new Set([...next.featureIds, 'gsap'])];
      }

      if (next.priceModel === 'Free') {
        next.selectedPrice = null;
      } else if (!next.pageCount) {
        next.selectedPrice = null;
      } else {
        const allowedPrices = getPricingTiers(next.pageCount, next.typeCms).prices;
        if (
          next.selectedPrice !== null &&
          !allowedPrices.includes(next.selectedPrice)
        ) {
          next.selectedPrice = null;
        }
      }

      return next;
    });

    if (Object.keys(managedNext).length > 0) {
      setAutofillManaged((current) => ({ ...current, ...managedNext }));
    }

    return detailsApplied;
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
      setFeedback('creatorEligibility', {
        tone: 'error',
        message: 'Enter the creator email first.'
      });
      return;
    }

    setFeedback('creatorEligibility', {
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
      setFeedback('creatorEligibility', {
        tone: 'error',
        message: data.message || 'Creator is not eligible to submit.'
      });
      return;
    }

    setVerification((current) => ({
      ...current,
      creatorEligibilityEmail: email.toLowerCase()
    }));
    setFeedback('creatorEligibility', {
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
      setFeedback('publishedUrl', {
        tone: 'error',
        message: data.message || 'Published URL validation failed.'
      });
      return;
    }

    const autofillApplied = applyTemplateAutofill(data.autofill, {
      gsapDetected: Boolean(data.gsapDetected),
    });

    setAutofillAssets(
      data.screenshotsDownloadUrl
        ? {
            screenshotCount: data.screenshotCount ?? 0,
            screenshotsDownloadUrl: data.screenshotsDownloadUrl,
          }
        : null,
    );

    setFeedback('publishedUrl', {
      tone: 'success',
      message: [
        data.message || 'Published site validated.',
        autofillApplied ? 'Suggested template details were added automatically.' : '',
        data.gsapDetected ? 'GSAP was detected automatically.' : '',
        data.autofillWarning
          ? 'Template suggestions were unavailable, so finish the remaining fields manually.'
          : '',
      ]
        .filter(Boolean)
        .join(' '),
    });
    setVerification((current) => ({
      ...current,
      publishedUrlVerified: data.normalizedUrl || '',
      publishedUrlMessage:
        data.message ||
        (data.gsapDetected
          ? 'Published site validated. GSAP was detected automatically.'
          : 'Published site validated.')
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
        templateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      setAutofillAssets(null);
      setAutofillManaged({});
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
    <main className="submission-app">
      {turnstileEnabled ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setTurnstileReady(true)}
        />
      ) : null}
      <section className="section cc-submission-wrapper cc-creator-wrap" id="join-today">
        <div className="container">
          <div className="w-layout-grid submission_content-grid">
            <div className="cc-sticky submission-sidecar">
              <p className="submission-step-label">Step 1</p>
              <h2 className="submission-panel-title">Become a Creator</h2>
              <p className="application-subheading-2-2 submission-panel-copy">
                Start with your creator profile so the review team has the right identity,
                correspondence, and profile context before the first template enters review.
              </p>
              <div className="submission-sidecar-steps">
                <div className={sidecarStepClass(creatorIdentityState)}>
                  <div className="submission-step-meta">
                    <p className="submission-step-label submission-step-label-secondary">
                      Profile
                    </p>
                    <span className={sidecarBadgeClass(creatorIdentityState)}>
                      {sidecarBadgeLabel(creatorIdentityState)}
                    </span>
                  </div>
                  <p className="submission-panel-copy">
                    Complete the creator details once. The template step below reuses the same
                    name and email automatically.
                  </p>
                </div>
                <div className={sidecarStepClass(creatorVerificationState)}>
                  <div className="submission-step-meta">
                    <p className="submission-step-label submission-step-label-secondary">
                      Verification
                    </p>
                    <span className={sidecarBadgeClass(creatorVerificationState)}>
                      {sidecarBadgeLabel(creatorVerificationState)}
                    </span>
                  </div>
                  <p className="submission-panel-copy">
                    Verify the creator and Webflow account emails before the first submission so
                    the review team starts with clean identity and correspondence data.
                  </p>
                </div>
                <div className={sidecarStepClass(creatorReadyState)}>
                  <div className="submission-step-meta">
                    <p className="submission-step-label submission-step-label-secondary">Ready</p>
                    <span className={sidecarBadgeClass(creatorReadyState)}>
                      {sidecarBadgeLabel(creatorReadyState, 'Ready')}
                    </span>
                  </div>
                  <p className="submission-panel-copy">
                    Once the profile details and verification checks are complete, create the
                    creator profile and continue directly into the template handoff below.
                  </p>
                </div>
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
                  <div className="submission-grid-2">
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
                  </div>

                  <div className="submission-field-inline">
                    <div className="submission-field">
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
                    </div>
                    <button
                      className="button-sp cc-white"
                      type="button"
                      onClick={() => verifyCreatorEmail('primary')}
                    >
                      Verify email
                    </button>
                  </div>
                  {fieldFeedback.primaryEmail ? (
                    <div className={feedbackClass(fieldFeedback.primaryEmail!.tone)}>
                      {fieldFeedback.primaryEmail.message}
                    </div>
                  ) : null}

                  <div className="submission-field-inline">
                    <div className="submission-field">
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
                    </div>
                    <button
                      className="button-sp cc-white"
                      type="button"
                      onClick={() => verifyCreatorEmail('webflow')}
                    >
                      Verify email
                    </button>
                  </div>
                  {fieldFeedback.webflowEmail ? (
                    <div className={feedbackClass(fieldFeedback.webflowEmail!.tone)}>
                      {fieldFeedback.webflowEmail.message}
                    </div>
                  ) : null}

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
                  {imageErrors.avatarFile ? (
                      <div className="submission-field-feedback submission-field-feedback-error">
                        {imageErrors.avatarFile}
                      </div>
                    ) : null}
                    {creator.avatarFile && !imageErrors.avatarFile ? (
                      <div className="submission-file-list">
                        <span className="submission-file-pill submission-file-pill-success">
                          Selected: {fileSummary(creator.avatarFile)}
                        </span>
                      </div>
                    ) : null}
                  </div>

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
                          templateSectionRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          });
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
              <p className="application-subheading-2-2 submission-panel-copy">
                Once the creator profile exists, this form runs the marketplace checks for creator
                eligibility, naming policy, published-site validation, preview URL format, and
                image requirements.
              </p>
              <div className="submission-sidecar-steps">
                <div className={sidecarStepClass(templateValidationState)}>
                  <div className="submission-step-meta">
                    <p className="submission-step-label submission-step-label-secondary">
                      Validation
                    </p>
                    <span className={sidecarBadgeClass(templateValidationState)}>
                      {sidecarBadgeLabel(templateValidationState)}
                    </span>
                  </div>
                  <p className="submission-panel-copy">
                    Use the inline checks before submit so the final handoff matches the live
                    review workflow.
                  </p>
                </div>
                <div className={sidecarStepClass(templateDetailsState)}>
                  <div className="submission-step-meta">
                    <p className="submission-step-label submission-step-label-secondary">
                      Assets &amp; details
                    </p>
                    <span className={sidecarBadgeClass(templateDetailsState)}>
                      {sidecarBadgeLabel(templateDetailsState)}
                    </span>
                  </div>
                  <p className="submission-panel-copy">
                    Upload the required WebP assets, choose the right categories and styles, and
                    make sure the supporting details are ready for reviewers.
                  </p>
                </div>
                <div className={sidecarStepClass(templateReadyState)}>
                  <div className="submission-step-meta">
                    <p className="submission-step-label submission-step-label-secondary">Review</p>
                    <span className={sidecarBadgeClass(templateReadyState)}>
                      {sidecarBadgeLabel(templateReadyState, 'Ready')}
                    </span>
                  </div>
                  <p className="submission-panel-copy">
                    Reviewers still receive the submission through the existing Airtable automation
                    path, so downstream routing stays unchanged.
                  </p>
                </div>
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

                  <div className="submission-field-inline">
                    <div className="submission-field">
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
                    </div>
                    <button className="button-sp cc-white" type="button" onClick={verifyCreatorEligibility}>
                      Check creator
                    </button>
                  </div>
                  {fieldFeedback.creatorEligibility ? (
                    <div className={feedbackClass(fieldFeedback.creatorEligibility.tone)}>
                      {fieldFeedback.creatorEligibility.message}
                    </div>
                  ) : null}

                  <div className="submission-field-inline">
                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="templateName"
                      >
                        Template name
                        <span className="submission-required"> *</span>
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
                    </div>
                    <button className="button-sp cc-white" type="button" onClick={verifyTemplateName}>
                      Check name
                    </button>
                  </div>
                  {fieldFeedback.templateName ? (
                    <div className={feedbackClass(fieldFeedback.templateName!.tone)}>
                      {fieldFeedback.templateName.message}
                    </div>
                  ) : null}

                  <div className="submission-field-inline">
                    <div className="submission-field">
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
                    </div>
                    <button className="button-sp cc-white" type="button" onClick={verifyPublishedUrl}>
                      Validate template
                    </button>
                  </div>
                  {fieldFeedback.publishedUrl ? (
                    <div className={feedbackClass(fieldFeedback.publishedUrl!.tone)}>
                      {fieldFeedback.publishedUrl.message}
                    </div>
                  ) : null}

                  <div className="submission-grid-2">
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
                        <div className="submission-field-feedback submission-field-feedback-error">
                          Preview URLs must contain https://preview.webflow.com/preview/.
                        </div>
                      ) : null}
                    </div>

                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                      >
                        Free or paid
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        Choose whether this template is distributed for free or sold through
                        marketplace pricing.
                      </p>
                      <div className="submission-choice-grid">
                        {[
                          {
                            value: 'Free' as const,
                            label: 'Free',
                            detail: 'No price tier is required for free submissions.',
                          },
                          {
                            value: 'Paid' as const,
                            label: 'Paid',
                            detail: 'Choose a marketplace price tier below.',
                          },
                        ].map((option) => (
                          <label
                            className="submission-choice input-block cc-check cc-template-application-form-choice"
                            key={option.value}
                          >
                            <input
                              type="radio"
                              name="priceModel"
                              checked={template.priceModel === option.value}
                              onChange={() => updateTemplate('priceModel', option.value)}
                            />
                            <span className="submission-choice-copy">
                              <strong>{option.label}</strong>
                              <br />
                              {option.detail}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="submission-field">
                    <span className="field-label template-application-form_field-label cc-with-desc">
                      Category
                      <span className="submission-required"> *</span>
                    </span>
                    <p className="field-help cc-library-application-form_field-desc">
                      Select up to 2 options that best describe your template.
                    </p>
                    <div className="submission-choice-grid is-scroll">
                      {CATEGORY_OPTIONS.map((category) => {
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

                  <div className="submission-grid-2">
                    <div className="submission-field">
                      <span className="field-label template-application-form_field-label cc-with-desc">
                        Page count
                        <span className="submission-required"> *</span>
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
                      </span>
                      <p className="field-help cc-library-application-form_field-desc">
                        Check the Webflow product surfaces used by the template.
                      </p>
                      <div className="submission-choice-grid">
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
                    </span>
                    <p className="field-help cc-library-application-form_field-desc">
                      Select up to 2 styles.
                    </p>
                    <div className="submission-choice-grid">
                      {TEMPLATE_STYLES.map((style) => {
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
                    </span>
                    <p className="field-help cc-library-application-form_field-desc">
                      Choose the Webflow features used by the template.
                    </p>
                    <div className="submission-choice-grid">
                      {WEBFLOW_FEATURES.filter((f) => !f.hidden).map((option) => (
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

                  {autofillAssets ? (
                    <div className="submission-status submission-status-info submission-status-stack">
                      <div>
                        Generated screenshots are ready from the analyzer.
                        {autofillAssets.screenshotCount > 0
                          ? ` ${autofillAssets.screenshotCount} screenshot${autofillAssets.screenshotCount === 1 ? '' : 's'} were prepared for upload.`
                          : ''}
                      </div>
                      <div>
                        Download the ZIP, then drag each file into the matching upload field
                        below.
                      </div>
                      <a
                        className="submission-status-link"
                        href={autofillAssets.screenshotsDownloadUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download generated screenshots (ZIP)
                      </a>
                    </div>
                  ) : null}

                  <div className="submission-grid-2">
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
                      {imageErrors.thumbnailFile ? (
                        <div className="submission-field-feedback submission-field-feedback-error">
                          {imageErrors.thumbnailFile}
                        </div>
                      ) : null}
                      {template.thumbnailFile && !imageErrors.thumbnailFile ? (
                        <div className="submission-file-list">
                          <span className="submission-file-pill submission-file-pill-success">
                            Selected: {fileSummary(template.thumbnailFile)}
                          </span>
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
                      {imageErrors.secondaryThumbnailFile ? (
                        <div className="submission-field-feedback submission-field-feedback-error">
                          {imageErrors.secondaryThumbnailFile}
                        </div>
                      ) : null}
                      {template.secondaryThumbnailFile && !imageErrors.secondaryThumbnailFile ? (
                        <div className="submission-file-list">
                          <span className="submission-file-pill submission-file-pill-neutral">
                            Selected: {fileSummary(template.secondaryThumbnailFile)}
                          </span>
                        </div>
                      ) : null}
                    </div>
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
                    {Object.entries(imageErrors)
                      .filter(([k, v]) => k.startsWith('gallery-') && v)
                      .map(([k, v]) => (
                        <div key={k} className="submission-field-feedback submission-field-feedback-error">
                          {v}
                        </div>
                      ))}
                    {template.galleryFiles.length > 0 ? (
                      <div className="field-help submission-counter">
                        {template.galleryFiles.length} of 5 gallery images selected
                      </div>
                    ) : null}
                    {template.galleryFiles.length > 0 ? (
                      <div className="submission-file-list">
                        {template.galleryFiles.map((file) => (
                          <span
                            key={`${file.name}-${file.size}-${file.lastModified}`}
                            className="submission-file-pill submission-file-pill-success"
                          >
                            {fileSummary(file)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

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

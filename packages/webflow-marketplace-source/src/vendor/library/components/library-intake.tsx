'use client';

import Script from '../../../components/ExternalScript';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { appPath } from '../lib/runtime-paths';
import {
  ALL_COUNTRIES,
  isSupportedCountry,
  requiresSpecificStripeOnboarding
} from '../lib/intake/constants';
import { CountryPicker } from './country-picker';

const FEATURE_GROUPS = [
  { name: 'Styling', options: ['Styled', 'Unstyled'], mode: 'radio' },
  { name: 'Advanced functionality', options: ['Interactions', 'Custom code'], mode: 'checkbox' },
  { name: 'Creative assets', options: ['Lottie files', 'Icons', 'SVGs'], mode: 'checkbox' }
] as const;

const TARGET_AUDIENCES = [
  'New users',
  'New & Intermediate users',
  'Intermediate & Advanced users'
] as const;

type FormStatus = {
  tone: 'idle' | 'success' | 'error';
  message: string;
};

type Tone = 'success' | 'error' | 'info';

type StatusMessage = {
  tone: Tone;
  message: string;
};

type ValidationField = 'creatorEmail' | 'libraryName';
type IntentValidationField = 'intentEmail' | 'intentShareUrl';
type CreatorValidationField = 'primaryEmail' | 'webflowEmail';

type VerifiedFields = {
  creatorEmail: string;
  libraryName: string;
};

type IntentVerifiedFields = {
  email: string;
  shareUrl: string;
};

type LibraryIntentState = {
  email: string;
  shareUrl: string;
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

type LibraryFormState = {
  creatorEmail: string;
  libraryName: string;
  publishedUrl: string;
  previewUrl: string;
  documentationUrl: string;
  supportUrl: string;
  layoutCount: string;
  styling: string;
  features: string[];
  targetAudience: string;
  thumbnailAltText: string;
  shortDescription: string;
  longDescription: string;
  checklistConfirmed: boolean;
  agreementConfirmed: boolean;
};

const INITIAL_STATE: LibraryFormState = {
  creatorEmail: '',
  libraryName: '',
  publishedUrl: '',
  previewUrl: '',
  documentationUrl: '',
  supportUrl: '',
  layoutCount: '',
  styling: '',
  features: [],
  targetAudience: '',
  thumbnailAltText: '',
  shortDescription: '',
  longDescription: '',
  checklistConfirmed: false,
  agreementConfirmed: false
};

const INITIAL_INTENT_STATE: LibraryIntentState = {
  email: '',
  shareUrl: ''
};

const INITIAL_CREATOR_STATE: CreatorFormState = {
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

const WEBFLOW_PREVIEW_URL_PATTERN = 'https://preview.webflow.com/preview/';

// Bot protection mirrors the template form: the widget renders only when the
// public site key is configured; the API routes verify tokens when the secret is set.
const BUILD_TIME_TURNSTILE_SITE_KEY = '';

type IntakeStep = 'creator' | 'library';
type IntakeSection = 'join-today' | 'submit-today';
type TurnstileStep = 'creator' | 'intent' | 'library';

const INTAKE_STEP_SECTION: Record<IntakeStep, IntakeSection> = {
  creator: 'join-today',
  library: 'submit-today'
};

const TURNSTILE_ACTION: Record<TurnstileStep, string> = {
  creator: 'creator-submit',
  intent: 'library-intent',
  library: 'library-submit'
};

type TurnstileRenderOptions = {
  sitekey: string;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

type SubmissionParentMessage =
  | {
      type?: 'ts-submission:utm';
      params?: Record<string, string>;
    }
  | {
      type?: 'ts-submission:navigate';
      section?: IntakeSection;
    };

type SubmissionChildMessage =
  | {
      type: 'ts-submission:resize';
      height: number;
    }
  | {
      type: 'ts-submission:scroll-to';
      section: IntakeSection;
      offsetTop: number;
    };

type SubmittedLibraryState = {
  name: string;
  submissionId?: string;
};



function statusClassName(tone: FormStatus['tone']) {
  if (tone === 'success') return 'submission-status submission-status-success';
  if (tone === 'error') return 'submission-status submission-status-error';
  return 'submission-status submission-status-info';
}

function feedbackClass(tone: Tone) {
  if (tone === 'success') return 'submission-field-feedback submission-field-feedback-success';
  if (tone === 'error') return 'submission-field-feedback submission-field-feedback-error';
  return 'submission-field-feedback submission-field-feedback-info';
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function choiceClassName(isSelected: boolean, ...extraClassNames: Array<string | false | null | undefined>) {
  return classNames('submission-choice', ...extraClassNames, isSelected && 'is-selected');
}

function FieldFeedback({ feedback }: { feedback?: StatusMessage | null }) {
  if (!feedback) return null;
  return <div className={feedbackClass(feedback.tone)}>{feedback.message}</div>;
}

function InlineActionField({
  actionLabel,
  children,
  feedback,
  isBusy,
  onAction
}: {
  actionLabel: string;
  children: ReactNode;
  feedback?: StatusMessage | null;
  isBusy?: boolean;
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
            disabled={isBusy}
            onClick={onAction}
          >
            {isBusy ? 'Checking...' : actionLabel}
          </button>
        </div>
      </div>
      <FieldFeedback feedback={feedback} />
    </>
  );
}

function SubmissionStepper({
  activeStep,
  onSelectStep
}: {
  activeStep: IntakeStep;
  onSelectStep: (step: IntakeStep) => void;
}) {
  const steps: Array<{ id: IntakeStep; index: string; title: string; subtitle: string }> = [
    {
      id: 'creator',
      index: '1',
      title: 'Become a Library Creator',
      subtitle: 'One-time creator profile'
    },
    {
      id: 'library',
      index: '2',
      title: 'Submit a Library',
      subtitle: 'Enable a project, then submit'
    }
  ];

  return (
    <nav className="submission-stepper" aria-label="Submission steps">
      <div className="submission-stepper-inner">
        {steps.map((step) => {
          const isActive = step.id === activeStep;
          return (
            <button
              aria-current={isActive ? 'step' : undefined}
              className={classNames('submission-stepper-button', isActive && 'is-active')}
              key={step.id}
              onClick={() => onSelectStep(step.id)}
              type="button"
            >
              <span aria-hidden="true" className="submission-stepper-index">
                {step.index}
              </span>
              <span className="submission-stepper-copy">
                <span className="submission-stepper-title">{step.title}</span>
                <span className="submission-stepper-subtitle">{step.subtitle}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SectionHeader({ index, title, copy }: { index: string; title: string; copy?: string }) {
  return (
    <header className="submission-section-header">
      <div className="submission-section-kicker">{index}</div>
      <h3 className="submission-section-title">{title}</h3>
      {copy ? <p className="field-help submission-section-copy">{copy}</p> : null}
    </header>
  );
}

function LibrarySubmissionSuccessPanel({
  submission,
  onSubmitAnother
}: {
  submission: SubmittedLibraryState;
  onSubmitAnother: () => void;
}) {
  return (
    <div className="submission-form submission-success-panel" aria-live="polite">
      <div>
        <div className="submission-success-kicker">Submission received</div>
        <h3 className="submission-success-title">Library submitted for review</h3>
        <p className="submission-success-copy">
          Reviewers will process this submission next. We will follow up at the creator email on
          file with the review outcome or any required changes.
        </p>
      </div>

      <div className="submission-status submission-status-success">
        {submission.name
          ? `${submission.name} is now in the review queue.`
          : 'Your Library is now in the review queue.'}
      </div>

      {submission.submissionId ? (
        <p className="field-help">
          Submission receipt:{' '}
          <code className="submission-inline-code">{submission.submissionId}</code>
        </p>
      ) : null}

      <div className="submission-actions">
        <button className="button-sp cc-white" type="button" onClick={onSubmitAnother}>
          Submit another Library
        </button>
      </div>
    </div>
  );
}

export function LibraryIntake({ turnstileSiteKey }: { turnstileSiteKey?: string } = {}) {
  // The server page reads the key from the Cloudflare runtime env (same source the API
  // routes use to decide whether to verify), so client and server can never disagree.
  const TURNSTILE_SITE_KEY = turnstileSiteKey ?? BUILD_TIME_TURNSTILE_SITE_KEY;
  const turnstileEnabled = Boolean(TURNSTILE_SITE_KEY);
  const appRootRef = useRef<HTMLElement | null>(null);
  const libraryFormRef = useRef<HTMLFormElement | null>(null);
  const creatorTurnstileRef = useRef<HTMLDivElement | null>(null);
  const intentTurnstileRef = useRef<HTMLDivElement | null>(null);
  const libraryTurnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIds = useRef<Record<TurnstileStep, string | null>>({
    creator: null,
    intent: null,
    library: null
  });
  const [turnstileReady, setTurnstileReady] = useState(!turnstileEnabled);
  const [turnstileTokens, setTurnstileTokens] = useState<Record<TurnstileStep, string>>({
    creator: '',
    intent: '',
    library: ''
  });
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [utm, setUtm] = useState<Record<string, string>>({});
  const [submittedLibrary, setSubmittedLibrary] = useState<SubmittedLibraryState | null>(null);
  const [completionMinHeight, setCompletionMinHeight] = useState<number | null>(null);
  const creatorSectionRef = useRef<HTMLElement | null>(null);
  const submitSectionRef = useRef<HTMLElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const [activeStep, setActiveStep] = useState<IntakeStep>('creator');
  const [creatorForm, setCreatorForm] = useState<CreatorFormState>(INITIAL_CREATOR_STATE);
  const [intentForm, setIntentForm] = useState<LibraryIntentState>(INITIAL_INTENT_STATE);
  const [form, setForm] = useState<LibraryFormState>(INITIAL_STATE);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [creatorStatus, setCreatorStatus] = useState<FormStatus>({ tone: 'idle', message: '' });
  const [intentStatus, setIntentStatus] = useState<FormStatus>({ tone: 'idle', message: '' });
  const [status, setStatus] = useState<FormStatus>({ tone: 'idle', message: '' });
  const [creatorSubmitting, setCreatorSubmitting] = useState(false);
  const [intentSubmitting, setIntentSubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [creatorFeedback, setCreatorFeedback] = useState<
    Record<CreatorValidationField, StatusMessage | null>
  >({
    primaryEmail: null,
    webflowEmail: null
  });
  const [intentFeedback, setIntentFeedback] = useState<
    Record<IntentValidationField, StatusMessage | null>
  >({
    intentEmail: null,
    intentShareUrl: null
  });
  const [fieldFeedback, setFieldFeedback] = useState<
    Record<ValidationField, StatusMessage | null>
  >({
    creatorEmail: null,
    libraryName: null
  });
  const [intentValidating, setIntentValidating] = useState<Record<IntentValidationField, boolean>>({
    intentEmail: false,
    intentShareUrl: false
  });
  const [creatorValidating, setCreatorValidating] = useState<Record<CreatorValidationField, boolean>>({
    primaryEmail: false,
    webflowEmail: false
  });
  const [validating, setValidating] = useState<Record<ValidationField, boolean>>({
    creatorEmail: false,
    libraryName: false
  });
  const [creatorVerifiedFields, setCreatorVerifiedFields] = useState<Record<CreatorValidationField, string>>({
    primaryEmail: '',
    webflowEmail: ''
  });
  const [intentVerifiedFields, setIntentVerifiedFields] = useState<IntentVerifiedFields>({
    email: '',
    shareUrl: ''
  });
  const [verifiedFields, setVerifiedFields] = useState<VerifiedFields>({
    creatorEmail: '',
    libraryName: ''
  });

  const selectedFeatures = useMemo(
    () => [form.styling, ...form.features].filter(Boolean),
    [form.features, form.styling]
  );

  const creatorCountrySupported = creatorForm.country ? isSupportedCountry(creatorForm.country) : true;
  const creatorCountryRequiresStripeOnboarding =
    creatorForm.country && creatorCountrySupported
      ? requiresSpecificStripeOnboarding(creatorForm.country)
      : false;

  function goToStep(step: IntakeStep) {
    setActiveStep(step);

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('section', INTAKE_STEP_SECTION[step]);
      url.hash = '';
      window.history.replaceState(null, '', url.toString());
    } catch {
      // URL sync is best-effort; the step state has already changed.
    }

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (window.parent !== window) {
        const message: SubmissionChildMessage = {
          type: 'ts-submission:scroll-to',
          section: INTAKE_STEP_SECTION[step],
          offsetTop: 0
        };
        window.parent.postMessage(message, '*');
      }
    });
  }

  function scrollToSubmitLibrary() {
    requestAnimationFrame(() => {
      const target = document.getElementById('submit-library');
      if (!target) return;
      if (window.parent !== window) {
        // Document-relative: offsetTop would be relative to the positioned .container.
        const documentTop = Math.round(target.getBoundingClientRect().top + window.scrollY);
        const message: SubmissionChildMessage = {
          type: 'ts-submission:scroll-to',
          section: 'submit-today',
          offsetTop: documentTop
        };
        window.parent.postMessage(message, '*');
        return;
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const updateCreatorField = useCallback(
    <TKey extends keyof CreatorFormState>(key: TKey, value: CreatorFormState[TKey]) => {
      setCreatorForm((current) => ({ ...current, [key]: value }));
      if (key === 'primaryEmail') {
        setCreatorVerifiedFields((current) => ({ ...current, primaryEmail: '' }));
        setCreatorFeedback((current) => ({ ...current, primaryEmail: null }));
      }
      if (key === 'webflowEmail') {
        setCreatorVerifiedFields((current) => ({ ...current, webflowEmail: '' }));
        setCreatorFeedback((current) => ({ ...current, webflowEmail: null }));
      }
    },
    []
  );

  const updateField = useCallback(
    <TKey extends keyof LibraryFormState>(key: TKey, value: LibraryFormState[TKey]) => {
      setForm((current) => ({ ...current, [key]: value }));
      if (key === 'creatorEmail' || key === 'libraryName') {
        setVerifiedFields((current) => ({ ...current, [key]: '' }));
        setFieldFeedback((current) => ({ ...current, [key]: null }));
      }
    },
    []
  );

  const updateIntentField = useCallback(
    <TKey extends keyof LibraryIntentState>(key: TKey, value: LibraryIntentState[TKey]) => {
      setIntentForm((current) => ({ ...current, [key]: value }));
      if (key === 'email') {
        setIntentVerifiedFields((current) => ({ ...current, email: '' }));
        setIntentFeedback((current) => ({ ...current, intentEmail: null }));
      }
      if (key === 'shareUrl') {
        setIntentVerifiedFields((current) => ({ ...current, shareUrl: '' }));
        setIntentFeedback((current) => ({ ...current, intentShareUrl: null }));
      }
    },
    []
  );

  const toggleFeature = useCallback((feature: string) => {
    setForm((current) => {
      const selected = new Set(current.features);
      if (selected.has(feature)) {
        selected.delete(feature);
      } else {
        selected.add(feature);
      }
      return { ...current, features: [...selected] };
    });
  }, []);

  async function uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', 'avatar');
    if (creatorForm.primaryEmail) {
      formData.append('email', creatorForm.primaryEmail);
    }

    const response = await fetch(appPath('/api/intake/upload'), {
      method: 'POST',
      body: formData
    });

    const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!response.ok || !data.url) {
      throw new Error(data.error || 'Failed to upload creator profile image.');
    }

    return data.url;
  }

  async function uploadThumbnail(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', 'library-thumbnail');
    if (form.creatorEmail) {
      formData.append('email', form.creatorEmail);
    }

    const response = await fetch(appPath('/api/intake/upload'), {
      method: 'POST',
      body: formData
    });

    const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!response.ok || !data.url) {
      throw new Error(data.error || 'Failed to upload Library thumbnail.');
    }

    return data.url;
  }

  const setFeedback = useCallback((field: ValidationField, feedback: StatusMessage | null) => {
    setFieldFeedback((current) => ({ ...current, [field]: feedback }));
  }, []);

  const setCreatorFieldFeedback = useCallback(
    (field: CreatorValidationField, feedback: StatusMessage | null) => {
      setCreatorFeedback((current) => ({ ...current, [field]: feedback }));
    },
    []
  );

  const setIntentFieldFeedback = useCallback(
    (field: IntentValidationField, feedback: StatusMessage | null) => {
      setIntentFeedback((current) => ({ ...current, [field]: feedback }));
    },
    []
  );

  async function verifyCreatorApplicationEmail(kind: CreatorValidationField) {
    const email =
      kind === 'primaryEmail' ? creatorForm.primaryEmail.trim() : creatorForm.webflowEmail.trim();
    if (!email) {
      setCreatorFieldFeedback(kind, { tone: 'error', message: 'Enter an email address first.' });
      return false;
    }

    setCreatorValidating((current) => ({ ...current, [kind]: true }));
    setCreatorFieldFeedback(kind, { tone: 'info', message: 'Verifying email...' });

    try {
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
        setCreatorFieldFeedback(kind, {
          tone: 'error',
          message: data.message || 'Email verification failed.'
        });
        return false;
      }

      setCreatorVerifiedFields((current) => ({ ...current, [kind]: email.toLowerCase() }));
      setCreatorFieldFeedback(kind, {
        tone: 'success',
        message: data.message || 'Email verified and available.'
      });
      return true;
    } catch {
      setCreatorFieldFeedback(kind, {
        tone: 'error',
        message: 'Creator email validation is temporarily unavailable.'
      });
      return false;
    } finally {
      setCreatorValidating((current) => ({ ...current, [kind]: false }));
    }
  }

  async function verifyIntentEmail() {
    const email = intentForm.email.trim();
    if (!email) {
      setIntentFieldFeedback('intentEmail', {
        tone: 'error',
        message: 'Enter the Webflow account email first.'
      });
      return false;
    }

    setIntentValidating((current) => ({ ...current, intentEmail: true }));
    setIntentFieldFeedback('intentEmail', { tone: 'info', message: 'Checking creator record...' });

    try {
      const response = await fetch(appPath('/api/intake/check-library-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = (await response.json().catch(() => ({}))) as {
        registered?: boolean;
        message?: string;
      };

      if (!response.ok || !data.registered) {
        setIntentFieldFeedback('intentEmail', {
          tone: 'error',
          message: data.message || 'Your email is currently not set as a Library creator.'
        });
        return false;
      }

      setIntentVerifiedFields((current) => ({ ...current, email: email.toLowerCase() }));
      setIntentFieldFeedback('intentEmail', {
        tone: 'success',
        message: data.message || 'Your email is verified.'
      });
      return true;
    } catch {
      setIntentFieldFeedback('intentEmail', {
        tone: 'error',
        message: 'Library creator email validation is temporarily unavailable.'
      });
      return false;
    } finally {
      setIntentValidating((current) => ({ ...current, intentEmail: false }));
    }
  }

  function verifyIntentShareUrl() {
    const shareUrl = intentForm.shareUrl.trim();
    if (!shareUrl.includes(WEBFLOW_PREVIEW_URL_PATTERN)) {
      setIntentFieldFeedback('intentShareUrl', {
        tone: 'error',
        message: "URL must contain 'https://preview.webflow.com/preview/'."
      });
      return false;
    }

    try {
      const normalizedUrl = new URL(shareUrl).toString();
      setIntentVerifiedFields((current) => ({ ...current, shareUrl: normalizedUrl }));
      setIntentFieldFeedback('intentShareUrl', { tone: 'success', message: 'Valid URL.' });
      return true;
    } catch {
      setIntentFieldFeedback('intentShareUrl', {
        tone: 'error',
        message: 'Demo site share URL is invalid.'
      });
      return false;
    }
  }

  async function verifyRequiredIntentFields() {
    const email = intentForm.email.trim().toLowerCase();
    const shareUrl = intentForm.shareUrl.trim();

    const emailOk =
      intentVerifiedFields.email === email ? true : await verifyIntentEmail();
    const shareUrlOk =
      intentVerifiedFields.shareUrl === shareUrl ? true : verifyIntentShareUrl();

    return emailOk && shareUrlOk;
  }

  async function verifyCreatorEmail() {
    const email = form.creatorEmail.trim();
    if (!email) {
      setFeedback('creatorEmail', { tone: 'error', message: 'Enter the Webflow account email first.' });
      return false;
    }

    setValidating((current) => ({ ...current, creatorEmail: true }));
    setFeedback('creatorEmail', { tone: 'info', message: 'Checking Library submit access...' });

    try {
      const response = await fetch(appPath('/api/intake/check-library-user'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = (await response.json().catch(() => ({}))) as {
        canSubmitLibraries?: boolean;
        message?: string;
      };

      if (!response.ok || !data.canSubmitLibraries) {
        setFeedback('creatorEmail', {
          tone: 'error',
          message: data.message || 'This account is not approved to submit Libraries.'
        });
        return false;
      }

      setVerifiedFields((current) => ({ ...current, creatorEmail: email.toLowerCase() }));
      setFeedback('creatorEmail', {
        tone: 'success',
        message: data.message || 'Email verified for Library submissions.'
      });
      return true;
    } catch {
      setFeedback('creatorEmail', {
        tone: 'error',
        message: 'Library creator validation is temporarily unavailable.'
      });
      return false;
    } finally {
      setValidating((current) => ({ ...current, creatorEmail: false }));
    }
  }

  async function verifyLibraryName() {
    const name = form.libraryName.trim();
    if (!name) {
      setFeedback('libraryName', { tone: 'error', message: 'Enter the Library name first.' });
      return false;
    }

    setValidating((current) => ({ ...current, libraryName: true }));
    setFeedback('libraryName', { tone: 'info', message: 'Checking Library name...' });

    try {
      const response = await fetch(appPath('/api/intake/check-library-name'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      const data = (await response.json().catch(() => ({}))) as {
        available?: boolean;
        message?: string;
      };

      if (!response.ok || !data.available) {
        setFeedback('libraryName', {
          tone: 'error',
          message: data.message || 'Library name is already in use.'
        });
        return false;
      }

      setVerifiedFields((current) => ({ ...current, libraryName: name }));
      setFeedback('libraryName', {
        tone: 'success',
        message: data.message || 'Library name is available.'
      });
      return true;
    } catch {
      setFeedback('libraryName', {
        tone: 'error',
        message: 'Library name validation is temporarily unavailable.'
      });
      return false;
    } finally {
      setValidating((current) => ({ ...current, libraryName: false }));
    }
  }

  async function verifyRequiredFieldsBeforeSubmit() {
    const creatorEmail = form.creatorEmail.trim().toLowerCase();
    const libraryName = form.libraryName.trim();

    const creatorOk =
      verifiedFields.creatorEmail === creatorEmail ? true : await verifyCreatorEmail();
    const nameOk = verifiedFields.libraryName === libraryName ? true : await verifyLibraryName();

    return creatorOk && nameOk;
  }

  async function handleIntentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIntentSubmitting(true);
    setIntentStatus({ tone: 'idle', message: '' });

    try {
      const validationPassed = await verifyRequiredIntentFields();
      if (!validationPassed) {
        throw new Error('Resolve the email and demo-site URL validation errors before submitting.');
      }

      requireTurnstile('intent');
      const response = await fetch(appPath('/api/intake/library-intent'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: intentForm.email,
          shareUrl: intentForm.shareUrl,
          turnstileToken: turnstileTokens.intent,
          utm
        })
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        submissionId?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Library project enablement failed.');
      }

      setIntentForm(INITIAL_INTENT_STATE);
      setIntentFeedback({ intentEmail: null, intentShareUrl: null });
      setIntentVerifiedFields({ email: '', shareUrl: '' });
      resetTurnstile('intent');
      setIntentStatus({
        tone: 'success',
        message: data.submissionId
          ? `Project enablement received. Submission ID: ${data.submissionId}`
          : 'Project enablement received.'
      });
    } catch (error) {
      resetTurnstile('intent');
      setIntentStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Library project enablement failed.'
      });
    } finally {
      setIntentSubmitting(false);
    }
  }

  async function handleCreatorSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatorSubmitting(true);
    setCreatorStatus({ tone: 'idle', message: '' });

    try {
      const primaryEmail = creatorForm.primaryEmail.trim().toLowerCase();
      const webflowEmail = creatorForm.webflowEmail.trim().toLowerCase();

      if (creatorVerifiedFields.primaryEmail !== primaryEmail) {
        const ok = await verifyCreatorApplicationEmail('primaryEmail');
        if (!ok) throw new Error('Verify the primary email before submitting.');
      }

      if (creatorVerifiedFields.webflowEmail !== webflowEmail) {
        const ok = await verifyCreatorApplicationEmail('webflowEmail');
        if (!ok) throw new Error('Verify the Webflow account email before submitting.');
      }

      if (!creatorForm.avatarFile) {
        throw new Error('Upload the creator profile image before submitting.');
      }

      requireTurnstile('creator');
      const avatarUrl = await uploadAvatar(creatorForm.avatarFile);
      const response = await fetch(appPath('/api/intake/creator'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: creatorForm.country,
          primaryEmail: creatorForm.primaryEmail,
          webflowEmail: creatorForm.webflowEmail,
          preferredName: creatorForm.preferredName,
          legalName: creatorForm.legalName,
          websiteUrl: creatorForm.websiteUrl,
          biography: creatorForm.biography,
          avatarUrl,
          agreedToTerms: creatorForm.agreedToTerms,
          program: 'library',
          turnstileToken: turnstileTokens.creator,
          utm
        })
      });

      const data = (await response.json().catch(() => ({}))) as {
        creator?: { name?: string; email?: string };
        error?: string;
      };

      if (!response.ok || !data.creator) {
        throw new Error(data.error || 'Failed to create creator profile.');
      }

      setIntentForm((current) => ({
        ...current,
        email: data.creator?.email || creatorForm.webflowEmail || creatorForm.primaryEmail
      }));
      setCreatorForm(INITIAL_CREATOR_STATE);
      setCreatorFeedback({ primaryEmail: null, webflowEmail: null });
      setCreatorVerifiedFields({ primaryEmail: '', webflowEmail: '' });
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
      setCreatorStatus({
        tone: 'success',
        message: 'Creator profile received. Continue by enabling your Library project.'
      });
      resetTurnstile('creator');
      goToStep('library');
    } catch (error) {
      // Turnstile tokens are single-use: siteverify already consumed this one.
      resetTurnstile('creator');
      setCreatorStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Failed to create creator profile.'
      });
    } finally {
      setCreatorSubmitting(false);
    }
  }

  useEffect(() => {
    setIsEmbedded(window.parent !== window);

    const captureParams = (searchLike: string | Record<string, string>) => {
      const params =
        typeof searchLike === 'string'
          ? new URLSearchParams(searchLike)
          : new URLSearchParams(Object.entries(searchLike || {}));
      const captured: Record<string, string> = {};
      for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
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
      setActiveStep('library');
    } else if (initialSection === 'join-today' || initialHash === '#join-today') {
      setActiveStep('creator');
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
        goToStep(data.section === 'submit-today' ? 'library' : 'creator');
      }
    };
    window.addEventListener('message', onParentMessage);

    return () => {
      window.removeEventListener('message', onParentMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (window.parent === window) return;
    const root = appRootRef.current;
    if (!root) return;

    let lastHeight = 0;
    const postHeight = () => {
      // Measure the app root's content height, not scrollHeight: body has
      // min-height:100vh, which pins scrollHeight to the frame's current
      // viewport and would prevent the frame from ever shrinking.
      const height = Math.ceil(root.getBoundingClientRect().height);
      if (height === lastHeight) return;
      lastHeight = height;
      const message: SubmissionChildMessage = { type: 'ts-submission:resize', height };
      window.parent.postMessage(message, '*');
    };

    postHeight();
    const observer = new ResizeObserver(() => postHeight());
    observer.observe(root);
    window.addEventListener('load', postHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('load', postHeight);
    };
  }, []);

  function setTurnstileToken(stepName: TurnstileStep, token: string) {
    setTurnstileTokens((current) => ({ ...current, [stepName]: token }));
  }

  function getTurnstileContainer(stepName: TurnstileStep) {
    if (stepName === 'creator') return creatorTurnstileRef.current;
    if (stepName === 'intent') return intentTurnstileRef.current;
    return libraryTurnstileRef.current;
  }

  function resetTurnstile(stepName: TurnstileStep) {
    if (!turnstileEnabled || typeof window === 'undefined' || !(window as unknown as {turnstile:TurnstileApi}).turnstile) return;
    const widgetId = turnstileWidgetIds.current[stepName];
    if (!widgetId) return;
    (window as unknown as {turnstile:TurnstileApi}).turnstile.reset(widgetId);
    setTurnstileToken(stepName, '');
  }

  function ensureTurnstile(stepName: TurnstileStep) {
    if (!turnstileEnabled || !turnstileReady || typeof window === 'undefined' || !(window as unknown as {turnstile:TurnstileApi}).turnstile) {
      return;
    }

    const container = getTurnstileContainer(stepName);
    if (!container) return;

    if (turnstileWidgetIds.current[stepName]) {
      if (container.hasChildNodes()) return;
      // The widget DOM was unmounted when its step was hidden; the stored id is stale.
      turnstileWidgetIds.current[stepName] = null;
      setTurnstileToken(stepName, '');
    }

    turnstileWidgetIds.current[stepName] = (window as unknown as {turnstile:TurnstileApi}).turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      action: TURNSTILE_ACTION[stepName],
      theme: 'light',
      callback: (token) => setTurnstileToken(stepName, token),
      'expired-callback': () => setTurnstileToken(stepName, ''),
      'error-callback': () => setTurnstileToken(stepName, '')
    });
  }

  useEffect(() => {
    if (!turnstileEnabled || !turnstileReady) return;
    if (activeStep === 'creator') {
      ensureTurnstile('creator');
    } else {
      ensureTurnstile('intent');
      ensureTurnstile('library');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnstileEnabled, turnstileReady, activeStep, submittedLibrary]);

  useEffect(() => {
    return () => {
      if (!turnstileEnabled || typeof window === 'undefined' || !(window as unknown as {turnstile:TurnstileApi}).turnstile) return;
      for (const widgetId of Object.values(turnstileWidgetIds.current)) {
        if (widgetId) (window as unknown as {turnstile:TurnstileApi}).turnstile.remove(widgetId);
      }
    };
  }, [turnstileEnabled]);

  function requireTurnstile(stepName: TurnstileStep) {
    if (turnstileEnabled && !turnstileTokens[stepName]) {
      throw new Error('Complete the bot check before submitting.');
    }
  }

  function handleSubmitAnotherLibrary() {
    setSubmittedLibrary(null);
    setCompletionMinHeight(null);
    setStatus({ tone: 'idle', message: '' });
    scrollToSubmitLibrary();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ tone: 'idle', message: '' });

    try {
      const validationPassed = await verifyRequiredFieldsBeforeSubmit();
      if (!validationPassed) {
        throw new Error('Resolve the email and Library name validation errors before submitting.');
      }

      if (!thumbnailFile) {
        throw new Error('Upload the Library thumbnail before submitting.');
      }

      requireTurnstile('library');
      const thumbnailUrl = await uploadThumbnail(thumbnailFile);
      const response = await fetch(appPath('/api/intake/library'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorEmail: form.creatorEmail,
          libraryName: form.libraryName,
          publishedUrl: form.publishedUrl,
          previewUrl: form.previewUrl,
          documentationUrl: form.documentationUrl,
          supportUrl: form.supportUrl,
          layoutCount: form.layoutCount,
          features: selectedFeatures,
          targetAudience: form.targetAudience,
          thumbnailUrl,
          thumbnailAltText: form.thumbnailAltText,
          shortDescription: form.shortDescription,
          longDescription: form.longDescription,
          checklistConfirmed: form.checklistConfirmed,
          agreementConfirmed: form.agreementConfirmed,
          turnstileToken: turnstileTokens.library,
          utm
        })
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        submissionId?: string;
        asset?: { name?: string };
      };

      if (!response.ok) {
        throw new Error(data.error || 'Library submission failed.');
      }

      const submittedName = data.asset?.name || form.libraryName;
      // Hold the column at the form's height so the embedded frame does not
      // collapse when the success panel replaces the form.
      const submittedFormHeight = libraryFormRef.current?.getBoundingClientRect().height;
      setCompletionMinHeight(
        submittedFormHeight && submittedFormHeight > 0 ? Math.ceil(submittedFormHeight) : null
      );
      resetTurnstile('library');
      setForm(INITIAL_STATE);
      setThumbnailFile(null);
      setFieldFeedback({ creatorEmail: null, libraryName: null });
      setVerifiedFields({ creatorEmail: '', libraryName: '' });
      if (thumbnailInputRef.current) {
        thumbnailInputRef.current.value = '';
      }
      setStatus({ tone: 'idle', message: '' });
      setSubmittedLibrary({ name: submittedName, submissionId: data.submissionId });
    } catch (error) {
      resetTurnstile('library');
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Library submission failed.'
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`submission-app${isEmbedded ? ' is-embedded' : ''}`} ref={appRootRef}>
      {turnstileEnabled ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setTurnstileReady(true)}
        />
      ) : null}
      <SubmissionStepper activeStep={activeStep} onSelectStep={goToStep} />

      {activeStep === 'creator' ? (
        <section
          className="section cc-submission-wrapper cc-creator-wrap"
          id="join-today"
          ref={creatorSectionRef}
        >
          <div className="container">
            <div className="w-layout-grid submission_content-grid">
              <div className="cc-sticky submission-sidecar">
                <p className="submission-step-label">Step 1</p>
                <h2 className="submission-panel-title">Become a Library Creator</h2>
                <div className="rte w-richtext submission-panel-copy">
                  <p>
                    Fill out the Marketplace Creator form once. Our review team uses these details
                    to learn about you as a designer and evaluate your experience with Webflow.
                    Once you are approved, you can enable a demo project and submit Libraries.
                  </p>
                  <p>
                    Already registered?{' '}
                    <a
                      className="ts_link"
                      href="#submit-today"
                      onClick={(event) => {
                        event.preventDefault();
                        goToStep('library');
                      }}
                    >
                      Skip to Library submission
                    </a>
                    .
                  </p>
                </div>
              </div>

              <div className="submission-form-column">
                <div className="w-form">
                  <form
                    className="form-2 cc-library-application-form submission-form"
                    id="wf-form-Marketplace-Creator-Submission"
                    name="wf-form-Marketplace-Creator-Submission"
                    onSubmit={handleCreatorSubmit}
                  >
                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="creator-country"
                      >
                        Country
                        <span className="submission-required"> *</span>
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        Choose the country tied to your creator account. Some countries require
                        specific Stripe onboarding before payouts can continue.
                      </p>
                      <CountryPicker
                        id="creator-country"
                        countries={ALL_COUNTRIES}
                        value={creatorForm.country}
                        onChange={(value) => updateCreatorField('country', value)}
                        placeholder="Select or search for a country…"
                        required
                      />
                      {!creatorCountrySupported ? (
                        <div className="submission-status submission-status-error submission-country-onboarding-warning">
                          This country is currently unavailable for Marketplace payouts. You can
                          review Stripe&apos;s requirements to open an account in another
                          supported country.
                        </div>
                      ) : creatorCountryRequiresStripeOnboarding ? (
                        <div className="submission-status submission-status-warning submission-country-onboarding-warning">
                          This country requires specific Stripe onboarding before payouts can
                          continue. Review Stripe&apos;s requirements before applying.
                        </div>
                      ) : null}
                    </div>

                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="creator-website"
                      >
                        Personal website URL
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        Optional, but useful context for the review team.
                      </p>
                      <input
                        id="creator-website"
                        className="field-input input w-input"
                        type="url"
                        placeholder="https://"
                        value={creatorForm.websiteUrl}
                        onChange={(event) => updateCreatorField('websiteUrl', event.target.value)}
                      />
                    </div>

                    <InlineActionField
                      actionLabel="Verify email"
                      feedback={creatorFeedback.primaryEmail}
                      isBusy={creatorValidating.primaryEmail}
                      onAction={() => verifyCreatorApplicationEmail('primaryEmail')}
                    >
                      <label>
                        <span className="field-label template-application-form_field-label cc-with-desc">
                          Primary email
                          <span className="submission-required"> *</span>
                        </span>
                        <p className="field-help cc-library-application-form_field-desc">
                          This email is used for creator correspondence and submission follow-up.
                        </p>
                        <input
                          className="field-input input w-input"
                          type="email"
                          required
                          value={creatorForm.primaryEmail}
                          onChange={(event) =>
                            updateCreatorField('primaryEmail', event.target.value)
                          }
                        />
                      </label>
                    </InlineActionField>

                    <InlineActionField
                      actionLabel="Verify email"
                      feedback={creatorFeedback.webflowEmail}
                      isBusy={creatorValidating.webflowEmail}
                      onAction={() => verifyCreatorApplicationEmail('webflowEmail')}
                    >
                      <label>
                        <span className="field-label template-application-form_field-label cc-with-desc">
                          Webflow account email
                          <span className="submission-required"> *</span>
                        </span>
                        <p className="field-help cc-library-application-form_field-desc">
                          This must match the Webflow account used for the submitted Library.
                        </p>
                        <input
                          className="field-input input w-input"
                          type="email"
                          required
                          value={creatorForm.webflowEmail}
                          onChange={(event) =>
                            updateCreatorField('webflowEmail', event.target.value)
                          }
                        />
                      </label>
                    </InlineActionField>

                    <div className="submission-grid-2">
                      <div className="submission-field">
                        <label
                          className="field-label template-application-form_field-label"
                          htmlFor="creator-preferred-name"
                        >
                          Preferred name
                        </label>
                        <input
                          id="creator-preferred-name"
                          className="field-input input w-input"
                          type="text"
                          value={creatorForm.preferredName}
                          onChange={(event) =>
                            updateCreatorField('preferredName', event.target.value)
                          }
                        />
                      </div>
                      <div className="submission-field">
                        <label
                          className="field-label template-application-form_field-label"
                          htmlFor="creator-legal-name"
                        >
                          Legal name
                          <span className="submission-required"> *</span>
                        </label>
                        <input
                          id="creator-legal-name"
                          className="field-input input w-input"
                          type="text"
                          required
                          value={creatorForm.legalName}
                          onChange={(event) => updateCreatorField('legalName', event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="creator-bio"
                      >
                        Creator bio
                        <span className="submission-required"> *</span>
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        Keep it short and specific. One or two lines shown on your profile page.
                      </p>
                      <textarea
                        id="creator-bio"
                        className="field-textarea input w-input submission-textarea-short"
                        maxLength={200}
                        required
                        value={creatorForm.biography}
                        onChange={(event) => updateCreatorField('biography', event.target.value)}
                      />
                      <span className="field-help submission-counter">
                        {creatorForm.biography.length}/200 characters
                      </span>
                    </div>

                    <div className="submission-field">
                      <label
                        className="field-label template-application-form_field-label cc-with-desc"
                        htmlFor="creator-avatar"
                      >
                        Profile image
                        <span className="submission-required"> *</span>
                      </label>
                      <p className="field-help cc-library-application-form_field-desc">
                        Upload a WebP image that is exactly 256x256 and under 100KB.
                      </p>
                      <div className="submission-upload-card">
                        <div className="submission-upload-specs" aria-hidden="true">
                          <span className="submission-spec-chip">WebP</span>
                          <span className="submission-spec-chip">256×256</span>
                          <span className="submission-spec-chip">&lt;100KB</span>
                        </div>
                        <input
                          id="creator-avatar"
                          ref={avatarInputRef}
                          className="submission-file-input"
                          type="file"
                          accept="image/webp"
                          onChange={(event) =>
                            updateCreatorField('avatarFile', event.target.files?.[0] ?? null)
                          }
                        />
                        <div className="field-help submission-selected-files-empty">
                          {creatorForm.avatarFile
                            ? creatorForm.avatarFile.name
                            : 'No profile image selected yet.'}
                        </div>
                      </div>
                    </div>

                    <div className="submission-confirmation-card">
                      <div className="submission-confirmation-header">
                        <h3 className="submission-confirmation-title">Confirm profile submission</h3>
                        <p className="field-help submission-confirmation-copy">
                          One agreement{turnstileEnabled ? ' and one bot check' : ''} before the
                          creator profile is created.
                        </p>
                      </div>
                      <div className="submission-confirmation-stack">
                        <label
                          className={choiceClassName(
                            creatorForm.agreedToTerms,
                            'submission-choice-checkbox w-checkbox input-block cc-check u-mb-0'
                          )}
                        >
                          <input
                            type="checkbox"
                            required
                            checked={creatorForm.agreedToTerms}
                            onChange={(event) =>
                              updateCreatorField('agreedToTerms', event.target.checked)
                            }
                          />
                          <span className="submission-choice-copy">
                            I acknowledge the Library Marketplace agreement and creator policies.
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

                    {creatorStatus.message ? (
                      <div className={statusClassName(creatorStatus.tone)} role="status">
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
                        onClick={() => goToStep('library')}
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
      ) : null}

      {activeStep === 'library' ? (
        <section
          className="section cc-submission-wrapper cc-submit-wrap"
          id="submit-today"
          ref={submitSectionRef}
        >
          <div className="container">
            <div className="w-layout-grid submission_content-grid">
              <div className="cc-sticky submission-sidecar">
                <p className="submission-step-label">Step 2</p>
                <h2 className="submission-panel-title">Submit a Library</h2>
                <div className="rte w-richtext submission-panel-copy">
                  <p>
                    Enable the demo project reviewers will use, then submit the Library for review
                    and publication in the Webflow Marketplace. Reference the{' '}
                    <a
                      className="ts_link"
                      href="https://webflow.com/templates/grading-rubric"
                      rel="noreferrer"
                      target="_blank"
                    >
                      quality rubric
                    </a>{' '}
                    and{' '}
                    <a
                      className="ts_link"
                      href="https://webflow.com/templates/submission-guidelines"
                      rel="noreferrer"
                      target="_blank"
                    >
                      submission guidelines
                    </a>{' '}
                    before sending the Library for review.
                  </p>
                  <p>
                    Not a creator yet?{' '}
                    <a
                      className="ts_link"
                      href="#join-today"
                      onClick={(event) => {
                        event.preventDefault();
                        goToStep('creator');
                      }}
                    >
                      Become a Library Creator
                    </a>{' '}
                    first.
                  </p>
                </div>
              </div>

              <div className="submission-form-column">
                <div className="w-form" id="enable-project">
                  <form
                    className="form-2 cc-library-application-form submission-form"
                    id="wf-form-Marketplace-Library-Intent"
                    name="wf-form-Marketplace-Library-Intent"
                    onSubmit={handleIntentSubmit}
                  >
                    <section className="submission-section" aria-label="Enable a project">
                      <SectionHeader
                        index="Section 1"
                        title="Enable a project"
                        copy="Before submitting a new Library, enable the demo project reviewers should use during the Library review."
                      />

                      <InlineActionField
                        actionLabel="Verify email"
                        feedback={intentFeedback.intentEmail}
                        isBusy={intentValidating.intentEmail}
                        onAction={verifyIntentEmail}
                      >
                        <label>
                          <span className="field-label template-application-form_field-label cc-with-desc">
                            Webflow account email
                            <span className="submission-required"> *</span>
                          </span>
                          <p className="field-help cc-library-application-form_field-desc">
                            Must match the email used when becoming a Library creator.
                          </p>
                          <input
                            className="field-input input w-input"
                            type="email"
                            required
                            value={intentForm.email}
                            onChange={(event) => updateIntentField('email', event.target.value)}
                          />
                        </label>
                      </InlineActionField>

                      <div className="submission-field">
                        <label
                          className="field-label template-application-form_field-label cc-with-desc"
                          htmlFor="intent-share-url"
                        >
                          Demo site share link
                          <span className="submission-required"> *</span>
                        </label>
                        <p className="field-help cc-library-application-form_field-desc">
                          A read-only{' '}
                          <code className="submission-inline-code">
                            https://preview.webflow.com/preview/
                          </code>{' '}
                          link for the site you will use for this Library.{' '}
                          <a
                            className="ts_link"
                            href="https://university.webflow.com/lesson/share-your-project-and-invite-collaborators"
                            target="_blank"
                            rel="noreferrer"
                          >
                            How to generate a share link
                          </a>
                          .
                        </p>
                        <input
                          id="intent-share-url"
                          className="field-input input w-input"
                          type="url"
                          required
                          placeholder="https://preview.webflow.com/preview/example-site?preview=…"
                          value={intentForm.shareUrl}
                          onBlur={verifyIntentShareUrl}
                          onChange={(event) => updateIntentField('shareUrl', event.target.value)}
                        />
                        <FieldFeedback feedback={intentFeedback.intentShareUrl} />
                      </div>

                      {turnstileEnabled ? (
                        <div className="submission-field">
                          <span className="field-label template-application-form_field-label">
                            Bot check
                          </span>
                          <div className="turnstile-wrap" ref={intentTurnstileRef} />
                        </div>
                      ) : null}

                      {intentStatus.message ? (
                        <div className={statusClassName(intentStatus.tone)} role="status">
                          {intentStatus.message}
                        </div>
                      ) : null}

                      <div className="submission-actions">
                        <button className="button-sp" type="submit" disabled={intentSubmitting}>
                          {intentSubmitting ? 'Submitting...' : 'Enable project'}
                        </button>
                      </div>
                    </section>
                  </form>
                </div>

                <div
                  className={`w-form${submittedLibrary ? ' submission-completion-anchor' : ''}`}
                  id="submit-library"
                  style={
                    submittedLibrary && completionMinHeight
                      ? { minHeight: `${completionMinHeight}px` }
                      : undefined
                  }
                >
                  {submittedLibrary ? (
                    <LibrarySubmissionSuccessPanel
                      submission={submittedLibrary}
                      onSubmitAnother={handleSubmitAnotherLibrary}
                    />
                  ) : (
                    <form
                      ref={libraryFormRef}
                      className="form-2 cc-library-application-form submission-form"
                      id="wf-form-Marketplace-Library-Submission"
                      name="wf-form-Marketplace-Library-Submission"
                      onSubmit={handleSubmit}
                    >
                      <section className="submission-section" aria-label="Creator identity">
                        <SectionHeader
                          index="Section 2"
                          title="Creator identity"
                          copy="Confirm the Webflow account approved to submit Libraries."
                        />
                        <InlineActionField
                          actionLabel="Verify email"
                          feedback={fieldFeedback.creatorEmail}
                          isBusy={validating.creatorEmail}
                          onAction={verifyCreatorEmail}
                        >
                          <label>
                            <span className="field-label template-application-form_field-label cc-with-desc">
                              Webflow account email
                              <span className="submission-required"> *</span>
                            </span>
                            <p className="field-help cc-library-application-form_field-desc">
                              This must match the Webflow account approved to submit Libraries.
                            </p>
                            <input
                              className="field-input input w-input"
                              type="email"
                              required
                              value={form.creatorEmail}
                              onChange={(event) => updateField('creatorEmail', event.target.value)}
                            />
                          </label>
                        </InlineActionField>
                      </section>

                      <section className="submission-section" aria-label="Library details">
                        <SectionHeader
                          index="Section 3"
                          title="Library details"
                          copy="Name the Library and point reviewers at the published site, the preview, and support."
                        />

                        <InlineActionField
                          actionLabel="Check name"
                          feedback={fieldFeedback.libraryName}
                          isBusy={validating.libraryName}
                          onAction={verifyLibraryName}
                        >
                          <label>
                            <span className="field-label template-application-form_field-label cc-with-desc">
                              Library name
                              <span className="submission-required"> *</span>
                            </span>
                            <p className="field-help cc-library-application-form_field-desc">
                              Use the Marketplace display name exactly as reviewers should see it.
                            </p>
                            <input
                              className="field-input input w-input"
                              type="text"
                              required
                              value={form.libraryName}
                              onChange={(event) => updateField('libraryName', event.target.value)}
                            />
                          </label>
                        </InlineActionField>

                        <div className="submission-field">
                          <label
                            className="field-label template-application-form_field-label cc-with-desc"
                            htmlFor="library-published-url"
                          >
                            Published URL
                            <span className="submission-required"> *</span>
                          </label>
                          <p className="field-help cc-library-application-form_field-desc">
                            Must be an HTTPS published Webflow URL reviewers can open.
                          </p>
                          <input
                            id="library-published-url"
                            className="field-input input w-input"
                            type="url"
                            required
                            placeholder="https://my-library.webflow.io"
                            value={form.publishedUrl}
                            onChange={(event) => updateField('publishedUrl', event.target.value)}
                          />
                        </div>

                        <div className="submission-field">
                          <label
                            className="field-label template-application-form_field-label cc-with-desc"
                            htmlFor="library-preview-url"
                          >
                            Preview URL
                            <span className="submission-required"> *</span>
                          </label>
                          <p className="field-help cc-library-application-form_field-desc">
                            Must contain{' '}
                            <code className="submission-inline-code">
                              https://preview.webflow.com/preview/
                            </code>{' '}
                            so reviewers can inspect the Designer structure.
                          </p>
                          <input
                            id="library-preview-url"
                            className="field-input input w-input"
                            type="url"
                            required
                            placeholder="https://preview.webflow.com/preview/…"
                            value={form.previewUrl}
                            onChange={(event) => updateField('previewUrl', event.target.value)}
                          />
                        </div>

                        <div className="submission-grid-2">
                          <div className="submission-field">
                            <label
                              className="field-label template-application-form_field-label"
                              htmlFor="library-documentation-url"
                            >
                              Documentation URL
                            </label>
                            <input
                              id="library-documentation-url"
                              className="field-input input w-input"
                              type="url"
                              placeholder="https://"
                              value={form.documentationUrl}
                              onChange={(event) =>
                                updateField('documentationUrl', event.target.value)
                              }
                            />
                          </div>
                          <div className="submission-field">
                            <label
                              className="field-label template-application-form_field-label cc-with-desc"
                              htmlFor="library-support-url"
                            >
                              Support URL
                              <span className="submission-required"> *</span>
                            </label>
                            <p className="field-help cc-library-application-form_field-desc">
                              The support or contact page shown to customers.
                            </p>
                            <input
                              id="library-support-url"
                              className="field-input input w-input"
                              type="url"
                              required
                              placeholder="https://"
                              value={form.supportUrl}
                              onChange={(event) => updateField('supportUrl', event.target.value)}
                            />
                          </div>
                        </div>

                        <div className="submission-field">
                          <label
                            className="field-label template-application-form_field-label cc-with-desc"
                            htmlFor="library-layout-count"
                          >
                            Layout count
                            <span className="submission-required"> *</span>
                          </label>
                          <p className="field-help cc-library-application-form_field-desc">
                            Count only complete, reusable layouts included in the Library.
                          </p>
                          <input
                            id="library-layout-count"
                            className="field-input input w-input"
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={form.layoutCount}
                            onChange={(event) => updateField('layoutCount', event.target.value)}
                          />
                        </div>
                      </section>

                      <section className="submission-section" aria-label="Listing details">
                        <SectionHeader
                          index="Section 4"
                          title="Listing details"
                          copy="How the Library appears in the Marketplace."
                        />

                        <fieldset className="submission-field submission-library-fieldset">
                          <legend className="field-label template-application-form_field-label cc-with-desc">
                            Features
                            <span className="submission-required"> *</span>
                          </legend>
                          <p className="field-help cc-library-application-form_field-desc">
                            Choose the styling mode and any functionality or creative assets
                            included.
                          </p>
                          <div className="submission-library-feature-groups">
                            {FEATURE_GROUPS.map((group) => (
                              <div key={group.name} className="submission-choice-group">
                                <div className="submission-choice-heading">{group.name}</div>
                                <div className="submission-choice-grid submission-choice-grid-taxonomy submission-library-choice-grid">
                                  {group.options.map((feature) => {
                                    const checked =
                                      group.mode === 'radio'
                                        ? form.styling === feature
                                        : form.features.includes(feature);
                                    return (
                                      <label
                                        key={feature}
                                        className={choiceClassName(
                                          checked,
                                          'submission-choice-taxonomy input-block cc-check cc-template-application-form-choice'
                                        )}
                                      >
                                        <input
                                          type={group.mode}
                                          name={group.mode === 'radio' ? 'library-styling' : feature}
                                          value={feature}
                                          checked={checked}
                                          onChange={() =>
                                            group.mode === 'radio'
                                              ? updateField('styling', feature)
                                              : toggleFeature(feature)
                                          }
                                        />
                                        <span className="submission-choice-copy">{feature}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </fieldset>

                        <fieldset className="submission-field submission-library-fieldset">
                          <legend className="field-label template-application-form_field-label cc-with-desc">
                            Target audience
                            <span className="submission-required"> *</span>
                          </legend>
                          <p className="field-help cc-library-application-form_field-desc">
                            Select the Webflow skill level this Library is built for.
                          </p>
                          <div className="submission-choice-grid submission-library-audience-grid">
                            {TARGET_AUDIENCES.map((audience) => (
                              <label
                                key={audience}
                                className={choiceClassName(
                                  form.targetAudience === audience,
                                  'input-block cc-check cc-template-application-form-choice'
                                )}
                              >
                                <input
                                  type="radio"
                                  name="targetAudience"
                                  value={audience}
                                  checked={form.targetAudience === audience}
                                  onChange={() => updateField('targetAudience', audience)}
                                  required
                                />
                                <span className="submission-choice-copy">{audience}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>

                        <div className="submission-field">
                          <label
                            className="field-label template-application-form_field-label cc-with-desc"
                            htmlFor="library-short-description"
                          >
                            Short description
                            <span className="submission-required"> *</span>
                          </label>
                          <p className="field-help cc-library-application-form_field-desc">
                            Keep it concise. Explain what the Library helps customers build.
                          </p>
                          <textarea
                            id="library-short-description"
                            className="field-textarea input w-input submission-textarea-short"
                            maxLength={250}
                            required
                            value={form.shortDescription}
                            onChange={(event) => updateField('shortDescription', event.target.value)}
                          />
                          <span className="field-help submission-counter">
                            {form.shortDescription.length}/250 characters
                          </span>
                        </div>

                        <div className="submission-field">
                          <label
                            className="field-label template-application-form_field-label cc-with-desc"
                            htmlFor="library-long-description"
                          >
                            Long description
                            <span className="submission-required"> *</span>
                          </label>
                          <p className="field-help cc-library-application-form_field-desc">
                            Include the intended use case, what is included, and any setup
                            expectations.
                          </p>
                          <textarea
                            id="library-long-description"
                            className="field-textarea input w-input submission-textarea submission-long-text"
                            required
                            value={form.longDescription}
                            onChange={(event) => updateField('longDescription', event.target.value)}
                          />
                        </div>
                      </section>

                      <section className="submission-section" aria-label="Assets">
                        <SectionHeader
                          index="Section 5"
                          title="Assets"
                          copy="The image reviewers and buyers see."
                        />

                        <div className="submission-field">
                          <label
                            className="field-label template-application-form_field-label cc-with-desc"
                            htmlFor="library-thumbnail"
                          >
                            Library thumbnail
                            <span className="submission-required"> *</span>
                          </label>
                          <p className="field-help cc-library-application-form_field-desc">
                            WebP only, exactly 1184x1524, under 300KB.
                          </p>
                          <div className="submission-upload-card">
                            <div className="submission-upload-specs" aria-hidden="true">
                              <span className="submission-spec-chip">WebP</span>
                              <span className="submission-spec-chip">1184×1524</span>
                              <span className="submission-spec-chip">&lt;300KB</span>
                            </div>
                            <input
                              id="library-thumbnail"
                              ref={thumbnailInputRef}
                              className="submission-file-input"
                              type="file"
                              accept="image/webp"
                              onChange={(event) =>
                                setThumbnailFile(event.target.files?.[0] ?? null)
                              }
                            />
                            <div className="field-help submission-selected-files-empty">
                              {thumbnailFile ? thumbnailFile.name : 'No Library thumbnail selected yet.'}
                            </div>
                          </div>
                        </div>

                        <div className="submission-field">
                          <label
                            className="field-label template-application-form_field-label cc-with-desc"
                            htmlFor="library-thumbnail-alt"
                          >
                            Thumbnail alt text
                            <span className="submission-required"> *</span>
                          </label>
                          <p className="field-help cc-library-application-form_field-desc">
                            Describe the Library preview image for accessibility.
                          </p>
                          <input
                            id="library-thumbnail-alt"
                            className="field-input input w-input"
                            type="text"
                            required
                            value={form.thumbnailAltText}
                            onChange={(event) => updateField('thumbnailAltText', event.target.value)}
                          />
                        </div>
                      </section>

                      <section className="submission-section" aria-label="Confirm and submit">
                        <SectionHeader
                          index="Section 6"
                          title="Confirm & submit"
                          copy="Final checks before the Library enters the review queue."
                        />

                        <div className="submission-confirmation-card">
                          <div className="submission-confirmation-header">
                            <h3 className="submission-confirmation-title">Confirm and submit</h3>
                            <p className="field-help submission-confirmation-copy">
                              Confirm these last items, then send your Library to the review queue.
                            </p>
                          </div>
                          <div className="submission-confirmation-stack">
                            <label
                              className={choiceClassName(
                                form.checklistConfirmed,
                                'submission-choice-checkbox w-checkbox input-block cc-check u-mb-0'
                              )}
                            >
                              <input
                                type="checkbox"
                                required
                                checked={form.checklistConfirmed}
                                onChange={(event) =>
                                  updateField('checklistConfirmed', event.target.checked)
                                }
                              />
                              <span className="submission-choice-copy">
                                I have completed the Library submission checklist.
                              </span>
                            </label>

                            <label
                              className={choiceClassName(
                                form.agreementConfirmed,
                                'submission-choice-checkbox w-checkbox input-block cc-check u-mb-0'
                              )}
                            >
                              <input
                                type="checkbox"
                                required
                                checked={form.agreementConfirmed}
                                onChange={(event) =>
                                  updateField('agreementConfirmed', event.target.checked)
                                }
                              />
                              <span className="submission-choice-copy">
                                I confirm the Library complies with the submission guidelines and
                                the Library Marketplace agreement.
                              </span>
                            </label>

                            {turnstileEnabled ? (
                              <div className="submission-field">
                                <span className="field-label template-application-form_field-label">
                                  Bot check
                                </span>
                                <div className="turnstile-wrap" ref={libraryTurnstileRef} />
                                <div className="field-help">
                                  Required before submitting the Library.
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {status.message ? (
                          <div className={statusClassName(status.tone)} role="status">
                            {status.message}
                          </div>
                        ) : null}

                        <div className="submission-actions">
                          <button className="button-sp" type="submit" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Library'}
                          </button>
                        </div>
                      </section>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

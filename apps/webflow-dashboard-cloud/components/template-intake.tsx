'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { appPath } from '../lib/runtime-paths';
import {
  ALL_COUNTRIES,
  CATEGORY_OPTIONS,
  FEATURE_OPTIONS,
  PRIMARY_TAGS,
  SITE_TYPE_OPTIONS,
  isSupportedCountry
} from '../lib/intake/constants';

type Tone = 'success' | 'error' | 'info';

type StatusMessage = {
  tone: Tone;
  message: string;
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
  category: string;
  tags: string;
  styleTags: string;
  shortDescription: string;
  longDescription: string;
  notes: string;
  siteTypes: string[];
  featureFlags: string[];
  thumbnailFile: File | null;
  secondaryThumbnailFile: File | null;
  galleryFiles: File[];
  checklistConfirmed: boolean;
  agreementConfirmed: boolean;
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

const initialTemplateState: TemplateFormState = {
  creatorName: '',
  creatorEmail: '',
  templateName: '',
  publishedUrl: '',
  previewUrl: '',
  priceModel: 'Free',
  category: '',
  tags: '',
  styleTags: '',
  shortDescription: '',
  longDescription: '',
  notes: '',
  siteTypes: [],
  featureFlags: [],
  thumbnailFile: null,
  secondaryThumbnailFile: null,
  galleryFiles: [],
  checklistConfirmed: false,
  agreementConfirmed: false
};

function splitCommaList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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
  if (tone === 'success') return 'notice notice-success';
  if (tone === 'error') return 'notice notice-error';
  return 'notice';
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export function TemplateIntake() {
  const turnstileEnabled = Boolean(TURNSTILE_SITE_KEY);
  const [step, setStep] = useState<'creator' | 'template'>('creator');
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
      if (value) {
        captured[key] = value;
      }
    }
    setUtm(captured);
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

  function removeTurnstile(stepName: TurnstileStep) {
    if (!turnstileEnabled || typeof window === 'undefined' || !window.turnstile) {
      return;
    }

    const widgetId = getTurnstileWidgetId(stepName);
    if (widgetId) {
      window.turnstile.remove(widgetId);
      setTurnstileWidgetId(stepName, null);
    }

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

    const activeStep: TurnstileStep = step;
    const inactiveStep: TurnstileStep = step === 'creator' ? 'template' : 'creator';

    removeTurnstile(inactiveStep);
    ensureTurnstile(activeStep);
  }, [step, turnstileEnabled, turnstileReady]);

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
      setVerification((current) => ({
        ...current,
        publishedUrlVerified: '',
        publishedUrlMessage: '',
        gsapDetected: false
      }));
      setTemplate((current) => ({
        ...current,
        featureFlags: current.featureFlags.filter((item) => item !== 'gsap')
      }));
    }
  }

  async function verifyCreatorEmail(kind: 'primary' | 'webflow') {
    const email = (kind === 'primary' ? creator.primaryEmail : creator.webflowEmail).trim();
    if (!email) {
      setCreatorStatus({ tone: 'error', message: 'Enter an email address first.' });
      return;
    }

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
      setCreatorStatus({
        tone: 'error',
        message: data.message || 'Email verification failed.'
      });
      return;
    }

    setVerification((current) => ({
      ...current,
      [kind === 'primary' ? 'primaryEmailVerified' : 'webflowEmailVerified']: email.toLowerCase()
    }));
    setCreatorStatus({
      tone: 'success',
      message:
        kind === 'primary'
          ? 'Primary email verified and available.'
          : 'Webflow account email verified and available.'
    });
  }

  async function verifyCreatorEligibility() {
    const email = template.creatorEmail.trim();
    if (!email) {
      setTemplateStatus({ tone: 'error', message: 'Enter the creator email first.' });
      return;
    }

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
      setTemplateStatus({
        tone: 'error',
        message: data.message || 'Creator is not eligible to submit.'
      });
      return;
    }

    setVerification((current) => ({
      ...current,
      creatorEligibilityEmail: email.toLowerCase()
    }));
    setTemplateStatus({
      tone: 'success',
      message: data.message || 'Creator is eligible to submit.'
    });
  }

  async function verifyTemplateName() {
    const name = template.templateName.trim();
    if (!name) {
      setTemplateStatus({ tone: 'error', message: 'Enter a template name first.' });
      return;
    }

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
      setTemplateStatus({
        tone: 'error',
        message: data.errors?.[0] || 'Template name failed validation.'
      });
      return;
    }

    setVerification((current) => ({
      ...current,
      templateNameVerified: name
    }));
    setTemplateStatus({
      tone: 'success',
      message: 'Template name passed the current availability and naming checks.'
    });
  }

  async function verifyPublishedUrl() {
    const url = template.publishedUrl.trim();
    if (!url) {
      setTemplateStatus({ tone: 'error', message: 'Enter the published Webflow URL first.' });
      return;
    }

    setTemplateStatus({
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
      siteResults?: {
        passedCount?: number;
      };
    };

    if (!response.ok || !data.passed || !data.normalizedUrl) {
      setTemplateStatus({
        tone: 'error',
        message: data.message || 'Published URL validation failed.'
      });
      return;
    }

    setVerification((current) => ({
      ...current,
      publishedUrlVerified: data.normalizedUrl || '',
      publishedUrlMessage: data.gsapDetected
        ? 'Published site validated. GSAP was detected automatically.'
        : 'Published site validated.'
    }));
    setTemplate((current) => ({
      ...current,
      publishedUrl: data.normalizedUrl || current.publishedUrl,
      featureFlags: data.gsapDetected
        ? [...new Set([...current.featureFlags, 'gsap'])]
        : current.featureFlags
    }));
    setVerification((current) => ({
      ...current,
      gsapDetected: Boolean(data.gsapDetected)
    }));
    setTemplateStatus({
      tone: 'success',
      message:
        data.siteResults?.passedCount !== undefined
          ? `Published site validated across ${data.siteResults.passedCount} pages.`
          : 'Published site validated.'
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
      setStep('template');
      setCreatorStatus({
        tone: 'success',
        message: 'Creator profile created. Continue to the template submission step.'
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
          category: template.category,
          tags: splitCommaList(template.tags),
          styleTags: splitCommaList(template.styleTags),
          siteTypes: template.siteTypes,
          featureFlags: template.featureFlags,
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
    <main className="container">
      {turnstileEnabled ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => setTurnstileReady(true)}
        />
      ) : null}
      <div className="page-stack">
        <section className="page-header">
          <div>
            <h1 className="page-title">Marketplace creator intake</h1>
            <p className="page-subtitle">
              Rebuilt as a Webflow Cloud flow: create the creator profile first, then run the
              template submission gates against the new app-owned API surface.
            </p>
          </div>
        </section>

        <section className="card submit-hero">
          <div className="submit-hero-grid">
            <div>
              <h2 className="card-title">Live logic, explicit state</h2>
              <p className="card-subtitle">
                The old Webflow form hid business rules behind checkbox gates. This version keeps
                the same checks visible: creator email uniqueness, creator eligibility, template
                name policy, published-site crawl, and exact WebP upload rules.
              </p>
            </div>
            <div className="pill-row">
              <span className="pill">Profile first</span>
              <span className="pill">Template crawl validation</span>
              <span className="pill">R2-backed uploads</span>
            </div>
          </div>
        </section>

        <div className="submit-switch">
          <button
            className="step-tab"
            data-active={step === 'creator'}
            type="button"
            onClick={() => setStep('creator')}
          >
            1. Creator profile
          </button>
          <button
            className="step-tab"
            data-active={step === 'template'}
            type="button"
            onClick={() => setStep('template')}
          >
            2. Template submission
          </button>
        </div>

        {step === 'creator' ? (
          <section className="card">
            <div className="page-header">
              <div>
                <h2 className="card-title">Creator profile creation</h2>
                <p className="card-subtitle">
                  New creators start here. Existing creators can move to step 2 and run the
                  eligibility check with their existing creator email.
                </p>
              </div>
            </div>

            <form className="form-stack" onSubmit={submitCreator} style={{ marginTop: '1rem' }}>
              <div className="grid grid-2">
                <div className="field">
                  <label className="field-label" htmlFor="country">
                    Country
                  </label>
                  <select
                    className="field-select"
                    id="country"
                    value={creator.country}
                    onChange={(event) => updateCreator('country', event.target.value)}
                    required
                  >
                    <option value="">Select a country</option>
                    {ALL_COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                  <div className="field-help">
                    Payout-country support is still warning-only here, matching the live form.
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="websiteUrl">
                    Personal website URL
                  </label>
                  <input
                    className="field-input"
                    id="websiteUrl"
                    type="url"
                    value={creator.websiteUrl}
                    onChange={(event) => updateCreator('websiteUrl', event.target.value)}
                    placeholder="https://"
                  />
                </div>
              </div>

              {!creatorCountrySupported && creator.country ? (
                <div className="notice notice-warning">
                  This country is not in the current supported payout list. The live form treats
                  this as a warning rather than a hard block.
                </div>
              ) : null}

              <div className="field-row">
                <div className="field">
                  <label className="field-label" htmlFor="primaryEmail">
                    Primary email
                  </label>
                  <input
                    className="field-input"
                    id="primaryEmail"
                    type="email"
                    value={creator.primaryEmail}
                    onChange={(event) => updateCreator('primaryEmail', event.target.value)}
                    required
                  />
                </div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => verifyCreatorEmail('primary')}
                >
                  Verify email
                </button>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label" htmlFor="webflowEmail">
                    Webflow account email
                  </label>
                  <input
                    className="field-input"
                    id="webflowEmail"
                    type="email"
                    value={creator.webflowEmail}
                    onChange={(event) => updateCreator('webflowEmail', event.target.value)}
                    required
                  />
                </div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => verifyCreatorEmail('webflow')}
                >
                  Verify email
                </button>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label className="field-label" htmlFor="preferredName">
                    Preferred name
                  </label>
                  <input
                    className="field-input"
                    id="preferredName"
                    value={creator.preferredName}
                    onChange={(event) => updateCreator('preferredName', event.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="legalName">
                    Legal name
                  </label>
                  <input
                    className="field-input"
                    id="legalName"
                    value={creator.legalName}
                    onChange={(event) => updateCreator('legalName', event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="biography">
                  Creator bio
                </label>
                <textarea
                  className="field-textarea"
                  id="biography"
                  value={creator.biography}
                  onChange={(event) => updateCreator('biography', event.target.value)}
                  maxLength={200}
                  required
                />
                <div className="field-help">{creator.biography.length}/200 characters</div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="avatar">
                  Profile image
                </label>
                <input
                  className="field-input"
                  id="avatar"
                  type="file"
                  accept="image/webp"
                  onChange={(event) => updateCreator('avatarFile', event.target.files?.[0] || null)}
                  required
                />
                <div className="field-help">WebP only, exactly 256x256, max 100KB.</div>
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={creator.agreedToTerms}
                  onChange={(event) => updateCreator('agreedToTerms', event.target.checked)}
                />
                <span>I agree to the creator terms and marketplace policies.</span>
              </label>

              {turnstileEnabled ? (
                <div className="field">
                  <span className="field-label">Bot check</span>
                  <div className="turnstile-wrap" ref={creatorTurnstileRef} />
                  <div className="field-help">
                    Required before creating the creator profile.
                  </div>
                </div>
              ) : null}

              {creatorStatus ? (
                <div className={statusClassName(creatorStatus.tone)}>{creatorStatus.message}</div>
              ) : null}

              <div className="form-actions">
                <button className="button button-primary" type="submit" disabled={creatorSubmitting}>
                  {creatorSubmitting ? 'Creating profile…' : 'Create creator profile'}
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setStep('template')}
                >
                  I already have a creator profile
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {step === 'template' ? (
          <section className="card">
            <div className="page-header">
              <div>
                <h2 className="card-title">Template submission</h2>
                <p className="card-subtitle">
                  This step enforces creator eligibility, template naming policy, published-site
                  validation, preview URL format, and exact WebP upload constraints.
                </p>
              </div>
            </div>

            <form className="form-stack" onSubmit={submitTemplate} style={{ marginTop: '1rem' }}>
              <div className="field-row">
                <div className="field">
                  <label className="field-label" htmlFor="templateCreatorName">
                    Creator name
                  </label>
                  <input
                    className="field-input"
                    id="templateCreatorName"
                    value={template.creatorName}
                    onChange={(event) => updateTemplate('creatorName', event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label" htmlFor="templateCreatorEmail">
                    Creator email
                  </label>
                  <input
                    className="field-input"
                    id="templateCreatorEmail"
                    type="email"
                    value={template.creatorEmail}
                    onChange={(event) => updateTemplate('creatorEmail', event.target.value)}
                    required
                  />
                  <div className="field-help">
                    Existing creators can enter their creator email directly here.
                  </div>
                </div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={verifyCreatorEligibility}
                >
                  Check creator
                </button>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label" htmlFor="templateName">
                    Template name
                  </label>
                  <input
                    className="field-input"
                    id="templateName"
                    value={template.templateName}
                    onChange={(event) => updateTemplate('templateName', event.target.value)}
                    required
                  />
                  <div className="field-help">
                    First word must be capitalized. Avoid emoji, tag names, category names, and the
                    standalone term "AI".
                  </div>
                </div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={verifyTemplateName}
                >
                  Check name
                </button>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label" htmlFor="publishedUrl">
                    Published URL
                  </label>
                  <input
                    className="field-input"
                    id="publishedUrl"
                    type="url"
                    value={template.publishedUrl}
                    onChange={(event) => updateTemplate('publishedUrl', event.target.value)}
                    required
                  />
                  <div className="field-help">
                    Must be an HTTPS <span className="inline-code">*.webflow.io</span> URL. The full
                    crawl can take a few minutes.
                  </div>
                </div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={verifyPublishedUrl}
                >
                  Validate template
                </button>
              </div>

              {verification.publishedUrlMessage ? (
                <div className="notice notice-success">{verification.publishedUrlMessage}</div>
              ) : null}

              <div className="grid grid-2">
                <div className="field">
                  <label className="field-label" htmlFor="previewUrl">
                    Preview URL
                  </label>
                  <input
                    className="field-input"
                    id="previewUrl"
                    type="url"
                    value={template.previewUrl}
                    onChange={(event) => updateTemplate('previewUrl', event.target.value)}
                    required
                  />
                  {!previewUrlValid ? (
                    <div className="field-help" style={{ color: 'var(--color-error)' }}>
                      Preview URLs must contain https://preview.webflow.com/preview/.
                    </div>
                  ) : null}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="priceModel">
                    Free or paid
                  </label>
                  <select
                    className="field-select"
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
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label className="field-label" htmlFor="category">
                    Category
                  </label>
                  <select
                    className="field-select"
                    id="category"
                    value={template.category}
                    onChange={(event) => updateTemplate('category', event.target.value)}
                  >
                    <option value="">Select a category</option>
                    {CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="tags">
                    Tags
                  </label>
                  <input
                    className="field-input"
                    id="tags"
                    list="primary-tag-suggestions"
                    value={template.tags}
                    onChange={(event) => updateTemplate('tags', event.target.value)}
                    placeholder="Portfolio, Creative, Agency"
                  />
                  <div className="field-help">Comma-separated. Tag names are blocked inside the template title.</div>
                </div>
              </div>

              <datalist id="primary-tag-suggestions">
                {PRIMARY_TAGS.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>

              <div className="grid grid-2">
                <div className="field">
                  <label className="field-label" htmlFor="styleTags">
                    Style tags
                  </label>
                  <input
                    className="field-input"
                    id="styleTags"
                    value={template.styleTags}
                    onChange={(event) => updateTemplate('styleTags', event.target.value)}
                    placeholder="Minimal, Editorial, Bold"
                  />
                </div>
                <div className="field">
                  <span className="field-label">Site types</span>
                  <div className="checkbox-grid">
                    {SITE_TYPE_OPTIONS.map((option) => (
                      <label className="checkbox-row" key={option.id}>
                        <input
                          type="checkbox"
                          checked={template.siteTypes.includes(option.id)}
                          onChange={() =>
                            updateTemplate(
                              'siteTypes',
                              toggleCheckbox(template.siteTypes, option.id)
                            )
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="field">
                <span className="field-label">Feature flags</span>
                <div className="checkbox-grid">
                  {FEATURE_OPTIONS.map((option) => (
                    <label className="checkbox-row" key={option.id}>
                      <input
                        type="checkbox"
                        checked={template.featureFlags.includes(option.id)}
                        onChange={() =>
                          updateTemplate(
                            'featureFlags',
                            toggleCheckbox(template.featureFlags, option.id)
                          )
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                {verification.gsapDetected ? (
                  <div className="field-help">
                    GSAP was detected automatically during published-site validation.
                  </div>
                ) : null}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="shortDescription">
                  Short description
                </label>
                <textarea
                  className="field-textarea"
                  id="shortDescription"
                  value={template.shortDescription}
                  onChange={(event) => updateTemplate('shortDescription', event.target.value)}
                  maxLength={250}
                  required
                />
                <div className="field-help">{template.shortDescription.length}/250 characters</div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="longDescription">
                  Long description
                </label>
                <textarea
                  className="field-textarea"
                  id="longDescription"
                  value={template.longDescription}
                  onChange={(event) => updateTemplate('longDescription', event.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="notes">
                  Notes
                </label>
                <textarea
                  className="field-textarea"
                  id="notes"
                  value={template.notes}
                  onChange={(event) => updateTemplate('notes', event.target.value)}
                />
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label className="field-label" htmlFor="thumbnailFile">
                    Primary thumbnail
                  </label>
                  <input
                    className="field-input"
                    id="thumbnailFile"
                    type="file"
                    accept="image/webp"
                    onChange={(event) => updateTemplate('thumbnailFile', event.target.files?.[0] || null)}
                    required
                  />
                  <div className="field-help">WebP only, exactly 750x995, max 300KB.</div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="secondaryThumbnailFile">
                    Secondary thumbnail
                  </label>
                  <input
                    className="field-input"
                    id="secondaryThumbnailFile"
                    type="file"
                    accept="image/webp"
                    onChange={(event) =>
                      updateTemplate('secondaryThumbnailFile', event.target.files?.[0] || null)
                    }
                  />
                  <div className="field-help">Optional. Same 750x995 WebP constraint.</div>
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="galleryFiles">
                  Gallery images
                </label>
                <input
                  className="field-input"
                  id="galleryFiles"
                  type="file"
                  accept="image/webp"
                  multiple
                  onChange={(event) =>
                    updateTemplate(
                      'galleryFiles',
                      Array.from(event.target.files || []).slice(0, 5)
                    )
                  }
                  required
                />
                <div className="field-help">
                  Upload 1 to 5 WebP images, each exactly 1440x900 and max 250KB.
                </div>
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={template.checklistConfirmed}
                  onChange={(event) =>
                    updateTemplate('checklistConfirmed', event.target.checked)
                  }
                />
                <span>I completed the submission checklist.</span>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={template.agreementConfirmed}
                  onChange={(event) =>
                    updateTemplate('agreementConfirmed', event.target.checked)
                  }
                />
                <span>I agree to the marketplace submission agreement.</span>
              </label>

              {turnstileEnabled ? (
                <div className="field">
                  <span className="field-label">Bot check</span>
                  <div className="turnstile-wrap" ref={templateTurnstileRef} />
                  <div className="field-help">Required before submitting the template.</div>
                </div>
              ) : null}

              {templateStatus ? (
                <div className={statusClassName(templateStatus.tone)}>{templateStatus.message}</div>
              ) : null}

              <div className="form-actions">
                <button className="button button-primary" type="submit" disabled={templateSubmitting}>
                  {templateSubmitting ? 'Submitting…' : 'Submit template'}
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setStep('creator')}
                >
                  Back to creator profile
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}

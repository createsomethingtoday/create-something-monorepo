import React, { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { trackMarketplaceEvent } from './analytics';
import { MarketplaceComponentErrorBoundary, useMarketplaceComponentErrorTracking } from './MarketplaceComponentErrorBoundary';
import { applyHostInert } from './modalIsolation';
import {
  SUPPORT_REQUEST_ERROR_MESSAGES,
  SUPPORT_REQUEST_TYPE_LABELS,
  SUPPORT_REQUEST_TYPES,
  SupportRequestError,
  SupportRequestType,
  createIdempotencyKey,
  describeRetryAfter,
  submitSupportRequest,
} from './supportRequest';
import { inferTemplateSlug, templateDetailAnalyticsBase } from './templateDetailOffer';
import { TEMPLATE_DETAIL_STYLES } from './templateDetailStyles';

const COMPONENT = 'TemplateSupportRequest';

export interface TemplateSupportRequestProps {
  templateSlug?: string;
  templateName?: string;
  /** Display only. The creator's email is resolved server-side and never passed in. */
  creatorName?: string;
  buttonLabel?: string;
  enableAnalytics?: boolean;
}

type Status = 'editing' | 'submitting' | 'sent' | 'failed';

const SUPPORT_STYLES = `
.tmsupport-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(8, 8, 8, 0.48);
  color: #080808;
  font-family: "WF Visual Sans Variable", "WF Visual Sans", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.tmsupport-overlay *, .tmsupport-overlay *::before, .tmsupport-overlay *::after { box-sizing: border-box; }
.tmsupport-dialog {
  width: 100%;
  max-width: 520px;
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 24px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 64px rgba(8, 8, 8, 0.24);
}
.tmsupport-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.tmsupport-title { margin: 0; font-size: 20px; font-weight: 600; line-height: 1.3; }
.tmsupport-subtitle { margin: 4px 0 0; color: #5a5a5a; font-size: 14px; line-height: 1.5; }
.tmsupport-form { display: flex; flex-direction: column; gap: 14px; }
.tmsupport-fieldset { display: flex; flex-direction: column; gap: 14px; min-width: 0; margin: 0; padding: 0; border: 0; }
.tmsupport-field { display: flex; flex-direction: column; gap: 6px; }
.tmsupport-label { font-size: 13px; font-weight: 600; }
.tmsupport-input {
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid #d8d8d8;
  border-radius: 4px;
  background: #fff;
  color: #080808;
  font: inherit;
  font-size: 14px;
}
.tmsupport-input[aria-invalid="true"] { border-color: #d0021b; }
textarea.tmsupport-input { min-height: 132px; resize: vertical; line-height: 1.5; }
.tmsupport-honeypot { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
.tmsupport-note { margin: 0; color: #5a5a5a; font-size: 12px; line-height: 1.5; }
.tmsupport-error { margin: 0; color: #d0021b; font-size: 13px; line-height: 1.5; }
.tmsupport-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.tmsupport-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border: 1px solid #d8d8d8;
  border-radius: 4px;
  background: #fff;
  color: #080808;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.tmsupport-button-primary { border-color: #146ef5; background: #146ef5; color: #fff; }
.tmsupport-button-primary:hover { border-color: #0f55d9; background: #0f55d9; }
.tmsupport-button[disabled] { opacity: 0.6; cursor: progress; }
.tmsupport-input:disabled { background: #f7f7f7; cursor: progress; }
.tmsupport-close { min-height: 32px; padding: 0 10px; }
.tmsupport-button:focus-visible, .tmsupport-input:focus-visible { outline: 2px solid #146ef5; outline-offset: 2px; }
`;

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([tabindex="-1"]), select, textarea, a[href]'),
  );
}

/**
 * The submission being written, held by the button so it survives the dialog
 * closing. Reopening after an uncertain failure restores the same fields and
 * idempotency key, so a retry can't email the creator twice.
 */
interface SupportRequestDraft {
  requestType: SupportRequestType | '';
  buyerName: string;
  buyerEmail: string;
  message: string;
  idempotencyKey: string;
}

function emptyDraft(): SupportRequestDraft {
  return { requestType: '', buyerName: '', buyerEmail: '', message: '', idempotencyKey: createIdempotencyKey() };
}

// sessionStorage, per template: an unsent submission survives a reload or
// remount in the buyer's own tab, so retrying it after an uncertain failure
// reuses the original key. Storage can be absent or throw (private mode,
// blocked site data); the component then falls back to memory only.
const DRAFT_STORAGE_PREFIX = 'wf_tm_support_draft:';

export function loadStoredDraft(templateSlug: string): SupportRequestDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_STORAGE_PREFIX + templateSlug);
    if (!raw) return null;
    const draft = JSON.parse(raw) as SupportRequestDraft;
    return typeof draft?.idempotencyKey === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(draft.idempotencyKey)
      ? draft
      : null;
  } catch {
    return null;
  }
}

export function storeDraft(templateSlug: string, draft: SupportRequestDraft | null): void {
  try {
    if (draft) window.sessionStorage.setItem(DRAFT_STORAGE_PREFIX + templateSlug, JSON.stringify(draft));
    else window.sessionStorage.removeItem(DRAFT_STORAGE_PREFIX + templateSlug);
  } catch {
    // Memory-only fallback.
  }
}

interface SupportRequestDialogProps {
  templateSlug: string;
  templateName: string;
  creatorName: string;
  enableAnalytics: boolean;
  draft: SupportRequestDraft;
  onDraftChange: (draft: SupportRequestDraft | null) => void;
  onClose: () => void;
}

const SupportRequestDialog: React.FC<SupportRequestDialogProps> = ({
  templateSlug,
  templateName,
  creatorName,
  enableAnalytics,
  draft,
  onDraftChange,
  onClose,
}) => {
  const titleId = useId();
  const fieldId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  // While a write is in flight its outcome is unknown, so dismissal is blocked:
  // reopening would mint a new idempotency key and could email the creator twice.
  const submittingRef = useRef(false);
  const requestClose = () => {
    if (!submittingRef.current) onClose();
  };
  const onCloseRef = useRef(requestClose);
  onCloseRef.current = requestClose;

  const [requestType, setRequestType] = useState<SupportRequestType | ''>(draft.requestType);
  const [buyerName, setBuyerName] = useState(draft.buyerName);
  const [buyerEmail, setBuyerEmail] = useState(draft.buyerEmail);
  const [message, setMessage] = useState(draft.message);
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('editing');
  const [error, setError] = useState<SupportRequestError | null>(null);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  // One key per submission. Retries after a failure reuse it so the creator is
  // never emailed twice; editing any delivered field starts a new one.
  const idempotencyKeyRef = useRef(draft.idempotencyKey);
  const edited = <T,>(setter: (value: T) => void) => (value: T) => {
    idempotencyKeyRef.current = createIdempotencyKey();
    setter(value);
  };
  const sentRef = useRef(false);
  useEffect(() => {
    if (sentRef.current) return;
    onDraftChange({ requestType, buyerName, buyerEmail, message, idempotencyKey: idempotencyKeyRef.current });
  }, [requestType, buyerName, buyerEmail, message, onDraftChange]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const restoreHost = applyHostInert(Array.from(document.body.children), dialogRef.current);
    firstFieldRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusables = focusableElements(dialogRef.current);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restoreHost();
      document.body.style.overflow = previousOverflow;
      returnFocus?.focus();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;

    const missing = [
      !requestType && 'request_type',
      !buyerEmail.trim() && 'buyer_email',
      message.trim().length < 10 && 'message',
    ].filter((field): field is string => Boolean(field));
    if (missing.length > 0 || !requestType) {
      setInvalidFields(missing);
      setError('invalid_fields');
      return;
    }

    submittingRef.current = true;
    setStatus('submitting');
    setError(null);
    setInvalidFields([]);
    setRetryAfterSeconds(null);
    const analytics = { ...templateDetailAnalyticsBase(COMPONENT, templateSlug), request_type: requestType };
    const result = await submitSupportRequest({
      template_slug: templateSlug,
      request_type: requestType,
      buyer_name: buyerName.trim(),
      buyer_email: buyerEmail.trim(),
      message: message.trim(),
      website,
      idempotency_key: idempotencyKeyRef.current,
    });
    submittingRef.current = false;

    if (result.ok) {
      // Delivered: the next time the dialog opens it starts a new submission.
      sentRef.current = true;
      onDraftChange(null);
      setStatus('sent');
      trackMarketplaceEvent('Support Request Submitted', { ...analytics, request_id: result.requestId }, enableAnalytics);
      return;
    }
    setStatus('failed');
    setError(result.error);
    setInvalidFields(result.fields ?? []);
    setRetryAfterSeconds(result.retryAfterSeconds ?? null);
    trackMarketplaceEvent('Support Request Failed', { ...analytics, error: result.error }, enableAnalytics);
  };

  const invalid = (field: string) => invalidFields.includes(field);
  const recipient = creatorName || 'the creator';

  const content = (
    <div className="tmsupport-overlay" onClick={(event) => event.target === event.currentTarget && requestClose()}>
      <style dangerouslySetInnerHTML={{ __html: SUPPORT_STYLES }} />
      <div ref={dialogRef} className="tmsupport-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="tmsupport-header">
          <div>
            <h2 id={titleId} className="tmsupport-title">
              {status === 'sent' ? 'Request sent' : `Contact ${recipient}`}
            </h2>
            {templateName ? <p className="tmsupport-subtitle">About {templateName}</p> : null}
          </div>
          <button
            type="button"
            className="tmsupport-button tmsupport-close"
            onClick={requestClose}
            disabled={status === 'submitting'}
          >
            Close
          </button>
        </div>

        {status === 'sent' ? (
          <div className="tmsupport-form">
            <p className="tmsupport-subtitle" role="status">
              We sent your message to {recipient}. Their reply will come to {buyerEmail.trim()}.
            </p>
            <div className="tmsupport-actions">
              <button type="button" className="tmsupport-button tmsupport-button-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="tmsupport-form" onSubmit={handleSubmit} noValidate>
            {/* Fields stay fixed while a write is in flight so its idempotency key can't rotate. */}
            <fieldset className="tmsupport-fieldset" disabled={status === 'submitting'}>
            <div className="tmsupport-field">
              <label className="tmsupport-label" htmlFor={`${fieldId}-type`}>What do you need help with?</label>
              <select
                ref={firstFieldRef}
                id={`${fieldId}-type`}
                className="tmsupport-input"
                value={requestType}
                aria-invalid={invalid('request_type')}
                onChange={(event) => edited(setRequestType)(event.target.value as SupportRequestType)}
              >
                <option value="" disabled>Choose a topic</option>
                {SUPPORT_REQUEST_TYPES.map((type) => (
                  <option key={type} value={type}>{SUPPORT_REQUEST_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>
            <div className="tmsupport-field">
              <label className="tmsupport-label" htmlFor={`${fieldId}-name`}>Your name (optional)</label>
              <input
                id={`${fieldId}-name`}
                className="tmsupport-input"
                autoComplete="name"
                maxLength={120}
                value={buyerName}
                onChange={(event) => edited(setBuyerName)(event.target.value)}
              />
            </div>
            <div className="tmsupport-field">
              <label className="tmsupport-label" htmlFor={`${fieldId}-email`}>Your email</label>
              <input
                id={`${fieldId}-email`}
                className="tmsupport-input"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={buyerEmail}
                aria-invalid={invalid('buyer_email')}
                onChange={(event) => edited(setBuyerEmail)(event.target.value)}
              />
            </div>
            <div className="tmsupport-field">
              <label className="tmsupport-label" htmlFor={`${fieldId}-message`}>Message</label>
              <textarea
                id={`${fieldId}-message`}
                className="tmsupport-input"
                maxLength={4000}
                required
                value={message}
                aria-invalid={invalid('message')}
                onChange={(event) => edited(setMessage)(event.target.value)}
              />
            </div>
            <div className="tmsupport-honeypot" aria-hidden="true">
              <label htmlFor={`${fieldId}-website`}>Website</label>
              <input
                id={`${fieldId}-website`}
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </div>
            </fieldset>
            <p className="tmsupport-note">
              Webflow sends your message and email address to {recipient} so they can reply to you directly.
            </p>
            {error ? (
              <p className="tmsupport-error" role="alert">
                {error === 'rate_limited' && retryAfterSeconds
                  ? `You've sent several requests recently. ${describeRetryAfter(retryAfterSeconds)}`
                  : SUPPORT_REQUEST_ERROR_MESSAGES[error]}
              </p>
            ) : null}
            <div className="tmsupport-actions">
              <button type="button" className="tmsupport-button" onClick={requestClose} disabled={status === 'submitting'}>
                Cancel
              </button>
              <button type="submit" className="tmsupport-button tmsupport-button-primary" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return typeof document === 'undefined' ? content : createPortal(content, document.body);
};

const TemplateSupportRequestInner: React.FC<TemplateSupportRequestProps> = ({
  templateSlug = '',
  templateName = '',
  creatorName = '',
  buttonLabel = '',
  enableAnalytics = true,
}) => {
  useMarketplaceComponentErrorTracking(COMPONENT, enableAnalytics);
  const [open, setOpen] = useState(false);
  const slug = inferTemplateSlug(templateSlug);
  const draftRef = useRef<SupportRequestDraft | null>(null);
  const handleDraftChange = useCallback(
    (next: SupportRequestDraft | null) => {
      draftRef.current = next;
      if (slug) storeDraft(slug, next);
    },
    [slug],
  );
  const label = buttonLabel.trim() || (creatorName ? `Contact ${creatorName}` : 'Contact creator');

  const handleOpen = () => {
    setOpen(true);
    trackMarketplaceEvent('Support Request Opened', templateDetailAnalyticsBase(COMPONENT, slug), enableAnalytics);
  };

  return (
    <div className="wfdt">
      <style dangerouslySetInnerHTML={{ __html: TEMPLATE_DETAIL_STYLES }} />
      <button type="button" className="wfdt-button wfdt-button-secondary" onClick={handleOpen} disabled={!slug}>
        {label}
      </button>
      {open ? (
        <SupportRequestDialog
          templateSlug={slug}
          templateName={templateName}
          creatorName={creatorName}
          enableAnalytics={enableAnalytics}
          draft={draftRef.current ?? loadStoredDraft(slug) ?? emptyDraft()}
          onDraftChange={handleDraftChange}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
};

export const TemplateSupportRequest: React.FC<TemplateSupportRequestProps> = (props) => (
  <MarketplaceComponentErrorBoundary component={COMPONENT} enabled={props.enableAnalytics}>
    <TemplateSupportRequestInner {...props} />
  </MarketplaceComponentErrorBoundary>
);

export default TemplateSupportRequest;

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { applyHostInert } from './modalIsolation';
import { marketplacePrimaryLabel } from './templateDetailOffer';
import {
  PREVIEW_IFRAME_SANDBOX,
  safeMarketplaceUrl,
  safePreviewUrl,
} from './templateUrlSafety';

export type FeaturedTemplatePreviewDevice = 'desktop' | 'tablet' | 'mobile';

export interface FeaturedTemplatePreviewTerm {
  name: string;
  slug: string;
  url?: string;
}

export interface FeaturedTemplatePreviewItem {
  id: string;
  template_slug: string;
  name: string;
  url: string | null;
  website_url: string | null;
  purchase_url: string | null;
  creator_name: string | null;
  price: number | null;
  is_free: boolean;
  reviewer_pick_reason: string | null;
  description_short?: string | null;
  template_type?: string | null;
  category_groups?: FeaturedTemplatePreviewTerm[];
  child_categories?: FeaturedTemplatePreviewTerm[];
  styles?: FeaturedTemplatePreviewTerm[];
}

export interface FeaturedTemplatePreviewProps {
  item: FeaturedTemplatePreviewItem;
  index: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  loadingNext?: boolean;
  navigationError?: string | null;
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
  onPrimaryAction?: () => void;
  onOpenSite?: () => void;
}

export function shouldResetFeaturedPreviewLoad(previousItemId: string, nextItemId: string): boolean {
  return previousItemId !== nextItemId;
}

const FEATURED_TEMPLATE_PREVIEW_STYLES = `
.tmfeatured-preview,
.tmfeatured-preview * { box-sizing: border-box; }
.tmfeatured-preview {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  min-width: 0;
  min-height: 0;
  color: #080808;
  background: #f3f3f3;
  font-family: "WF Visual Sans Variable", "WF Visual Sans", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.tmfeatured-shell { display: flex; flex: 1; min-width: 0; min-height: 0; flex-direction: column; }
.tmfeatured-toolbar {
  display: flex;
  min-height: 64px;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  border-bottom: 1px solid #dedede;
  background: #fff;
}
.tmfeatured-button,
.tmfeatured-action,
.tmfeatured-device {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
  border: 1px solid #d8d8d8;
  border-radius: 4px;
  color: #080808;
  background: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
}
.tmfeatured-button:hover,
.tmfeatured-action:hover { border-color: #b8b8b8; background: #f7f7f7; }
.tmfeatured-device:hover { border-color: #b8b8b8; }
.tmfeatured-button:focus-visible,
.tmfeatured-action:focus-visible,
.tmfeatured-device:focus-visible { outline: 2px solid #146ef5; outline-offset: 2px; }
.tmfeatured-button:disabled { cursor: not-allowed; opacity: .42; }
.tmfeatured-close { flex: 0 0 auto; }
.tmfeatured-meta { min-width: 0; flex: 1; }
.tmfeatured-name { margin: 0; overflow: hidden; font-size: 15px; font-weight: 600; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.tmfeatured-byline { margin: 3px 0 0; color: #5f5f5f; font-size: 12px; line-height: 1.2; }
.tmfeatured-devices { display: flex; gap: 4px; padding: 3px; border-radius: 7px; background: #f2f2f2; }
.tmfeatured-device { min-width: 78px; min-height: 34px; border-color: transparent; background: transparent; }
.tmfeatured-device[aria-pressed="true"] { border-color: #d8d8d8; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.05); }
.tmfeatured-action[data-primary="true"] { border-color: #146ef5; color: #fff; background: #146ef5; }
.tmfeatured-action[data-primary="true"]:hover { background: #0f55d9; }
.tmfeatured-action-new-tab { font-size: 14px; line-height: 1; }
.tmfeatured-body { display: grid; flex: 1; min-width: 0; min-height: 0; grid-template-columns: minmax(0, 1fr) minmax(0, 360px); }
.tmfeatured-stage { display: flex; min-width: 0; min-height: 0; align-items: flex-start; justify-content: center; overflow: auto; padding: 24px; background: #e9e9e9; }
.tmfeatured-frame-wrap { position: relative; width: 100%; height: 100%; min-height: 360px; overflow: hidden; border: 1px solid #d3d3d3; border-radius: 8px; background: #fff; box-shadow: 0 14px 36px rgba(0,0,0,.12); transition: width 180ms ease, height 180ms ease, border-radius 180ms ease; }
.tmfeatured-stage[data-device="desktop"] .tmfeatured-frame-wrap { width: 100%; height: 100%; }
.tmfeatured-stage[data-device="tablet"] .tmfeatured-frame-wrap { width: min(768px, 100%); height: min(1024px, 100%); }
.tmfeatured-stage[data-device="mobile"] .tmfeatured-frame-wrap { width: min(390px, 100%); height: min(844px, 100%); border-radius: 18px; }
.tmfeatured-frame { display: block; width: 100%; height: 100%; min-height: 360px; border: 0; background: #fff; }
.tmfeatured-loading,
.tmfeatured-unavailable { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #5f5f5f; background: #fff; font-size: 14px; }
.tmfeatured-loading { pointer-events: none; transition: opacity 160ms ease; }
.tmfeatured-unavailable { flex-direction: column; gap: 12px; }
.tmfeatured-unavailable p { margin: 0; }
.tmfeatured-side { display: flex; min-height: 0; flex-direction: column; overflow: auto; padding: 24px 24px 0; border-left: 1px solid #dedede; background: #fff; }
.tmfeatured-kicker { margin: 0 0 8px; color: #757575; font-size: 12px; font-weight: 600; letter-spacing: 0; line-height: 1.25; text-transform: uppercase; }
.tmfeatured-title { margin: 0; font-size: 24px; font-weight: 600; line-height: 1.3; }
.tmfeatured-position { margin: 8px 0 0; color: #5f5f5f; font-size: 13px; }
.tmfeatured-feedback { margin-top: 24px; padding: 18px; border: 1px solid #dedede; border-radius: 8px; background: #f8f8f8; }
.tmfeatured-feedback-label { margin: 0 0 8px; color: #080808; font-size: 18px; font-weight: 600; letter-spacing: 0; line-height: 1.25; }
.tmfeatured-feedback-text { margin: 0; font-size: 14px; line-height: 1.5; }
.tmfeatured-details { margin-top: 24px; }
.tmfeatured-details-heading { margin: 0 0 8px; font-size: 18px; font-weight: 600; line-height: 1.25; }
.tmfeatured-details-summary { margin: 0 0 16px; color: #3b3b3b; font-size: 13px; line-height: 1.5; }
.tmfeatured-detail-list { display: grid; gap: 12px; margin: 0; }
.tmfeatured-detail-row { display: grid; gap: 5px; }
.tmfeatured-detail-row dt { color: #4a4a4a; font-size: 13px; font-weight: 600; line-height: 1.25; }
.tmfeatured-detail-row dd { display: flex; flex-wrap: wrap; gap: 5px; margin: 0; color: #080808; font-size: 13px; line-height: 1.4; }
.tmfeatured-detail-pill { min-height: 24px; padding: 2px 8px; border: 1px solid #e6e6e6; border-radius: 4px; background: #f7f7f7; font-size: 12px; font-weight: 600; line-height: 18px; }
.tmfeatured-nav-wrap { position: sticky; bottom: 0; margin-top: auto; padding: 16px 0 24px; background: #fff; box-shadow: 0 -8px 16px -8px rgba(8,8,8,.08); }
.tmfeatured-nav { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tmfeatured-nav .tmfeatured-button { width: 100%; }
.tmfeatured-nav-error { margin: 0 0 10px; color: #b42318; font-size: 13px; line-height: 1.4; }
@media (max-width: 991px) {
  .tmfeatured-toolbar { flex-wrap: wrap; }
  .tmfeatured-body { grid-template-columns: 1fr; overflow: auto; }
  .tmfeatured-stage { min-height: 62vh; }
  .tmfeatured-side { min-height: auto; overflow: visible; border-top: 1px solid #dedede; border-left: 0; }
}
@media (max-width: 767px) {
  .tmfeatured-toolbar { gap: 8px; padding: 9px; }
  .tmfeatured-devices { width: 100%; }
  .tmfeatured-device { flex: 1; padding: 0 8px; }
  .tmfeatured-action-open-site { display: none; }
  .tmfeatured-stage { min-height: 56vh; padding: 10px; }
  .tmfeatured-stage[data-device="tablet"] .tmfeatured-frame-wrap,
  .tmfeatured-stage[data-device="mobile"] .tmfeatured-frame-wrap { height: 56vh; }
}
@media (max-width: 478px) {
  .tmfeatured-toolbar { display: grid; grid-template-columns: auto minmax(0, 1fr); }
  .tmfeatured-meta { min-width: 0; }
  .tmfeatured-devices { grid-column: 1 / -1; }
  .tmfeatured-action-details { grid-column: 1; width: 100%; }
  .tmfeatured-action[data-primary="true"] { grid-column: 2; width: 100%; }
  .tmfeatured-side { padding-right: 16px; padding-left: 16px; }
  .tmfeatured-nav-wrap { padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
}
@media (prefers-reduced-motion: reduce) {
  .tmfeatured-frame-wrap { transition: none; }
}
`;

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled'));
}

function uniqueTermNames(groups: Array<FeaturedTemplatePreviewTerm[] | undefined>): string[] {
  const names = groups.flatMap((group) => group ?? []).map((term) => term.name.trim()).filter(Boolean);
  return Array.from(new Set(names));
}

export const FeaturedTemplatePreview: React.FC<FeaturedTemplatePreviewProps> = ({
  item,
  index,
  total,
  hasPrevious,
  hasNext,
  loadingNext = false,
  navigationError = null,
  onClose,
  onNavigate,
  onPrimaryAction,
  onOpenSite,
}) => {
  const [device, setDevice] = useState<FeaturedTemplatePreviewDevice>('desktop');
  const [loaded, setLoaded] = useState(false);
  const titleId = useId();
  const feedbackTitleId = useId();
  const detailsTitleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const loadedItemIdRef = useRef(item.id);
  const interactionRef = useRef({ hasPrevious, hasNext, onClose, onNavigate });
  interactionRef.current = { hasPrevious, hasNext, onClose, onNavigate };
  const previewUrl = safePreviewUrl(item.website_url);
  const detailUrl = safeMarketplaceUrl(item.url);
  const actionUrl = safeMarketplaceUrl(item.purchase_url) ?? safeMarketplaceUrl(item.url);
  const actionLabel = item.is_free || item.price === 0
    ? 'Use for free'
    : typeof item.price === 'number'
      ? marketplacePrimaryLabel(`$${item.price} USD`)
      : marketplacePrimaryLabel('');
  const reviewerFeedback = item.reviewer_pick_reason?.trim();
  const description = item.description_short?.trim();
  const templateType = item.template_type?.trim();
  const subcategories = uniqueTermNames([item.child_categories]);
  const styles = uniqueTermNames([item.styles]);
  const hasDetails = Boolean(description || templateType || subcategories.length || styles.length);

  useEffect(() => {
    const previousItemId = loadedItemIdRef.current;
    loadedItemIdRef.current = item.id;
    if (shouldResetFeaturedPreviewLoad(previousItemId, item.id)) setLoaded(false);
  }, [item.id]);

  const previewLoaded = loaded && loadedItemIdRef.current === item.id;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const restoreHost = applyHostInert(Array.from(document.body.children), dialogRef.current);
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      const interaction = interactionRef.current;
      if (event.key === 'Escape') {
        event.preventDefault();
        interaction.onClose();
        return;
      }
      if (event.key === 'ArrowLeft' && interaction.hasPrevious) {
        event.preventDefault();
        interaction.onNavigate(-1);
        return;
      }
      if (event.key === 'ArrowRight' && interaction.hasNext) {
        event.preventDefault();
        interaction.onNavigate(1);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusables = focusableElements(dialogRef.current);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restoreHost();
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, []);

  const content = (
    <div
      className="tmfeatured-preview"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: FEATURED_TEMPLATE_PREVIEW_STYLES }} />
      <section
        ref={dialogRef}
        className="tmfeatured-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="tmfeatured-toolbar">
          <button ref={closeRef} type="button" className="tmfeatured-button tmfeatured-close" onClick={onClose}>
            Close
          </button>
          <div className="tmfeatured-meta">
            <p className="tmfeatured-name">{item.name}</p>
            {item.creator_name ? <p className="tmfeatured-byline">by {item.creator_name}</p> : null}
          </div>
          <div className="tmfeatured-devices" role="group" aria-label="Preview device">
            {(['desktop', 'tablet', 'mobile'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className="tmfeatured-device"
                aria-pressed={device === option}
                onClick={() => setDevice(option)}
              >
                {option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
          {detailUrl ? (
            <a
              className="tmfeatured-action tmfeatured-action-details"
              href={detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${item.name} template details (opens in a new tab)`}
            >
              View details <span className="tmfeatured-action-new-tab" aria-hidden="true">↗</span>
            </a>
          ) : null}
          {previewUrl ? (
            <a
              className="tmfeatured-action tmfeatured-action-open-site"
              data-secondary="true"
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onOpenSite}
            >
              Open site
            </a>
          ) : null}
          {actionUrl ? (
            <a
              className="tmfeatured-action"
              data-primary="true"
              href={actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onPrimaryAction}
            >
              {actionLabel}
            </a>
          ) : null}
        </header>

        <div className="tmfeatured-body">
          <div className="tmfeatured-stage" data-device={device}>
            <div className="tmfeatured-frame-wrap" aria-busy={previewUrl ? !previewLoaded : undefined}>
              {previewUrl ? (
                <>
                  {!previewLoaded ? (
                    <div className="tmfeatured-loading" aria-live="polite">Loading live preview</div>
                  ) : null}
                  <iframe
                    className="tmfeatured-frame"
                    data-preview-device={device}
                    src={previewUrl}
                    sandbox={PREVIEW_IFRAME_SANDBOX}
                    referrerPolicy="no-referrer"
                    tabIndex={-1}
                    title={`${item.name} live template preview`}
                    loading="eager"
                    onLoad={() => setLoaded(true)}
                    style={{ opacity: previewLoaded ? 1 : 0 }}
                  />
                </>
              ) : (
                <div className="tmfeatured-unavailable">
                  <p>Live preview unavailable</p>
                  {detailUrl ? (
                    <a
                      className="tmfeatured-action"
                      href={detailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${item.name} template details (opens in a new tab)`}
                    >
                      View details <span className="tmfeatured-action-new-tab" aria-hidden="true">↗</span>
                    </a>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <aside className="tmfeatured-side">
            <p className="tmfeatured-kicker">Featured template</p>
            <h1 id={titleId} className="tmfeatured-title">{item.name}</h1>
            <p className="tmfeatured-position">{index + 1} of {total}</p>
            {reviewerFeedback ? (
              <section className="tmfeatured-feedback" aria-labelledby={feedbackTitleId}>
                <h2 id={feedbackTitleId} className="tmfeatured-feedback-label">Why our team featured it</h2>
                <p className="tmfeatured-feedback-text">{reviewerFeedback}</p>
              </section>
            ) : null}
            {hasDetails ? (
              <section className="tmfeatured-details" aria-labelledby={detailsTitleId}>
                <h2 id={detailsTitleId} className="tmfeatured-details-heading">Template details</h2>
                {description ? <p className="tmfeatured-details-summary">{description}</p> : null}
                <dl className="tmfeatured-detail-list">
                  {templateType ? (
                    <div className="tmfeatured-detail-row">
                      <dt>Type</dt>
                      <dd>{templateType}</dd>
                    </div>
                  ) : null}
                  {subcategories.length ? (
                    <div className="tmfeatured-detail-row">
                      <dt>Subcategories</dt>
                      <dd>{subcategories.map((name) => <span key={name} className="tmfeatured-detail-pill">{name}</span>)}</dd>
                    </div>
                  ) : null}
                  {styles.length ? (
                    <div className="tmfeatured-detail-row">
                      <dt>Styles</dt>
                      <dd>{styles.map((name) => <span key={name} className="tmfeatured-detail-pill">{name}</span>)}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}
            <div className="tmfeatured-nav-wrap">
              {navigationError ? (
                <p className="tmfeatured-nav-error" role="alert">{navigationError}</p>
              ) : null}
              <nav className="tmfeatured-nav" aria-label="Featured template navigation">
                <button
                  type="button"
                  className="tmfeatured-button"
                  disabled={!hasPrevious}
                  onClick={() => onNavigate(-1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="tmfeatured-button"
                  disabled={!hasNext || loadingNext}
                  onClick={() => onNavigate(1)}
                >
                  {loadingNext ? 'Loading…' : navigationError ? 'Try again' : 'Next'}
                </button>
              </nav>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );

  return typeof document === 'undefined' ? content : createPortal(content, document.body);
};

export default FeaturedTemplatePreview;

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type FeaturedTemplatePreviewDevice = 'desktop' | 'tablet' | 'mobile';

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
}

export interface FeaturedTemplatePreviewProps {
  item: FeaturedTemplatePreviewItem;
  index: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  loadingNext?: boolean;
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
  font-family: "WF Visual Sans Variable", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
  border-radius: 6px;
  color: #080808;
  background: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 560;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
}
.tmfeatured-button:hover,
.tmfeatured-action:hover,
.tmfeatured-device:hover { border-color: #989898; }
.tmfeatured-button:focus-visible,
.tmfeatured-action:focus-visible,
.tmfeatured-device:focus-visible { outline: 2px solid #146ef5; outline-offset: 2px; }
.tmfeatured-button:disabled { cursor: not-allowed; opacity: .42; }
.tmfeatured-close { flex: 0 0 auto; }
.tmfeatured-meta { min-width: 0; flex: 1; }
.tmfeatured-name { margin: 0; overflow: hidden; font-size: 15px; font-weight: 650; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.tmfeatured-byline { margin: 3px 0 0; color: #666; font-size: 12px; line-height: 1.2; }
.tmfeatured-devices { display: flex; gap: 4px; padding: 3px; border-radius: 7px; background: #f2f2f2; }
.tmfeatured-device { min-height: 34px; border-color: transparent; background: transparent; }
.tmfeatured-device[aria-pressed="true"] { border-color: #d8d8d8; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.05); }
.tmfeatured-action[data-primary="true"] { border-color: #146ef5; color: #fff; background: #146ef5; }
.tmfeatured-action[data-primary="true"]:hover { background: #0f55d9; }
.tmfeatured-body { display: grid; flex: 1; min-width: 0; min-height: 0; grid-template-columns: minmax(0, 1fr) 320px; }
.tmfeatured-stage { display: flex; min-width: 0; min-height: 0; align-items: flex-start; justify-content: center; overflow: auto; padding: 24px; background: #e9e9e9; }
.tmfeatured-frame-wrap { position: relative; width: 100%; height: 100%; min-height: 360px; overflow: hidden; border: 1px solid #d3d3d3; border-radius: 8px; background: #fff; box-shadow: 0 14px 36px rgba(0,0,0,.12); transition: width 180ms ease, height 180ms ease, border-radius 180ms ease; }
.tmfeatured-stage[data-device="desktop"] .tmfeatured-frame-wrap { width: 100%; height: 100%; }
.tmfeatured-stage[data-device="tablet"] .tmfeatured-frame-wrap { width: min(768px, 100%); height: min(1024px, 100%); }
.tmfeatured-stage[data-device="mobile"] .tmfeatured-frame-wrap { width: min(390px, 100%); height: min(844px, 100%); border-radius: 18px; }
.tmfeatured-frame { display: block; width: 100%; height: 100%; min-height: 360px; border: 0; background: #fff; }
.tmfeatured-loading,
.tmfeatured-unavailable { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #666; background: #fff; font-size: 14px; }
.tmfeatured-loading { pointer-events: none; transition: opacity 160ms ease; }
.tmfeatured-side { display: flex; min-height: 0; flex-direction: column; overflow: auto; padding: 22px; border-left: 1px solid #dedede; background: #fff; }
.tmfeatured-kicker { margin: 0 0 6px; color: #146ef5; font-size: 11px; font-weight: 680; letter-spacing: .06em; line-height: 1.2; text-transform: uppercase; }
.tmfeatured-title { margin: 0; font-size: 24px; font-weight: 650; line-height: 1.1; }
.tmfeatured-position { margin: 8px 0 0; color: #666; font-size: 13px; }
.tmfeatured-feedback { margin-top: 22px; padding: 15px; border: 1px solid #ddd; border-radius: 7px; background: #f8f8f8; }
.tmfeatured-feedback-label { margin: 0 0 7px; color: #555; font-size: 11px; font-weight: 680; letter-spacing: .04em; line-height: 1.2; text-transform: uppercase; }
.tmfeatured-feedback-text { margin: 0; font-size: 14px; line-height: 1.5; }
.tmfeatured-nav { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: auto; padding-top: 22px; }
.tmfeatured-nav .tmfeatured-button { width: 100%; }
@media (max-width: 900px) {
  .tmfeatured-toolbar { flex-wrap: wrap; }
  .tmfeatured-meta { order: -1; flex-basis: calc(100% - 60px); }
  .tmfeatured-body { grid-template-columns: 1fr; overflow: auto; }
  .tmfeatured-stage { min-height: 62vh; }
  .tmfeatured-side { min-height: auto; border-top: 1px solid #dedede; border-left: 0; }
}
@media (max-width: 620px) {
  .tmfeatured-toolbar { gap: 8px; padding: 9px; }
  .tmfeatured-devices { order: 3; width: 100%; }
  .tmfeatured-device { flex: 1; padding: 0 8px; }
  .tmfeatured-action[data-secondary="true"] { display: none; }
  .tmfeatured-stage { min-height: 56vh; padding: 10px; }
  .tmfeatured-stage[data-device="tablet"] .tmfeatured-frame-wrap,
  .tmfeatured-stage[data-device="mobile"] .tmfeatured-frame-wrap { height: 56vh; }
}
@media (prefers-reduced-motion: reduce) {
  .tmfeatured-frame-wrap { transition: none; }
}
`;

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled'));
}

export const FeaturedTemplatePreview: React.FC<FeaturedTemplatePreviewProps> = ({
  item,
  index,
  total,
  hasPrevious,
  hasNext,
  loadingNext = false,
  onClose,
  onNavigate,
  onPrimaryAction,
  onOpenSite,
}) => {
  const [device, setDevice] = useState<FeaturedTemplatePreviewDevice>('desktop');
  const [loaded, setLoaded] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const loadedItemIdRef = useRef(item.id);
  const interactionRef = useRef({ hasPrevious, hasNext, onClose, onNavigate });
  interactionRef.current = { hasPrevious, hasNext, onClose, onNavigate };
  const actionUrl = item.purchase_url || item.url;
  const actionLabel = item.is_free || item.price === 0
    ? 'Use for free'
    : typeof item.price === 'number'
      ? `Buy — $${item.price}`
      : 'View template';
  const reviewerFeedback = item.reviewer_pick_reason?.trim();

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
          {item.website_url ? (
            <a
              className="tmfeatured-action"
              data-secondary="true"
              href={item.website_url}
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
            <div className="tmfeatured-frame-wrap">
              {item.website_url ? (
                <>
                  <div className="tmfeatured-loading" aria-live="polite" style={{ opacity: previewLoaded ? 0 : 1 }}>
                    Loading live preview
                  </div>
                  <iframe
                    className="tmfeatured-frame"
                    data-preview-device={device}
                    src={item.website_url}
                    title={`${item.name} live template preview`}
                    loading="eager"
                    onLoad={() => setLoaded(true)}
                    style={{ opacity: previewLoaded ? 1 : 0 }}
                  />
                </>
              ) : (
                <div className="tmfeatured-unavailable">Live preview unavailable</div>
              )}
            </div>
          </div>

          <aside className="tmfeatured-side">
            <p className="tmfeatured-kicker">Featured template</p>
            <h2 id={titleId} className="tmfeatured-title">{item.name}</h2>
            <p className="tmfeatured-position">{index + 1} of {total}</p>
            {reviewerFeedback ? (
              <section className="tmfeatured-feedback" aria-label={`${item.name} Featured template feedback`}>
                <p className="tmfeatured-feedback-label">Featured template feedback</p>
                <p className="tmfeatured-feedback-text">{reviewerFeedback}</p>
              </section>
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
                {loadingNext ? 'Loading…' : 'Next'}
              </button>
            </nav>
          </aside>
        </div>
      </section>
    </div>
  );

  return typeof document === 'undefined' ? content : createPortal(content, document.body);
};

export default FeaturedTemplatePreview;

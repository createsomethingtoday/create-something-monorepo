import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { UiIcon } from '../primitives/UiIcon';
import { prefersReducedMotion } from './templateChatRuntime';
import {
  PREVIEW_IFRAME_SANDBOX,
  safeMarketplaceUrl,
  safePreviewUrl,
} from './templateChatSafety';
import type { ChatTrack } from './templateChatAnalytics';
import type { AgentTemplateItem } from './templateChatProtocol';
import {
  DEFAULT_TEMPLATE_CHAT_STRINGS,
  formatTemplatePrice,
  type TemplateChatStrings,
} from './templateChatStrings';

/**
 * The framed document is a creator-authored site running its own scripts inside
 * a webflow.com page. Deny everything it does not need to render:
 * `allow-top-navigation` is deliberately absent, so a template cannot navigate
 * the marketplace away from itself, and `allow-same-origin` is absent so it
 * gets an opaque origin with no access to marketplace storage.
 */
// Live preview of the template's published .webflow.io site. The published
// sites ship `frame-ancestors … *.webflow.com`, so embedding here is
// explicitly sanctioned. The mobile toggle narrows the iframe viewport, which
// drives the site's own responsive breakpoints — a real mobile render, not a
// scaled screenshot.
export function TemplatePreviewPane({
  item,
  onClose,
  onEvent,
  strings = DEFAULT_TEMPLATE_CHAT_STRINGS,
  locale,
  currency,
}: {
  item: AgentTemplateItem;
  onClose: () => void;
  onEvent?: ChatTrack;
  strings?: TemplateChatStrings;
  locale?: string;
  currency?: string;
}): React.ReactElement {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loaded, setLoaded] = useState(false);
  const [closing, setClosing] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);
  const headingId = `tmchat-preview-title-${useId().replace(/:/g, '')}`;
  const stageRef = useRef<HTMLDivElement>(null);
  // Validated locally as well as server-side: an index row cannot put an
  // arbitrary origin into the frame or the toolbar links.
  const previewUrl = safePreviewUrl(item.website_url);
  const ctaUrl = safeMarketplaceUrl(item.purchase_url) ?? safeMarketplaceUrl(item.url);

  useEffect(() => {
    backRef.current?.focus();
  }, []);

  // Exit gracefully: play the out animation, then unmount via onClose.
  const requestClose = useCallback(() => {
    if (closing) return;
    if (prefersReducedMotion()) {
      onClose();
      return;
    }
    setClosing(true);
  }, [closing, onClose]);

  // The desktop <-> mobile width change can't interpolate (% <-> px snaps, and
  // live-resizing an iframe reflows the embedded site every frame). Snap the
  // layout, then settle the new frame in with a compositor-only fade so the
  // change reads as intentional.
  const switchDevice = (next: 'desktop' | 'tablet' | 'mobile') => {
    if (next === device) return;
    setDevice(next);
    onEvent?.('live_preview_device_changed', { template_slug: item.template_slug, device: next });
    if (prefersReducedMotion()) return;
    requestAnimationFrame(() => {
      stageRef.current?.animate?.(
        [
          { opacity: 0.25, transform: 'scale(0.992)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 240, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
      );
    });
  };

  return (
    <div
      className={`tmchat-preview${closing ? ' closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onAnimationEnd={(event) => {
        if (event.animationName === 'tmchat-preview-out') onClose();
      }}
    >
      <div className="tmchat-preview-bar">
        <button ref={backRef} type="button" className="tmchat-preview-back" onClick={requestClose}>
          <UiIcon name="arrow-left" size={14} /> {strings.backToChat}
        </button>
        <span className="tmchat-preview-sep" aria-hidden="true" />
        <div className="tmchat-preview-meta">
          <span className="tmchat-preview-name" id={headingId}>{item.name}</span>
          {item.creator_name ? <span className="tmchat-preview-creator">by {item.creator_name}</span> : null}
        </div>
        <div className="tmchat-devicetoggle" role="group" aria-label={strings.previewDevice}>
          <button
            type="button"
            className={`tmchat-devicebtn${device === 'desktop' ? ' active' : ''}`}
            aria-pressed={device === 'desktop'}
            onClick={() => switchDevice('desktop')}
          >
            <UiIcon name="monitor" size={14} /> {strings.deviceDesktop}
          </button>
          <button
            type="button"
            className={`tmchat-devicebtn${device === 'tablet' ? ' active' : ''}`}
            aria-pressed={device === 'tablet'}
            onClick={() => switchDevice('tablet')}
          >
            <UiIcon name="tablet" size={14} /> {strings.deviceTablet}
          </button>
          <button
            type="button"
            className={`tmchat-devicebtn${device === 'mobile' ? ' active' : ''}`}
            aria-pressed={device === 'mobile'}
            onClick={() => switchDevice('mobile')}
          >
            <UiIcon name="smartphone" size={14} /> {strings.deviceMobile}
          </button>
        </div>
        {previewUrl ? (
          <a
            className="tmchat-preview-open"
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onEvent?.('live_preview_site_opened', { template_slug: item.template_slug })}
          >
            {strings.openSite} <UiIcon name="external-link" size={12} />
          </a>
        ) : null}
        {ctaUrl ? (
          <a
            className="tmchat-preview-cta"
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              onEvent?.('live_preview_cta_clicked', {
                template_slug: item.template_slug,
                is_free: item.is_free,
                price: item.price,
              })
            }
          >
            {item.is_free || item.price === 0
              ? strings.useForFree
              : typeof item.price === 'number'
                ? strings.buyFor(formatTemplatePrice(item.price, locale, currency))
                : strings.viewTemplate}
          </a>
        ) : null}
      </div>
      <div ref={stageRef} className={`tmchat-preview-stage ${device}`}>
        {!loaded ? (
          <div className="tmchat-preview-loading" aria-live="polite">
            {strings.loadingPreview}
            <span className="tmchat-dots">
              <span />
              <span />
              <span />
            </span>
          </div>
        ) : null}
        <iframe
          className="tmchat-preview-frame"
          src={previewUrl ?? undefined}
          sandbox={PREVIEW_IFRAME_SANDBOX}
          referrerPolicy="no-referrer"
          title={strings.previewOf(item.name)}
          loading="eager"
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 240ms ease' }}
        />
      </div>
    </div>
  );
}

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { trackMarketplaceEvent } from './analytics';

export interface TemplateCampaignLaneProps {
  enableAnalytics?: boolean;
  setupHref?: string;
}

const CAMPAIGN_ID = 'webflow-mcp-2';
const VIDEO_ID = '04xmzvomt2I';
const DEFAULT_SETUP_HREF = 'https://developers.webflow.com/mcp/reference/getting-started';
const VIDEO_THUMBNAIL_URL = `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`;
const VIDEO_EMBED_URL = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&cc_load_policy=1`;

export function templateCampaignEventData(scope: string): Record<string, string> {
  return {
    component: 'TemplateCampaignLane',
    scope,
    campaign_id: CAMPAIGN_ID,
    placement: 'template_grid',
    video_id: VIDEO_ID,
  };
}

const trackedCampaignImpressions = new Set<string>();

function trackCampaignEvent(scope: string, enabled: boolean): void {
  trackMarketplaceEvent('Code Component Event', templateCampaignEventData(scope), enabled);
}

const TEMPLATE_CAMPAIGN_STYLES = `
.tmcampaign-lane,
.tmcampaign-lane * { box-sizing: border-box; }
.tmcampaign-lane {
  flex: 0 0 100% !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  color: #fff;
  font-family: "WF Visual Sans Variable", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.tmcampaign-surface {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 300px;
  overflow: hidden;
  grid-template-columns: minmax(0, 1fr) minmax(360px, .92fr);
  gap: 38px;
  align-items: center;
  padding: 38px;
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 12px;
  background:
    radial-gradient(circle at 78% 70%, rgba(20,110,245,.34), transparent 34%),
    linear-gradient(135deg, #161616 0%, #050505 70%);
  box-shadow: 0 18px 44px rgba(0,0,0,.14);
}
.tmcampaign-copy { position: relative; z-index: 1; max-width: 650px; }
.tmcampaign-kicker {
  margin: 0 0 13px;
  color: #8db9ff;
  font-size: 12px;
  font-weight: 680;
  letter-spacing: .08em;
  line-height: 1.2;
  text-transform: uppercase;
}
.tmcampaign-title {
  max-width: 620px;
  margin: 0;
  color: #fff;
  font-size: clamp(30px, 3.4vw, 52px);
  font-weight: 580;
  letter-spacing: -.035em;
  line-height: .98;
}
.tmcampaign-description {
  max-width: 610px;
  margin: 19px 0 0;
  color: rgba(255,255,255,.74);
  font-size: 16px;
  line-height: 1.55;
}
.tmcampaign-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 25px; }
.tmcampaign-action {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 17px;
  border: 1px solid rgba(255,255,255,.28);
  border-radius: 6px;
  color: #fff;
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 620;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
}
.tmcampaign-action[data-primary="true"] { border-color: #146ef5; background: #146ef5; }
.tmcampaign-action:hover { border-color: #fff; transform: translateY(-1px); }
.tmcampaign-action[data-primary="true"]:hover { border-color: #3b86f7; background: #3b86f7; }
.tmcampaign-action:focus-visible,
.tmcampaign-media:focus-visible { outline: 3px solid #8db9ff; outline-offset: 3px; }
.tmcampaign-media {
  position: relative;
  display: block;
  width: 100%;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  padding: 0;
  border: 1px solid rgba(255,255,255,.24);
  border-radius: 9px;
  background: #000;
  box-shadow: 0 22px 54px rgba(0,0,0,.42);
  cursor: pointer;
}
.tmcampaign-thumbnail { display: block; width: 100%; height: 100%; object-fit: cover; }
.tmcampaign-media::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 55%, rgba(0,0,0,.38));
  content: "";
}
.tmcampaign-play {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 50%;
  display: grid;
  width: 62px;
  height: 62px;
  place-items: center;
  border: 1px solid rgba(255,255,255,.78);
  border-radius: 50%;
  color: #080808;
  background: rgba(255,255,255,.94);
  box-shadow: 0 12px 28px rgba(0,0,0,.3);
  font-size: 20px;
  transform: translate(-50%, -50%);
}
.tmcampaign-duration {
  position: absolute;
  z-index: 1;
  right: 10px;
  bottom: 9px;
  padding: 4px 6px;
  border-radius: 4px;
  color: #fff;
  background: rgba(0,0,0,.78);
  font-size: 11px;
  font-weight: 650;
  line-height: 1;
}
.tmcampaign-modal-backdrop,
.tmcampaign-modal-backdrop * { box-sizing: border-box; }
.tmcampaign-modal-backdrop {
  position: fixed;
  z-index: 2147483001;
  inset: 0;
  display: grid;
  overflow: auto;
  place-items: center;
  padding: 28px;
  color: #fff;
  background: rgba(0,0,0,.86);
  font-family: "WF Visual Sans Variable", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  backdrop-filter: blur(8px);
}
.tmcampaign-modal {
  width: min(1120px, 100%);
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 12px;
  background: #0a0a0a;
  box-shadow: 0 28px 90px rgba(0,0,0,.6);
}
.tmcampaign-modal-header {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 10px 12px 10px 20px;
  border-bottom: 1px solid rgba(255,255,255,.13);
}
.tmcampaign-modal-heading { min-width: 0; margin: 0; overflow: hidden; font-size: 15px; font-weight: 620; text-overflow: ellipsis; white-space: nowrap; }
.tmcampaign-modal-close {
  display: inline-grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(255,255,255,.24);
  border-radius: 6px;
  color: #fff;
  background: transparent;
  font: inherit;
  font-size: 20px;
  cursor: pointer;
}
.tmcampaign-modal-close:hover { border-color: #fff; background: rgba(255,255,255,.08); }
.tmcampaign-modal-close:focus-visible,
.tmcampaign-modal-setup:focus-visible { outline: 3px solid #8db9ff; outline-offset: 3px; }
.tmcampaign-video-wrap { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; }
.tmcampaign-video { display: block; width: 100%; height: 100%; border: 0; }
.tmcampaign-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 20px;
  border-top: 1px solid rgba(255,255,255,.13);
}
.tmcampaign-modal-copy { margin: 0; color: rgba(255,255,255,.72); font-size: 14px; line-height: 1.45; }
.tmcampaign-modal-setup {
  display: inline-flex;
  min-height: 42px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding: 0 15px;
  border: 1px solid #146ef5;
  border-radius: 6px;
  color: #fff;
  background: #146ef5;
  font-size: 13px;
  font-weight: 620;
  text-decoration: none;
}
.tmcampaign-modal-setup:hover { background: #3b86f7; }
@media (max-width: 900px) {
  .tmcampaign-surface { grid-template-columns: 1fr; gap: 28px; padding: 30px; }
  .tmcampaign-media { max-width: 720px; }
}
@media (max-width: 479px) {
  .tmcampaign-surface { gap: 22px; min-height: 0; padding: 22px; border-radius: 9px; }
  .tmcampaign-title { font-size: 32px; }
  .tmcampaign-description { font-size: 15px; }
  .tmcampaign-actions { display: grid; grid-template-columns: 1fr; }
  .tmcampaign-action { width: 100%; }
  .tmcampaign-play { width: 54px; height: 54px; }
  .tmcampaign-modal-backdrop { align-items: start; padding: 12px; }
  .tmcampaign-modal { margin-top: 5vh; border-radius: 9px; }
  .tmcampaign-modal-header { min-height: 52px; padding-left: 14px; }
  .tmcampaign-modal-footer { align-items: stretch; flex-direction: column; gap: 14px; padding: 16px; }
  .tmcampaign-modal-setup { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .tmcampaign-action { transition: none; }
}
`;

export interface TemplateCampaignVideoModalProps {
  onClose: () => void;
  onSetupClick?: () => void;
  setupHref?: string;
}

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled'));
}

export const TemplateCampaignVideoModal: React.FC<TemplateCampaignVideoModalProps> = ({
  onClose,
  onSetupClick,
  setupHref = DEFAULT_SETUP_HREF,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

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
      className="tmcampaign-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: TEMPLATE_CAMPAIGN_STYLES }} />
      <section
        ref={dialogRef}
        className="tmcampaign-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="tmcampaign-modal-header">
          <h2 id={titleId} className="tmcampaign-modal-heading">
            Introducing MCP 2.0 — Everything Your AI Agents Need to Build in Webflow
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="tmcampaign-modal-close"
            aria-label="Close video"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="tmcampaign-video-wrap">
          <iframe
            className="tmcampaign-video"
            src={VIDEO_EMBED_URL}
            title="Introducing Webflow MCP 2.0"
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <footer className="tmcampaign-modal-footer">
          <p id={descriptionId} className="tmcampaign-modal-copy">
            Start with a Webflow template, then customize the resulting site with your AI agent and MCP 2.0.
          </p>
          <a
            className="tmcampaign-modal-setup"
            href={setupHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onSetupClick}
          >
            Get started with MCP
          </a>
        </footer>
      </section>
    </div>
  );

  return typeof document === 'undefined' ? content : createPortal(content, document.body);
};

export const TemplateCampaignLane: React.FC<TemplateCampaignLaneProps> = ({
  enableAnalytics = true,
  setupHref = DEFAULT_SETUP_HREF,
}) => {
  const titleId = useId();
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    if (!enableAnalytics || trackedCampaignImpressions.has(CAMPAIGN_ID)) return;
    trackedCampaignImpressions.add(CAMPAIGN_ID);
    trackCampaignEvent('campaign_impression', true);
  }, [enableAnalytics]);

  const openVideo = () => {
    setVideoOpen(true);
    trackCampaignEvent('campaign_video_opened', enableAnalytics);
  };

  const closeVideo = () => {
    setVideoOpen(false);
    trackCampaignEvent('campaign_video_closed', enableAnalytics);
  };

  const trackSetupClick = () => {
    trackCampaignEvent('campaign_mcp_setup_clicked', enableAnalytics);
  };

  return (
    <>
      <section className="tmcampaign-lane" data-campaign-id={CAMPAIGN_ID} aria-labelledby={titleId}>
        <style dangerouslySetInnerHTML={{ __html: TEMPLATE_CAMPAIGN_STYLES }} />
        <div className="tmcampaign-surface">
          <div className="tmcampaign-copy">
            <p className="tmcampaign-kicker">New · Webflow MCP 2.0</p>
            <h2 id={titleId} className="tmcampaign-title">Start with a template. Make it yours with an AI agent.</h2>
            <p className="tmcampaign-description">
              Choose and install a Webflow template, then use MCP 2.0 to customize its components, styles,
              CMS content, and pages with your AI agent.
            </p>
            <div className="tmcampaign-actions">
              <button
                type="button"
                className="tmcampaign-action"
                data-primary="true"
                aria-haspopup="dialog"
                aria-expanded={videoOpen}
                onClick={openVideo}
              >
                <span aria-hidden="true">▶</span>
                Watch MCP 2.0
              </button>
              <a
                className="tmcampaign-action"
                href={setupHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackSetupClick}
              >
                Get started with MCP
              </a>
            </div>
          </div>

          <button
            type="button"
            className="tmcampaign-media"
            aria-label="Watch Webflow MCP 2.0 video"
            aria-haspopup="dialog"
            aria-expanded={videoOpen}
            onClick={openVideo}
          >
            <img
              className="tmcampaign-thumbnail"
              src={VIDEO_THUMBNAIL_URL}
              alt="Webflow MCP 2.0 video title card"
              loading="lazy"
            />
            <span className="tmcampaign-play" aria-hidden="true">▶</span>
            <span className="tmcampaign-duration" aria-hidden="true">5:28</span>
          </button>
        </div>
      </section>
      {videoOpen ? (
        <TemplateCampaignVideoModal
          onClose={closeVideo}
          setupHref={setupHref}
          onSetupClick={trackSetupClick}
        />
      ) : null}
    </>
  );
};

export default TemplateCampaignLane;

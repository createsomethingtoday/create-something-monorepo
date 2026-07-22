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
const VIDEO_SOURCE_URL = 'https://pub-fb87e05654104f5fbb33989fc4dca65b.r2.dev/webflow/mcp-2/introducing-mcp-2-0-1080p.mp4';

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
  container: tmcampaign / inline-size;
  container-type: inline-size;
  font-family: "WF Visual Sans Variable", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.tmcampaign-surface {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 300px;
  overflow: hidden;
  grid-template-columns: minmax(0, 1.08fr) minmax(340px, .92fr);
  gap: 34px;
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
  font-size: clamp(38px, 4.3cqi, 52px);
  font-weight: 580;
  letter-spacing: -.035em;
  line-height: 1;
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
  color: #fff;
  background:
    radial-gradient(circle at 82% 18%, rgba(20,110,245,.64), transparent 24%),
    radial-gradient(circle at 20% 88%, rgba(111,76,255,.34), transparent 30%),
    linear-gradient(145deg, #181818 0%, #050505 72%);
  box-shadow: 0 22px 54px rgba(0,0,0,.42);
  cursor: pointer;
  text-decoration: none;
}
.tmcampaign-media::before {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.055) 1px, transparent 1px);
  background-size: 32px 32px;
  content: "";
  mask-image: linear-gradient(135deg, rgba(0,0,0,.9), transparent 82%);
}
.tmcampaign-media::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 48%, rgba(0,0,0,.3));
  content: "";
}
.tmcampaign-media-art {
  position: absolute;
  z-index: 1;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 22px;
}
.tmcampaign-media-status,
.tmcampaign-media-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(255,255,255,.68);
  font-size: 11px;
  font-weight: 620;
  letter-spacing: .035em;
  line-height: 1.2;
  text-transform: uppercase;
}
.tmcampaign-media-status > span:first-child { display: inline-flex; align-items: center; gap: 7px; }
.tmcampaign-media-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #38d996;
  box-shadow: 0 0 0 4px rgba(56,217,150,.12);
}
.tmcampaign-media-prompt {
  width: min(76%, 300px);
  margin: 0;
  padding: 14px 15px;
  border: 1px solid rgba(255,255,255,.17);
  border-radius: 8px;
  color: rgba(255,255,255,.9);
  background: rgba(8,8,8,.7);
  box-shadow: 0 14px 32px rgba(0,0,0,.25);
  font-size: 14px;
  line-height: 1.38;
  backdrop-filter: blur(8px);
}
.tmcampaign-media-footer { padding-right: 72px; color: rgba(255,255,255,.5); }
.tmcampaign-play {
  position: absolute;
  z-index: 1;
  right: 22px;
  bottom: 18px;
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
  transition: transform 160ms ease, background 160ms ease;
}
.tmcampaign-media:hover .tmcampaign-play { background: #fff; transform: scale(1.05); }
.tmcampaign-duration {
  position: absolute;
  z-index: 1;
  top: 17px;
  right: 17px;
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
  width: min(1040px, 100%);
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
.tmcampaign-video-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
}
.tmcampaign-video { display: block; width: 100%; height: 100%; border: 0; background: #000; object-fit: contain; }
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
@container tmcampaign (max-width: 1160px) {
  .tmcampaign-surface { min-height: 292px; grid-template-columns: minmax(0, 1.08fr) minmax(330px, .92fr); gap: 28px; padding: 32px; }
  .tmcampaign-title { max-width: 560px; font-size: clamp(38px, 4.25cqi, 46px); }
  .tmcampaign-description { margin-top: 16px; font-size: 15px; }
  .tmcampaign-actions { margin-top: 21px; }
}
@container tmcampaign (max-width: 820px) {
  .tmcampaign-surface { grid-template-columns: 1fr; gap: 28px; padding: 30px; }
  .tmcampaign-copy { max-width: 620px; }
  .tmcampaign-title { max-width: 620px; font-size: clamp(36px, 7cqi, 48px); }
  .tmcampaign-media { max-width: 720px; }
}
@container tmcampaign (max-width: 520px) {
  .tmcampaign-surface { gap: 22px; min-height: 0; padding: 22px; border-radius: 9px; }
  .tmcampaign-title { font-size: 32px; }
  .tmcampaign-description { font-size: 15px; }
  .tmcampaign-actions { display: grid; grid-template-columns: 1fr; }
  .tmcampaign-action { width: 100%; }
  .tmcampaign-media-art { padding: 16px; }
  .tmcampaign-media-prompt { width: 78%; padding: 11px 12px; font-size: 12px; }
  .tmcampaign-play { right: 15px; bottom: 14px; width: 52px; height: 52px; }
  .tmcampaign-duration { top: 12px; right: 12px; }
}
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
  .tmcampaign-play { width: 52px; height: 52px; }
  .tmcampaign-modal-backdrop { align-items: start; padding: 12px; }
  .tmcampaign-modal { margin-top: 5vh; border-radius: 9px; }
  .tmcampaign-modal-header { min-height: 52px; padding-left: 14px; }
  .tmcampaign-modal-footer { align-items: stretch; flex-direction: column; gap: 14px; padding: 16px; }
  .tmcampaign-modal-setup { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .tmcampaign-action,
  .tmcampaign-play { transition: none; }
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
          <video
            className="tmcampaign-video"
            src={VIDEO_SOURCE_URL}
            controls
            autoPlay
            playsInline
            preload="metadata"
          >
            Your browser does not support the video element.
          </video>
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
            data-video-destination="cloudflare"
            onClick={openVideo}
          >
            <span className="tmcampaign-media-art" aria-hidden="true">
              <span className="tmcampaign-media-status">
                <span><span className="tmcampaign-media-dot" /> Agent connected</span>
              </span>
              <span className="tmcampaign-media-prompt">“Use this template to build our next launch page.”</span>
              <span className="tmcampaign-media-footer"><span>Webflow MCP 2.0</span><span>Ready</span></span>
            </span>
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

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { TemplateCard, TEMPLATE_CARD_STYLES } from '../cards/TemplateCard';
import { UiIcon } from '../primitives/UiIcon';
import { trackMarketplaceEvent, type MarketplaceAnalyticsData } from '../marketplace/analytics';
import { useMarketplaceComponentErrorTracking } from '../marketplace/MarketplaceComponentErrorBoundary';
import {
  getSafeAnalyticsOverrides,
  writeTemplateAttribution,
  MARKETPLACE_SIGNAL_WINDOW,
  type TemplateMarketplaceAttribution,
} from '../marketplace/templateAttribution';
import {
  fetchAuthorizedAgentRequest,
  MAX_REQUEST_MESSAGE_CHARS,
  prepareAgentMessages,
  requestTemplateAgentSession,
} from './templateAgentSession';
import { completeTurnstileChallenge, type TurnstileApi } from './turnstileChallenge';
import {
  createHighlightMissState,
  createTextDeltaBatcher,
  discoverOpenRoots,
  getHostOverlayBottomInset,
  isHostOverlayBlocking,
  queryDiscoveredRoots,
  type TextDeltaBatcher,
} from './templateChatRuntime';

// ── Agent protocol (mirrors webflow-template-agent) ───────────────────────────

type DisplayLayout = 'gallery' | 'carousel' | 'spotlight' | 'comparison' | 'shortlist';

interface AgentTemplateItem {
  template_slug: string;
  name: string;
  url: string | null;
  /** Published .webflow.io site — frameable on *.webflow.com, used for live previews. */
  website_url?: string | null;
  /** Direct marketplace checkout deep link — used by the preview Buy CTA. */
  purchase_url?: string | null;
  creator_name: string | null;
  creator_profile_url: string | null;
  creator_avatar_url: string | null;
  creator_avatar_alt: string | null;
  thumbnail_image_url: string | null;
  price: number | null;
  is_free: boolean;
  features: string[];
  cumulative_purchases: number | null;
}

interface DisplayPayload {
  layout: DisplayLayout;
  title?: string;
  items: Array<{ template_slug: string; reason?: string; item: AgentTemplateItem }>;
  followups?: string[];
}

// Filters/sort/highlights the agent wants applied to the host page's template
// grid (via the marketplace components' URL-param + templateFiltersChanged
// contract). Highlight slugs are already validated server-side.
export interface PageActionPayload {
  q?: string | null;
  category_group_slug?: string | null;
  styles?: string[] | null;
  types?: string[] | null;
  free_only?: boolean | null;
  sort?: string | null;
  clear_filters?: boolean | null;
  highlight_slugs?: string[];
}

type AgentStatus = 'thinking' | 'searching' | 'curating';

type AgentSseEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'display'; payload: DisplayPayload }
  | { type: 'status'; label: AgentStatus }
  | { type: 'page_action'; payload: PageActionPayload }
  // Signed continuity snapshot from the stateless agent Worker. The browser
  // cannot forge or modify trusted template facts between turns.
  | { type: 'context'; payload: { context_token: string } }
  | { type: 'done' }
  | { type: 'error'; message: string };

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  displays: DisplayPayload[];
}

export interface TemplateChatProps {
  /** Base URL of the template agent (no trailing slash). */
  apiBase?: string;
  /** Public Cloudflare Turnstile site key used to mint a short-lived agent session. */
  turnstileSiteKey?: string;
  title?: string;
  launcherLabel?: string;
  placeholder?: string;
  /** Opening assistant message shown before the first user turn. */
  welcomeMessage?: string;
  /**
   * 'floating' — launcher button + docked panel (default).
   * 'inline' — fills its parent element; drop it on a dedicated page section.
   * Both can expand into the immersive fullscreen experience.
   */
  variant?: 'floating' | 'inline';
  /** Comma-separated starter prompts shown before the first message. */
  starterPrompts?: string;
  defaultOpen?: boolean;
  /** Start in the immersive fullscreen state. */
  defaultImmersive?: boolean;
  /** Emit marketplace analytics (wf_analytics / Segment / Amplitude). */
  enableAnalytics?: boolean;
  /**
   * Stable persistence namespace for this surface. Use a distinct value when
   * more than one TemplateChat experience can appear in the same tab.
   */
  sessionScope?: string;
  /** CSS selector list for host-owned consent/modals that must win interaction. */
  hostOverlaySelectors?: string;
}

const DEFAULT_STARTERS =
  'A portfolio with bold animations, An online store for a clothing brand, A restaurant site with a menu, A SaaS landing page with a blog';

export interface AgentProgressView {
  activeIndex: number;
  title: string;
  detail: string;
  receipt: string | null;
}

function humanizeAgentValue(value: string): string {
  return value
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bAnd\b/g, '&');
}

export function summarizePageAction(payload: PageActionPayload | null): string | null {
  if (!payload) return null;
  const details: string[] = [];

  if (payload.category_group_slug) details.push(humanizeAgentValue(payload.category_group_slug));
  for (const style of payload.styles ?? []) details.push(humanizeAgentValue(style));
  for (const type of payload.types ?? []) details.push(humanizeAgentValue(type));
  if (payload.free_only === true) details.push('Free only');
  if (payload.sort) details.push(`Sorted by ${humanizeAgentValue(payload.sort)}`);
  const highlightCount = payload.highlight_slugs?.length ?? 0;
  if (highlightCount > 0) details.push(`Highlighted ${highlightCount} ${highlightCount === 1 ? 'match' : 'matches'}`);

  if (details.length > 0) return `Page updated · ${details.join(' · ')}`;
  if (payload.clear_filters) return 'Reset the page filters';
  if (payload.q != null) return 'Updated the page search';
  return null;
}

export function getAgentProgressView(status: AgentStatus, payload: PageActionPayload | null): AgentProgressView {
  const progress: Record<AgentStatus, Omit<AgentProgressView, 'receipt'>> = {
    thinking: {
      activeIndex: 0,
      title: 'Understanding your request',
      detail: 'Identifying the requirements that matter most.',
    },
    searching: {
      activeIndex: 1,
      title: 'Searching templates',
      detail: 'Checking the template catalog for strong matches.',
    },
    curating: {
      activeIndex: 2,
      title: 'Curating the strongest matches',
      detail: 'Comparing fit, style, and useful features.',
    },
  };

  return {
    ...progress[status],
    receipt: summarizePageAction(payload),
  };
}

export function AgentProgress({
  status,
  pageAction,
}: {
  status: AgentStatus;
  pageAction: PageActionPayload | null;
}): React.ReactElement {
  const view = getAgentProgressView(status, pageAction);
  const steps = [
    'Understanding your request',
    'Searching templates',
    'Curating the strongest matches',
  ];

  return (
    <div className="tmchat-progress" role="status" aria-live="polite" aria-atomic="true">
      <div className="tmchat-progress-current">
        <span className="tmchat-progress-mark" aria-hidden="true"><UiIcon name="sparkles" size={15} /></span>
        <span>
          <strong>{view.title}</strong>
          <span className="tmchat-progress-detail">{view.detail}</span>
        </span>
        <span className="tmchat-dots" aria-hidden="true"><span /><span /><span /></span>
      </div>
      <ol className="tmchat-progress-steps" aria-label="Template search progress">
        {steps.map((label, index) => {
          const state = index < view.activeIndex ? 'complete' : index === view.activeIndex ? 'current' : 'upcoming';
          return (
            <li key={label} data-state={state}>
              <span>{label}</span>
              <span className="tmchat-progress-stepmark" aria-hidden="true">{state === 'complete' ? '✓' : ''}</span>
            </li>
          );
        })}
      </ol>
      {view.receipt ? <div className="tmchat-progress-receipt">{view.receipt}</div> : null}
      <div className="tmchat-progress-preview" aria-hidden="true">
        {steps.map((label) => <span key={label} className="tmchat-progress-skeleton-card" />)}
      </div>
    </div>
  );
}

const STORAGE_KEY = 'tmchat-session-v1';
const MAX_PERSISTED_MESSAGES = 30;

export function getTemplateChatStorageKey(sessionScope = 'marketplace'): string {
  const normalized = sessionScope.trim() || 'marketplace';
  if (normalized === 'marketplace') return STORAGE_KEY;

  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const readable = encodeURIComponent(normalized).slice(0, 48);
  return `${STORAGE_KEY}:${readable}:${(hash >>> 0).toString(36)}`;
}

export function limitTemplateChatInput(value: string): string {
  return value.slice(0, MAX_REQUEST_MESSAGE_CHARS);
}

export function getPreviewReturnImmersive(
  openedImmersive: boolean | null,
  currentImmersive: boolean,
): boolean {
  return openedImmersive ?? currentImmersive;
}

const CHAT_STYLES = `
.tmchat-launcher {
  position: fixed; right: 24px; bottom: 24px; z-index: 9000;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 18px; border: 0; border-radius: 999px; cursor: pointer;
  background: #146ef5; color: #fff;
  font-family: "WF Visual Sans Variable", "Inter", system-ui, sans-serif;
  font-size: 14px; font-weight: 600; box-shadow: 0 6px 24px rgba(0,0,0,0.18);
  transition: background 160ms ease, transform 160ms ease;
}
.tmchat-launcher:hover { background: #0f5cd0; transform: translateY(-1px); }
.tmchat-launcher:focus-visible,
.tmchat-iconbtn:focus-visible,
.tmchat-intro-toggle:focus-visible,
.tmchat-chip:focus-visible,
.tmchat-jump:focus-visible,
.tmchat-send:focus-visible,
.tmchat-preview-back:focus-visible,
.tmchat-devicebtn:focus-visible,
.tmchat-preview-open:focus-visible,
.tmchat-preview-cta:focus-visible,
.tmchat-input:focus-visible {
  outline: 2px solid #146ef5; outline-offset: 2px;
}
.tmchat-backdrop {
  position: fixed; inset: 0; z-index: 99999998;
  background: rgba(8,8,8,0.44);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  animation: tmchat-fade 200ms ease both;
}
@keyframes tmchat-fade { from { opacity: 0; } }
.tmchat-panel {
  position: fixed; right: 24px; bottom: 24px; z-index: 9001;
  display: flex; flex-direction: column;
  width: min(440px, calc(100vw - 32px)); height: min(640px, calc(100vh - 48px));
  border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;
  background: #fff; box-shadow: 0 12px 48px rgba(0,0,0,0.22);
  font-family: "WF Visual Sans Variable", "Inter", system-ui, sans-serif;
  color: #080808; font-size: 14px; line-height: 1.45;
  transition: bottom 160ms ease;
}
.tmchat-panel.entering { animation: tmchat-in 220ms cubic-bezier(0.2, 0, 0, 1); }
@keyframes tmchat-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
.tmchat-panel.inline {
  position: relative; right: auto; bottom: auto; z-index: auto;
  width: 100%; height: 100%; min-height: 560px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.tmchat-panel.immersive {
  /* Above the webflow.com sticky navigation — the immersive state is a modal
     and nothing on the host page should paint over it. */
  position: fixed; top: 24px; bottom: 24px; left: 0; right: 0; margin: 0 auto; z-index: 99999999;
  width: min(1120px, calc(100vw - 48px)); height: auto; min-height: 0;
  border-radius: 16px; box-shadow: 0 24px 80px rgba(0,0,0,0.3);
}
.tmchat-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 14px 16px; border-bottom: 1px solid #ececec; background: #fafafa;
}
.tmchat-header-title { font-weight: 600; font-size: 15px; }
.tmchat-panel.immersive .tmchat-header-title { font-size: 16px; }
.tmchat-turnstile:empty { display: none; }
.tmchat-turnstile:not(:empty) {
  flex: 0 0 auto; display: flex; justify-content: center;
  padding: 8px 16px; border-top: 1px solid #ececec; background: #fafafa;
}
.tmchat-header-actions { display: flex; align-items: center; gap: 2px; }
.tmchat-iconbtn {
  border: 0; background: transparent; cursor: pointer; color: #404040;
  width: 30px; height: 30px; border-radius: 8px; font-size: 16px; line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background 120ms ease;
}
.tmchat-iconbtn:hover { background: #ececec; }
.tmchat-iconbtn:active { background: #e0e0e0; }
.tmchat-scroll {
  flex: 1 1 auto; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
/* Compositor-only entrances: transform + opacity, no layout properties. */
.tmchat-msg, .tmchat-display, .tmchat-typing {
  animation: tmchat-rise 180ms cubic-bezier(0.2, 0, 0, 1) both;
}
@keyframes tmchat-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
/* Chips arrive one by one after the reply settles — the whole row popping in
   at once reads as a layout jump. Delay is set inline per chip. */
.tmchat-followups .tmchat-chip { animation: tmchat-chip-in 240ms cubic-bezier(0.2, 0, 0, 1) both; }
@keyframes tmchat-chip-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.tmchat-grid > div, .tmchat-strip > div {
  animation: tmchat-card 260ms cubic-bezier(0.2, 0, 0, 1) both;
}
@keyframes tmchat-card { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
.tmchat-msg { max-width: 92%; white-space: pre-wrap; overflow-wrap: break-word; }
.tmchat-panel.immersive .tmchat-msg { max-width: 680px; font-size: 15px; }
.tmchat-msg.user { align-self: flex-end; background: #146ef5; color: #fff; padding: 9px 13px; border-radius: 14px 14px 4px 14px; }
.tmchat-msg.assistant { align-self: flex-start; background: #f5f5f5; padding: 9px 13px; border-radius: 14px 14px 14px 4px; }
.tmchat-turn-status { align-self: flex-start; color: #5b5b5b; font-size: 12px; font-weight: 600; }
.tmchat-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
.tmchat-intro {
  align-self: flex-start; max-width: 92%; color: #5b5b5b; font-size: 12px;
  border: 1px solid #ececec; border-radius: 8px; background: #fafafa;
}
.tmchat-intro-toggle {
  width: 100%; border: 0; background: transparent; cursor: pointer; padding: 7px 10px;
  color: #404040; font: inherit; font-weight: 600; text-align: left;
}
.tmchat-intro-toggle:hover { color: #080808; }
.tmchat-intro-copy { padding: 0 10px 9px; max-width: 560px; }
.tmchat-intro-copy[hidden] { display: none; }
.tmchat-caret {
  display: inline-block; width: 2px; height: 1em; margin-left: 2px;
  background: currentColor; vertical-align: -0.15em;
  animation: tmchat-blink 1s steps(2, start) infinite;
}
@keyframes tmchat-blink { 50% { opacity: 0; } }
.tmchat-display { align-self: stretch; }
.tmchat-display-title { font-weight: 600; margin: 4px 0 8px; font-size: 14px; }
.tmchat-panel.immersive .tmchat-display-title { font-size: 16px; }
.tmchat-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.tmchat-grid.single { grid-template-columns: 1fr; }
/* Chat displays are curated sets (2-6 items), not a browse grid: two scaled-up
   columns by default (thumbnails are the product — bigger reads better, and 4
   items make a clean 2x2). Sets of exactly 3 or 6+ go three-across so rows
   stay complete. */
.tmchat-panel.immersive .tmchat-grid { grid-template-columns: repeat(2, minmax(0, 420px)); justify-content: start; gap: 20px; }
.tmchat-panel.immersive .tmchat-grid.wide { grid-template-columns: repeat(3, minmax(0, 380px)); gap: 16px; }
.tmchat-panel.immersive .tmchat-grid.single { grid-template-columns: minmax(0, 420px); }
.tmchat-strip { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; -webkit-overflow-scrolling: touch; }
.tmchat-strip > * { flex: 0 0 220px; }
.tmchat-panel.immersive .tmchat-strip > * { flex-basis: 260px; }
.tmchat-followups { display: flex; flex-wrap: wrap; gap: 8px; }
.tmchat-refine { display: grid; gap: 7px; }
.tmchat-refine-label { color: #5b5b5b; font-size: 11px; font-weight: 600; letter-spacing: 0.01em; }
.tmchat-chip {
  border: 1px solid #dbe6fb; border-radius: 999px; background: #f2f7ff;
  color: #0f5cd0; padding: 7px 12px; font-size: 13px; cursor: pointer; font-family: inherit;
  transition: background 140ms ease, transform 140ms ease;
}
.tmchat-chip:hover { background: #e3edfd; transform: translateY(-1px); }
.tmchat-chip:active { transform: translateY(0); }
.tmchat-typing { align-self: flex-start; color: #757575; font-size: 13px; display: inline-flex; align-items: baseline; gap: 6px; }
.tmchat-progress {
  align-self: stretch; padding: 13px; border: 1px solid #ececec; border-radius: 8px;
  background: #fafafa; color: #404040;
  animation: tmchat-rise 180ms cubic-bezier(0.2, 0, 0, 1) both;
}
.tmchat-progress-current { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 9px; align-items: start; }
.tmchat-progress-current strong { display: block; color: #080808; font-size: 13px; line-height: 1.35; }
.tmchat-progress-detail { display: block; margin-top: 2px; color: #5b5b5b; font-size: 12px; line-height: 1.4; }
.tmchat-progress-mark {
  width: 28px; height: 28px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;
  background: #f0f0f0; color: #146ef5;
}
.tmchat-progress-steps { display: grid; gap: 5px; margin: 11px 0 0 37px; padding: 0; list-style: none; }
.tmchat-progress-steps li { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #6b6b6b; font-size: 11px; }
.tmchat-progress-steps li[data-state="current"] { color: #146ef5; font-weight: 600; }
.tmchat-progress-steps li[data-state="complete"] { color: #5b5b5b; }
.tmchat-progress-stepmark { min-width: 12px; color: #146ef5; text-align: center; }
.tmchat-progress-receipt {
  margin: 10px 0 0 37px; padding-top: 9px; border-top: 1px solid #ececec;
  color: #5b5b5b; font-size: 11px; font-weight: 600;
}
.tmchat-progress-preview { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: 12px; }
.tmchat-progress-skeleton-card {
  height: 42px; border-radius: 7px;
  background: linear-gradient(100deg, #ececec 20%, #f5f5f5 40%, #ececec 60%);
  background-size: 200% 100%; animation: tmchat-progress-shimmer 1.4s linear infinite;
}
@keyframes tmchat-progress-shimmer { to { background-position-x: -200%; } }
.tmchat-dots { display: inline-flex; gap: 3px; }
.tmchat-dots span {
  width: 4px; height: 4px; border-radius: 50%; background: #757575;
  animation: tmchat-pulse 1.2s ease-in-out infinite;
}
.tmchat-dots span:nth-child(2) { animation-delay: 0.15s; }
.tmchat-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes tmchat-pulse { 0%, 60%, 100% { opacity: 0.25; } 30% { opacity: 1; } }
.tmchat-scrollwrap { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.tmchat-jump {
  position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); z-index: 3;
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid #e0e0e0; border-radius: 999px; background: #fff; color: #080808;
  padding: 6px 12px; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.14);
  animation: tmchat-chip-in 200ms cubic-bezier(0.2, 0, 0, 1) both;
}
.tmchat-jump:hover { background: #f5f5f5; }
.tmchat-inputrow { display: flex; align-items: flex-end; gap: 8px; padding: 12px; border-top: 1px solid #ececec; background: #fff; }
/* Immersive (and wide inline panels): one centered content column (max 960px).
   Header, conversation, and input share the same left/right rails so every
   surface aligns. */
.tmchat-panel.inline .tmchat-header { padding: 14px max(16px, calc((100% - 960px) / 2)); }
.tmchat-panel.inline .tmchat-inputrow { padding: 12px max(16px, calc((100% - 960px) / 2)) 14px; }
.tmchat-panel.inline .tmchat-scroll { padding: 16px max(16px, calc((100% - 960px) / 2)) 24px; }
.tmchat-panel.inline .tmchat-preview-bar { padding: 10px max(16px, calc((100% - 960px) / 2)); }
.tmchat-panel.immersive .tmchat-header { padding: 14px max(clamp(16px, 5vw, 56px), calc((100% - 960px) / 2)); }
.tmchat-panel.immersive .tmchat-inputrow { padding: 14px max(clamp(16px, 5vw, 56px), calc((100% - 960px) / 2)) 18px; }
.tmchat-panel.immersive .tmchat-scroll { padding: 24px max(clamp(16px, 5vw, 56px), calc((100% - 960px) / 2)) 32px; gap: 14px; }
.tmchat-panel.immersive .tmchat-preview-bar { padding: 10px max(clamp(16px, 5vw, 56px), calc((100% - 960px) / 2)); }
.tmchat-input {
  width: 100%; min-height: 40px; max-height: 120px; padding: 9px 12px;
  box-sizing: border-box;
  border: 1px solid #e0e0e0; border-radius: 8px; font: inherit; resize: none; overflow-y: auto;
}
.tmchat-inputfield { flex: 1 1 auto; min-width: 0; }
.tmchat-inputmeta { margin: 4px 2px 0; color: #757575; font-size: 11px; line-height: 1.25; }
.tmchat-send {
  border: 0; border-radius: 8px; background: #146ef5; color: #fff;
  padding: 0 16px; font: inherit; font-weight: 600; cursor: pointer; align-self: flex-end; min-height: 40px;
  transition: background 140ms ease, transform 120ms ease;
}
.tmchat-send:active:not(:disabled) { transform: scale(0.97); }
.tmchat-send:disabled { background: #a9c6f7; cursor: default; }
.tmchat-send.stop { background: #fff; color: #404040; border: 1px solid #e0e0e0; }
.tmchat-send.stop:hover { background: #f5f5f5; }
/* ── Live template preview (published .webflow.io site in an iframe) ── */
.tmchat-body { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.tmchat-preview {
  position: absolute; inset: 0; z-index: 4;
  display: flex; flex-direction: column; background: #fff;
  animation: tmchat-preview-in 220ms cubic-bezier(0.2, 0, 0, 1) both;
}
@keyframes tmchat-preview-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.tmchat-preview.closing { animation: tmchat-preview-out 160ms cubic-bezier(0.4, 0, 1, 1) both; }
@keyframes tmchat-preview-out { to { opacity: 0; transform: translateY(10px); } }
.tmchat-preview-bar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 14px; border-bottom: 1px solid #ececec; background: #fff;
}
.tmchat-preview-back {
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; color: #080808;
  padding: 7px 12px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
}
.tmchat-preview-back { height: 36px; padding: 0 12px; transition: background 120ms ease; }
.tmchat-preview-back:hover { background: #f5f5f5; }
.tmchat-preview-sep { width: 1px; height: 20px; background: #e0e0e0; flex: 0 0 auto; }
.tmchat-preview-meta { display: flex; flex-direction: column; justify-content: center; min-width: 0; margin-right: auto; min-height: 36px; }
.tmchat-preview-name { font-size: 14px; line-height: 1.25; font-weight: 600; color: #080808; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tmchat-preview-creator { font-size: 12px; line-height: 1.25; color: #757575; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tmchat-devicetoggle { display: inline-flex; align-items: stretch; height: 36px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
.tmchat-devicebtn {
  display: inline-flex; align-items: center; gap: 6px;
  border: 0; background: #fff; color: #757575; padding: 0 12px;
  font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
}
.tmchat-devicebtn { transition: background 140ms ease, color 140ms ease; }
.tmchat-devicebtn + .tmchat-devicebtn { border-left: 1px solid #e0e0e0; }
.tmchat-devicebtn.active { background: #f0f5ff; color: #146ef5; }
.tmchat-preview-cta {
  display: inline-flex; align-items: center; gap: 6px; text-decoration: none;
  height: 36px; border-radius: 8px; background: #146ef5; color: #fff; padding: 0 14px;
  font-family: inherit; font-size: 13px; font-weight: 600;
}
.tmchat-preview-cta { transition: background 140ms ease; }
.tmchat-preview-cta:hover { background: #0f5cd0; }
.tmchat-preview-open { display: inline-flex; align-items: center; gap: 5px; color: #757575; font-size: 12px; text-decoration: none; }
.tmchat-preview-open:hover { color: #080808; }
.tmchat-preview-stage {
  position: relative; flex: 1 1 auto; min-height: 0; overflow: auto;
  display: flex; justify-content: center; background: #f2f2f2; padding: 0;
}
.tmchat-preview-stage.mobile, .tmchat-preview-stage.tablet { padding: 20px 16px; }
.tmchat-preview-frame { border: 0; background: #fff; width: 100%; height: 100%; display: block; }
.tmchat-preview-stage.mobile .tmchat-preview-frame, .tmchat-preview-stage.tablet .tmchat-preview-frame {
  max-width: 100%; height: 100%; flex: 0 0 auto;
  border: 1px solid #d9d9d9; box-shadow: 0 12px 40px rgba(0,0,0,0.14);
}
.tmchat-preview-stage.mobile .tmchat-preview-frame { width: 390px; border-radius: 20px; }
.tmchat-preview-stage.tablet .tmchat-preview-frame { width: 768px; border-radius: 14px; }
.tmchat-preview-loading {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 6px;
  color: #757575; font-size: 13px; pointer-events: none;
}
@media (max-width: 560px) {
  .tmchat-panel {
    inset: 0; width: 100vw; height: 100vh; height: 100dvh;
    border: 0; border-radius: 0; box-shadow: none;
  }
  .tmchat-panel.immersive { top: 0; bottom: 0; width: 100vw; border-radius: 0; }
  .tmchat-inputrow, .tmchat-panel.immersive .tmchat-inputrow {
    padding: 10px 12px;
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }
  .tmchat-header, .tmchat-panel.immersive .tmchat-header { padding: 8px 10px; }
  .tmchat-scroll, .tmchat-panel.immersive .tmchat-scroll { padding: 12px 16px 16px; gap: 12px; }
  .tmchat-iconbtn { width: 40px; height: 40px; }
  .tmchat-expand { display: none; }
  .tmchat-grid:not(.single), .tmchat-panel.immersive .tmchat-grid:not(.single) {
    grid-template-columns: none; grid-auto-flow: column;
    grid-auto-columns: min(76vw, 280px); justify-content: start;
    overflow-x: auto; overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory; padding-bottom: 6px;
    -webkit-overflow-scrolling: touch;
  }
  .tmchat-grid:not(.single) > *, .tmchat-panel.immersive .tmchat-grid:not(.single) > * { scroll-snap-align: start; }
  .tmchat-grid.single, .tmchat-panel.immersive .tmchat-grid.single {
    grid-template-columns: 1fr; overflow: visible;
  }
  .tmchat-followups {
    flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-inline: contain;
    scroll-snap-type: x proximity; padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }
  .tmchat-followups > * { flex: 0 0 auto; scroll-snap-align: start; }
  .tmchat-preview-bar, .tmchat-panel.immersive .tmchat-preview-bar { flex-wrap: nowrap; gap: 8px; padding: 8px 10px; }
  .tmchat-preview-back, .tmchat-preview-cta { height: 40px; }
  .tmchat-devicetoggle, .tmchat-preview-open, .tmchat-preview-sep { display: none; }
  .tmchat-preview-stage.mobile, .tmchat-preview-stage.tablet { padding: 0; }
  .tmchat-preview-stage.mobile .tmchat-preview-frame, .tmchat-preview-stage.tablet .tmchat-preview-frame { width: 100%; border: 0; border-radius: 0; box-shadow: none; }
}
@media (prefers-reduced-motion: reduce) {
  .tmchat-panel.entering, .tmchat-backdrop, .tmchat-dots span, .tmchat-caret,
  .tmchat-msg, .tmchat-display, .tmchat-typing, .tmchat-progress, .tmchat-progress-skeleton-card, .tmchat-followups .tmchat-chip,
  .tmchat-jump, .tmchat-grid > div, .tmchat-strip > div, .tmchat-preview,
  .tmchat-preview.closing { animation: none; }
  .tmchat-panel, .tmchat-chip, .tmchat-send, .tmchat-launcher, .tmchat-devicebtn,
  .tmchat-preview-back, .tmchat-preview-cta { transition: none; }
  .tmchat-chip:hover, .tmchat-launcher:hover, .tmchat-send:active:not(:disabled) { transform: none; }
}
` + TEMPLATE_CARD_STYLES;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function formatPrice(item: AgentTemplateItem): string {
  if (item.is_free || item.price === 0) return 'Free';
  return typeof item.price === 'number' ? `$${item.price} USD` : '';
}

// The agent is prompted to emit plain text, but render defensively: turn any
// **bold** spans into <strong> instead of showing raw asterisks.
function renderMessageText(content: string): React.ReactNode {
  const parts = content.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return content;
  return parts.map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part));
}

// ── Session persistence (survive navigation/reload within the tab) ───────────

interface PersistedSession {
  messages: ChatMessage[];
  followups: string[];
  known: AgentTemplateItem[];
  contextToken?: string;
  stoppedPrompt?: string;
  open: boolean;
}

function loadPersistedSession(storageKey: string): PersistedSession | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (!Array.isArray(parsed.messages)) return null;
    return {
      messages: parsed.messages.filter(
        (message): message is ChatMessage =>
          typeof message === 'object' &&
          message !== null &&
          (message.role === 'user' || message.role === 'assistant') &&
          typeof message.content === 'string' &&
          Array.isArray(message.displays),
      ),
      followups: Array.isArray(parsed.followups) ? parsed.followups.filter((f) => typeof f === 'string') : [],
      known: Array.isArray(parsed.known) ? parsed.known.filter((item) => item && typeof item.template_slug === 'string') : [],
      contextToken: typeof parsed.contextToken === 'string' ? parsed.contextToken : undefined,
      stoppedPrompt: typeof parsed.stoppedPrompt === 'string' ? parsed.stoppedPrompt : undefined,
      open: Boolean(parsed.open),
    };
  } catch {
    return null;
  }
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileScriptPromise) return turnstileScriptPromise;

  const pending = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-template-agent-turnstile]');
    const script = existing ?? document.createElement('script');
    const finish = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Bot check unavailable.')));
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('Bot check unavailable.')), { once: true });
    if (!existing) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.templateAgentTurnstile = 'true';
      document.head.appendChild(script);
    }
  }).catch((error) => {
    turnstileScriptPromise = null;
    throw error;
  });
  turnstileScriptPromise = pending;
  return pending;
}

async function getTurnstileToken(container: HTMLElement, sitekey: string): Promise<string> {
  const turnstile = await loadTurnstile();
  return completeTurnstileChallenge(turnstile, container, sitekey);
}

// ── Page control (agent drives the host page's grid/filters) ─────────────────

// Detect the marketplace grid components on the host page. Used both to tell
// the agent whether update_page is meaningful and to target highlights.
// Webflow mounts each code component in an isolated (open) shadow root. Build
// one bounded root inventory, then reuse it for every selector in the action.

const GRID_MARKER_SELECTOR = '[data-template-slug], .tmgrid-grid, .tmgrid-item, .tmsearch-page';

function pageHasTemplateGrid(): boolean {
  if (typeof document === 'undefined') return false;
  const roots = discoverOpenRoots(document);
  return queryDiscoveredRoots(roots, GRID_MARKER_SELECTOR).length > 0;
}

type PageActionTimers = Map<number, (() => void) | undefined>;

function schedulePageAction(
  timers: PageActionTimers,
  callback: () => void,
  delay: number,
  onCancel?: () => void,
): void {
  const timer = window.setTimeout(() => {
    timers.delete(timer);
    callback();
  }, delay);
  timers.set(timer, onCancel);
}

function clearPageActionTimers(timers: PageActionTimers): void {
  for (const [timer, onCancel] of timers) {
    window.clearTimeout(timer);
    onCancel?.();
  }
  timers.clear();
}

// Apply an agent page action through the marketplace components' shared
// contract: write URL params, then dispatch templateFiltersChanged so
// TemplateGrid / sidebar / heading re-read and re-fetch.
function applyPageAction(
  payload: PageActionPayload,
  highlightMisses: ReturnType<typeof createHighlightMissState>,
  timers: PageActionTimers,
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const roots = discoverOpenRoots(document);
  const hasFilterChange =
    Boolean(payload.clear_filters) ||
    payload.q != null ||
    payload.category_group_slug != null ||
    payload.styles != null ||
    payload.types != null ||
    payload.free_only != null ||
    payload.sort != null;

  if (hasFilterChange) {
    const url = new URL(window.location.href);
    if (payload.clear_filters) {
      for (const key of ['q', 'query', 'search', 'category', 'category_group_slug', 'subcategory', 'child_category_slug', 'styles', 'tags', 'types', 'free_only', 'sort', 'page']) {
        url.searchParams.delete(key);
      }
    }
    if (payload.q != null) {
      url.searchParams.delete('query');
      url.searchParams.delete('search');
      if (payload.q) url.searchParams.set('q', payload.q);
      else url.searchParams.delete('q');
    }
    if (payload.category_group_slug != null) {
      url.searchParams.delete('subcategory');
      url.searchParams.delete('child_category_slug');
      url.searchParams.delete('category_group_slug');
      if (payload.category_group_slug) url.searchParams.set('category', payload.category_group_slug);
      else url.searchParams.delete('category');
    }
    if (payload.styles != null) {
      url.searchParams.delete('styles');
      for (const style of payload.styles) url.searchParams.append('styles', style);
    }
    if (payload.types != null) {
      url.searchParams.delete('types');
      for (const type of payload.types) url.searchParams.append('types', type);
    }
    if (payload.free_only != null) {
      if (payload.free_only) url.searchParams.set('free_only', 'true');
      else url.searchParams.delete('free_only');
    }
    if (payload.sort) url.searchParams.set('sort', payload.sort);
    url.searchParams.delete('page');
    window.history.replaceState({}, '', url.toString());

    const params = url.searchParams;
    const splitList = (key: string) =>
      params.getAll(key).flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
    const detail = {
      q: (params.get('q') ?? '').trim(),
      categoryGroupSlug: params.get('category'),
      childCategorySlug: params.get('subcategory'),
      styles: splitList('styles'),
      tags: splitList('tags'),
      types: splitList('types'),
      freeOnly: (params.get('free_only') ?? '').toLowerCase() === 'true',
      sort: params.get('sort') ?? 'popular',
      href: url.toString(),
      source: 'TemplateChat',
      updatedAt: Date.now(),
    };
    (window as unknown as Record<string, unknown>).__templateMarketplaceFilters = detail;
    window.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));
    document.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));

    // Show the user which controls the agent just changed. Slight delay so
    // the filter bar has re-rendered its state before we point at it.
    schedulePageAction(timers, () => pulsePageControls(payload, roots, timers), 250);
  }

  if (payload.highlight_slugs?.length) {
    // The grid re-fetches after a filter change; retry until the cards exist.
    highlightPageTemplates(payload.highlight_slugs, 0, roots, highlightMisses, timers);
  }
}

function highlightPageTemplates(
  slugs: string[],
  attempt: number,
  roots: readonly ParentNode[],
  highlightMisses: ReturnType<typeof createHighlightMissState>,
  timers: PageActionTimers,
): void {
  if (typeof document === 'undefined' || slugs.length === 0) return;
  // Query the already-discovered roots; do not re-walk the whole host tree on
  // every retry while the grid re-renders.
  const bySlug = new Map<string, HTMLElement>();
  for (const el of queryDiscoveredRoots(roots, '[data-template-slug]')) {
    const slug = el.getAttribute('data-template-slug');
    if (slug && el instanceof HTMLElement && !bySlug.has(slug)) bySlug.set(slug, el);
  }
  const found = slugs
    .map((slug) => bySlug.get(slug))
    .filter((el): el is HTMLElement => Boolean(el));

  if (found.length === 0) {
    if (attempt < 7) {
      schedulePageAction(
        timers,
        () => highlightPageTemplates(slugs, attempt + 1, roots, highlightMisses, timers),
        500,
      );
    } else highlightMisses.add(slugs);
    return;
  }
  const foundSlugs = new Set(found.map((el) => el.getAttribute('data-template-slug')));
  highlightMisses.add(slugs.filter((slug) => !foundSlugs.has(slug)));

  const reduced = prefersReducedMotion();
  for (const el of found) {
    // Inline styles + WAAPI: chat styles can't reach the grid's isolated root.
    const previousOutline = el.style.outline;
    const previousOffset = el.style.outlineOffset;
    el.style.outline = '3px solid #146ef5';
    el.style.outlineOffset = '4px';
    const restore = () => {
      el.style.outline = previousOutline;
      el.style.outlineOffset = previousOffset;
    };
    schedulePageAction(timers, restore, 5200, restore);
    if (!reduced && typeof el.animate === 'function') {
      el.animate(
        [
          { boxShadow: '0 0 0 3px rgba(20,110,245,0.35), 0 0 0 6px rgba(20,110,245,0.18)' },
          { boxShadow: '0 0 0 3px rgba(20,110,245,0.35), 0 0 0 16px rgba(20,110,245,0)' },
        ],
        { duration: 1300, iterations: 4, easing: 'ease-out' },
      );
    }
  }
  found[0]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
}

// ── Analytics ─────────────────────────────────────────────────────────────────
// All chat telemetry flows through the shared marketplace tracker
// ('Code Component Event' + scope, fanned out to wf_analytics/Segment/
// Amplitude), matching TemplateGrid — chat sessions join the same Amplitude
// funnels, and card clicks write the same attribution record the template
// detail page's conversion tracker consumes.
type ChatTrack = (scope: string, data?: MarketplaceAnalyticsData) => void;
type ChatMessageSource = 'input' | 'starter' | 'followup' | 'retry';

export function buildMessageSentAnalytics(
  source: ChatMessageSource,
  turn: number,
  message: string,
): MarketplaceAnalyticsData {
  return {
    source,
    turn,
    message_length: message.length,
  };
}

function buildChatAttribution(
  item: AgentTemplateItem,
  position: number,
  sourceSort: string,
): TemplateMarketplaceAttribution {
  return {
    version: 1,
    source_component: 'TemplateChat',
    source_pathname: typeof window === 'undefined' ? null : window.location.pathname || null,
    source_scope: 'chat',
    // The display layout (or 'preview') stands in for sort context — chat
    // results are agent-curated, not sorted by a grid lens.
    source_sort: sourceSort,
    source_category_group_slug: null,
    source_child_category_slug: null,
    source_style_slug: null,
    source_tag_slug: null,
    source_free_only: false,
    // Chat results always follow a user prompt.
    source_q_present: true,
    source_styles_count: 0,
    source_tags_count: 0,
    source_types_count: 0,
    source_page: 1,
    source_position: position,
    template_slug: item.template_slug,
    signal_bucket: null,
    signal_metric: null,
    signal_window: MARKETPLACE_SIGNAL_WINDOW,
    signal_density: 'none',
    created_at: new Date().toISOString(),
  };
}

function isAnchorClickOn(event: React.MouseEvent, href: string | null): boolean {
  if (!href) return false;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const anchor = target.closest<HTMLAnchorElement>('a[href]');
  return Boolean(anchor && anchor.getAttribute('href') === href);
}

// ── Agent-action transparency ────────────────────────────────────────────────
// When the agent drives the page's filters/sort, pulse the controls it
// "touched" so the change is visible and attributable — the same trust
// language as the template-card highlight. Inline styles + WAAPI because the
// controls live in other components' isolated shadow roots.
const CONTROL_SELECTORS: Array<{ keys: Array<keyof PageActionPayload>; selector: string }> = [
  { keys: ['sort'], selector: '.tmfilter-sort-toggle, [data-template-search-sort], select[name="sort"]' },
  { keys: ['styles'], selector: '[data-template-search-style], select[name="styles"]' },
  { keys: ['types'], selector: '[data-template-search-type], select[name="types"]' },
  { keys: ['free_only'], selector: '[data-template-search-free], input[name="free_only"]' },
  { keys: ['q'], selector: '.tmfilter-search-wrap, [data-template-search-input], input[type="search"]' },
  // Fields without a precise control (category, clear) light up the bar shell.
  { keys: ['category_group_slug', 'clear_filters'], selector: '.tmfilter-shell' },
];

function pulseElements(elements: HTMLElement[], timers: PageActionTimers): void {
  const reduced = prefersReducedMotion();
  for (const el of elements) {
    const previousOutline = el.style.outline;
    const previousOffset = el.style.outlineOffset;
    const previousRadius = el.style.borderRadius;
    el.style.outline = '2px solid #146ef5';
    el.style.outlineOffset = '3px';
    if (!previousRadius) el.style.borderRadius = '8px';
    const restore = () => {
      el.style.outline = previousOutline;
      el.style.outlineOffset = previousOffset;
      el.style.borderRadius = previousRadius;
    };
    schedulePageAction(timers, restore, 2600, restore);
    if (!reduced && typeof el.animate === 'function') {
      el.animate(
        [
          { boxShadow: '0 0 0 2px rgba(20,110,245,0.3), 0 0 0 5px rgba(20,110,245,0.16)' },
          { boxShadow: '0 0 0 2px rgba(20,110,245,0.3), 0 0 0 12px rgba(20,110,245,0)' },
        ],
        { duration: 1200, iterations: 2, easing: 'ease-out' },
      );
    }
  }
}

function pulsePageControls(
  payload: PageActionPayload,
  roots: readonly ParentNode[],
  timers: PageActionTimers,
): void {
  if (typeof document === 'undefined') return;
  const targets = new Set<HTMLElement>();
  let matchedSpecific = false;
  for (const entry of CONTROL_SELECTORS) {
    if (!entry.keys.some((key) => payload[key] != null)) continue;
    const found = queryDiscoveredRoots(roots, entry.selector).filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    );
    if (found.length > 0 && entry.selector !== '.tmfilter-shell') matchedSpecific = true;
    for (const el of found.slice(0, 3)) targets.add(el);
  }
  // Nothing specific found (e.g. older filter bar markup): fall back to the bar.
  if (!matchedSpecific && targets.size === 0) {
    for (const el of queryDiscoveredRoots(roots, '.tmfilter-shell').slice(0, 1)) {
      if (el instanceof HTMLElement) targets.add(el);
    }
  }
  pulseElements(Array.from(targets), timers);
}

function DisplayArtifact({
  payload,
  onPreview,
  onTemplateClick,
}: {
  payload: DisplayPayload;
  onPreview?: (item: AgentTemplateItem, position: number, layout: string) => void;
  onTemplateClick?: (item: AgentTemplateItem, position: number, layout: string) => void;
}): React.ReactElement {
  const isStrip = payload.layout === 'carousel';
  const isSingle = payload.layout === 'spotlight' || payload.items.length === 1;

  const cards = payload.items.map((entry, index) => (
    <div
      key={entry.template_slug}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      onClickCapture={(event) => {
        if (isAnchorClickOn(event, entry.item.url)) {
          onTemplateClick?.(entry.item, index + 1, payload.layout);
        }
      }}
    >
      <TemplateCard
        templateName={entry.item.name}
        templateLink={{ href: entry.item.url ?? '#', target: '_blank' }}
        price={formatPrice(entry.item)}
        isFree={entry.item.is_free}
        creatorName={entry.item.creator_name ?? ''}
        creatorLink={
          entry.item.creator_profile_url ? { href: entry.item.creator_profile_url, target: '_blank' } : undefined
        }
        creatorIcon={
          entry.item.creator_avatar_url
            ? {
                src: entry.item.creator_avatar_url,
                alt: entry.item.creator_avatar_alt ?? entry.item.creator_name ?? '',
              }
            : undefined
        }
        primaryImage={
          entry.item.thumbnail_image_url ? { src: entry.item.thumbnail_image_url, alt: entry.item.name } : undefined
        }
        cumulativePurchases={entry.item.cumulative_purchases ?? undefined}
        agentNote={entry.reason ? `Why it fits — ${entry.reason}` : undefined}
        showCategoryMeta={false}
        showPreviewLink={Boolean(onPreview && entry.item.website_url)}
        previewLabel="Live preview"
        previewLink={
          onPreview && entry.item.website_url
            ? {
                // Plain click opens the in-chat preview; cmd/middle-click
                // still opens the published site directly.
                href: entry.item.website_url,
                target: '_blank',
                onClick: (event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  onPreview(entry.item, index + 1, payload.layout);
                },
              }
            : undefined
        }
      />
    </div>
  ));

  return (
    <div className="tmchat-display">
      {payload.title ? <div className="tmchat-display-title">{payload.title}</div> : null}
      {isStrip ? (
        <div className="tmchat-strip">{cards}</div>
      ) : (
        <div
          className={`tmchat-grid${isSingle ? ' single' : ''}${
            payload.items.length === 3 || payload.items.length >= 6 ? ' wide' : ''
          }`}
        >
          {cards}
        </div>
      )}
    </div>
  );
}

// Live preview of the template's published .webflow.io site. The published
// sites ship `frame-ancestors … *.webflow.com`, so embedding here is
// explicitly sanctioned. The mobile toggle narrows the iframe viewport, which
// drives the site's own responsive breakpoints — a real mobile render, not a
// scaled screenshot.
function TemplatePreviewPane({
  item,
  onClose,
  onEvent,
}: {
  item: AgentTemplateItem;
  onClose: () => void;
  onEvent?: ChatTrack;
}): React.ReactElement {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loaded, setLoaded] = useState(false);
  const [closing, setClosing] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

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
      role="region"
      aria-label={`Live preview of ${item.name}`}
      onAnimationEnd={(event) => {
        if (event.animationName === 'tmchat-preview-out') onClose();
      }}
    >
      <div className="tmchat-preview-bar">
        <button ref={backRef} type="button" className="tmchat-preview-back" onClick={requestClose}>
          <UiIcon name="arrow-left" size={14} /> Back to chat
        </button>
        <span className="tmchat-preview-sep" aria-hidden="true" />
        <div className="tmchat-preview-meta">
          <span className="tmchat-preview-name">{item.name}</span>
          {item.creator_name ? <span className="tmchat-preview-creator">by {item.creator_name}</span> : null}
        </div>
        <div className="tmchat-devicetoggle" role="group" aria-label="Preview device">
          <button
            type="button"
            className={`tmchat-devicebtn${device === 'desktop' ? ' active' : ''}`}
            aria-pressed={device === 'desktop'}
            onClick={() => switchDevice('desktop')}
          >
            <UiIcon name="monitor" size={14} /> Desktop
          </button>
          <button
            type="button"
            className={`tmchat-devicebtn${device === 'tablet' ? ' active' : ''}`}
            aria-pressed={device === 'tablet'}
            onClick={() => switchDevice('tablet')}
          >
            <UiIcon name="tablet" size={14} /> Tablet
          </button>
          <button
            type="button"
            className={`tmchat-devicebtn${device === 'mobile' ? ' active' : ''}`}
            aria-pressed={device === 'mobile'}
            onClick={() => switchDevice('mobile')}
          >
            <UiIcon name="smartphone" size={14} /> Mobile
          </button>
        </div>
        {item.website_url ? (
          <a
            className="tmchat-preview-open"
            href={item.website_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onEvent?.('live_preview_site_opened', { template_slug: item.template_slug })}
          >
            Open site <UiIcon name="external-link" size={12} />
          </a>
        ) : null}
        {item.purchase_url || item.url ? (
          <a
            className="tmchat-preview-cta"
            href={item.purchase_url ?? item.url ?? '#'}
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
              ? 'Use for free'
              : typeof item.price === 'number'
                ? `Buy — $${item.price}`
                : 'View template'}
          </a>
        ) : null}
      </div>
      <div ref={stageRef} className={`tmchat-preview-stage ${device}`}>
        {!loaded ? (
          <div className="tmchat-preview-loading" aria-live="polite">
            Loading live preview
            <span className="tmchat-dots">
              <span />
              <span />
              <span />
            </span>
          </div>
        ) : null}
        <iframe
          className="tmchat-preview-frame"
          src={item.website_url ?? undefined}
          title={`${item.name} — live template preview`}
          loading="eager"
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 240ms ease' }}
        />
      </div>
    </div>
  );
}

export const TemplateChat: React.FC<TemplateChatProps> = ({
  apiBase = 'https://templates.webflow.com/templates-api',
  turnstileSiteKey = '0x4AAAAAADzmfUVSu5s1hvW5',
  title = 'Template finder',
  launcherLabel = 'Find your template',
  placeholder = 'Describe the site you want to build…',
  welcomeMessage = 'Hi! Tell me about the site you want to build — the business, the look you like, and anything it must support (store, blog, member logins…) — and I’ll find templates that fit.',
  variant = 'floating',
  starterPrompts = DEFAULT_STARTERS,
  defaultOpen = false,
  defaultImmersive = false,
  enableAnalytics = true,
  sessionScope = 'marketplace',
  hostOverlaySelectors = '#transcend-consent-manager',
}) => {
  const isInline = variant === 'inline';
  const storageKey = getTemplateChatStorageKey(sessionScope);
  const inputLimitId = `tmchat-input-limit-${useId().replace(/:/g, '')}`;
  const introId = `tmchat-intro-${useId().replace(/:/g, '')}`;
  useMarketplaceComponentErrorTracking('TemplateChat', enableAnalytics);
  const [persisted] = useState<PersistedSession | null>(() =>
    typeof window === 'undefined' ? null : loadPersistedSession(storageKey),
  );
  const [open, setOpen] = useState(isInline || defaultOpen || Boolean(persisted?.open));
  const [immersive, setImmersive] = useState(defaultImmersive);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [hostOverlayBlocking, setHostOverlayBlocking] = useState(false);
  const [hostOverlayBottomInset, setHostOverlayBottomInset] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>(persisted?.messages ?? []);
  const [input, setInput] = useState('');
  const [introExpanded, setIntroExpanded] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [followups, setFollowups] = useState<string[]>(persisted?.followups ?? []);
  const [status, setStatus] = useState<AgentStatus>('thinking');
  const [pageAction, setPageAction] = useState<PageActionPayload | null>(null);
  const [working, setWorking] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [retryText, setRetryText] = useState<string | null>(persisted?.stoppedPrompt ?? null);
  const [stoppedPrompt, setStoppedPrompt] = useState<string | null>(persisted?.stoppedPrompt ?? null);
  // Template being live-previewed in the in-panel iframe (null = chat view).
  // Position/layout are kept for conversion attribution on the preview CTA.
  const [preview, setPreview] = useState<{ item: AgentTemplateItem; position: number; layout: string } | null>(null);
  const previewOpenedImmersiveRef = useRef<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamBatcherRef = useRef<TextDeltaBatcher | null>(null);
  const highlightMissesRef = useRef(createHighlightMissState());
  const pageActionTimersRef = useRef<PageActionTimers>(new Map());
  const turnstileRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);
  const contextTokenRef = useRef<string | null>(persisted?.contextToken ?? null);
  const atBottomRef = useRef(true);
  const workingRef = useRef(false);
  const warmedRef = useRef(false);
  // Templates verified by the agent's tools this conversation, keyed by slug.
  // Echoed back with each request so the stateless worker can compare or
  // re-display earlier results instead of "forgetting" them between turns.
  const knownTemplatesRef = useRef(new Map<string, AgentTemplateItem>(persisted?.known.map((item) => [item.template_slug, item])));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 560px)');
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  const syncHostOverlay = useCallback(() => {
    if (isInline || typeof window === 'undefined' || typeof document === 'undefined') {
      setHostOverlayBlocking(false);
      setHostOverlayBottomInset(0);
      return;
    }
    const blocking = isHostOverlayBlocking(document, hostOverlaySelectors, window.innerWidth, window.innerHeight);
    if (window.innerWidth <= 560) {
      setHostOverlayBlocking(blocking);
      setHostOverlayBottomInset(0);
      return;
    }
    setHostOverlayBlocking(false);
    setHostOverlayBottomInset(
      blocking
        ? getHostOverlayBottomInset(document, hostOverlaySelectors, window.innerWidth, window.innerHeight)
        : 0,
    );
  }, [hostOverlaySelectors, isInline]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const scheduledChecks = new Set<number>();
    const scheduleCheck = (delay: number) => {
      const timer = window.setTimeout(() => {
        scheduledChecks.delete(timer);
        syncHostOverlay();
      }, delay);
      scheduledChecks.add(timer);
    };
    const observer = new MutationObserver(syncHostOverlay);
    observer.observe(document.body, { childList: true });
    const onDocumentClick = () => {
      scheduleCheck(100);
      scheduleCheck(500);
    };
    document.addEventListener('click', onDocumentClick, { capture: true });
    window.addEventListener('resize', syncHostOverlay);
    for (const delay of [0, 500, 1500, 3000]) scheduleCheck(delay);
    return () => {
      observer.disconnect();
      document.removeEventListener('click', onDocumentClick, { capture: true });
      window.removeEventListener('resize', syncHostOverlay);
      for (const timer of scheduledChecks) window.clearTimeout(timer);
    };
  }, [syncHostOverlay]);

  useEffect(() => {
    if ((!hostOverlayBlocking && hostOverlayBottomInset === 0) || typeof window === 'undefined') return;
    const interval = window.setInterval(syncHostOverlay, 500);
    return () => window.clearInterval(interval);
  }, [hostOverlayBlocking, hostOverlayBottomInset, syncHostOverlay]);

  useEffect(() => {
    if (hostOverlayBlocking && !isInline && open) setOpen(false);
  }, [hostOverlayBlocking, isInline, open]);

  const isModalSurface = immersive || (!isInline && open && isMobileViewport);

  const starters = starterPrompts
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 6);

  const setWorkingState = useCallback((value: boolean) => {
    if (workingRef.current !== value) {
      workingRef.current = value;
      setWorking(value);
    }
  }, []);

  // Refs so track() stays referentially stable across immersive/turn changes.
  const immersiveRef = useRef(immersive);
  immersiveRef.current = immersive;
  const messageCountRef = useRef(messages.length);
  messageCountRef.current = messages.length;

  const track = useCallback<ChatTrack>(
    (scope, data = {}) => {
      trackMarketplaceEvent(
        'Code Component Event',
        {
          ...getSafeAnalyticsOverrides(),
          component: 'TemplateChat',
          scope,
          chat_variant: variant,
          chat_surface: immersiveRef.current ? 'immersive' : 'compact',
          chat_message_count: messageCountRef.current,
          ...data,
        },
        enableAnalytics,
      );
    },
    [enableAnalytics, variant],
  );

  // Open/collapse transitions (skips the initial render).
  const prevImmersiveRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevImmersiveRef.current !== null && prevImmersiveRef.current !== immersive) {
      track(immersive ? 'chat_expanded' : 'chat_collapsed');
    }
    prevImmersiveRef.current = immersive;
  }, [immersive, track]);

  const prevOpenRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevOpenRef.current === open) return;
    const isFirst = prevOpenRef.current === null;
    prevOpenRef.current = open;
    if (open) {
      track('chat_opened', {
        trigger: isFirst ? (isInline ? 'inline' : defaultOpen ? 'default_open' : persisted?.open ? 'restored' : 'launcher') : 'launcher',
      });
    } else if (!isFirst) {
      track('chat_closed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, track]);

  // Warm the worker (edge cold start + upstream TLS) before the first message.
  const warmUp = useCallback(() => {
    if (warmedRef.current || !apiBase) return;
    warmedRef.current = true;
    fetch(`${apiBase.replace(/\/+$/, '')}/health`).catch(() => {});
  }, [apiBase]);

  useEffect(() => {
    if (open) warmUp();
  }, [open, warmUp]);

  // Persist settled conversation state so the chat survives navigation/reload.
  useEffect(() => {
    if (streaming || typeof window === 'undefined') return;
    try {
      const state: PersistedSession = {
        messages: messages.slice(-MAX_PERSISTED_MESSAGES),
        followups,
        known: Array.from(knownTemplatesRef.current.values()).slice(-40),
        contextToken: contextTokenRef.current ?? undefined,
        stoppedPrompt: stoppedPrompt ?? undefined,
        open: isInline ? false : open,
      };
      window.sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage unavailable (private mode, iframe policy) — chat still works.
    }
  }, [messages, followups, open, stoppedPrompt, streaming, isInline, storageKey]);

  // Stick-to-bottom: only auto-follow when the reader is already at the end.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = near;
    setAtBottom(near);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = true;
    setAtBottom(true);
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : behavior });
  }, []);

  useEffect(() => {
    if (!atBottomRef.current) return;
    // Instant follow while streaming — queueing smooth scrolls on every SSE
    // delta fights the scroller and janks. Smooth only for discrete changes.
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: streaming || prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [messages, streaming, open, followups]);

  const focusOpenRef = useRef(open);
  useEffect(() => {
    const wasOpen = focusOpenRef.current;
    focusOpenRef.current = open;
    if (typeof window === 'undefined') return;
    const frame = window.requestAnimationFrame(() => {
      if (open) inputRef.current?.focus();
      else if (wasOpen && !isInline && !hostOverlayBlocking) launcherRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hostOverlayBlocking, immersive, isInline, open]);

  // Auto-grow the input with its content (1 -> ~4 rows).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  // FLIP the docked panel <-> immersive transition: measure before the layout
  // change (in the toggle handler), then play a single compositor-friendly
  // transform animation from the old box to the new one via WAAPI.
  const flipRectRef = useRef<DOMRect | null>(null);

  const setImmersiveAnimated = useCallback((next: boolean | ((current: boolean) => boolean)) => {
    flipRectRef.current = panelRef.current?.getBoundingClientRect() ?? null;
    setImmersive(next);
  }, []);

  const closePreview = useCallback(() => {
    const returnImmersive = getPreviewReturnImmersive(previewOpenedImmersiveRef.current, immersive);
    previewOpenedImmersiveRef.current = null;
    setPreview(null);
    if (returnImmersive !== immersive) setImmersiveAnimated(returnImmersive);
    inputRef.current?.focus();
  }, [immersive, setImmersiveAnimated]);

  useEffect(() => {
    const first = flipRectRef.current;
    flipRectRef.current = null;
    const el = panelRef.current;
    if (!first || !el || typeof el.animate !== 'function' || prefersReducedMotion()) return;
    const last = el.getBoundingClientRect();
    const sx = first.width / Math.max(last.width, 1);
    const sy = first.height / Math.max(last.height, 1);
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(1 - sx) < 0.01 && Math.abs(1 - sy) < 0.01) return;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: 'top left' },
        { transform: 'none', transformOrigin: 'top left' },
      ],
      { duration: 280, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    );
  }, [immersive]);

  // Immersive and phone-sized floating chats are modal surfaces: lock the page
  // behind them so swipe/keyboard interactions stay inside the conversation.
  useEffect(() => {
    if (!isModalSurface || typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isModalSurface]);

  // Keep Tab focus inside any modal conversation surface.
  useEffect(() => {
    if (!isModalSurface) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const root = panelRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true');
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isModalSurface]);

  // Esc closes the live preview first, then collapses the immersive state,
  // then closes a floating panel.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (preview) {
        closePreview();
      } else if (immersive) setImmersiveAnimated(false);
      else if (!isInline) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closePreview, open, immersive, isInline, preview, setImmersiveAnimated]);

  // The preview reads best on a wide canvas: opening one from a desktop docked
  // panel expands to immersive. Phones already use the full-screen surface, so
  // toggling desktop immersive state there would only reintroduce wide padding.
  const openPreview = useCallback(
    (item: AgentTemplateItem, position: number, layout: string) => {
      if (!item.website_url) return;
      previewOpenedImmersiveRef.current = immersive;
      setPreview({ item, position, layout });
      track('live_preview_opened', {
        template_slug: item.template_slug,
        source_position: position,
        display_layout: layout,
        is_free: item.is_free,
        price: item.price,
      });
      if (!immersive && !isMobileViewport) setImmersiveAnimated(true);
    },
    [immersive, isMobileViewport, setImmersiveAnimated, track],
  );

  // Card clicks to the template detail page — writes the same attribution
  // record TemplateGrid does, so the detail page's conversion tracker
  // credits purchases back to the chat.
  const handleTemplateClick = useCallback(
    (item: AgentTemplateItem, position: number, layout: string) => {
      writeTemplateAttribution(buildChatAttribution(item, position, layout));
      track('template_card_clicked', {
        template_slug: item.template_slug,
        source_position: position,
        display_layout: layout,
        is_free: item.is_free,
        price: item.price,
      });
    },
    [track],
  );

  // Preview toolbar events; the CTA also writes conversion attribution.
  const handlePreviewEvent = useCallback<ChatTrack>(
    (scope, data = {}) => {
      if (scope === 'live_preview_cta_clicked' && preview) {
        writeTemplateAttribution(buildChatAttribution(preview.item, preview.position, `preview:${preview.layout}`));
      }
      track(scope, data);
    },
    [preview, track],
  );

  useEffect(
    () => () => {
      streamAbortRef.current?.abort();
      streamBatcherRef.current?.cancel();
      clearPageActionTimers(pageActionTimersRef.current);
    },
    [],
  );

  const stopStreaming = useCallback(() => {
    streamBatcherRef.current?.flushNow();
    streamAbortRef.current?.abort();
    inputRef.current?.focus();
  }, []);

  const resetChat = useCallback(() => {
    streamAbortRef.current?.abort();
    streamBatcherRef.current?.cancel();
    clearPageActionTimers(pageActionTimersRef.current);
    highlightMissesRef.current.clear();
    knownTemplatesRef.current.clear();
    sessionTokenRef.current = null;
    sessionPromiseRef.current = null;
    contextTokenRef.current = null;
    setMessages([]);
    setFollowups([]);
    setPageAction(null);
    setInput('');
    setIntroExpanded(false);
    setRetryText(null);
    setStoppedPrompt(null);
    previewOpenedImmersiveRef.current = null;
    setPreview(null);
    track('chat_reset');
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors.
    }
    inputRef.current?.focus();
  }, [storageKey, track]);

  const getSessionToken = useCallback(async (): Promise<string> => {
    if (sessionTokenRef.current) return sessionTokenRef.current;
    if (sessionPromiseRef.current) return sessionPromiseRef.current;
    if (!turnstileSiteKey || !turnstileRef.current) throw new Error('Secure session is not configured.');

    sessionPromiseRef.current = (async () => {
      const challengeToken = await getTurnstileToken(turnstileRef.current!, turnstileSiteKey);
      const sessionToken = await requestTemplateAgentSession(apiBase, challengeToken);
      sessionTokenRef.current = sessionToken;
      return sessionToken;
    })().finally(() => {
      sessionPromiseRef.current = null;
    });
    return sessionPromiseRef.current;
  }, [apiBase, turnstileSiteKey]);

  const send = useCallback(
    async (text: string, baseOverride?: ChatMessage[], source: ChatMessageSource = 'input') => {
      const trimmed = limitTemplateChatInput(text).trim();
      if (!trimmed || streaming || !apiBase) return;

      setFollowups([]);
      setInput('');
      setRetryText(null);
      const stoppedBase = stoppedPrompt
        ? messages.slice(0, messages[messages.length - 1]?.role === 'assistant' ? -2 : -1)
        : messages;
      setStoppedPrompt(null);
      setStreaming(true);
      setStatus('thinking');
      setPageAction(null);
      setWorkingState(true);
      inputRef.current?.focus();
      atBottomRef.current = true;
      setAtBottom(true);

      const base = baseOverride ?? stoppedBase;
      const history = [...base, { role: 'user' as const, content: trimmed, displays: [] }];
      setMessages([...history, { role: 'assistant', content: '', displays: [] }]);

      const turn = history.filter((message) => message.role === 'user').length;
      const highlightMisses = highlightMissesRef.current.snapshot();
      const startedAt = Date.now();
      let displaysShown = 0;
      let templatesShown = 0;
      let pageActionsApplied = 0;
      let hadError = false;
      track('message_sent', buildMessageSentAnalytics(source, turn, trimmed));

      const controller = new AbortController();
      streamAbortRef.current = controller;

      const appendToAssistant = (updater: (message: ChatMessage) => ChatMessage) => {
        setMessages((current) => {
          const next = current.slice();
          const last = next[next.length - 1];
          if (last?.role === 'assistant') next[next.length - 1] = updater(last);
          return next;
        });
      };
      const textBatcher = createTextDeltaBatcher((delta) => {
        appendToAssistant((message) => ({ ...message, content: message.content + delta }));
      });
      streamBatcherRef.current?.cancel();
      streamBatcherRef.current = textBatcher;

      try {
        const response = await fetchAuthorizedAgentRequest({
          url: `${apiBase.replace(/\/+$/, '')}/api/templates/agent/chat`,
          getSessionToken,
          clearSessionToken: () => {
            sessionTokenRef.current = null;
          },
          clearContextToken: () => {
            contextTokenRef.current = null;
          },
          init: () => ({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              messages: prepareAgentMessages(history),
              context: {
                context_token: contextTokenRef.current ?? undefined,
                // Highlight failures from the previous turn (cards not rendered
                // under the page's current filters) — keeps the agent honest.
                highlight_misses: highlightMisses.length > 0 ? highlightMisses : undefined,
                // Wide canvases (immersive, or an inline panel rendered wide)
                // fit larger galleries; the agent sizes displays accordingly.
                surface: immersive || (panelRef.current?.clientWidth ?? 0) >= 720 ? 'immersive' : 'compact',
                // Whether the agent can drive this page's grid via update_page.
                has_page_grid: pageHasTemplateGrid(),
              },
            }),
          }),
        });
        if (!response.ok || !response.body) throw new Error(`Agent unavailable (${response.status}).`);
        highlightMissesRef.current.clear();

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let separator = buffer.indexOf('\n\n');
          while (separator >= 0) {
            const frame = buffer.slice(0, separator);
            buffer = buffer.slice(separator + 2);
            separator = buffer.indexOf('\n\n');

            const data = frame
              .split('\n')
              .filter((line) => line.startsWith('data: '))
              .map((line) => line.slice(6))
              .join('');
            if (!data) continue;

            let event: AgentSseEvent;
            try {
              event = JSON.parse(data) as AgentSseEvent;
            } catch {
              continue;
            }

            if (event.type === 'text_delta') {
              setWorkingState(false);
              textBatcher.push(event.text);
            } else if (event.type === 'status') {
              textBatcher.flushNow();
              setStatus(event.label);
              setWorkingState(true);
            } else if (event.type === 'display') {
              textBatcher.flushNow();
              setWorkingState(false);
              for (const entry of event.payload.items) knownTemplatesRef.current.set(entry.template_slug, entry.item);
              appendToAssistant((message) => ({ ...message, displays: [...message.displays, event.payload] }));
              if (event.payload.followups?.length) setFollowups(event.payload.followups);
              displaysShown += 1;
              templatesShown += event.payload.items.length;
              track('results_displayed', {
                turn,
                display_layout: event.payload.layout,
                result_count: event.payload.items.length,
                template_slugs: event.payload.items.map((entry) => entry.template_slug).join(','),
                followups_count: event.payload.followups?.length ?? 0,
              });
            } else if (event.type === 'page_action') {
              textBatcher.flushNow();
              setPageAction(event.payload);
              setWorkingState(true);
              applyPageAction(event.payload, highlightMissesRef.current, pageActionTimersRef.current);
              pageActionsApplied += 1;
              track('page_action_applied', {
                turn,
                action_sort: event.payload.sort ?? null,
                action_category: event.payload.category_group_slug ?? null,
                action_styles: (event.payload.styles ?? []).join(',') || null,
                action_free_only: event.payload.free_only ?? null,
                action_clear_filters: event.payload.clear_filters ?? null,
                action_q: event.payload.q ?? null,
                highlight_count: event.payload.highlight_slugs?.length ?? 0,
              });
            } else if (event.type === 'context') {
              textBatcher.flushNow();
              contextTokenRef.current = event.payload.context_token;
            } else if (event.type === 'error') {
              textBatcher.flushNow();
              hadError = true;
              track('chat_error', { turn, error_source: 'agent', message: String(event.message).slice(0, 200) });
              setRetryText(trimmed);
              appendToAssistant((message) => ({
                ...message,
                content: message.content || `Sorry — ${event.message}`,
              }));
            }
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          hadError = true;
          track('chat_error', {
            turn,
            error_source: 'connection',
            message: (error instanceof Error ? error.message : String(error)).slice(0, 200),
          });
          setRetryText(trimmed);
          appendToAssistant((message) => ({
            ...message,
            content: message.content || 'Sorry — I hit a connection problem.',
          }));
        }
      } finally {
        textBatcher.flushNow();
        if (streamBatcherRef.current === textBatcher) streamBatcherRef.current = null;
        if (controller.signal.aborted) {
          setRetryText(trimmed);
          setStoppedPrompt(trimmed);
          setMessages((current) => {
            const last = current[current.length - 1];
            return last?.role === 'assistant' && !last.content && last.displays.length === 0
              ? current.slice(0, -1)
              : current;
          });
        }
        setWorkingState(false);
        setStreaming(false);
        track('response_completed', {
          turn,
          duration_ms: Date.now() - startedAt,
          displays_shown: displaysShown,
          templates_shown: templatesShown,
          page_actions_applied: pageActionsApplied,
          had_error: hadError,
          stopped: controller.signal.aborted,
        });
      }
    },
    [apiBase, messages, stoppedPrompt, streaming, immersive, setWorkingState, track, getSessionToken],
  );

  if (!open) {
    const launcherStyle = hostOverlayBottomInset > 0 ? { bottom: hostOverlayBottomInset + 16 } : undefined;
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CHAT_STYLES }} />
        <button
          ref={launcherRef}
          type="button"
          className="tmchat-launcher"
          data-host-overlay-policy="yield"
          style={launcherStyle}
          hidden={hostOverlayBlocking}
          aria-hidden={hostOverlayBlocking || undefined}
          disabled={hostOverlayBlocking}
          onMouseEnter={warmUp}
          onClick={() => setOpen(true)}
        >
          <UiIcon name="sparkles" /> {launcherLabel}
        </button>
      </>
    );
  }

  const panelClass = `tmchat-panel entering${immersive ? ' immersive' : isInline ? ' inline' : ''}`;
  const panelStyle = !isInline && !immersive && hostOverlayBottomInset > 0
    ? {
        bottom: hostOverlayBottomInset + 16,
        height: `min(640px, calc(100vh - ${hostOverlayBottomInset + 32}px))`,
      }
    : undefined;
  const showConversationChips = !streaming && followups.length > 0;
  const showStarterChips = !streaming && messages.length === 0 && starters.length > 0;
  const showRetry = !streaming && retryText !== null;
  const hasDisplayedResults = messages.some((message) => message.displays.length > 0);
  const lastIndex = messages.length - 1;
  const latestAssistant = messages.slice().reverse().find((message) => message.role === 'assistant');
  const latestResultCount = latestAssistant?.displays.reduce((count, display) => count + display.items.length, 0) ?? 0;
  const outcomeAnnouncement = !streaming && !stoppedPrompt && latestAssistant
    ? [
        latestAssistant.content.trim(),
        latestResultCount > 0
          ? `${latestResultCount} template ${latestResultCount === 1 ? 'recommendation is' : 'recommendations are'} ready.`
          : '',
      ].filter(Boolean).join(' ')
    : '';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CHAT_STYLES }} />
      {immersive ? (
        <div
          className="tmchat-backdrop"
          onClick={() => {
            // Layered dismissal, matching Esc: leave the preview first, then
            // the immersive state — never both in one click.
            if (preview) closePreview();
            else setImmersiveAnimated(false);
          }}
        />
      ) : null}
      <div
        ref={panelRef}
        className={panelClass}
        style={panelStyle}
        role={isInline && !immersive ? undefined : 'dialog'}
        aria-label={title}
        aria-modal={isModalSurface || undefined}
      >
        <div className="tmchat-header">
          <span className="tmchat-header-title">{title}</span>
          <div className="tmchat-header-actions">
            {messages.length > 0 ? (
              <button type="button" className="tmchat-iconbtn" aria-label="New chat" title="New chat" onClick={resetChat}>
                <UiIcon name="refresh-cw" />
              </button>
            ) : null}
            <button
              type="button"
              className="tmchat-iconbtn tmchat-expand"
              aria-label={immersive ? 'Exit fullscreen' : 'Expand to fullscreen'}
              title={immersive ? 'Exit fullscreen' : 'Expand'}
              onClick={() => setImmersiveAnimated((current) => !current)}
            >
              <UiIcon name={immersive ? 'minimize-2' : 'maximize-2'} />
            </button>
            {!isInline || immersive ? (
              <button
                type="button"
                className="tmchat-iconbtn"
                aria-label="Close chat"
                onClick={() => {
                  previewOpenedImmersiveRef.current = null;
                  setPreview(null);
                  if (immersive) setImmersiveAnimated(false);
                  if (!isInline) setOpen(false);
                }}
              >
                <UiIcon name="x" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="tmchat-body">
        <div className="tmchat-scrollwrap">
        <div ref={scrollRef} className="tmchat-scroll" onScroll={handleScroll}>
          {messages.length === 0 ? (
            <div className="tmchat-msg assistant">{welcomeMessage}</div>
          ) : (
            <div className="tmchat-intro">
              <button
                type="button"
                className="tmchat-intro-toggle"
                aria-expanded={introExpanded}
                aria-controls={introId}
                onClick={() => setIntroExpanded((current) => !current)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  setIntroExpanded((current) => !current);
                }}
              >
                How Template finder works
              </button>
              <div id={introId} className="tmchat-intro-copy" hidden={!introExpanded}>{welcomeMessage}</div>
            </div>
          )}
          {showStarterChips ? (
            <div className="tmchat-followups">
              {starters.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  className="tmchat-chip"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => void send(suggestion, undefined, 'starter')}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
          {messages.map((message, index) => (
            <React.Fragment key={index}>
              {message.content ? (
                <div className={`tmchat-msg ${message.role}`}>
                  {renderMessageText(message.content)}
                  {streaming && index === lastIndex && message.role === 'assistant' && !working ? (
                    <span className="tmchat-caret" aria-hidden="true" />
                  ) : null}
                </div>
              ) : null}
              {message.displays.map((payload, displayIndex) => (
                <DisplayArtifact key={displayIndex} payload={payload} onPreview={openPreview} onTemplateClick={handleTemplateClick} />
              ))}
            </React.Fragment>
          ))}
          {outcomeAnnouncement ? (
            <div className="tmchat-outcome-announcement tmchat-sr-only" role="status" aria-live="polite" aria-atomic="true">
              {outcomeAnnouncement}
            </div>
          ) : null}
          {streaming && working ? (
            <AgentProgress status={status} pageAction={pageAction} />
          ) : null}
          {!streaming && stoppedPrompt ? <div className="tmchat-turn-status" role="status">Stopped</div> : null}
          {showRetry ? (
            <div className="tmchat-followups">
              <button
                type="button"
                className="tmchat-chip"
                onClick={() => {
                  if (!retryText) return;
                  const base = stoppedPrompt
                    ? messages.slice(0, messages[messages.length - 1]?.role === 'assistant' ? -2 : -1)
                    : messages.slice(0, -2);
                  void send(retryText, base, 'retry');
                }}
              >
                Try again
              </button>
            </div>
          ) : null}
          {showConversationChips ? (
            <div className="tmchat-refine">
              {hasDisplayedResults ? <div className="tmchat-refine-label">Refine these results</div> : null}
              <div className="tmchat-followups">
                {followups.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="tmchat-chip"
                    style={{ animationDelay: `${120 + index * 50}ms` }}
                    onClick={() => void send(suggestion, undefined, 'followup')}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {!atBottom && messages.length > 0 ? (
          <button type="button" className="tmchat-jump" onClick={() => scrollToBottom('smooth')}>
            <UiIcon name="arrow-down" size={14} /> Latest
          </button>
        ) : null}
        </div>

        <div ref={turnstileRef} className="tmchat-turnstile" aria-live="polite" />
        <div className="tmchat-inputrow">
          <div className="tmchat-inputfield">
            <textarea
              ref={inputRef}
              className="tmchat-input"
              rows={1}
              maxLength={MAX_REQUEST_MESSAGE_CHARS}
              aria-label="Describe the site you want to build"
              aria-describedby={inputLimitId}
              placeholder={placeholder}
              value={input}
              onChange={(event) => setInput(limitTemplateChatInput(event.target.value))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
            />
            <div id={inputLimitId} className="tmchat-inputmeta">
              {input.length.toLocaleString()} / {MAX_REQUEST_MESSAGE_CHARS.toLocaleString()} character limit
            </div>
          </div>
          {streaming ? (
            <button type="button" className="tmchat-send stop" onClick={stopStreaming}>
              Stop
            </button>
          ) : (
            <button type="button" className="tmchat-send" disabled={!input.trim()} onClick={() => void send(input)}>
              Send
            </button>
          )}
        </div>

        {preview ? (
          <TemplatePreviewPane
            key={preview.item.template_slug}
            item={preview.item}
            onEvent={handlePreviewEvent}
            onClose={closePreview}
          />
        ) : null}
        </div>
      </div>
    </>
  );
};

export default TemplateChat;

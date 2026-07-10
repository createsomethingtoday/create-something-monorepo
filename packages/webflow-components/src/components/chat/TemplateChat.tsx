import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TemplateCard, TEMPLATE_CARD_STYLES } from '../cards/TemplateCard';
import { trackMarketplaceEvent, type MarketplaceAnalyticsData } from '../marketplace/analytics';
import { useMarketplaceComponentErrorTracking } from '../marketplace/MarketplaceComponentErrorBoundary';
import {
  getSafeAnalyticsOverrides,
  writeTemplateAttribution,
  MARKETPLACE_SIGNAL_WINDOW,
  type TemplateMarketplaceAttribution,
} from '../marketplace/templateAttribution';

// ── Agent protocol (mirrors webflow-template-agent) ───────────────────────────

type DisplayLayout = 'gallery' | 'carousel' | 'spotlight' | 'comparison' | 'shortlist';

interface AgentTemplateItem {
  template_slug: string;
  name: string;
  url: string | null;
  /** Published .webflow.io site — frameable on *.webflow.com, used for live previews. */
  website_url?: string | null;
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
interface PageActionPayload {
  q?: string | null;
  category_group_slug?: string | null;
  styles?: string[] | null;
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
  // Continuity snapshot from the (stateless) agent worker: templates verified
  // by tools this conversation. Echoed back as `context` on the next request
  // so follow-up turns can compare/re-display without re-searching.
  | { type: 'context'; payload: { known_templates: AgentTemplateItem[] } }
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
}

const DEFAULT_STARTERS =
  'A portfolio with bold animations, An online store for a clothing brand, A restaurant site with a menu, A SaaS landing page with a blog';

const STATUS_LABELS: Record<AgentStatus, string> = {
  thinking: 'Thinking',
  searching: 'Searching templates',
  curating: 'Curating picks',
};

const STORAGE_KEY = 'tmchat-session-v1';
const MAX_PERSISTED_MESSAGES = 30;

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
.tmchat-backdrop {
  position: fixed; inset: 0; z-index: 9000;
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
}
.tmchat-panel.entering { animation: tmchat-in 220ms cubic-bezier(0.2, 0, 0, 1); }
@keyframes tmchat-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
.tmchat-panel.inline {
  position: relative; right: auto; bottom: auto; z-index: auto;
  width: 100%; height: 100%; min-height: 560px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.tmchat-panel.immersive {
  position: fixed; top: 24px; bottom: 24px; left: 0; right: 0; margin: 0 auto; z-index: 9001;
  width: min(1120px, calc(100vw - 48px)); height: auto; min-height: 0;
  border-radius: 16px; box-shadow: 0 24px 80px rgba(0,0,0,0.3);
}
.tmchat-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 14px 16px; border-bottom: 1px solid #ececec; background: #fafafa;
}
.tmchat-header-title { font-weight: 600; font-size: 15px; }
.tmchat-panel.immersive .tmchat-header-title { font-size: 16px; }
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
.tmchat-panel.immersive .tmchat-grid { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
.tmchat-panel.immersive .tmchat-grid.single { grid-template-columns: minmax(0, 420px); }
.tmchat-strip { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; -webkit-overflow-scrolling: touch; }
.tmchat-strip > * { flex: 0 0 220px; }
.tmchat-panel.immersive .tmchat-strip > * { flex-basis: 260px; }
.tmchat-followups { display: flex; flex-wrap: wrap; gap: 8px; }
.tmchat-chip {
  border: 1px solid #dbe6fb; border-radius: 999px; background: #f2f7ff;
  color: #0f5cd0; padding: 7px 12px; font-size: 13px; cursor: pointer; font-family: inherit;
  transition: background 140ms ease, transform 140ms ease;
}
.tmchat-chip:hover { background: #e3edfd; transform: translateY(-1px); }
.tmchat-chip:active { transform: translateY(0); }
.tmchat-typing { align-self: flex-start; color: #757575; font-size: 13px; display: inline-flex; align-items: baseline; gap: 6px; }
.tmchat-dots { display: inline-flex; gap: 3px; }
.tmchat-dots span {
  width: 4px; height: 4px; border-radius: 50%; background: #757575;
  animation: tmchat-pulse 1.2s ease-in-out infinite;
}
.tmchat-dots span:nth-child(2) { animation-delay: 0.15s; }
.tmchat-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes tmchat-pulse { 0%, 60%, 100% { opacity: 0.25; } 30% { opacity: 1; } }
.tmchat-jump {
  position: absolute; bottom: 78px; left: 50%; transform: translateX(-50%); z-index: 3;
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid #e0e0e0; border-radius: 999px; background: #fff; color: #080808;
  padding: 6px 12px; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.14);
  animation: tmchat-chip-in 200ms cubic-bezier(0.2, 0, 0, 1) both;
}
.tmchat-jump:hover { background: #f5f5f5; }
.tmchat-inputrow { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #ececec; background: #fff; }
.tmchat-panel.immersive .tmchat-inputrow { padding: 14px clamp(16px, 5vw, 56px) 18px; }
.tmchat-panel.immersive .tmchat-scroll { padding: 24px clamp(16px, 5vw, 56px) 32px; gap: 14px; }
.tmchat-input {
  flex: 1 1 auto; min-height: 40px; max-height: 120px; padding: 9px 12px;
  border: 1px solid #e0e0e0; border-radius: 8px; font: inherit; resize: none; overflow-y: auto;
}
.tmchat-input:focus-visible { outline: 2px solid #146ef5; outline-offset: 1px; }
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
  animation: tmchat-fade 180ms ease both;
}
.tmchat-preview-bar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 14px; border-bottom: 1px solid #ececec; background: #fff;
}
.tmchat-panel.immersive .tmchat-preview-bar { padding: 10px clamp(16px, 5vw, 56px); }
.tmchat-preview-back {
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid #e0e0e0; border-radius: 8px; background: #fff; color: #080808;
  padding: 7px 12px; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
}
.tmchat-preview-back:hover { background: #f5f5f5; }
.tmchat-preview-meta { display: flex; flex-direction: column; min-width: 0; margin-right: auto; }
.tmchat-preview-name { font-size: 14px; font-weight: 600; color: #080808; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tmchat-preview-creator { font-size: 12px; color: #757575; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tmchat-devicetoggle { display: inline-flex; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
.tmchat-devicebtn {
  display: inline-flex; align-items: center; gap: 6px;
  border: 0; background: #fff; color: #757575; padding: 7px 12px;
  font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
}
.tmchat-devicebtn + .tmchat-devicebtn { border-left: 1px solid #e0e0e0; }
.tmchat-devicebtn.active { background: #f0f5ff; color: #146ef5; }
.tmchat-preview-cta {
  display: inline-flex; align-items: center; gap: 6px; text-decoration: none;
  border-radius: 8px; background: #146ef5; color: #fff; padding: 8px 14px;
  font-family: inherit; font-size: 13px; font-weight: 600;
}
.tmchat-preview-cta:hover { background: #0f5cd0; }
.tmchat-preview-open { display: inline-flex; align-items: center; gap: 5px; color: #757575; font-size: 12px; text-decoration: none; }
.tmchat-preview-open:hover { color: #080808; }
.tmchat-preview-stage {
  position: relative; flex: 1 1 auto; min-height: 0; overflow: auto;
  display: flex; justify-content: center; background: #f2f2f2; padding: 0;
}
.tmchat-preview-stage.mobile { padding: 20px 16px; }
.tmchat-preview-frame { border: 0; background: #fff; width: 100%; height: 100%; display: block; }
.tmchat-preview-stage.mobile .tmchat-preview-frame {
  width: 390px; max-width: 100%; height: 100%; flex: 0 0 auto;
  border: 1px solid #d9d9d9; border-radius: 20px; box-shadow: 0 12px 40px rgba(0,0,0,0.14);
}
.tmchat-preview-loading {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: #757575; font-size: 13px; pointer-events: none;
}
@media (max-width: 560px) {
  .tmchat-panel { right: 8px; bottom: 8px; width: calc(100vw - 16px); height: calc(100vh - 16px); }
  .tmchat-panel.immersive { top: 0; bottom: 0; width: 100vw; border-radius: 0; }
  .tmchat-grid, .tmchat-panel.immersive .tmchat-grid { grid-template-columns: 1fr; }
  .tmchat-preview-stage.mobile { padding: 0; }
  .tmchat-preview-stage.mobile .tmchat-preview-frame { width: 100%; border: 0; border-radius: 0; box-shadow: none; }
}
@media (prefers-reduced-motion: reduce) {
  .tmchat-panel.entering, .tmchat-backdrop, .tmchat-dots span, .tmchat-caret,
  .tmchat-msg, .tmchat-display, .tmchat-typing, .tmchat-followups .tmchat-chip,
  .tmchat-jump, .tmchat-grid > div, .tmchat-strip > div, .tmchat-preview { animation: none; }
  .tmchat-chip, .tmchat-send, .tmchat-launcher { transition: none; }
  .tmchat-chip:hover, .tmchat-launcher:hover, .tmchat-send:active:not(:disabled) { transform: none; }
}
` + TEMPLATE_CARD_STYLES;

// Standardized 16px stroke icons (Feather-style geometry, currentColor) —
// Unicode glyphs render inconsistently across platforms/fonts.
function ChatIcon({
  name,
  size = 16,
}: {
  name: 'sparkle' | 'refresh' | 'expand' | 'collapse' | 'close' | 'down' | 'back' | 'external' | 'desktop' | 'mobile';
  size?: number;
}): React.ReactElement {
  const paths: Record<string, React.ReactNode> = {
    back: (
      <>
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </>
    ),
    external: (
      <>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </>
    ),
    desktop: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </>
    ),
    mobile: (
      <>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <line x1="11" y1="18" x2="13" y2="18" />
      </>
    ),
    sparkle: <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="currentColor" stroke="none" />,
    refresh: (
      <>
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </>
    ),
    expand: (
      <>
        <polyline points="15 3 21 3 21 9" />
        <polyline points="9 21 3 21 3 15" />
        <line x1="21" y1="3" x2="14" y2="10" />
        <line x1="3" y1="21" x2="10" y2="14" />
      </>
    ),
    collapse: (
      <>
        <polyline points="4 14 10 14 10 20" />
        <polyline points="20 10 14 10 14 4" />
        <line x1="14" y1="10" x2="21" y2="3" />
        <line x1="3" y1="21" x2="10" y2="14" />
      </>
    ),
    close: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
    down: (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

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
  open: boolean;
}

function loadPersistedSession(): PersistedSession | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
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
      open: Boolean(parsed.open),
    };
  } catch {
    return null;
  }
}

// ── Page control (agent drives the host page's grid/filters) ─────────────────

// Detect the marketplace grid components on the host page. Used both to tell
// the agent whether update_page is meaningful and to target highlights.
// Webflow mounts each code component in an isolated (open) shadow root, so a
// plain document.querySelector can never see a grid rendered by a *different*
// component on the page. Walk open shadow roots (bounded depth) to find them.
function deepQuerySelectorAll(selector: string): Element[] {
  if (typeof document === 'undefined') return [];
  const found: Element[] = [];
  const visit = (root: ParentNode, depth: number) => {
    found.push(...Array.from(root.querySelectorAll(selector)));
    if (depth >= 3) return;
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
      if (el.shadowRoot) visit(el.shadowRoot, depth + 1);
    }
  };
  visit(document, 0);
  return found;
}

const GRID_MARKER_SELECTOR = '[data-template-slug], .tmgrid-grid, .tmgrid-item, .tmsearch-page';

function pageHasTemplateGrid(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.querySelector(GRID_MARKER_SELECTOR)) return true;
  return deepQuerySelectorAll(GRID_MARKER_SELECTOR).length > 0;
}

// Apply an agent page action through the marketplace components' shared
// contract: write URL params, then dispatch templateFiltersChanged so
// TemplateGrid / sidebar / heading re-read and re-fetch.
function applyPageAction(payload: PageActionPayload): void {
  if (typeof window === 'undefined') return;
  const hasFilterChange =
    Boolean(payload.clear_filters) ||
    payload.q != null ||
    payload.category_group_slug != null ||
    payload.styles != null ||
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
  }

  if (payload.highlight_slugs?.length) {
    // The grid re-fetches after a filter change; retry until the cards exist.
    highlightPageTemplates(payload.highlight_slugs, 0);
  }
}

function highlightPageTemplates(slugs: string[], attempt: number): void {
  if (typeof document === 'undefined' || slugs.length === 0) return;
  // One shadow-piercing sweep for all cards, then match requested slugs.
  const bySlug = new Map<string, HTMLElement>();
  for (const el of deepQuerySelectorAll('[data-template-slug]')) {
    const slug = el.getAttribute('data-template-slug');
    if (slug && el instanceof HTMLElement && !bySlug.has(slug)) bySlug.set(slug, el);
  }
  const found = slugs
    .map((slug) => bySlug.get(slug))
    .filter((el): el is HTMLElement => Boolean(el));

  if (found.length === 0) {
    if (attempt < 16) window.setTimeout(() => highlightPageTemplates(slugs, attempt + 1), 500);
    return;
  }

  const reduced = prefersReducedMotion();
  for (const el of found) {
    // Inline styles + WAAPI: chat styles can't reach the grid's isolated root.
    const previousOutline = el.style.outline;
    const previousOffset = el.style.outlineOffset;
    el.style.outline = '3px solid #146ef5';
    el.style.outlineOffset = '4px';
    window.setTimeout(() => {
      el.style.outline = previousOutline;
      el.style.outlineOffset = previousOffset;
    }, 5200);
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
  const showReasons = payload.layout === 'shortlist' || payload.layout === 'spotlight' || payload.layout === 'comparison';

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
        agentNote={showReasons ? entry.reason : undefined}
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
        <div className={`tmchat-grid${isSingle ? ' single' : ''}`}>{cards}</div>
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
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [loaded, setLoaded] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backRef.current?.focus();
  }, []);

  return (
    <div className="tmchat-preview" role="region" aria-label={`Live preview of ${item.name}`}>
      <div className="tmchat-preview-bar">
        <button ref={backRef} type="button" className="tmchat-preview-back" onClick={onClose}>
          <ChatIcon name="back" size={14} /> Back to chat
        </button>
        <div className="tmchat-preview-meta">
          <span className="tmchat-preview-name">{item.name}</span>
          {item.creator_name ? <span className="tmchat-preview-creator">by {item.creator_name}</span> : null}
        </div>
        <div className="tmchat-devicetoggle" role="group" aria-label="Preview device">
          <button
            type="button"
            className={`tmchat-devicebtn${device === 'desktop' ? ' active' : ''}`}
            aria-pressed={device === 'desktop'}
            onClick={() => {
              setDevice('desktop');
              onEvent?.('live_preview_device_changed', { template_slug: item.template_slug, device: 'desktop' });
            }}
          >
            <ChatIcon name="desktop" size={14} /> Desktop
          </button>
          <button
            type="button"
            className={`tmchat-devicebtn${device === 'mobile' ? ' active' : ''}`}
            aria-pressed={device === 'mobile'}
            onClick={() => {
              setDevice('mobile');
              onEvent?.('live_preview_device_changed', { template_slug: item.template_slug, device: 'mobile' });
            }}
          >
            <ChatIcon name="mobile" size={14} /> Mobile
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
            Open site <ChatIcon name="external" size={12} />
          </a>
        ) : null}
        {item.url ? (
          <a
            className="tmchat-preview-cta"
            href={item.url}
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
      <div className={`tmchat-preview-stage${device === 'mobile' ? ' mobile' : ''}`}>
        {!loaded ? <div className="tmchat-preview-loading">Loading live preview…</div> : null}
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
  title = 'Template assistant',
  launcherLabel = 'Find your template',
  placeholder = 'Describe the site you want to build…',
  welcomeMessage = 'Hi! Tell me about the site you want to build — the business, the look you like, and anything it must support (store, blog, member logins…) — and I’ll find templates that fit.',
  variant = 'floating',
  starterPrompts = DEFAULT_STARTERS,
  defaultOpen = false,
  defaultImmersive = false,
  enableAnalytics = true,
}) => {
  const isInline = variant === 'inline';
  useMarketplaceComponentErrorTracking('TemplateChat', enableAnalytics);
  const [persisted] = useState<PersistedSession | null>(() =>
    typeof window === 'undefined' ? null : loadPersistedSession(),
  );
  const [open, setOpen] = useState(isInline || defaultOpen || Boolean(persisted?.open));
  const [immersive, setImmersive] = useState(defaultImmersive);
  const [messages, setMessages] = useState<ChatMessage[]>(persisted?.messages ?? []);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [followups, setFollowups] = useState<string[]>(persisted?.followups ?? []);
  const [status, setStatus] = useState<AgentStatus>('thinking');
  const [working, setWorking] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [retryText, setRetryText] = useState<string | null>(null);
  // Template being live-previewed in the in-panel iframe (null = chat view).
  // Position/layout are kept for conversion attribution on the preview CTA.
  const [preview, setPreview] = useState<{ item: AgentTemplateItem; position: number; layout: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const atBottomRef = useRef(true);
  const workingRef = useRef(false);
  const warmedRef = useRef(false);
  // Templates verified by the agent's tools this conversation, keyed by slug.
  // Echoed back with each request so the stateless worker can compare or
  // re-display earlier results instead of "forgetting" them between turns.
  const knownTemplatesRef = useRef(new Map<string, AgentTemplateItem>(persisted?.known.map((item) => [item.template_slug, item])));

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
        open: isInline ? false : open,
      };
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable (private mode, iframe policy) — chat still works.
    }
  }, [messages, followups, open, streaming, isInline]);

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

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, immersive]);

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

  // Immersive is a modal: lock the page scroll behind the backdrop.
  useEffect(() => {
    if (!immersive || typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [immersive]);

  // Keep Tab focus inside the immersive dialog.
  useEffect(() => {
    if (!immersive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const root = panelRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, a[href], textarea, input, [tabindex]:not([tabindex="-1"])',
      );
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
  }, [immersive]);

  // Esc closes the live preview first, then collapses the immersive state,
  // then closes a floating panel.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (preview) setPreview(null);
      else if (immersive) setImmersiveAnimated(false);
      else if (!isInline) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, immersive, isInline, preview, setImmersiveAnimated]);

  // The preview reads best on a wide canvas: opening one from the docked
  // panel expands to immersive; closing the preview returns to the chat as-is.
  const openPreview = useCallback(
    (item: AgentTemplateItem, position: number, layout: string) => {
      if (!item.website_url) return;
      setPreview({ item, position, layout });
      track('live_preview_opened', {
        template_slug: item.template_slug,
        source_position: position,
        display_layout: layout,
        is_free: item.is_free,
        price: item.price,
      });
      if (!immersive) setImmersiveAnimated(true);
    },
    [immersive, setImmersiveAnimated, track],
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

  useEffect(() => () => streamAbortRef.current?.abort(), []);

  const stopStreaming = useCallback(() => {
    streamAbortRef.current?.abort();
  }, []);

  const resetChat = useCallback(() => {
    streamAbortRef.current?.abort();
    knownTemplatesRef.current.clear();
    setMessages([]);
    setFollowups([]);
    setInput('');
    setRetryText(null);
    setPreview(null);
    track('chat_reset');
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
    inputRef.current?.focus();
  }, [track]);

  const send = useCallback(
    async (text: string, baseOverride?: ChatMessage[], source: 'input' | 'starter' | 'followup' | 'retry' = 'input') => {
      const trimmed = text.trim();
      if (!trimmed || streaming || !apiBase) return;

      setFollowups([]);
      setInput('');
      setRetryText(null);
      setStreaming(true);
      setStatus('thinking');
      setWorkingState(true);
      atBottomRef.current = true;
      setAtBottom(true);

      const base = baseOverride ?? messages;
      const history = [...base, { role: 'user' as const, content: trimmed, displays: [] }];
      setMessages([...history, { role: 'assistant', content: '', displays: [] }]);

      const turn = history.filter((message) => message.role === 'user').length;
      const startedAt = Date.now();
      let displaysShown = 0;
      let templatesShown = 0;
      let pageActionsApplied = 0;
      let hadError = false;
      track('message_sent', {
        source,
        turn,
        message: trimmed.slice(0, 200),
        message_length: trimmed.length,
      });

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

      try {
        const response = await fetch(`${apiBase.replace(/\/+$/, '')}/api/templates/agent/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history.map((message) => ({ role: message.role, content: message.content })),
            context: {
              known_templates: Array.from(knownTemplatesRef.current.values()).slice(-40),
              // Wide canvases (immersive, or an inline panel rendered wide)
              // fit larger galleries; the agent sizes displays accordingly.
              surface: immersive || (panelRef.current?.clientWidth ?? 0) >= 720 ? 'immersive' : 'compact',
              // Whether the agent can drive this page's grid via update_page.
              has_page_grid: pageHasTemplateGrid(),
            },
          }),
        });
        if (!response.ok || !response.body) throw new Error(`Agent unavailable (${response.status}).`);

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
              appendToAssistant((message) => ({ ...message, content: message.content + event.text }));
            } else if (event.type === 'status') {
              setStatus(event.label);
              setWorkingState(true);
            } else if (event.type === 'display') {
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
              applyPageAction(event.payload);
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
              for (const item of event.payload.known_templates ?? []) {
                if (item?.template_slug) knownTemplatesRef.current.set(item.template_slug, item);
              }
            } else if (event.type === 'error') {
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
    [apiBase, messages, streaming, immersive, setWorkingState, track],
  );

  if (!open) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CHAT_STYLES }} />
        <button type="button" className="tmchat-launcher" onMouseEnter={warmUp} onClick={() => setOpen(true)}>
          <ChatIcon name="sparkle" /> {launcherLabel}
        </button>
      </>
    );
  }

  const panelClass = `tmchat-panel entering${immersive ? ' immersive' : isInline ? ' inline' : ''}`;
  const showConversationChips = !streaming && followups.length > 0;
  const showStarterChips = !streaming && messages.length === 0 && starters.length > 0;
  const showRetry = !streaming && retryText !== null;
  const lastIndex = messages.length - 1;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CHAT_STYLES }} />
      {immersive ? <div className="tmchat-backdrop" onClick={() => setImmersiveAnimated(false)} /> : null}
      <div ref={panelRef} className={panelClass} role={isInline && !immersive ? undefined : 'dialog'} aria-label={title}>
        <div className="tmchat-header">
          <span className="tmchat-header-title">{title}</span>
          <div className="tmchat-header-actions">
            {messages.length > 0 ? (
              <button type="button" className="tmchat-iconbtn" aria-label="New chat" title="New chat" onClick={resetChat}>
                <ChatIcon name="refresh" />
              </button>
            ) : null}
            <button
              type="button"
              className="tmchat-iconbtn"
              aria-label={immersive ? 'Exit fullscreen' : 'Expand to fullscreen'}
              title={immersive ? 'Exit fullscreen' : 'Expand'}
              onClick={() => setImmersiveAnimated((current) => !current)}
            >
              <ChatIcon name={immersive ? 'collapse' : 'expand'} />
            </button>
            {!isInline || immersive ? (
              <button
                type="button"
                className="tmchat-iconbtn"
                aria-label="Close chat"
                onClick={() => {
                  setPreview(null);
                  if (immersive) setImmersiveAnimated(false);
                  if (!isInline) setOpen(false);
                }}
              >
                <ChatIcon name="close" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="tmchat-body">
        <div ref={scrollRef} className="tmchat-scroll" onScroll={handleScroll}>
          <div className="tmchat-msg assistant">{welcomeMessage}</div>
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
          {streaming && working ? (
            <div className="tmchat-typing" aria-live="polite">
              {STATUS_LABELS[status]}
              <span className="tmchat-dots">
                <span />
                <span />
                <span />
              </span>
            </div>
          ) : null}
          {showRetry ? (
            <div className="tmchat-followups">
              <button
                type="button"
                className="tmchat-chip"
                onClick={() => {
                  if (!retryText) return;
                  const base = messages.slice(0, -2);
                  void send(retryText, base, 'retry');
                }}
              >
                Try again
              </button>
            </div>
          ) : null}
          {showConversationChips ? (
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
          ) : null}
        </div>

        {!atBottom && messages.length > 0 ? (
          <button type="button" className="tmchat-jump" onClick={() => scrollToBottom('smooth')}>
            <ChatIcon name="down" size={14} /> Latest
          </button>
        ) : null}

        <div className="tmchat-inputrow">
          <textarea
            ref={inputRef}
            className="tmchat-input"
            rows={1}
            placeholder={placeholder}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
          />
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
          <TemplatePreviewPane key={preview.item.template_slug} item={preview.item} onEvent={handlePreviewEvent} onClose={() => setPreview(null)} />
        ) : null}
        </div>
      </div>
    </>
  );
};

export default TemplateChat;

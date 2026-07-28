import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { UiIcon } from '../primitives/UiIcon';
import { trackMarketplaceEvent } from '../marketplace/analytics';
import { useMarketplaceComponentErrorTracking } from '../marketplace/MarketplaceComponentErrorBoundary';
import { getSafeAnalyticsOverrides, writeTemplateAttribution } from '../marketplace/templateAttribution';
import {
  fetchAuthorizedAgentRequest,
  MAX_REQUEST_MESSAGE_CHARS,
  prepareAgentMessages,
  requestTemplateAgentSession,
} from './templateAgentSession';
import {
  applyHostInert,
  createHighlightMissState,
  createTextDeltaBatcher,
  findFixedPositionBreaker,
  findHostPageBranch,
  getHostOverlayBottomInset,
  isHostOverlayBlocking,
  prefersReducedMotion,
  type PlacementAncestor,
  type TextDeltaBatcher,
} from './templateChatRuntime';
import type { AgentSseEvent, AgentTemplateItem, ChatMessage } from './templateChatProtocol';
import {
  AgentProgress,
  createAgentProgressState,
  getAgentOutcomeReceipt,
  getAgentProgressVisibility,
  reduceAgentProgress,
  type AgentProgressEvent,
  type AgentProgressState,
} from './templateChatProgress';
import {
  applyPageAction,
  clearPageActionTimers,
  normalizePageActionPayload,
  pageActionChangesFilters,
  pageHasTemplateGrid,
  undoPageAction,
  type PageActionTimers,
} from './templateChatPageAction';
import {
  getPreviewReturnImmersive,
  getRetryBaseMessages,
  getTemplateChatStorageKey,
  limitTemplateChatInput,
  loadPersistedSession,
  MAX_PERSISTED_KNOWN_TEMPLATES,
  MAX_PERSISTED_MESSAGES,
  serializePersistedSession,
  SLOW_TURN_MS,
  type PersistedSession,
} from './templateChatPersistence';
import { safePreviewUrl } from './templateChatSafety';
import {
  resolveTemplateChatStrings,
  type TemplateChatStringsOverride,
} from './templateChatStrings';
import { getTurnstileToken } from './templateChatTurnstile';
import {
  classifyAgentResponseFailure,
  classifyAgentStreamFailure,
  createStreamWatchdog,
  AGENT_REQUEST_TIMEOUT_MS,
  MAX_SSE_BUFFER_CHARS,
  parseSseFrames,
  type AgentFailure,
  type AgentFailureCode,
  type StreamWatchdog,
} from './templateChatStream';
import { CHAT_STYLES } from './templateChatStyles';
import {
  buildChatAttribution,
  buildMessageSentAnalytics,
  type ChatMessageSource,
  type ChatTrack,
} from './templateChatAnalytics';
import { DisplayArtifact } from './TemplateDisplayArtifact';
import { TemplatePreviewPane } from './TemplatePreviewPane';

// Re-exported so consumers and tests keep a single entry point for the chat
// surface even though the implementation is split by concern.
export type {
  AgentSseEvent,
  AgentTemplateItem,
  ChatMessage,
  DisplayPayload,
  PageActionPayload,
} from './templateChatProtocol';
export {
  AgentProgress,
  createAgentProgressState,
  getAgentOutcomeReceipt,
  getAgentProgressView,
  getAgentProgressVisibility,
  reduceAgentProgress,
  summarizePageAction,
} from './templateChatProgress';
export type {
  AgentProgressEvent,
  AgentProgressOutcome,
  AgentProgressPhase,
  AgentProgressState,
  AgentProgressView,
} from './templateChatProgress';
export { normalizePageActionPayload } from './templateChatPageAction';
export {
  getPreviewReturnImmersive,
  getTemplateChatStorageKey,
  limitTemplateChatInput,
} from './templateChatPersistence';
export { buildMessageSentAnalytics } from './templateChatAnalytics';

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
  /**
   * Whether the agent may drive the host page (apply filters/sort to the
   * template grid, rewrite URL params, highlight cards). Disable on surfaces
   * whose grid is not the template grid — e.g. Made in Webflow, where the
   * listing shows community sites and page actions have nothing to act on.
   * When false the agent is told there is no page grid and any page_action
   * events it still emits are dropped without touching the page.
   */
  enablePageActions?: boolean;
  /**
   * Overrides for reader-facing copy. The Webflow prop panel exposes the
   * high-traffic strings; everything else (progress narration, receipts,
   * preview toolbar) is localized here.
   */
  strings?: TemplateChatStringsOverride;
  /** BCP 47 tag used to format prices. Defaults to the document language. */
  locale?: string;
  /** ISO 4217 code for template prices. */
  currency?: string;
}

// ── Layout and interaction constants ────────────────────────────────────────
/** Panel width at which the agent may size galleries for a wide canvas. */
const WIDE_SURFACE_MIN_WIDTH = 720;
/** Distance from the end still treated as "following the conversation". */
const STICK_TO_BOTTOM_SLACK_PX = 80;
/** Composer grows to roughly four rows, then scrolls. */
const COMPOSER_MAX_HEIGHT_PX = 120;
/** Gap left between a host overlay and the surface that yields to it. */
const HOST_OVERLAY_GAP_PX = 16;
/** Docked panel height, matched to the stylesheet. */
const DOCKED_PANEL_MAX_HEIGHT_PX = 640;
/** Re-check cadence while a host overlay owns the composer area. */
const HOST_OVERLAY_POLL_MS = 500;
/**
 * Stop re-checking after this long. If a consent layer is still up a minute
 * later the reader is not trying to reach the launcher, and polling forever is
 * main-thread work with nothing to show for it.
 */
const HOST_OVERLAY_POLL_DEADLINE_MS = 60_000;

const DEFAULT_STARTERS =
  'A portfolio with bold animations, An online store for a clothing brand, A restaurant site with a menu, A SaaS landing page with a blog';

/** Carries a classified HTTP failure out of the request phase of a turn. */
class AgentResponseError extends Error {
  readonly failure: AgentFailure;

  constructor(failure: AgentFailure) {
    super(failure.code);
    this.name = 'AgentResponseError';
    this.failure = failure;
  }
}

// The agent is prompted to emit plain text, but render defensively: turn any
// **bold** spans into <strong> instead of showing raw asterisks.
function renderMessageText(content: string): React.ReactNode {
  const parts = content.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return content;
  return parts.map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part));
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
  enablePageActions = true,
  strings: stringsOverride,
  locale,
  currency = 'USD',
}) => {
  const isInline = variant === 'inline';
  const strings = resolveTemplateChatStrings(stringsOverride);
  // Prices follow the page's language when the caller does not pin one. An empty
  // string arrives from the Webflow panel's default, and Intl rejects it.
  const priceLocale =
    locale?.trim() ||
    (typeof document === 'undefined' ? undefined : document.documentElement.lang.trim() || undefined);
  const priceCurrency = currency.trim() || 'USD';
  const storageKey = getTemplateChatStorageKey(sessionScope);
  const inputLimitId = `tmchat-input-limit-${useId().replace(/:/g, '')}`;
  const introId = `tmchat-intro-${useId().replace(/:/g, '')}`;
  const titleId = `tmchat-title-${useId().replace(/:/g, '')}`;
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
  // Reset happens immediately; a toast offers Undo for a few seconds instead of
  // a pre-confirm step (Gmail-style recoverable destructive action).
  const [undoResetVisible, setUndoResetVisible] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [followups, setFollowups] = useState<string[]>(persisted?.followups ?? []);
  const [turnProgress, setTurnProgress] = useState<AgentProgressState>(() => {
    let restored = createAgentProgressState();
    if (persisted?.stoppedPrompt) return reduceAgentProgress(restored, { type: 'stop' });
    const latestAssistant = persisted?.messages.slice().reverse().find((message) => message.role === 'assistant');
    if (!latestAssistant) return restored;
    const resultCount = latestAssistant.displays.reduce((count, display) => count + display.items.length, 0);
    if (resultCount > 0) restored = reduceAgentProgress(restored, { type: 'display', resultCount });
    return reduceAgentProgress(restored, { type: 'done' });
  });
  const [working, setWorking] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [retryText, setRetryText] = useState<string | null>(persisted?.stoppedPrompt ?? null);
  const [stoppedPrompt, setStoppedPrompt] = useState<string | null>(persisted?.stoppedPrompt ?? null);
  // URL of the grid as it stood before this turn touched it, so the reader can
  // reverse an agent-applied filter set in one action.
  const [undoHref, setUndoHref] = useState<string | null>(null);
  // Template being live-previewed in the in-panel iframe (null = chat view).
  // Position/layout are kept for conversion attribution on the preview CTA.
  const [preview, setPreview] = useState<{ item: AgentTemplateItem; position: number; layout: string } | null>(null);
  const previewOpenedImmersiveRef = useRef<boolean | null>(null);
  const previewTriggerRef = useRef<HTMLElement | null>(null);
  const pendingPreviewFocusSlugRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const streamBatcherRef = useRef<TextDeltaBatcher | null>(null);
  const slowTurnTimerRef = useRef<number | null>(null);
  const undoResetTimerRef = useRef<number | null>(null);
  // Pre-reset conversation snapshot, held only while the undo toast is up.
  const resetSnapshotRef = useRef<{
    messages: ChatMessage[];
    followups: string[];
    known: AgentTemplateItem[];
    contextToken: string | null;
  } | null>(null);
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
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      // Nothing to reposition against while the tab is hidden.
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - startedAt > HOST_OVERLAY_POLL_DEADLINE_MS) {
        window.clearInterval(interval);
        return;
      }
      syncHostOverlay();
    }, HOST_OVERLAY_POLL_MS);
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

  const updateTurnProgress = useCallback((event: AgentProgressEvent) => {
    setTurnProgress((current) => reduceAgentProgress(current, event));
  }, []);

  const clearSlowTurnTimer = useCallback(() => {
    if (slowTurnTimerRef.current === null || typeof window === 'undefined') return;
    window.clearTimeout(slowTurnTimerRef.current);
    slowTurnTimerRef.current = null;
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
        known: Array.from(knownTemplatesRef.current.values()).slice(-MAX_PERSISTED_KNOWN_TEMPLATES),
        contextToken: contextTokenRef.current ?? undefined,
        stoppedPrompt: stoppedPrompt ?? undefined,
        open: isInline ? false : open,
        savedAt: Date.now(),
      };
      // Budgeted so an overflowing write cannot fail and leave an older
      // snapshot behind to be restored as stale state.
      window.sessionStorage.setItem(storageKey, serializePersistedSession(state));
    } catch {
      // Storage unavailable (private mode, iframe policy) — chat still works.
    }
  }, [messages, followups, open, stoppedPrompt, streaming, isInline, storageKey]);

  // Stick-to-bottom: only auto-follow when the reader is already at the end.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_SLACK_PX;
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
  }, [hostOverlayBlocking, isInline, open]);

  // Auto-grow the input with its content (1 -> ~4 rows).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
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
    pendingPreviewFocusSlugRef.current = preview?.item.template_slug ?? null;
    setPreview(null);
    if (returnImmersive !== immersive) setImmersiveAnimated(returnImmersive);
  }, [immersive, preview?.item.template_slug, setImmersiveAnimated]);

  useEffect(() => {
    if (preview || !pendingPreviewFocusSlugRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const templateSlug = pendingPreviewFocusSlugRef.current;
      const trigger = previewTriggerRef.current;
      const replacement = templateSlug
        ? Array.from(
            panelRef.current?.querySelectorAll<HTMLElement>('[data-template-chat-slug]') ?? [],
          )
            .find((element) => element.dataset.templateChatSlug === templateSlug)
            ?.querySelector<HTMLElement>('.tmcard-preview-link')
        : null;
      pendingPreviewFocusSlugRef.current = null;
      previewTriggerRef.current = null;
      (trigger?.isConnected ? trigger : replacement ?? inputRef.current)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [immersive, preview]);

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

  // The floating launcher and panel are position: fixed. Dropped inside a
  // transformed or filtered ancestor they anchor to that box instead of the
  // viewport and land in the wrong place, with no error to explain it. Detect it
  // once so the mistake is reportable rather than mysterious.
  const placementCheckedRef = useRef(false);
  useEffect(() => {
    if (isInline || placementCheckedRef.current || typeof window === 'undefined') return;
    const host = findHostPageBranch(panelRef.current ?? launcherRef.current);
    if (!host) return;
    placementCheckedRef.current = true;
    const problem = findFixedPositionBreaker(host as unknown as PlacementAncestor, (element) =>
      element instanceof Element ? window.getComputedStyle(element) : null,
    );
    if (!problem) return;
    // Surfaced both ways: the console line helps whoever placed it, the event
    // tells us it is happening on a live page.
    console.warn(
      `[TemplateChat] Floating placement is captured by an ancestor: ${problem.ancestor} sets ` +
        `${problem.property}: ${problem.value}. Move Template Chat to the page root, or use the ` +
        'inline variant, so the launcher and panel anchor to the viewport.',
    );
    track('placement_warning', { property: problem.property, ancestor: problem.ancestor });
  }, [isInline, open, track]);

  // aria-modal alone does not stop a screen reader from wandering into the page
  // behind the panel. Make the rest of the page inert for as long as the modal
  // surface is up, restoring only what we changed.
  useEffect(() => {
    if (!isModalSurface || typeof document === 'undefined') return;
    const ours = findHostPageBranch(panelRef.current);
    const siblings = Array.from(document.body.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== ours,
    );
    return applyHostInert(siblings, panelRef.current);
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
    (item: AgentTemplateItem, position: number, layout: string, trigger?: HTMLElement | null) => {
      // Never open the surface for a site we would refuse to frame.
      if (!safePreviewUrl(item.website_url)) return;
      previewTriggerRef.current = trigger ?? null;
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
      if (slowTurnTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(slowTurnTimerRef.current);
      }
      if (undoResetTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(undoResetTimerRef.current);
      }
      clearPageActionTimers(pageActionTimersRef.current);
    },
    [],
  );

  const undoLastPageAction = useCallback(() => {
    if (!undoHref) return;
    undoPageAction(undoHref);
    setUndoHref(null);
    track('page_action_undone');
  }, [track, undoHref]);

  const stopStreaming = useCallback(() => {
    streamBatcherRef.current?.flushNow();
    streamAbortRef.current?.abort();
    inputRef.current?.focus();
  }, []);

  const clearUndoResetTimer = useCallback(() => {
    if (undoResetTimerRef.current === null || typeof window === 'undefined') return;
    window.clearTimeout(undoResetTimerRef.current);
    undoResetTimerRef.current = null;
  }, []);

  const dismissUndoReset = useCallback(() => {
    clearUndoResetTimer();
    resetSnapshotRef.current = null;
    setUndoResetVisible(false);
  }, [clearUndoResetTimer]);

  const resetChat = useCallback(() => {
    // Snapshot before clearing: the toast's Undo restores exactly this state.
    if (messages.length > 0) {
      resetSnapshotRef.current = {
        messages,
        followups,
        known: Array.from(knownTemplatesRef.current.values()),
        contextToken: contextTokenRef.current,
      };
      setUndoResetVisible(true);
      if (typeof window !== 'undefined') {
        clearUndoResetTimer();
        undoResetTimerRef.current = window.setTimeout(() => {
          undoResetTimerRef.current = null;
          resetSnapshotRef.current = null;
          setUndoResetVisible(false);
        }, 6000);
      }
    }
    streamAbortRef.current?.abort();
    streamBatcherRef.current?.cancel();
    clearSlowTurnTimer();
    clearPageActionTimers(pageActionTimersRef.current);
    highlightMissesRef.current.clear();
    knownTemplatesRef.current.clear();
    sessionTokenRef.current = null;
    sessionPromiseRef.current = null;
    contextTokenRef.current = null;
    setMessages([]);
    setFollowups([]);
    setTurnProgress(createAgentProgressState());
    setInput('');
    setIntroExpanded(false);
    setRetryText(null);
    setStoppedPrompt(null);
    setUndoHref(null);
    previewOpenedImmersiveRef.current = null;
    previewTriggerRef.current = null;
    pendingPreviewFocusSlugRef.current = null;
    setPreview(null);
    track('chat_reset');
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors.
    }
    inputRef.current?.focus();
  }, [clearSlowTurnTimer, clearUndoResetTimer, followups, messages, storageKey, track]);

  // Undo the reset wholesale: conversation, follow-ups, agent template memory,
  // the worker continuity token, and the settled turn receipt.
  const undoResetChat = useCallback(() => {
    const snapshot = resetSnapshotRef.current;
    if (!snapshot) {
      dismissUndoReset();
      return;
    }
    dismissUndoReset();
    setMessages(snapshot.messages);
    setFollowups(snapshot.followups);
    knownTemplatesRef.current = new Map(snapshot.known.map((item) => [item.template_slug, item]));
    contextTokenRef.current = snapshot.contextToken;
    let restored = createAgentProgressState();
    const latestAssistant = snapshot.messages.slice().reverse().find((message) => message.role === 'assistant');
    if (latestAssistant) {
      const resultCount = latestAssistant.displays.reduce((count, display) => count + display.items.length, 0);
      if (resultCount > 0) restored = reduceAgentProgress(restored, { type: 'display', resultCount });
      restored = reduceAgentProgress(restored, { type: 'done' });
    }
    setTurnProgress(restored);
    track('chat_reset_undone');
  }, [dismissUndoReset, track]);

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
      // Guard on a ref, not on `streaming`: two Enter presses inside one tick
      // both observe the pre-render state and would open two streams.
      if (!trimmed || streaming || sendingRef.current || !apiBase) return;
      sendingRef.current = true;

      setFollowups([]);
      setInput('');
      setRetryText(null);
      // A new turn means the reset undo window has passed.
      dismissUndoReset();
      // A stopped turn resends from before its abandoned exchange.
      const stoppedBase = stoppedPrompt ? getRetryBaseMessages(messages, true) : messages;
      setStoppedPrompt(null);
      setUndoHref(null);
      setStreaming(true);
      setTurnProgress(createAgentProgressState());
      setWorkingState(true);
      clearSlowTurnTimer();
      if (typeof window !== 'undefined') {
        slowTurnTimerRef.current = window.setTimeout(() => {
          slowTurnTimerRef.current = null;
          updateTurnProgress({ type: 'slow' });
        }, SLOW_TURN_MS);
      }
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
      // Latency attribution: a slow turn is otherwise indistinguishable between
      // minting a session, edge cold start, and model time.
      let sessionMintMs: number | null = null;
      let ttfbMs: number | null = null;
      let firstTokenMs: number | null = null;
      let responseStatus: number | null = null;
      let failureCode: AgentFailureCode | null = null;
      track('message_sent', buildMessageSentAnalytics(source, turn, trimmed));

      const controller = new AbortController();
      streamAbortRef.current = controller;
      // Set when a watchdog aborts, so the abort is reported as a stall or a
      // timeout rather than as a reader-initiated stop.
      let stalled = false;
      let timedOut = false;
      let requestWatchdog: StreamWatchdog | null = null;

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

      // Armed once the session token is in hand — a challenge the reader has to
      // interact with must never be the thing that trips this.
      const stopRequestWatchdog = () => {
        requestWatchdog?.stop();
        requestWatchdog = null;
      };
      const armRequestWatchdog = () => {
        stopRequestWatchdog();
        requestWatchdog = createStreamWatchdog(
          () => {
            timedOut = true;
            controller.abort();
          },
          AGENT_REQUEST_TIMEOUT_MS,
        );
      };

      try {
        const response = await fetchAuthorizedAgentRequest({
          url: `${apiBase.replace(/\/+$/, '')}/api/templates/agent/chat`,
          getSessionToken: async () => {
            const cached = sessionTokenRef.current;
            if (!cached) {
              const mintStartedAt = Date.now();
              const minted = await getSessionToken();
              sessionMintMs = Date.now() - mintStartedAt;
              armRequestWatchdog();
              return minted;
            }
            armRequestWatchdog();
            return cached;
          },
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
                surface:
                  immersive || (panelRef.current?.clientWidth ?? 0) >= WIDE_SURFACE_MIN_WIDTH
                    ? 'immersive'
                    : 'compact',
                // Whether the agent can drive this page's grid via update_page.
                // Surfaces without a template grid (e.g. Made in Webflow)
                // disable page actions outright.
                has_page_grid: enablePageActions && pageHasTemplateGrid(),
              },
            }),
          }),
        });
        stopRequestWatchdog();
        responseStatus = response.status;
        ttfbMs = Date.now() - startedAt;
        if (!response.ok || !response.body) {
          const failure = classifyAgentResponseFailure(response.status, response.headers.get('Retry-After'));
          throw new AgentResponseError(failure);
        }
        updateTurnProgress({ type: 'connected' });
        highlightMissesRef.current.clear();

        const handleAgentEvent = (event: AgentSseEvent): void => {
            if (event.type === 'text_delta') {
              if (firstTokenMs === null) firstTokenMs = Date.now() - startedAt;
              setWorkingState(false);
              updateTurnProgress({ type: 'text' });
              textBatcher.push(event.text);
            } else if (event.type === 'status') {
              textBatcher.flushNow();
              updateTurnProgress({ type: 'agent_status', status: event.label });
              setWorkingState(true);
            } else if (event.type === 'display') {
              textBatcher.flushNow();
              setWorkingState(false);
              updateTurnProgress({ type: 'display', resultCount: event.payload.items.length });
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
              if (!enablePageActions) {
                // Defense in depth: the request already reports no page grid,
                // but if the agent emits a page action anyway, drop it without
                // touching the page (no URL rewrite, no dispatch, no receipt).
                track('page_action_suppressed', { turn });
                return;
              }
              const pageAction = normalizePageActionPayload(event.payload);
              if (Object.keys(pageAction).length > 0) {
                updateTurnProgress({ type: 'page_action', payload: pageAction });
                setWorkingState(true);
                // First filter change of the turn becomes its own history entry
                // so Back reverses the agent; later ones in the same answer
                // amend it rather than stacking entries.
                const isFirstFilterChange =
                  pageActionsApplied === 0 && pageActionChangesFilters(pageAction);
                if (isFirstFilterChange && typeof window !== 'undefined') {
                  setUndoHref(window.location.href);
                }
                applyPageAction(pageAction, highlightMissesRef.current, pageActionTimersRef.current, {
                  history: isFirstFilterChange ? 'push' : 'replace',
                });
                pageActionsApplied += 1;
                track('page_action_applied', {
                  turn,
                  action_sort: pageAction.sort ?? null,
                  action_category: pageAction.category_group_slug ?? null,
                  action_styles: (pageAction.styles ?? []).join(',') || null,
                  action_free_only: pageAction.free_only ?? null,
                  action_clear_filters: pageAction.clear_filters ?? null,
                  action_q: pageAction.q ?? null,
                  highlight_count: pageAction.highlight_slugs?.length ?? 0,
                });
              }
            } else if (event.type === 'context') {
              textBatcher.flushNow();
              contextTokenRef.current = event.payload.context_token;
            } else if (event.type === 'done') {
              textBatcher.flushNow();
              updateTurnProgress({ type: 'done' });
            } else if (event.type === 'error') {
              textBatcher.flushNow();
              hadError = true;
              updateTurnProgress({ type: 'fail' });
              track('chat_error', { turn, error_source: 'agent', message: String(event.message).slice(0, 200) });
              setRetryText(trimmed);
              appendToAssistant((message) => ({
                ...message,
                content: message.content || `Sorry — ${event.message}`,
              }));
            }
        };

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        // The Worker emits no keep-alive comments, so silence is the only stall
        // signal available. Without this a hung upstream leaves the composer
        // spinning with no exit but the Stop button.
        const watchdog = createStreamWatchdog(() => {
          stalled = true;
          controller.abort();
        });

        try {
          for (;;) {
            const { value, done } = await reader.read();
            // Flush the decoder on the final read so a split multi-byte
            // character does not disappear with the last frame.
            const chunk = done ? decoder.decode() : decoder.decode(value, { stream: true });
            if (chunk) {
              watchdog.touch();
              buffer += chunk;
            }
            if (buffer.length > MAX_SSE_BUFFER_CHARS) {
              throw new Error('Agent stream exceeded the frame buffer.');
            }

            // `done` dispatches a trailing frame that never received its blank
            // line — that frame is often the continuity token.
            const { events, rest } = parseSseFrames(buffer, done);
            buffer = rest;

            for (const data of events) {
              let event: AgentSseEvent;
              try {
                event = JSON.parse(data) as AgentSseEvent;
              } catch {
                continue;
              }
              handleAgentEvent(event);
            }

            if (done) break;
          }
        } finally {
          watchdog.stop();
        }
      } catch (error) {
        const readerStopped = controller.signal.aborted && !stalled && !timedOut;
        if (!readerStopped) {
          const failure =
            error instanceof AgentResponseError
              ? error.failure
              : classifyAgentStreamFailure(error, {
                  stalled,
                  timedOut,
                  online: typeof navigator === 'undefined' ? undefined : navigator.onLine,
                });
          hadError = true;
          failureCode = failure.code;
          updateTurnProgress({ type: 'fail' });
          // Codes, not upstream strings: a free-text message can echo payload
          // fragments into Segment and Amplitude.
          track('chat_error', {
            turn,
            error_source: failure.code === 'session' ? 'session' : 'connection',
            error_code: failure.code,
            status: responseStatus,
            retry_after_seconds: failure.retryAfterSeconds,
          });
          if (failure.retryable) setRetryText(trimmed);
          appendToAssistant((message) => ({
            ...message,
            content: message.content || failure.message,
          }));
        }
      } finally {
        stopRequestWatchdog();
        clearSlowTurnTimer();
        textBatcher.flushNow();
        if (streamBatcherRef.current === textBatcher) streamBatcherRef.current = null;
        // A watchdog abort is a failure, not a reader-initiated stop; only the
        // latter earns the "Search stopped" receipt and a resumable prompt.
        const stoppedByReader = controller.signal.aborted && !stalled && !timedOut;
        if (stoppedByReader) {
          updateTurnProgress({ type: 'stop' });
          setRetryText(trimmed);
          setStoppedPrompt(trimmed);
        }
        if (controller.signal.aborted) {
          setMessages((current) => {
            const last = current[current.length - 1];
            return last?.role === 'assistant' && !last.content && last.displays.length === 0
              ? current.slice(0, -1)
              : current;
          });
        }
        if (!controller.signal.aborted && !hadError) updateTurnProgress({ type: 'done' });
        setWorkingState(false);
        setStreaming(false);
        sendingRef.current = false;
        track('response_completed', {
          turn,
          duration_ms: Date.now() - startedAt,
          session_mint_ms: sessionMintMs,
          ttfb_ms: ttfbMs,
          first_token_ms: firstTokenMs,
          status: responseStatus,
          displays_shown: displaysShown,
          templates_shown: templatesShown,
          page_actions_applied: pageActionsApplied,
          had_error: hadError,
          error_code: failureCode,
          stalled,
          timed_out: timedOut,
          stopped: stoppedByReader,
        });
      }
    },
    [
      apiBase,
      clearSlowTurnTimer,
      dismissUndoReset,
      getSessionToken,
      immersive,
      messages,
      setWorkingState,
      stoppedPrompt,
      streaming,
      track,
      updateTurnProgress,
    ],
  );

  if (!open) {
    const launcherStyle =
      hostOverlayBottomInset > 0 ? { bottom: hostOverlayBottomInset + HOST_OVERLAY_GAP_PX } : undefined;
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
        bottom: hostOverlayBottomInset + HOST_OVERLAY_GAP_PX,
        height: `min(${DOCKED_PANEL_MAX_HEIGHT_PX}px, calc(100vh - ${
          hostOverlayBottomInset + HOST_OVERLAY_GAP_PX * 2
        }px))`,
      }
    : undefined;
  const showConversationChips = !streaming && followups.length > 0;
  const showStarterChips = !streaming && messages.length === 0 && starters.length > 0;
  const showRetry = !streaming && retryText !== null;
  const hasDisplayedResults = messages.some((message) => message.displays.length > 0);
  const lastIndex = messages.length - 1;
  // The in-flight turn is always the appended last assistant message; the
  // loading surface keys off what that turn has already put on screen.
  const lastMessage = messages[lastIndex];
  const inFlightAssistant = lastMessage?.role === 'assistant' ? lastMessage : null;
  const turnHasDisplays = Boolean(inFlightAssistant && inFlightAssistant.displays.length > 0);
  const turnHasContent = Boolean(
    inFlightAssistant && (inFlightAssistant.content.trim() || turnHasDisplays),
  );
  const progressVisibility = getAgentProgressVisibility({ streaming, turnHasContent, turnHasDisplays });
  const latestAssistant = messages.slice().reverse().find((message) => message.role === 'assistant');
  const turnReceipt = getAgentOutcomeReceipt(turnProgress, strings);
  const outcomeAnnouncement = !streaming && turnReceipt
    ? [latestAssistant?.content.trim() ?? '', `${turnReceipt}.`].filter(Boolean).join(' ')
    : '';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CHAT_STYLES }} />
      {immersive ? (
        <div
          className="tmchat-backdrop"
          aria-hidden="true"
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
        aria-labelledby={titleId}
        aria-modal={isModalSurface || undefined}
      >
        <div className="tmchat-header">
          <h2 className="tmchat-header-title" id={titleId}>{title}</h2>
          <div className="tmchat-header-actions">
            {messages.length > 0 ? (
              <button
                type="button"
                className="tmchat-iconbtn tmchat-newchat"
                aria-label={strings.newChat}
                title={strings.newChat}
                onClick={resetChat}
              >
                <UiIcon name="message-square-plus" />
              </button>
            ) : null}
            <button
              type="button"
              className="tmchat-iconbtn tmchat-expand"
              aria-label={immersive ? strings.exitFullscreen : strings.expand}
              title={immersive ? strings.exitFullscreen : strings.expand}
              onClick={() => setImmersiveAnimated((current) => !current)}
            >
              <UiIcon name={immersive ? 'minimize-2' : 'maximize-2'} />
            </button>
            {!isInline || immersive ? (
              <button
                type="button"
                className="tmchat-iconbtn"
                aria-label={strings.closeChat}
                onClick={() => {
                  previewOpenedImmersiveRef.current = null;
                  previewTriggerRef.current = null;
                  pendingPreviewFocusSlugRef.current = null;
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
        <div
          ref={scrollRef}
          className="tmchat-scroll"
          aria-busy={streaming || undefined}
          onScroll={handleScroll}
        >
          {messages.length === 0 ? (
            <div className="tmchat-msg assistant">
              <span className="tmchat-eyebrow"><UiIcon name="sparkles" size={11} /> {title}</span>
              {welcomeMessage}
            </div>
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
                {strings.introToggle(title)}
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
                  {message.role === 'assistant' ? (
                    <span className="tmchat-eyebrow"><UiIcon name="sparkles" size={11} /> {title}</span>
                  ) : null}
                  {renderMessageText(message.content)}
                  {streaming && index === lastIndex && message.role === 'assistant' && !working ? (
                    <span className="tmchat-caret" aria-hidden="true" />
                  ) : null}
                </div>
              ) : null}
              {message.displays.map((payload, displayIndex) => (
                <DisplayArtifact
                  key={displayIndex}
                  payload={payload}
                  onPreview={openPreview}
                  onTemplateClick={handleTemplateClick}
                  strings={strings}
                  locale={priceLocale}
                  currency={priceCurrency}
                />
              ))}
            </React.Fragment>
          ))}
          {outcomeAnnouncement ? (
            <div className="tmchat-outcome-announcement tmchat-sr-only" role="status" aria-live="polite" aria-atomic="true">
              {outcomeAnnouncement}
            </div>
          ) : null}
          {progressVisibility.showProgress ? (
            <AgentProgress
              progress={turnProgress}
              strings={strings}
              hideSkeletons={progressVisibility.hideSkeletons}
            />
          ) : null}
          {!streaming && turnReceipt ? (
            <div className="tmchat-turn-row">
              <div className="tmchat-turn-status" data-outcome={turnProgress.outcome}>{turnReceipt}</div>
              {undoHref ? (
                <button type="button" className="tmchat-undo" onClick={undoLastPageAction}>
                  <UiIcon name="rotate-ccw" size={13} /> {strings.undoPageUpdate}
                </button>
              ) : null}
            </div>
          ) : null}
          {showRetry ? (
            <div className="tmchat-followups">
              <button
                type="button"
                className="tmchat-chip"
                onClick={() => {
                  if (!retryText) return;
                  void send(retryText, getRetryBaseMessages(messages, Boolean(stoppedPrompt)), 'retry');
                }}
              >
                {strings.tryAgain}
              </button>
            </div>
          ) : null}
          {showConversationChips ? (
            <div className="tmchat-refine">
              {hasDisplayedResults ? <div className="tmchat-refine-label">{strings.refineResults}</div> : null}
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
            <UiIcon name="arrow-down" size={14} /> {strings.jumpToLatest}
          </button>
        ) : null}

        {undoResetVisible ? (
          <div className="tmchat-reset-toast" role="status">
            <span>{strings.conversationCleared}</span>
            <button type="button" className="tmchat-reset-undo" onClick={undoResetChat}>
              {strings.undoReset}
            </button>
          </div>
        ) : null}
        </div>

        <div ref={turnstileRef} className="tmchat-turnstile" />
        <div className="tmchat-inputrow">
          <div className="tmchat-inputfield">
            <textarea
              ref={inputRef}
              className="tmchat-input"
              rows={1}
              maxLength={MAX_REQUEST_MESSAGE_CHARS}
              aria-label={strings.composerLabel}
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
              <span className="tmchat-inputhint">{strings.composerHint}</span>
              <span
                className={
                  input.length >= MAX_REQUEST_MESSAGE_CHARS * 0.8
                    ? 'tmchat-inputcount'
                    : 'tmchat-inputcount tmchat-sr-only'
                }
              >
                {strings.characterLimit(
                  input.length.toLocaleString(priceLocale),
                  MAX_REQUEST_MESSAGE_CHARS.toLocaleString(priceLocale),
                )}
              </span>
            </div>
          </div>
          {streaming ? (
            <button type="button" className="tmchat-send stop" onClick={stopStreaming}>
              <UiIcon name="square" size={11} /> Stop
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
            strings={strings}
            locale={priceLocale}
            currency={priceCurrency}
          />
        ) : null}
        </div>
      </div>
    </>
  );
};

export default TemplateChat;

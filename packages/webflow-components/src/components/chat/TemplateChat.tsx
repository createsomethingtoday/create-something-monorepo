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
  createHighlightMissState,
  createTextDeltaBatcher,
  getHostOverlayBottomInset,
  isHostOverlayBlocking,
  prefersReducedMotion,
  type TextDeltaBatcher,
} from './templateChatRuntime';
import type { AgentSseEvent, AgentTemplateItem, ChatMessage } from './templateChatProtocol';
import {
  AgentProgress,
  createAgentProgressState,
  getAgentOutcomeReceipt,
  reduceAgentProgress,
  type AgentProgressEvent,
  type AgentProgressState,
} from './templateChatProgress';
import {
  applyPageAction,
  clearPageActionTimers,
  normalizePageActionPayload,
  pageHasTemplateGrid,
  type PageActionTimers,
} from './templateChatPageAction';
import {
  getPreviewReturnImmersive,
  getTemplateChatStorageKey,
  limitTemplateChatInput,
  loadPersistedSession,
  MAX_PERSISTED_MESSAGES,
  SLOW_TURN_MS,
  type PersistedSession,
} from './templateChatPersistence';
import { getTurnstileToken } from './templateChatTurnstile';
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
}

const DEFAULT_STARTERS =
  'A portfolio with bold animations, An online store for a clothing brand, A restaurant site with a menu, A SaaS landing page with a blog';

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
  const slowTurnTimerRef = useRef<number | null>(null);
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
      if (slowTurnTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(slowTurnTimerRef.current);
      }
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
    previewOpenedImmersiveRef.current = null;
    setPreview(null);
    track('chat_reset');
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors.
    }
    inputRef.current?.focus();
  }, [clearSlowTurnTimer, storageKey, track]);

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
        updateTurnProgress({ type: 'connected' });
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
              const pageAction = normalizePageActionPayload(event.payload);
              if (Object.keys(pageAction).length > 0) {
                updateTurnProgress({ type: 'page_action', payload: pageAction });
                setWorkingState(true);
                applyPageAction(pageAction, highlightMissesRef.current, pageActionTimersRef.current);
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
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          hadError = true;
          updateTurnProgress({ type: 'fail' });
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
        clearSlowTurnTimer();
        textBatcher.flushNow();
        if (streamBatcherRef.current === textBatcher) streamBatcherRef.current = null;
        if (controller.signal.aborted) {
          updateTurnProgress({ type: 'stop' });
          setRetryText(trimmed);
          setStoppedPrompt(trimmed);
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
    [
      apiBase,
      clearSlowTurnTimer,
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
  const turnReceipt = getAgentOutcomeReceipt(turnProgress);
  const outcomeAnnouncement = !streaming && turnReceipt
    ? [latestAssistant?.content.trim() ?? '', `${turnReceipt}.`].filter(Boolean).join(' ')
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
        <div
          ref={scrollRef}
          className="tmchat-scroll"
          aria-busy={streaming || undefined}
          onScroll={handleScroll}
        >
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
          {streaming ? (
            <AgentProgress progress={turnProgress} />
          ) : null}
          {!streaming && turnReceipt ? (
            <div className="tmchat-turn-status" data-outcome={turnProgress.outcome}>{turnReceipt}</div>
          ) : null}
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

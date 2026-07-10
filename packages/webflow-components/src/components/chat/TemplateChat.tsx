import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TemplateCard, TEMPLATE_CARD_STYLES } from '../cards/TemplateCard';

// ── Agent protocol (mirrors webflow-template-agent) ───────────────────────────

type DisplayLayout = 'gallery' | 'carousel' | 'spotlight' | 'comparison' | 'shortlist';

interface AgentTemplateItem {
  template_slug: string;
  name: string;
  url: string | null;
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

type AgentSseEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'display'; payload: DisplayPayload }
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
}

const DEFAULT_STARTERS =
  'A portfolio with bold animations, An online store for a clothing brand, A restaurant site with a menu, A SaaS landing page with a blog';

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
}
.tmchat-panel {
  position: fixed; right: 24px; bottom: 24px; z-index: 9001;
  display: flex; flex-direction: column;
  width: min(440px, calc(100vw - 32px)); height: min(640px, calc(100vh - 48px));
  border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;
  background: #fff; box-shadow: 0 12px 48px rgba(0,0,0,0.22);
  font-family: "WF Visual Sans Variable", "Inter", system-ui, sans-serif;
  color: #080808; font-size: 14px; line-height: 1.45;
}
.tmchat-panel.entering { animation: tmchat-in 200ms ease; }
@keyframes tmchat-in { from { opacity: 0; } to { opacity: 1; } }
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
}
.tmchat-iconbtn:hover { background: #ececec; }
.tmchat-scroll {
  flex: 1 1 auto; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth;
}
.tmchat-panel.immersive .tmchat-scroll { padding: 24px clamp(16px, 5vw, 56px) 32px; gap: 14px; }
.tmchat-msg { max-width: 92%; white-space: pre-wrap; overflow-wrap: break-word; }
.tmchat-panel.immersive .tmchat-msg { max-width: 680px; font-size: 15px; }
.tmchat-msg.user { align-self: flex-end; background: #146ef5; color: #fff; padding: 9px 13px; border-radius: 14px 14px 4px 14px; }
.tmchat-msg.assistant { align-self: flex-start; background: #f5f5f5; padding: 9px 13px; border-radius: 14px 14px 14px 4px; }
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
  transition: background 140ms ease;
}
.tmchat-chip:hover { background: #e3edfd; }
.tmchat-typing { align-self: flex-start; color: #757575; font-size: 13px; display: inline-flex; align-items: baseline; gap: 6px; }
.tmchat-dots { display: inline-flex; gap: 3px; }
.tmchat-dots span {
  width: 4px; height: 4px; border-radius: 50%; background: #757575;
  animation: tmchat-pulse 1.2s ease-in-out infinite;
}
.tmchat-dots span:nth-child(2) { animation-delay: 0.15s; }
.tmchat-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes tmchat-pulse { 0%, 60%, 100% { opacity: 0.25; } 30% { opacity: 1; } }
.tmchat-inputrow { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #ececec; background: #fff; }
.tmchat-panel.immersive .tmchat-inputrow { padding: 14px clamp(16px, 5vw, 56px) 18px; }
.tmchat-input {
  flex: 1 1 auto; min-height: 40px; padding: 9px 12px;
  border: 1px solid #e0e0e0; border-radius: 8px; font: inherit; resize: none;
}
.tmchat-input:focus-visible { outline: 2px solid #146ef5; outline-offset: 1px; }
.tmchat-send {
  border: 0; border-radius: 8px; background: #146ef5; color: #fff;
  padding: 0 16px; font: inherit; font-weight: 600; cursor: pointer;
}
.tmchat-send:disabled { background: #a9c6f7; cursor: default; }
.tmchat-send.stop { background: #fff; color: #404040; border: 1px solid #e0e0e0; }
.tmchat-send.stop:hover { background: #f5f5f5; }
@media (max-width: 560px) {
  .tmchat-panel { right: 8px; bottom: 8px; width: calc(100vw - 16px); height: calc(100vh - 16px); }
  .tmchat-panel.immersive { top: 0; bottom: 0; width: 100vw; border-radius: 0; }
  .tmchat-grid, .tmchat-panel.immersive .tmchat-grid { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .tmchat-panel.entering, .tmchat-dots span { animation: none; }
  .tmchat-scroll { scroll-behavior: auto; }
}
` + TEMPLATE_CARD_STYLES;

// Standardized 16px stroke icons (Feather-style geometry, currentColor) —
// Unicode glyphs render inconsistently across platforms/fonts.
function ChatIcon({ name }: { name: 'sparkle' | 'refresh' | 'expand' | 'collapse' | 'close' | 'send' }): React.ReactElement {
  const paths: Record<string, React.ReactNode> = {
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
    send: (
      <>
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </>
    ),
  };
  return (
    <svg
      width="16"
      height="16"
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

function DisplayArtifact({ payload }: { payload: DisplayPayload }): React.ReactElement {
  const isStrip = payload.layout === 'carousel';
  const isSingle = payload.layout === 'spotlight' || payload.items.length === 1;
  const showReasons = payload.layout === 'shortlist' || payload.layout === 'spotlight' || payload.layout === 'comparison';

  const cards = payload.items.map((entry) => (
    <div key={entry.template_slug}>
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

export const TemplateChat: React.FC<TemplateChatProps> = ({
  apiBase = '',
  title = 'Template assistant',
  launcherLabel = 'Find your template',
  placeholder = 'Describe the site you want to build…',
  welcomeMessage = 'Hi! Tell me about the site you want to build — the business, the look you like, and anything it must support (store, blog, member logins…) — and I’ll find templates that fit.',
  variant = 'floating',
  starterPrompts = DEFAULT_STARTERS,
  defaultOpen = false,
  defaultImmersive = false,
}) => {
  const isInline = variant === 'inline';
  const [open, setOpen] = useState(isInline || defaultOpen);
  const [immersive, setImmersive] = useState(defaultImmersive);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [followups, setFollowups] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  // Templates verified by the agent's tools this conversation, keyed by slug.
  // Echoed back with each request so the stateless worker can compare or
  // re-display earlier results instead of "forgetting" them between turns.
  const knownTemplatesRef = useRef(new Map<string, AgentTemplateItem>());

  const starters = starterPrompts
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 6);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streaming, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, immersive]);

  // Esc collapses the immersive state first, then closes a floating panel.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (immersive) setImmersive(false);
      else if (!isInline) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, immersive, isInline]);

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
    inputRef.current?.focus();
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming || !apiBase) return;

      setFollowups([]);
      setInput('');
      setStreaming(true);

      const history = [...messages, { role: 'user' as const, content: trimmed, displays: [] }];
      setMessages([...history, { role: 'assistant', content: '', displays: [] }]);

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
              appendToAssistant((message) => ({ ...message, content: message.content + event.text }));
            } else if (event.type === 'display') {
              for (const entry of event.payload.items) knownTemplatesRef.current.set(entry.template_slug, entry.item);
              appendToAssistant((message) => ({ ...message, displays: [...message.displays, event.payload] }));
              if (event.payload.followups?.length) setFollowups(event.payload.followups);
            } else if (event.type === 'context') {
              for (const item of event.payload.known_templates ?? []) {
                if (item?.template_slug) knownTemplatesRef.current.set(item.template_slug, item);
              }
            } else if (event.type === 'error') {
              appendToAssistant((message) => ({
                ...message,
                content: message.content || `Sorry — ${event.message}`,
              }));
            }
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          appendToAssistant((message) => ({
            ...message,
            content: message.content || 'Sorry — I hit a connection problem. Please try again.',
          }));
        }
      } finally {
        setStreaming(false);
      }
    },
    [apiBase, messages, streaming, immersive],
  );

  if (!open) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CHAT_STYLES }} />
        <button type="button" className="tmchat-launcher" onClick={() => setOpen(true)}>
          <ChatIcon name="sparkle" /> {launcherLabel}
        </button>
      </>
    );
  }

  const panelClass = `tmchat-panel entering${immersive ? ' immersive' : isInline ? ' inline' : ''}`;
  const showConversationChips = !streaming && followups.length > 0;
  const showStarterChips = !streaming && messages.length === 0 && starters.length > 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CHAT_STYLES }} />
      {immersive ? <div className="tmchat-backdrop" onClick={() => setImmersive(false)} /> : null}
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
              onClick={() => setImmersive((current) => !current)}
            >
              <ChatIcon name={immersive ? 'collapse' : 'expand'} />
            </button>
            {!isInline || immersive ? (
              <button
                type="button"
                className="tmchat-iconbtn"
                aria-label="Close chat"
                onClick={() => {
                  if (immersive) setImmersive(false);
                  if (!isInline) setOpen(false);
                }}
              >
                <ChatIcon name="close" />
              </button>
            ) : null}
          </div>
        </div>

        <div ref={scrollRef} className="tmchat-scroll">
          <div className="tmchat-msg assistant">{welcomeMessage}</div>
          {showStarterChips ? (
            <div className="tmchat-followups">
              {starters.map((suggestion) => (
                <button key={suggestion} type="button" className="tmchat-chip" onClick={() => void send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
          {messages.map((message, index) => (
            <React.Fragment key={index}>
              {message.content ? (
                <div className={`tmchat-msg ${message.role}`}>{renderMessageText(message.content)}</div>
              ) : null}
              {message.displays.map((payload, displayIndex) => (
                <DisplayArtifact key={displayIndex} payload={payload} />
              ))}
            </React.Fragment>
          ))}
          {streaming ? (
            <div className="tmchat-typing" aria-live="polite">
              Searching templates
              <span className="tmchat-dots">
                <span />
                <span />
                <span />
              </span>
            </div>
          ) : null}
          {showConversationChips ? (
            <div className="tmchat-followups">
              {followups.map((suggestion) => (
                <button key={suggestion} type="button" className="tmchat-chip" onClick={() => void send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>

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
      </div>
    </>
  );
};

export default TemplateChat;

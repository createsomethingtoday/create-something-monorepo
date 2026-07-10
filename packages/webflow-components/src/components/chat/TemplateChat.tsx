import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TemplateCard, TEMPLATE_CARD_STYLES } from '../cards/TemplateCard';

// ── Agent protocol (mirrors webflow-template-agent) ───────────────────────────

type DisplayLayout = 'gallery' | 'carousel' | 'spotlight' | 'comparison' | 'shortlist';

interface AgentTemplateItem {
  template_slug: string;
  name: string;
  url: string | null;
  creator_name: string | null;
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
  defaultOpen?: boolean;
}

const CHAT_STYLES = `
.tmchat-launcher {
  position: fixed; right: 24px; bottom: 24px; z-index: 9000;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 18px; border: 0; border-radius: 999px; cursor: pointer;
  background: #146ef5; color: #fff;
  font-family: "WF Visual Sans Variable", "Inter", system-ui, sans-serif;
  font-size: 14px; font-weight: 600; box-shadow: 0 6px 24px rgba(0,0,0,0.18);
}
.tmchat-launcher:hover { background: #0f5cd0; }
.tmchat-panel {
  position: fixed; right: 24px; bottom: 24px; z-index: 9001;
  display: flex; flex-direction: column;
  width: min(440px, calc(100vw - 32px)); height: min(640px, calc(100vh - 48px));
  border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;
  background: #fff; box-shadow: 0 12px 48px rgba(0,0,0,0.22);
  font-family: "WF Visual Sans Variable", "Inter", system-ui, sans-serif;
  color: #080808; font-size: 14px; line-height: 1.45;
}
.tmchat-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid #ececec; background: #fafafa;
}
.tmchat-header-title { font-weight: 600; font-size: 15px; }
.tmchat-close { border: 0; background: transparent; cursor: pointer; font-size: 18px; line-height: 1; color: #404040; padding: 4px; }
.tmchat-scroll { flex: 1 1 auto; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.tmchat-msg { max-width: 92%; white-space: pre-wrap; overflow-wrap: break-word; }
.tmchat-msg.user { align-self: flex-end; background: #146ef5; color: #fff; padding: 9px 13px; border-radius: 14px 14px 4px 14px; }
.tmchat-msg.assistant { align-self: flex-start; background: #f5f5f5; padding: 9px 13px; border-radius: 14px 14px 14px 4px; }
.tmchat-display { align-self: stretch; }
.tmchat-display-title { font-weight: 600; margin: 4px 0 8px; font-size: 14px; }
.tmchat-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.tmchat-grid.single { grid-template-columns: 1fr; }
.tmchat-strip { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; -webkit-overflow-scrolling: touch; }
.tmchat-strip > * { flex: 0 0 220px; }
.tmchat-reason { font-size: 12.5px; color: #404040; margin: 4px 0 0; }
.tmchat-followups { display: flex; flex-wrap: wrap; gap: 8px; }
.tmchat-chip {
  border: 1px solid #dbe6fb; border-radius: 999px; background: #f2f7ff;
  color: #0f5cd0; padding: 7px 12px; font-size: 13px; cursor: pointer; font-family: inherit;
}
.tmchat-chip:hover { background: #e3edfd; }
.tmchat-typing { align-self: flex-start; color: #757575; font-size: 13px; }
.tmchat-inputrow { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #ececec; background: #fff; }
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
@media (max-width: 560px) {
  .tmchat-panel { right: 8px; bottom: 8px; width: calc(100vw - 16px); height: calc(100vh - 16px); }
  .tmchat-grid { grid-template-columns: 1fr; }
}
` + TEMPLATE_CARD_STYLES;

function formatPrice(item: AgentTemplateItem): string {
  if (item.is_free || item.price === 0) return 'Free';
  return typeof item.price === 'number' ? `$${item.price} USD` : '';
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
        primaryImage={
          entry.item.thumbnail_image_url ? { src: entry.item.thumbnail_image_url, alt: entry.item.name } : undefined
        }
        cumulativePurchases={entry.item.cumulative_purchases ?? undefined}
        agentNote={showReasons ? entry.reason : undefined}
        showCategoryMeta={false}
      />
      {showReasons && entry.reason ? <p className="tmchat-reason">{entry.reason}</p> : null}
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
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [followups, setFollowups] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streaming, open]);

  useEffect(() => () => streamAbortRef.current?.abort(), []);

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
              appendToAssistant((message) => ({ ...message, displays: [...message.displays, event.payload] }));
              if (event.payload.followups?.length) setFollowups(event.payload.followups);
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
    [apiBase, messages, streaming],
  );

  if (!open) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CHAT_STYLES }} />
        <button type="button" className="tmchat-launcher" onClick={() => setOpen(true)}>
          ✦ {launcherLabel}
        </button>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CHAT_STYLES }} />
      <div className="tmchat-panel" role="dialog" aria-label={title}>
        <div className="tmchat-header">
          <span className="tmchat-header-title">{title}</span>
          <button type="button" className="tmchat-close" aria-label="Close chat" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>

        <div ref={scrollRef} className="tmchat-scroll">
          <div className="tmchat-msg assistant">{welcomeMessage}</div>
          {messages.map((message, index) => (
            <React.Fragment key={index}>
              {message.content ? <div className={`tmchat-msg ${message.role}`}>{message.content}</div> : null}
              {message.displays.map((payload, displayIndex) => (
                <DisplayArtifact key={displayIndex} payload={payload} />
              ))}
            </React.Fragment>
          ))}
          {streaming ? <div className="tmchat-typing">Searching templates…</div> : null}
          {!streaming && followups.length > 0 ? (
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
          <button type="button" className="tmchat-send" disabled={streaming || !input.trim()} onClick={() => void send(input)}>
            Send
          </button>
        </div>
      </div>
    </>
  );
};

export default TemplateChat;

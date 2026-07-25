import { MAX_REQUEST_MESSAGE_CHARS } from './templateAgentSession';
import type { AgentTemplateItem, ChatMessage } from './templateChatProtocol';

const STORAGE_KEY = 'tmchat-session-v1';
export const MAX_PERSISTED_MESSAGES = 30;
export const SLOW_TURN_MS = 8_000;

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

/**
 * History to resend a prompt from, with the abandoned exchange removed.
 *
 * A stopped turn may have dropped its empty assistant artifact already, so the
 * trailing pair is one or two messages depending on how it ended. Both the
 * composer and the "Try again" control need the same answer; computing it twice
 * is how they drift.
 */
export function getRetryBaseMessages(
  messages: readonly ChatMessage[],
  wasStopped: boolean,
): ChatMessage[] {
  if (!wasStopped) return messages.slice(0, -2);
  const trailing = messages[messages.length - 1]?.role === 'assistant' ? -2 : -1;
  return messages.slice(0, trailing);
}

// ── Session persistence (survive navigation/reload within the tab) ───────────

export const MAX_PERSISTED_KNOWN_TEMPLATES = 40;

/**
 * A restored conversation older than this is stale enough that resuming it
 * silently would be more confusing than starting fresh — the catalog, the
 * page, and the reader's intent have all moved on.
 */
export const PERSISTED_SESSION_TTL_MS = 6 * 60 * 60 * 1_000;

/**
 * Serialized ceiling. Display payloads carry whole template records, so a long
 * conversation can approach the ~5MB origin quota; overflowing it made
 * setItem throw and left the *previous* snapshot in place, which then restored
 * as stale state. Staying under budget keeps the newest turns instead.
 */
export const MAX_PERSISTED_SESSION_CHARS = 512_000;

export interface PersistedSession {
  messages: ChatMessage[];
  followups: string[];
  known: AgentTemplateItem[];
  contextToken?: string;
  stoppedPrompt?: string;
  open: boolean;
  /** Epoch ms of the write, used to expire stale conversations. */
  savedAt?: number;
}

export function loadPersistedSession(
  storageKey: string,
  now: number = Date.now(),
): PersistedSession | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (!Array.isArray(parsed.messages)) return null;
    // A snapshot past the TTL is dropped rather than restored. A snapshot with
    // no stamp predates this field — restore it once (it is a conversation that
    // was in flight when the component upgraded) and let the next write stamp it.
    if (typeof parsed.savedAt === 'number' && now - parsed.savedAt > PERSISTED_SESSION_TTL_MS) {
      window.sessionStorage.removeItem?.(storageKey);
      return null;
    }
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
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Serializes a session inside the byte budget, shedding the most expendable
 * data first: older turns' card payloads, then older turns entirely. The
 * newest turn keeps its results, because that is what the reader is looking at.
 */
export function serializePersistedSession(
  session: PersistedSession,
  maxChars: number = MAX_PERSISTED_SESSION_CHARS,
): string {
  let messages = session.messages.slice(-MAX_PERSISTED_MESSAGES);
  let known = session.known.slice(-MAX_PERSISTED_KNOWN_TEMPLATES);
  const encode = () => JSON.stringify({ ...session, messages, known });

  let payload = encode();
  if (payload.length <= maxChars) return payload;

  // 1. Strip displays from every turn but the last that has any.
  const lastDisplayIndex = messages.reduce(
    (found, message, index) => (message.displays.length > 0 ? index : found),
    -1,
  );
  messages = messages.map((message, index) =>
    index === lastDisplayIndex ? message : { ...message, displays: [] },
  );
  payload = encode();
  if (payload.length <= maxChars) return payload;

  // 2. Drop the known-template cache, which the Worker can rebuild.
  known = [];
  payload = encode();
  if (payload.length <= maxChars) return payload;

  // 3. Drop oldest turns until it fits, keeping at least the final exchange.
  while (payload.length > maxChars && messages.length > 2) {
    messages = messages.slice(1);
    payload = encode();
  }
  return payload;
}

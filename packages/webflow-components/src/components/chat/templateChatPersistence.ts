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

// ── Session persistence (survive navigation/reload within the tab) ───────────

export interface PersistedSession {
  messages: ChatMessage[];
  followups: string[];
  known: AgentTemplateItem[];
  contextToken?: string;
  stoppedPrompt?: string;
  open: boolean;
}

export function loadPersistedSession(storageKey: string): PersistedSession | null {
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

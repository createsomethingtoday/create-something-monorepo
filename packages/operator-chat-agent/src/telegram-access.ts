import type { Env } from './env.js';

interface TelegramUser {
  id?: number;
  username?: string;
}

interface TelegramChat {
  id?: number;
  type?: string;
  username?: string;
}

interface TelegramMessage {
  chat?: TelegramChat;
  from?: TelegramUser;
  text?: string;
}

export interface TelegramUpdate {
  callback_query?: {
    from?: TelegramUser;
    message?: TelegramMessage;
  };
  message?: TelegramMessage;
}

export interface TelegramAccessDecision {
  allowed: boolean;
  reason: string;
  chatId?: string;
  userId?: string;
}

function csvSet(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function telegramSecretMatches(
  request: Request,
  env: Pick<Env, 'TELEGRAM_WEBHOOK_SECRET_TOKEN'>
): boolean {
  const expected = env.TELEGRAM_WEBHOOK_SECRET_TOKEN?.trim();
  if (!expected) return false;

  return request.headers.get('x-telegram-bot-api-secret-token') === expected;
}

export function telegramAccessDecision(
  update: TelegramUpdate,
  env: Pick<Env, 'TELEGRAM_ALLOWED_CHAT_IDS' | 'TELEGRAM_ALLOWED_USER_IDS'>
): TelegramAccessDecision {
  const message = update.message ?? update.callback_query?.message;
  const from = update.message?.from ?? update.callback_query?.from;
  const chatId = message?.chat?.id === undefined ? undefined : String(message.chat.id);
  const userId = from?.id === undefined ? undefined : String(from.id);
  const allowedChatIds = csvSet(env.TELEGRAM_ALLOWED_CHAT_IDS);
  const allowedUserIds = csvSet(env.TELEGRAM_ALLOWED_USER_IDS);

  if (allowedChatIds.size === 0 && allowedUserIds.size === 0) {
    return {
      allowed: false,
      chatId,
      userId,
      reason: 'No Telegram operator allow-list is configured.'
    };
  }

  if (chatId && allowedChatIds.has(chatId)) {
    return {
      allowed: true,
      chatId,
      userId,
      reason: 'Telegram chat id is allowed.'
    };
  }

  if (userId && allowedUserIds.has(userId)) {
    return {
      allowed: true,
      chatId,
      userId,
      reason: 'Telegram user id is allowed.'
    };
  }

  return {
    allowed: false,
    chatId,
    userId,
    reason: 'Telegram sender is not on the operator allow-list.'
  };
}

export async function readTelegramUpdate(request: {
  json(): Promise<unknown>;
}): Promise<TelegramUpdate | null> {
  try {
    return (await request.json()) as TelegramUpdate;
  } catch {
    return null;
  }
}

#!/usr/bin/env node

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const token = readArg('token') ?? process.env.TELEGRAM_BOT_TOKEN;
const apiBaseUrl = process.env.TELEGRAM_API_BASE_URL ?? 'https://api.telegram.org';

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is required. Pass --token or set the environment variable.');
  process.exit(1);
}

async function telegram(method, body) {
  const response = await fetch(`${apiBaseUrl}/bot${token}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(`${method} failed: ${JSON.stringify(payload)}`);
  }
  return payload.result;
}

const me = await telegram('getMe');
const updates = await telegram('getUpdates');

console.log(`Bot: @${me.username ?? me.first_name ?? 'unknown'}`);

if (!Array.isArray(updates) || updates.length === 0) {
  console.log('No updates found.');
  console.log(`Open Telegram, send /start to @${me.username}, then run this command again before registering the webhook.`);
  process.exit(0);
}

const seen = new Map();
for (const update of updates) {
  const message = update.message ?? update.callback_query?.message;
  const from = update.message?.from ?? update.callback_query?.from;
  const chatId = message?.chat?.id;
  const userId = from?.id;
  if (chatId === undefined && userId === undefined) continue;
  const key = `${chatId ?? 'none'}:${userId ?? 'none'}`;
  seen.set(key, {
    chatId,
    userId,
    chatType: message?.chat?.type,
    username: from?.username,
    firstName: from?.first_name,
    text: message?.text
  });
}

if (seen.size === 0) {
  console.log('Updates were present, but no message chat/user ids were found.');
  process.exit(0);
}

for (const item of seen.values()) {
  console.log(JSON.stringify(item, null, 2));
}

const first = seen.values().next().value;
if (first?.userId !== undefined) {
  console.log(`\nRecommended secret: TELEGRAM_ALLOWED_USER_IDS=${first.userId}`);
}
if (first?.chatId !== undefined) {
  console.log(`Recommended secret: TELEGRAM_ALLOWED_CHAT_IDS=${first.chatId}`);
}

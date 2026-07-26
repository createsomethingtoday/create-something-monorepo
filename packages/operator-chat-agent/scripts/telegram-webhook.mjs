#!/usr/bin/env node

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const command = process.argv[2] ?? 'setup';
const host = readArg('host') ?? process.env.OPERATOR_CHAT_AGENT_URL;
const adminToken = readArg('admin-token') ?? process.env.OPERATOR_ADMIN_TOKEN;
const botToken = readArg('bot-token') ?? process.env.TELEGRAM_BOT_TOKEN;
const apiBaseUrl = process.env.TELEGRAM_API_BASE_URL ?? 'https://api.telegram.org';

async function telegram(method) {
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is required for Telegram API commands.');
  const response = await fetch(`${apiBaseUrl}/bot${botToken}/${method}`);
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(`${method} failed: ${JSON.stringify(payload)}`);
  }
  return payload.result;
}

if (command === 'status') {
  console.log(JSON.stringify(await telegram('getWebhookInfo'), null, 2));
  process.exit(0);
}

if (command !== 'setup') {
  console.error(`Unknown command: ${command}`);
  console.error('Usage: telegram-webhook.mjs setup --host https://... --admin-token ...');
  console.error('       telegram-webhook.mjs status --bot-token ...');
  process.exit(1);
}

if (!host) {
  console.error('OPERATOR_CHAT_AGENT_URL or --host is required.');
  process.exit(1);
}

if (!adminToken) {
  console.error('OPERATOR_ADMIN_TOKEN or --admin-token is required.');
  process.exit(1);
}

const response = await fetch(new URL('/admin/telegram/setup', host), {
  method: 'POST',
  headers: {
    authorization: `Bearer ${adminToken}`
  }
});

const payload = await response.json();
console.log(JSON.stringify(payload, null, 2));

if (!response.ok || payload.ok === false) {
  process.exit(1);
}

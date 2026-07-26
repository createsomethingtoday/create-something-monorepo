import assert from 'node:assert/strict';
import { test } from 'node:test';

import { telegramAccessDecision, telegramSecretMatches } from '../src/telegram-access.js';

const update = {
  message: {
    chat: { id: 111, type: 'private' },
    from: { id: 222, username: 'operator' },
    text: '/start'
  }
};

test('telegram webhook secret is checked from Telegram header', () => {
  const request = new Request('https://operator.example.test/messengers/telegram/webhook', {
    headers: { 'x-telegram-bot-api-secret-token': 'expected' }
  });

  assert.equal(telegramSecretMatches(request, { TELEGRAM_WEBHOOK_SECRET_TOKEN: 'expected' }), true);
  assert.equal(
    telegramSecretMatches(request, { TELEGRAM_WEBHOOK_SECRET_TOKEN: 'different' }),
    false
  );
});

test('telegram webhook secret fails closed when configuration is blank', () => {
  const request = new Request('https://operator.example.test/messengers/telegram/webhook', {
    headers: { 'x-telegram-bot-api-secret-token': '' }
  });

  assert.equal(telegramSecretMatches(request, { TELEGRAM_WEBHOOK_SECRET_TOKEN: '' }), false);
});

test('telegram access fails closed without allow list', () => {
  const decision = telegramAccessDecision(update, {});

  assert.equal(decision.allowed, false);
  assert.equal(decision.chatId, '111');
  assert.equal(decision.userId, '222');
});

test('telegram access accepts allowed chat id', () => {
  const decision = telegramAccessDecision(update, { TELEGRAM_ALLOWED_CHAT_IDS: '111' });

  assert.equal(decision.allowed, true);
});

test('telegram access accepts allowed user id', () => {
  const decision = telegramAccessDecision(update, { TELEGRAM_ALLOWED_USER_IDS: '222' });

  assert.equal(decision.allowed, true);
});

test('telegram access rejects unlisted sender', () => {
  const decision = telegramAccessDecision(update, {
    TELEGRAM_ALLOWED_CHAT_IDS: '333',
    TELEGRAM_ALLOWED_USER_IDS: '444'
  });

  assert.equal(decision.allowed, false);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildTelegramCommandResponse,
  commandFromText,
  matchTelegramCommand
} from '../src/telegram-command.js';

test('telegram command parser handles bare commands and slash commands', () => {
  assert.equal(commandFromText('status'), 'status');
  assert.equal(commandFromText(' Status '), 'status');
  assert.equal(commandFromText('/status'), 'status');
  assert.equal(commandFromText('/status@create_something_operator_bot'), 'status');
  assert.equal(commandFromText('/start'), 'help');
  assert.equal(commandFromText('commands'), 'help');
  assert.equal(commandFromText('research'), 'research');
  assert.equal(commandFromText('what is currently on the task list?'), null);
});

test('telegram command matcher requires a chat id', () => {
  assert.deepEqual(
    matchTelegramCommand({
      message: {
        chat: { id: 8757475795 },
        text: 'status'
      }
    }),
    {
      command: 'status',
      chatId: '8757475795'
    }
  );

  assert.equal(
    matchTelegramCommand({
      message: {
        text: 'status'
      }
    }),
    null
  );
});

test('status response shows live policy posture', () => {
  const response = buildTelegramCommandResponse('status', {
    LINEAR_API_KEY: 'linear-key',
    OPERATOR_TOOL_ACCESS_MODE: 'read_only',
    PAID_CAPABILITY_MODE: 'handoff_only',
    PAID_CAPABILITY_MAX_USD: '25',
    TELEGRAM_BOT_TOKEN: 'telegram-token'
  });

  assert.match(response, /Runtime: live/);
  assert.match(response, /Ingress: Telegram/);
  assert.match(response, /Tool mode: read_only/);
  assert.match(response, /Linear: configured/);
  assert.match(response, /Spend: handoff only, cap \$25/);
});

test('help response explains mobile operating posture', () => {
  const response = buildTelegramCommandResponse('help', {
    TELEGRAM_BOT_TOKEN: 'telegram-token'
  });

  assert.match(response, /Commands:/);
  assert.match(response, /For tasks, use explicit verbs/);
  assert.match(response, /Telegram is ingress/);
});

test('research response frames Poncho AgentCash and Composio', () => {
  const response = buildTelegramCommandResponse('research', {
    TELEGRAM_BOT_TOKEN: 'telegram-token'
  });

  assert.match(response, /Composio/);
  assert.match(response, /Poncho\/AgentCash/);
  assert.match(response, /no chat-only spend approval/);
});

import { getAgentByName, routeAgentRequest } from 'agents';

import { isAdminRequest } from './auth.js';
import { OperatorChatAgent, ThinkMessengerStateAgent } from './agent.js';
import type { Env } from './env.js';
import { readTelegramUpdate, telegramAccessDecision, telegramSecretMatches } from './telegram-access.js';
import { handleTelegramCommand } from './telegram-command.js';

export { OperatorChatAgent, ThinkMessengerStateAgent };

const TELEGRAM_WEBHOOK_PATH = '/messengers/telegram/webhook';

async function registerTelegramWebhook(request: Request, env: Env): Promise<Response> {
  if (!(await isAdminRequest(request, env))) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const webhookUrl = `https://${url.host}${TELEGRAM_WEBHOOK_PATH}`;
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
      allowed_updates: ['message'],
      drop_pending_updates: false
    })
  });

  const result = (await response.json()) as unknown;
  return Response.json(
    {
      ok: response.ok,
      webhookUrl,
      result
    },
    { status: response.ok ? 200 : 502 }
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) return agentResponse;

    const url = new URL(request.url);
    if (url.pathname === '/healthz') {
      return Response.json({
        ok: true,
        service: 'create-something-operator-chat-agent'
      });
    }

    if (url.pathname === '/admin/telegram/setup' && request.method === 'POST') {
      return registerTelegramWebhook(request, env);
    }

    if (url.pathname === TELEGRAM_WEBHOOK_PATH) {
      if (!telegramSecretMatches(request, env)) {
        return Response.json({ ok: false, error: 'invalid telegram webhook secret' }, { status: 401 });
      }

      const update = await readTelegramUpdate(request.clone());
      if (!update) {
        return Response.json({ ok: false, error: 'invalid telegram update' }, { status: 400 });
      }

      const decision = telegramAccessDecision(update, env);
      if (!decision.allowed) {
        console.warn(
          JSON.stringify({
            event: 'operator_chat_telegram_denied',
            reason: decision.reason,
            chatId: decision.chatId,
            userId: decision.userId
          })
        );
        return Response.json({ ok: true, ignored: true, reason: decision.reason });
      }

      const commandResult = await handleTelegramCommand(update, env);
      if (commandResult.handled) {
        return Response.json(commandResult, { status: commandResult.ok ? 200 : 502 });
      }

      const namespace = env.OperatorChatAgent as unknown as DurableObjectNamespace<OperatorChatAgent>;
      const agent = await getAgentByName(namespace, 'default');
      return agent.fetch(request);
    }

    return Response.json({
      service: 'create-something-operator-chat-agent',
      status: 'poc',
      mobileIngress: 'telegram',
      webhook: TELEGRAM_WEBHOOK_PATH,
      setup: 'POST /admin/telegram/setup',
      adminAuth: 'Authorization: Bearer <OPERATOR_ADMIN_TOKEN>',
      reset: 'not exposed in this POC'
    });
  }
} satisfies ExportedHandler<Env>;

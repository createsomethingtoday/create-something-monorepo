import { Think, type Session, type ToolCallContext } from '@cloudflare/think';
import {
  defineMessengers,
  ThinkMessengerStateAgent,
  type ThinkMessengers
} from '@cloudflare/think/messengers';
import telegramMessenger from '@cloudflare/think/messengers/telegram';
import { createWorkersAI } from 'workers-ai-provider';

import { createOperatorTools } from './tools.js';
import { decideToolPolicy } from './policy.js';
import { paidCapabilityMode, toolAccessMode, type Env } from './env.js';

export { ThinkMessengerStateAgent };

export class OperatorChatAgent extends Think<Env> {
  override maxSteps = 8;
  override sendReasoning = false;

  override getModel() {
    return createWorkersAI({ binding: this.env.AI })('@cf/meta/llama-4-scout-17b-16e-instruct');
  }

  override getSystemPrompt() {
    return [
      'You are the CREATE SOMETHING mobile operator agent.',
      'Keep responses compact enough for a phone.',
      'Use the Database / Automation / Judgment frame when explaining system state.',
      'Never imply that a paid capability has been purchased unless a tool result explicitly says it executed.',
      'When Poncho or AgentCash is relevant, separate capability discovery from spend approval and evidence capture.',
      'Linear is the durable coordination and evidence surface for tracked work.'
    ].join('\n');
  }

  override configureSession(session: Session): Session {
    return session.withContext('operator_policy', {
      provider: {
        get: async () =>
          [
            `Operator tool access mode: ${toolAccessMode(this.env)}.`,
            `Paid capability mode: ${paidCapabilityMode(this.env)}.`,
            'Connected SaaS operations and paid per-call capabilities are separate planes.',
            'Default posture is read-only plus handoff-only spend requests.'
          ].join('\n')
      }
    });
  }

  override getTools() {
    return createOperatorTools(this.env);
  }

  override beforeToolCall(ctx: ToolCallContext) {
    const decision = decideToolPolicy({
      toolName: ctx.toolName,
      accessMode: toolAccessMode(this.env),
      paidMode: paidCapabilityMode(this.env)
    });

    console.log(
      JSON.stringify({
        event: 'operator_chat_tool_policy',
        toolName: ctx.toolName,
        routeClass: decision.routeClass,
        allowed: decision.allowed,
        reason: decision.reason
      })
    );

    if (!decision.allowed) {
      return {
        action: 'block' as const,
        reason: decision.reason
      };
    }

    return { action: 'allow' as const };
  }

  override getMessengers(): ThinkMessengers {
    return defineMessengers({
      telegram: telegramMessenger({
        token: this.env.TELEGRAM_BOT_TOKEN,
        userName: this.env.TELEGRAM_BOT_USERNAME,
        secretToken: this.env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
        respondTo: ['direct-message', 'mention']
      })
    });
  }
}

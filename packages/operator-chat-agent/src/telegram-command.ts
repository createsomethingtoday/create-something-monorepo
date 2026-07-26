import {
  paidCapabilityMaxUsd,
  paidCapabilityMode,
  toolAccessMode,
  type Env,
  type PaidCapabilityMode
} from './env.js';
import type { TelegramUpdate } from './telegram-access.js';

export type TelegramMobileCommand = 'status' | 'help' | 'research';

export interface TelegramCommandMatch {
  command: TelegramMobileCommand;
  chatId: string;
}

export interface TelegramCommandHandled {
  handled: true;
  command: TelegramMobileCommand;
  ok: boolean;
  status: number;
}

export interface TelegramCommandNotHandled {
  handled: false;
}

export type TelegramCommandResult = TelegramCommandHandled | TelegramCommandNotHandled;

type CommandEnv = Pick<
  Env,
  | 'LINEAR_API_KEY'
  | 'OPERATOR_TOOL_ACCESS_MODE'
  | 'PAID_CAPABILITY_MAX_USD'
  | 'PAID_CAPABILITY_MODE'
  | 'TELEGRAM_BOT_TOKEN'
>;

const commandAliases = new Map<string, TelegramMobileCommand>([
  ['start', 'help'],
  ['help', 'help'],
  ['commands', 'help'],
  ['status', 'status'],
  ['research', 'research']
]);

function messageFromUpdate(update: TelegramUpdate) {
  return update.message ?? update.callback_query?.message;
}

function normalizedCommandText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function commandFromText(text: string | undefined): TelegramMobileCommand | null {
  if (!text) return null;

  const normalized = normalizedCommandText(text);
  if (!normalized) return null;

  const firstToken = normalized.split(' ')[0];
  if (!firstToken) return null;

  if (firstToken.startsWith('/')) {
    const slashCommand = firstToken.slice(1).split('@')[0] ?? '';
    return commandAliases.get(slashCommand) ?? null;
  }

  return commandAliases.get(normalized) ?? null;
}

export function matchTelegramCommand(update: TelegramUpdate): TelegramCommandMatch | null {
  const message = messageFromUpdate(update);
  const command = commandFromText(message?.text);
  const chatId = message?.chat?.id === undefined ? undefined : String(message.chat.id);

  if (!command || !chatId) {
    return null;
  }

  return { command, chatId };
}

function paidModeLabel(mode: PaidCapabilityMode): string {
  return mode.replace('_', ' ');
}

export function buildTelegramCommandResponse(command: TelegramMobileCommand, env: CommandEnv): string {
  if (command === 'status') {
    const paidMode = paidCapabilityMode(env);
    return [
      'CREATE SOMETHING Operator',
      'Runtime: live',
      'Ingress: Telegram',
      `Tool mode: ${toolAccessMode(env)}`,
      `Paid capability mode: ${paidMode}`,
      `Linear: ${env.LINEAR_API_KEY?.trim() ? 'configured' : 'not configured'}`,
      `Spend: ${paidModeLabel(paidMode)}, cap $${paidCapabilityMaxUsd(env)}`,
      'Commands: status, help, research'
    ].join('\n');
  }

  if (command === 'research') {
    return [
      'Research lane',
      'Telegram: mobile ingress only.',
      'Composio: durable authenticated SaaS operations.',
      'Poncho/AgentCash: paid external capability or artifact lane.',
      'Rule: no chat-only spend approval; create evidence and handoff first.',
      'Best use: ask for summaries, triage, and paid-capability handoff drafts.'
    ].join('\n');
  }

  return [
    'CREATE SOMETHING Operator',
    'Commands:',
    'status - runtime and policy posture',
    'help - command list and usage',
    'research - Poncho/AgentCash/Composio framing',
    '',
    'For tasks, use explicit verbs and evidence targets:',
    'List open CRE issues.',
    'Summarize AgentCash risks.',
    'Prepare a paid capability handoff under $25.',
    '',
    'Telegram is ingress. Linear is evidence. Spend is handoff-only in this POC.'
  ].join('\n');
}

export async function sendTelegramText(env: Pick<Env, 'TELEGRAM_BOT_TOKEN'>, chatId: string, text: string): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });
}

export async function handleTelegramCommand(update: TelegramUpdate, env: CommandEnv): Promise<TelegramCommandResult> {
  const match = matchTelegramCommand(update);
  if (!match) {
    return { handled: false };
  }

  const response = await sendTelegramText(env, match.chatId, buildTelegramCommandResponse(match.command, env));
  return {
    handled: true,
    command: match.command,
    ok: response.ok,
    status: response.status
  };
}

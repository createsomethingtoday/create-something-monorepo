import type { StoredAgentDecision } from './agent-console.js';

export interface AgentAdapterConfig {
  claudeExecutable?: string;
  codexExecutable?: string;
}

export interface AgentAdapterCommand {
  executable: string;
  args: string[];
}

function sessionReference(decision: StoredAgentDecision): string {
  const prefix = `${decision.provider}:`;
  if (!decision.agent_id.startsWith(prefix)) {
    throw new Error('Agent id does not match its provider.');
  }
  const session = decision.agent_id.slice(prefix.length);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(session)) {
    throw new Error('Agent id does not contain a safe resumable session reference.');
  }
  return session;
}

export function steeringPrompt(decision: StoredAgentDecision): string {
  const heading = `Operator steering from ${decision.device_id || 'Calm Operator'}: ${decision.kind} — ${decision.label}`;
  const detail = decision.message ? `\n\n${decision.message}` : '';
  const close =
    decision.kind === 'stop'
      ? 'Acknowledge this direction briefly, stop at the next safe checkpoint, and preserve a resumable handoff.'
      : decision.kind === 'pause'
        ? 'Acknowledge this direction briefly, pause at the next safe checkpoint, and preserve a resumable handoff.'
        : 'Acknowledge this direction briefly, then continue within the existing permissions and approval policy.';
  return `${heading}${detail}\n\n${close}`;
}

export function adapterCommand(
  decision: StoredAgentDecision,
  config: AgentAdapterConfig
): AgentAdapterCommand {
  const session = sessionReference(decision);
  const prompt = steeringPrompt(decision);

  if (decision.provider === 'claude') {
    return {
      executable: config.claudeExecutable?.trim() || 'claude',
      args: ['--resume', session, '--print', '--output-format', 'json', prompt]
    };
  }
  if (decision.provider === 'codex') {
    return {
      executable: config.codexExecutable?.trim() || 'codex',
      args: ['exec', '--json', 'resume', session, prompt]
    };
  }

  throw new Error(`Unsupported agent provider: ${decision.provider}`);
}

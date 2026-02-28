import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import readline from 'node:readline';
import TOML from '@iarna/toml';
import {
  evaluateConstraintPolicyHybrid,
  type ConstraintEvaluationInput,
  type ConstraintPolicy,
  type HybridEvaluatorConfig,
} from '@create-something/policy-os-engine';
import { AppServerClient } from './app-server/client.js';
import { BUILTIN_POLICIES } from './policy/builtin.js';
import { loadProjectPolicies } from './policy/load.js';
import type { LoadedPolicy } from './policy/types.js';
import { appendAndon } from './andon/log.js';
import { loadChecks } from './checks/load.js';
import { evaluateCheck } from './checks/eval.js';
import type { JudgmentCheck } from './checks/types.js';

type Args = {
  command: string;
  cwd: string;
  policyId?: string;
  prompt?: string;
  routeTask?: string;
  routeContext?: string;
  routeRequiresTools: boolean;
  routeStakeholderCount: number;
  routeDurationMinutes: number;
  routeRiskLevel: string;
  routeDomainCriticality: string;
  routeCodeTask?: boolean;
  checkId?: string;
  intervalSeconds: number;
  nonInteractive?: boolean;
  verbose?: boolean;
  stream?: boolean;
  andonTail?: number;
  mcpMode: 'minimal' | 'inherit';
  mcpExplicit?: boolean;
};

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2);

  const out: Args = {
    command: 'help',
    cwd: process.cwd(),
    mcpMode: 'minimal',
    intervalSeconds: 300,
    routeRequiresTools: false,
    routeStakeholderCount: 1,
    routeDurationMinutes: 60,
    routeRiskLevel: 'medium',
    routeDomainCriticality: 'medium',
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--cwd') out.cwd = resolve(args[++i] ?? out.cwd);
    else if (a === '--policy') out.policyId = args[++i];
    else if (a === '--prompt') out.prompt = args[++i];
    else if (a === '--task') out.routeTask = args[++i];
    else if (a === '--context') out.routeContext = args[++i];
    else if (a === '--requires-tools') out.routeRequiresTools = true;
    else if (a === '--no-requires-tools') out.routeRequiresTools = false;
    else if (a === '--stakeholders') out.routeStakeholderCount = parsePositiveInt(args[++i], out.routeStakeholderCount);
    else if (a === '--duration') out.routeDurationMinutes = parsePositiveInt(args[++i], out.routeDurationMinutes);
    else if (a === '--risk') out.routeRiskLevel = (args[++i] ?? out.routeRiskLevel).toLowerCase();
    else if (a === '--criticality') out.routeDomainCriticality = (args[++i] ?? out.routeDomainCriticality).toLowerCase();
    else if (a === '--code-task') out.routeCodeTask = true;
    else if (a === '--no-code-task') out.routeCodeTask = false;
    else if (a === '--check') out.checkId = args[++i];
    else if (a === '--interval') out.intervalSeconds = Math.max(10, Number(args[++i] ?? '300'));
    else if (a === '--non-interactive') out.nonInteractive = true;
    else if (a === '--verbose' || a === '-v') out.verbose = true;
    else if (a === '--stream') out.stream = true;
    else if (a === '--tail') out.andonTail = Number(args[++i] ?? '20');
    else if (a === '--mcp') {
      out.mcpMode = (args[++i] as any) === 'inherit' ? 'inherit' : 'minimal';
      out.mcpExplicit = true;
    }
    else if (a === '--help' || a === '-h') out.command = 'help';
    else if (!a.startsWith('-') && out.command === 'help') out.command = a;
  }
  return out;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function printHelp() {
  console.log(`
CREATE SOMETHING Judgment Layer (prototype)

Usage:
  cs-judge init [--cwd <dir>]
  cs-judge policies [--cwd <dir>]
  cs-judge andon [--cwd <dir>] [--tail <n>]
  cs-judge check [--check <id>] [--policy <id>] [--cwd <dir>] [--mcp minimal|inherit]
  cs-judge watch [--check <id>] [--interval <seconds>] [--policy <id>] [--cwd <dir>] [--mcp minimal|inherit]
  cs-judge route --task "<text>" [--context "<text>"] [--requires-tools|--no-requires-tools]
                 [--stakeholders <n>] [--duration <minutes>] [--risk low|medium|high]
                 [--criticality low|medium|high] [--code-task|--no-code-task]
                 [--policy <id>] [--cwd <dir>] [--mcp minimal|inherit]
  cs-judge run --prompt "<text>" [--policy <id>] [--cwd <dir>] [--non-interactive]
              [--mcp minimal|inherit] [--verbose] [--stream]

Defaults:
  --policy standard
  --mcp minimal  (disable configured MCP servers; avoids OAuth/auth failures from optional integrations)
`);
}

function scaffoldInit(cwd: string) {
  const root = join(cwd, '.judgment');
  const policiesDir = join(root, 'policies');
  const checksPath = join(root, 'checks.toml');

  mkdirSync(policiesDir, { recursive: true });

  // Minimal TOML templates (tuneable artifacts).
  const safe = `id = "safe"
label = "Safe"
description = "Read-only sandbox. Auto-approve read/list/search commands; decline writes by default."
approval_policy = "untrusted"
non_interactive_decision = "decline"

[sandbox_policy]
type = "readOnly"

[auto_approve]
command_action_types = ["read", "listFiles", "search"]
command_regex = ["^git\\\\s+(status|diff|log)\\\\b"]
`;

  const standard = `id = "standard"
label = "Standard"
description = "Workspace-write (no network by default). Auto-approve read/list/search; prompt for writes and unknown commands."
approval_policy = "untrusted"
non_interactive_decision = "decline"

[sandbox_policy]
type = "workspaceWrite"
network_access = false
writable_roots = ["$CWD"]

[auto_approve]
command_action_types = ["read", "listFiles", "search"]
command_regex = ["^pnpm\\\\b", "^git\\\\s+(status|diff|log|rev-parse|show)\\\\b", "^node\\\\s+-p\\\\b", "^cat\\\\b", "^ls\\\\b", "^rg\\\\b"]
`;

  const power = `id = "power"
label = "Power"
description = "Full-access sandbox. Defaults to accept-for-session when in doubt."
approval_policy = "untrusted"
non_interactive_decision = "cancel"

[sandbox_policy]
type = "dangerFullAccess"

[auto_approve]
command_action_types = ["read", "listFiles", "search", "unknown"]
file_path_prefixes = [""]
`;

  const readme = `# Judgment Layer (Project Policies)

These policy packs are **Judgment tier artifacts** (user-controlled constraints and guidance).

They are used by \`cs-judge\` to:
- set sandbox + approval posture
- auto-approve low-risk actions
- prompt an operator when uncertainty appears (Andon)

Files:
- \`policies/*.toml\` policy packs (track these)
- \`checks.toml\` monitoring checks (track this)
- \`andon.jsonl\` Andon log (ignore this)
`;

  const checksTemplate = `# Monitoring checks executed by: cs-judge check / cs-judge watch
# Minimal abstraction: fetch from one MCP tool, extract one value, compare to one target.

[[checks]]
id = "example_signal_low"
description = "Example: trigger when a signal drops below target"
enabled = false
server = "notion"
tool = "query_database"
args_json = "{}"
value_path = "results.0.properties.Score.number"
operator = "lt"
target = 50
severity = "high"
cooldown_minutes = 60
notify_channel = "console"
suggestion_prompt = "Given this low score, suggest three concrete actions for this week."
allow_auto_write = false
`;

  if (!existsSync(join(policiesDir, 'safe.toml'))) writeFileSync(join(policiesDir, 'safe.toml'), safe, 'utf-8');
  if (!existsSync(join(policiesDir, 'standard.toml')))
    writeFileSync(join(policiesDir, 'standard.toml'), standard, 'utf-8');
  if (!existsSync(join(policiesDir, 'power.toml'))) writeFileSync(join(policiesDir, 'power.toml'), power, 'utf-8');
  if (!existsSync(join(root, 'README.md'))) writeFileSync(join(root, 'README.md'), readme, 'utf-8');
  if (!existsSync(checksPath)) writeFileSync(checksPath, checksTemplate, 'utf-8');

  console.log(`Initialized policy packs in ${policiesDir}`);
}

function listPolicies(cwd: string): LoadedPolicy[] {
  const project = loadProjectPolicies(cwd);
  const byId = new Map<string, LoadedPolicy>();

  for (const p of BUILTIN_POLICIES) byId.set(p.id, p);
  for (const p of project) byId.set(p.id, p);

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function printAndon(cwd: string, tail = 20) {
  const path = join(cwd, '.judgment', 'andon.jsonl');
  if (!existsSync(path)) {
    console.log('(no Andon log found)');
    return;
  }

  const raw = readFileSync(path, 'utf-8');
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const last = lines.slice(Math.max(0, lines.length - tail));
  const records: any[] = [];
  for (const l of last) {
    try {
      records.push(JSON.parse(l));
    } catch {
      // ignore
    }
  }

  if (!records.length) {
    console.log('(Andon log is empty)');
    return;
  }

  for (const r of records) {
    const ts = typeof r.createdAt === 'string' ? r.createdAt : '';
    const kind = r.kind ?? '';
    const phase = r.phase ? `/${r.phase}` : '';
    const decision = r.decision ? ` decision=${r.decision}` : '';
    const status = r.status ? ` status=${r.status}` : '';
    const summary = r.summary ?? '';
    console.log(`${ts} ${kind}${phase}${decision}${status} ${summary}`.trim());
  }
}

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => rl.question(question, resolve));
  rl.close();
  return answer.trim();
}

function readTomlFileOrNull(path: string): any | null {
  if (!existsSync(path)) return null;
  try {
    return TOML.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function listConfiguredMcpServers(cwd: string): string[] {
  const userCfg = readTomlFileOrNull(join(homedir(), '.codex', 'config.toml'));
  const projectCfg = readTomlFileOrNull(join(cwd, '.codex', 'config.toml'));

  const names = new Set<string>();
  for (const cfg of [userCfg, projectCfg]) {
    const servers = cfg?.mcp_servers;
    if (servers && typeof servers === 'object') {
      for (const k of Object.keys(servers)) names.add(k);
    }
  }
  return [...names].sort();
}

function buildAppServerArgv(args: Args): {
  argv: string[];
  disabledMcpServers: string[];
  skippedMcpServers: string[];
} {
  const argv: string[] = ['app-server'];
  const disabledMcpServers: string[] = [];
  const skippedMcpServers: string[] = [];

  if (args.mcpMode === 'minimal') {
    // Disable all configured MCP servers for safety/reliability. This avoids OAuth flows, bearer tokens,
    // and remote connectivity from interfering with local runs. (Enable via `--mcp inherit`.)
    for (const name of listConfiguredMcpServers(args.cwd)) {
      // Dotted-path overrides split on '.'; server names containing '.' are skipped for now.
      if (name.includes('.')) {
        skippedMcpServers.push(name);
        continue;
      }
      argv.push('-c', `mcp_servers.${name}.enabled=false`);
      disabledMcpServers.push(name);
    }
  }

  return { argv, disabledMcpServers, skippedMcpServers };
}

function renderPolicyOneLine(p: LoadedPolicy): string {
  const src = p.source === 'builtin' ? 'builtin' : `project:${p.sourcePath ?? ''}`;
  return `${p.id.padEnd(10)} ${p.label.padEnd(10)} ${p.description} (${src})`;
}

function formatPolicySummary(policy: LoadedPolicy, cwd: string): string[] {
  const lines: string[] = [];
  lines.push(`Policy: ${policy.id} (${policy.source})`);
  lines.push(`Approvals: ${policy.approvalPolicy}`);

  const s = policy.sandboxPolicy;
  if (s.type === 'readOnly') {
    lines.push(`Sandbox: readOnly`);
  } else if (s.type === 'dangerFullAccess') {
    lines.push(`Sandbox: dangerFullAccess`);
  } else {
    const rootsRaw = (s.writableRoots ?? ['$CWD']).map((p) => (p === '$CWD' ? cwd : p));
    const rootsPretty = rootsRaw.map((p) => (p === cwd ? '<cwd>' : p));
    const roots =
      rootsPretty.length <= 2 ? rootsPretty.join(', ') : `${rootsPretty.length} roots (use --verbose to list)`;
    lines.push(`Sandbox: workspaceWrite (network: ${s.networkAccess ? 'on' : 'off'}, roots: ${roots})`);
  }

  const auto = policy.autoApprove;
  const autoCmd = (auto?.commandActionTypes?.length ?? 0) + (auto?.commandRegex?.length ?? 0);
  const autoFiles = auto?.filePathPrefixes?.length ?? 0;
  if (autoCmd > 0 || autoFiles > 0) {
    lines.push(`Auto-approve: commands=${autoCmd > 0 ? 'on' : 'off'} files=${autoFiles > 0 ? 'on' : 'off'}`);
  } else {
    lines.push(`Auto-approve: off`);
  }

  lines.push(`Constraint Engine: ${engineModeFromEnv()} (fallback: ${(process.env.ENGINE_FALLBACK_ENABLED ?? 'true').toLowerCase() !== 'false' ? 'on' : 'off'})`);

  return lines;
}

function engineModeFromEnv(): 'legacy' | 'hybrid' | 'polar' {
  const raw = (process.env.CONSTRAINT_ENGINE_MODE ?? 'hybrid').toLowerCase();
  if (raw === 'legacy' || raw === 'polar') return raw;
  return 'hybrid';
}

function hybridConfigFromEnv(): HybridEvaluatorConfig {
  const fetchTimeoutRaw = process.env.OSO_FETCH_TIMEOUT_MS;
  const fetchTimeoutMillis = fetchTimeoutRaw ? Number(fetchTimeoutRaw) : undefined;
  return {
    mode: engineModeFromEnv(),
    fallbackEnabled: (process.env.ENGINE_FALLBACK_ENABLED ?? 'true').toLowerCase() !== 'false',
    oso: {
      url: process.env.OSO_URL,
      apiKey: process.env.OSO_API_KEY,
      bootstrapPolicy: (process.env.OSO_BOOTSTRAP_POLICY ?? 'true').toLowerCase() !== 'false',
      fetchTimeoutMillis: Number.isFinite(fetchTimeoutMillis ?? NaN) ? fetchTimeoutMillis : undefined,
    },
  };
}

function buildApprovalConstraintPolicy(policy: LoadedPolicy, kind: 'command' | 'file'): ConstraintPolicy {
  const label = kind === 'command' ? 'command approval' : 'file approval';
  return {
    id: `${policy.id}-${kind}-policy-os`,
    name: `${policy.label} (${label})`,
    description: `Derived from ${policy.id} for ${label}.`,
    rules: [
      {
        id: `${policy.id}-${kind}-auto-allow`,
        priority: 10,
        when: { hasHumanReviewStep: true },
        then: {
          decision: 'allow',
          reason: `Auto-approve conditions matched for ${label}.`,
        },
      },
      {
        id: `${policy.id}-${kind}-review`,
        priority: 100,
        when: {},
        then: {
          decision: 'require_human_review',
          reason: `${label} requires operator review under current policy.`,
        },
      },
    ],
  };
}

async function evaluateApprovalConstraintDecision(
  policy: LoadedPolicy,
  kind: 'command' | 'file',
  input: ConstraintEvaluationInput,
) {
  const derivedPolicy = buildApprovalConstraintPolicy(policy, kind);
  return evaluateConstraintPolicyHybrid(input, derivedPolicy, null, hybridConfigFromEnv());
}

function resolvePolicy(cwd: string, policyId?: string): LoadedPolicy {
  const policies = listPolicies(cwd);
  const resolvedId = policyId ?? 'standard';
  const policy = policies.find((p) => p.id === resolvedId);
  if (!policy) {
    throw new Error(`Unknown policy: ${resolvedId}\nAvailable:\n${policies.map(renderPolicyOneLine).join('\n')}`);
  }
  return policy;
}

type PromptExecutionResult = {
  text: string;
  status: string;
  turnId: string;
  threadId: string;
  andonPath: string;
  andonCount: number;
  turnErrorMessage?: string;
};

function isTransientAppServerErrorMessage(message: string | undefined): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes('reconnecting') ||
    normalized.includes('stream disconnected') ||
    normalized.includes('retrying turn')
  );
}

function parseJsonObjectFromText(text: string): any {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const codeFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeFence?.[1]) {
    return JSON.parse(codeFence[1].trim());
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new Error('Unable to parse JSON object from agent output');
}

async function runPromptForMonitoring(args: Args, policy: LoadedPolicy, prompt: string): Promise<PromptExecutionResult> {
  const appServerArgs = buildAppServerArgv(args);
  const client = new AppServerClient({
    argv: appServerArgs.argv,
    stderr: args.verbose ? 'inherit' : 'pipe'
  });

  const items = new Map<string, any>();
  const agentMessages = new Map<string, string>();
  let lastAgentMessageId: string | null = null;
  let threadId = '';
  const andonRef = { path: '', count: 0 };

  const logAndon = (record: any) => {
    const path = appendAndon(args.cwd, record);
    andonRef.path = path;
    andonRef.count++;
  };

  const turnDone = new Promise<PromptExecutionResult>((resolveTurn, rejectTurn) => {
    client.onMessage = (msg) => {
      if (msg.method === 'error') {
        const { error } = msg.params as any;
        const message = error?.message ?? '(unknown app-server error)';
        if (isTransientAppServerErrorMessage(message)) return;
        rejectTurn(new Error(message));
        return;
      }

      if (msg.id !== undefined && msg.method === 'item/commandExecution/requestApproval') {
        const { itemId, threadId: msgThreadId, turnId, reason } = msg.params as any;
        const decision = policy.nonInteractiveDecision;
        logAndon({
          id: `andon_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          createdAt: new Date().toISOString(),
          policyId: policy.id,
          kind: 'commandExecution',
          phase: 'approval',
          threadId: msgThreadId,
          turnId,
          itemId,
          summary: 'monitoring prompt requested command approval',
          details: { reason },
          decision
        });
        client.respond(msg.id as any, { decision });
        return;
      }

      if (msg.id !== undefined && msg.method === 'item/fileChange/requestApproval') {
        const { itemId, threadId: msgThreadId, turnId, reason } = msg.params as any;
        const decision = policy.nonInteractiveDecision;
        logAndon({
          id: `andon_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          createdAt: new Date().toISOString(),
          policyId: policy.id,
          kind: 'fileChange',
          phase: 'approval',
          threadId: msgThreadId,
          turnId,
          itemId,
          summary: 'monitoring prompt requested file-change approval',
          details: { reason },
          decision
        });
        client.respond(msg.id as any, { decision });
        return;
      }

      if (msg.method === 'item/started') {
        const { item } = msg.params as any;
        items.set(item.id, item);
        if (item.type === 'agentMessage') {
          lastAgentMessageId = item.id;
          agentMessages.set(item.id, item.text ?? '');
        }
        return;
      }

      if (msg.method === 'item/agentMessage/delta') {
        const { itemId, delta } = msg.params as any;
        agentMessages.set(itemId, (agentMessages.get(itemId) ?? '') + delta);
        return;
      }

      if (msg.method === 'item/completed') {
        const { item } = msg.params as any;
        items.set(item.id, item);
        if (item.type === 'agentMessage') {
          lastAgentMessageId = item.id;
          agentMessages.set(item.id, item.text ?? agentMessages.get(item.id) ?? '');
        }
        return;
      }

      if (msg.method === 'turn/completed') {
        const { turn } = msg.params as any;
        const finalMsg =
          (lastAgentMessageId ? agentMessages.get(lastAgentMessageId) : null) ?? [...agentMessages.values()].join('');
        resolveTurn({
          text: (finalMsg ?? '').trim(),
          status: turn.status as string,
          turnId: turn.id as string,
          threadId,
          andonPath: andonRef.path,
          andonCount: andonRef.count,
          turnErrorMessage: turn.error?.message
        });
      }
    };
  });

  try {
    await client.request(
      'initialize',
      {
        clientInfo: { name: 'cs_judgment_layer', title: 'CREATE SOMETHING Judgment Layer', version: '0.1.0' },
        capabilities: { experimentalApi: true }
      },
      { timeoutMs: 15_000 }
    );
    client.notify('initialized');

    const threadResult = await client.request(
      'thread/start',
      {
        cwd: args.cwd,
        model: policy.model ?? null,
        approvalPolicy: policy.approvalPolicy,
        developerInstructions: policy.developerInstructions ?? null
      },
      { timeoutMs: 30_000 }
    );
    threadId = threadResult.thread.id as string;

    const sandboxPolicy =
      policy.sandboxPolicy.type === 'workspaceWrite'
        ? {
            ...policy.sandboxPolicy,
            writableRoots: (policy.sandboxPolicy.writableRoots ?? ['$CWD']).map((p) => (p === '$CWD' ? args.cwd : p))
          }
        : policy.sandboxPolicy;

    await client.request(
      'turn/start',
      {
        threadId,
        input: [{ type: 'text', text: prompt }],
        approvalPolicy: policy.approvalPolicy,
        sandboxPolicy,
        model: policy.model ?? null,
        effort: policy.effort ?? null,
        summary: policy.summary ?? null
      },
      { timeoutMs: 30_000 }
    );

    return await turnDone;
  } finally {
    client.close();
  }
}

function readAlertState(cwd: string): Record<string, string> {
  const path = join(cwd, '.judgment', 'alerts-state.json');
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function writeAlertState(cwd: string, state: Record<string, string>): void {
  const dir = join(cwd, '.judgment');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'alerts-state.json'), `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
}

function inCooldown(lastIso: string | undefined, cooldownMinutes: number, nowMs: number): boolean {
  if (!lastIso) return false;
  const lastMs = Date.parse(lastIso);
  if (Number.isNaN(lastMs)) return false;
  return nowMs - lastMs < cooldownMinutes * 60_000;
}

function buildToolFetchPrompt(check: JudgmentCheck, parsedArgs: unknown): string {
  return [
    'You are running a deterministic monitoring check.',
    'Use MCP exactly once to fetch data for this check.',
    `Server: ${check.server}`,
    `Tool: ${check.tool}`,
    `Arguments JSON: ${JSON.stringify(parsedArgs)}`,
    '',
    'Return ONLY JSON. No markdown. No explanation.',
    'Required shape:',
    '{"ok":true,"toolResult":<json>}',
    'If tool execution fails, return:',
    '{"ok":false,"error":"<short message>"}'
  ].join('\n');
}

function parseSeverityLevel(raw: string, fieldName: string): 'low' | 'medium' | 'high' {
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  throw new Error(`Invalid ${fieldName}: ${raw}. Expected low|medium|high`);
}

type RouteToolArgs = {
  task: string;
  context?: string;
  requiresToolOrchestration: boolean;
  stakeholderCount: number;
  expectedDurationMinutes: number;
  riskLevel: 'low' | 'medium' | 'high';
  domainCriticality: 'low' | 'medium' | 'high';
  isCodeTask?: boolean;
};

function buildRouteToolArgs(args: Args): RouteToolArgs {
  if (!args.routeTask || !args.routeTask.trim()) {
    throw new Error('Missing --task "<text>"');
  }

  const routeArgs: RouteToolArgs = {
    task: args.routeTask.trim(),
    context: args.routeContext?.trim() || undefined,
    requiresToolOrchestration: args.routeRequiresTools,
    stakeholderCount: Math.max(1, Math.floor(args.routeStakeholderCount)),
    expectedDurationMinutes: Math.max(1, Math.floor(args.routeDurationMinutes)),
    riskLevel: parseSeverityLevel(args.routeRiskLevel, '--risk'),
    domainCriticality: parseSeverityLevel(args.routeDomainCriticality, '--criticality'),
  };

  if (typeof args.routeCodeTask === 'boolean') {
    routeArgs.isCodeTask = args.routeCodeTask;
  }

  return routeArgs;
}

function buildProblemRoutePrompt(routeArgs: RouteToolArgs): string {
  return [
    'You are running a deterministic problem-routing step.',
    'Use MCP exactly once.',
    'Tool: hub_route_problem',
    `Arguments JSON: ${JSON.stringify(routeArgs)}`,
    '',
    'Return ONLY JSON. No markdown. No explanation.',
    'Required shape:',
    '{"ok":true,"toolResult":<json>}',
    'If tool execution fails, return:',
    '{"ok":false,"error":"<short message>"}'
  ].join('\n');
}

async function maybeGenerateSuggestion(
  args: Args,
  policy: LoadedPolicy,
  check: JudgmentCheck,
  observed: unknown
): Promise<string | null> {
  if (!check.suggestionPrompt) return null;

  const prompt = [
    'Create concise, practical suggestions.',
    `Check id: ${check.id}`,
    `Description: ${check.description ?? ''}`,
    `Observed value: ${JSON.stringify(observed)}`,
    `Target: ${JSON.stringify(check.target)} (operator: ${check.operator})`,
    '',
    `Instruction: ${check.suggestionPrompt}`,
    '',
    'Return 3 bullets, each under 140 chars.'
  ].join('\n');

  const result = await runPromptForMonitoring(args, policy, prompt);
  return result.text || null;
}

async function runChecksOnce(args: Args, policy: LoadedPolicy): Promise<void> {
  const allChecks = loadChecks(args.cwd).checks.filter((c) => c.enabled);
  const checks = args.checkId ? allChecks.filter((c) => c.id === args.checkId) : allChecks;
  if (!checks.length) {
    if (args.checkId) console.log(`No enabled check found with id "${args.checkId}"`);
    else console.log('No enabled checks found in .judgment/checks.toml');
    return;
  }

  const state = readAlertState(args.cwd);
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  let firedCount = 0;

  for (const check of checks) {
    let parsedArgs: unknown;
    try {
      parsedArgs = JSON.parse(check.argsJson);
    } catch (err: any) {
      console.log(`[${check.id}] error: invalid args_json (${err?.message ?? String(err)})`);
      continue;
    }

    let fetchResult: PromptExecutionResult;
    try {
      fetchResult = await runPromptForMonitoring(args, policy, buildToolFetchPrompt(check, parsedArgs));
    } catch (err: any) {
      console.log(`[${check.id}] error: MCP fetch failed (${err?.message ?? String(err)})`);
      continue;
    }

    let payload: any;
    try {
      payload = parseJsonObjectFromText(fetchResult.text);
    } catch (err: any) {
      console.log(`[${check.id}] error: could not parse monitor JSON (${err?.message ?? String(err)})`);
      continue;
    }

    if (!payload?.ok) {
      console.log(`[${check.id}] error: ${payload?.error ?? 'tool call failed'}`);
      continue;
    }

    const evaluation = evaluateCheck(check, payload.toolResult);
    if (!evaluation.extracted) {
      console.log(`[${check.id}] error: ${evaluation.reason}`);
      continue;
    }

    if (!evaluation.triggered) {
      console.log(`[${check.id}] OK ${evaluation.reason}`);
      continue;
    }

    const last = state[check.id];
    if (inCooldown(last, check.cooldownMinutes, nowMs)) {
      console.log(`[${check.id}] cooldown: alert suppressed (last=${last})`);
      continue;
    }

    firedCount++;
    state[check.id] = nowIso;
    const suggestion = await maybeGenerateSuggestion(args, policy, check, evaluation.observed);
    appendAndon(args.cwd, {
      id: `andon_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: nowIso,
      policyId: policy.id,
      kind: 'alert',
      phase: 'completed',
      threadId: fetchResult.threadId,
      turnId: fetchResult.turnId,
      itemId: check.id,
      summary: `check triggered: ${check.id}`,
      details: {
        checkId: check.id,
        severity: check.severity,
        notifyChannel: check.notifyChannel,
        observed: evaluation.observed,
        operator: check.operator,
        target: check.target,
        reason: evaluation.reason,
        source: { server: check.server, tool: check.tool, valuePath: check.valuePath }
      },
      status: 'triggered'
    });

    console.log(`[${check.id}] ALERT severity=${check.severity} observed=${String(evaluation.observed)} target=${String(check.target)}`);
    console.log(`source=${check.server}/${check.tool} value_path=${check.valuePath} notify=${check.notifyChannel}`);
    if (suggestion) console.log(suggestion);
  }

  writeAlertState(args.cwd, state);
  console.log(`Checks complete: ${checks.length} ran, ${firedCount} alert(s) fired`);
}

async function runChecks(args: Args): Promise<void> {
  const policy = resolvePolicy(args.cwd, args.policyId);
  for (const line of formatPolicySummary(policy, args.cwd)) console.log(line);
  console.log(`MCP: ${args.mcpMode}`);
  await runChecksOnce(args, policy);
}

async function runProblemRoute(args: Args): Promise<void> {
  const policy = resolvePolicy(args.cwd, args.policyId);
  const routeArgs = buildRouteToolArgs(args);

  for (const line of formatPolicySummary(policy, args.cwd)) console.log(line);
  console.log(`MCP: ${args.mcpMode}`);

  const result = await runPromptForMonitoring(args, policy, buildProblemRoutePrompt(routeArgs));

  let payload: any;
  try {
    payload = parseJsonObjectFromText(result.text);
  } catch (err: any) {
    throw new Error(`Could not parse route JSON (${err?.message ?? String(err)})`);
  }

  if (!payload?.ok) {
    throw new Error(`Routing failed: ${payload?.error ?? 'tool call failed'}`);
  }

  const routed = payload.toolResult;
  console.log('\n--- Problem Route ---\n');
  console.log(JSON.stringify(routed, null, 2));
}

async function watchChecks(args: Args): Promise<void> {
  const policy = resolvePolicy(args.cwd, args.policyId);
  for (const line of formatPolicySummary(policy, args.cwd)) console.log(line);
  console.log(`MCP: ${args.mcpMode}`);
  console.log(`Watch interval: ${args.intervalSeconds}s`);

  while (true) {
    console.log(`\n[${new Date().toISOString()}] Running checks...`);
    await runChecksOnce(args, policy);
    await new Promise((resolve) => setTimeout(resolve, args.intervalSeconds * 1000));
  }
}

async function runWithPolicy(args: Args) {
  const policy = resolvePolicy(args.cwd, args.policyId);
  if (!args.prompt) {
    console.error('Missing --prompt "<text>"');
    process.exit(1);
  }

  // Cache thread items by id so approval requests can be evaluated with context.
  const items = new Map<string, any>();
  const agentMessages = new Map<string, string>();
  let lastAgentMessageId: string | null = null;
  const approvalDecisionByItemId = new Map<string, string>();
  const suppressCompletionLogForItemId = new Set<string>();
  let streamHeaderPrinted = false;

  const appServerArgs = buildAppServerArgv(args);

  for (const line of formatPolicySummary(policy, args.cwd)) console.log(line);
  if (args.mcpMode === 'minimal') {
    console.log(`MCP: minimal (disabled ${appServerArgs.disabledMcpServers.length} servers)`);
  } else {
    console.log(`MCP: inherit`);
  }
  if (args.verbose && args.mcpMode === 'minimal') {
    if (appServerArgs.disabledMcpServers.length) console.log(`Disabled MCP servers: ${appServerArgs.disabledMcpServers.join(', ')}`);
    if (appServerArgs.skippedMcpServers.length) console.log(`Skipped MCP servers (unsupported name): ${appServerArgs.skippedMcpServers.join(', ')}`);
  }

  const client = new AppServerClient({
    argv: appServerArgs.argv,
    stderr: args.verbose ? 'inherit' : 'pipe'
  });

  let resolveTurnDone: (() => void) | null = null;
  let rejectTurnDone: ((err: Error) => void) | null = null;
  let turnDoneSettled = false;
  const turnDone = new Promise<void>((resolve, reject) => {
    resolveTurnDone = () => {
      if (turnDoneSettled) return;
      turnDoneSettled = true;
      resolve();
    };
    rejectTurnDone = (err) => {
      if (turnDoneSettled) return;
      turnDoneSettled = true;
      reject(err);
    };
  });

  const andonRef = { path: '', count: 0 };
  const logAndon = (record: any) => {
    const path = appendAndon(args.cwd, record);
    andonRef.path = path;
    andonRef.count++;
  };

  client.onMessage = async (msg) => {
    if (msg.method === 'error') {
      const { error } = msg.params as any;
      const message = error?.message ?? '(unknown error)';
      if (isTransientAppServerErrorMessage(message)) return;
      console.error(`\nApp-server error: ${message}`);
      client.close();
      rejectTurnDone?.(new Error(message));
      return;
    }

    // Server-initiated approval requests.
    if (msg.id !== undefined && msg.method === 'item/commandExecution/requestApproval') {
      const { itemId, threadId, turnId, reason, proposedExecpolicyAmendment } = msg.params as any;
      const item = items.get(itemId);
      const command = item?.command ?? '<unknown>';
      const actions: any[] = item?.commandActions ?? [];

      const auto = policy.autoApprove;
      const allowByAction =
        auto?.commandActionTypes && actions.length > 0
          ? actions.every((a) => auto.commandActionTypes!.includes(a.type))
          : false;
      const allowByRegex =
        (auto?.commandRegex ?? []).some((re) => {
          try {
            return new RegExp(re).test(command);
          } catch {
            return false;
          }
        }) ?? false;
      const autoApproved = allowByAction || allowByRegex;
      const readLikeActions = ['read', 'listFiles', 'search'];
      const hasWriteIntent =
        actions.length > 0 ? actions.some((a) => !readLikeActions.includes(a.type)) : !autoApproved;
      const engineDecision = await evaluateApprovalConstraintDecision(policy, 'command', {
        toolName: 'command_approval',
        accountId: 'local-operator',
        readOnly: policy.sandboxPolicy.type === 'readOnly',
        hasWriteIntent,
        hasHumanReviewStep: autoApproved,
        introspectionOk: true,
      });

      let decision: any =
        engineDecision.decision === 'allow'
          ? 'acceptForSession'
          : engineDecision.decision === 'block'
            ? 'decline'
            : null;

      if (!decision) {
        if (args.nonInteractive) {
          decision = policy.nonInteractiveDecision;
        } else {
          console.log(`\nApproval requested (command): ${command}`);
          if (reason) console.log(`Reason: ${reason}`);
          if (Array.isArray(proposedExecpolicyAmendment) && proposedExecpolicyAmendment.length) {
            console.log(`Proposed execpolicy amendment available (${proposedExecpolicyAmendment.length} rule(s)).`);
            const ans = await promptUser('Decision [a=accept for session, p=accept+amend, d=decline, c=cancel]: ');
            decision =
              ans === 'p'
                ? { acceptWithExecpolicyAmendment: { execpolicy_amendment: proposedExecpolicyAmendment } }
                : ans === 'c'
                  ? 'cancel'
                  : ans === 'a'
                    ? 'acceptForSession'
                    : 'decline';
          } else {
            const ans = await promptUser('Decision [a=accept for session, d=decline, c=cancel]: ');
            decision = ans === 'c' ? 'cancel' : ans === 'a' ? 'acceptForSession' : 'decline';
          }
        }
      }

      const decisionStr =
        typeof decision === 'string'
          ? decision
          : typeof decision === 'object' && decision && 'acceptWithExecpolicyAmendment' in decision
            ? 'acceptWithExecpolicyAmendment'
            : 'unknown';
      approvalDecisionByItemId.set(itemId, decisionStr);
      if (decisionStr === 'decline' || decisionStr === 'cancel') suppressCompletionLogForItemId.add(itemId);

      logAndon({
        id: `andon_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
        policyId: policy.id,
        kind: 'commandExecution',
        phase: 'approval',
        threadId,
        turnId,
        itemId,
        summary: `command approval: ${command}`,
        details: {
          command,
          reason,
          commandActions: actions,
          proposedExecpolicyAmendment: proposedExecpolicyAmendment ?? null,
          constraintEngine: {
            decision: engineDecision.decision,
            reason: engineDecision.reason,
            engine: engineDecision.engine,
            evaluationPath: engineDecision.evaluationPath,
            policyHash: engineDecision.policyHash ?? null,
            compilerVersion: engineDecision.compilerVersion ?? null,
            fallbackReason: engineDecision.fallbackReason ?? null
          }
        },
        decision: decisionStr
      });

      client.respond(msg.id as any, { decision });
      return;
    }

    if (msg.id !== undefined && msg.method === 'item/fileChange/requestApproval') {
      const { itemId, threadId, turnId, reason } = msg.params as any;
      approvalDecisionByItemId.set(itemId, 'pending');
      const item = items.get(itemId);
      const changes: Array<{ path: string; kind: string }> = (item?.changes ?? []).map((c: any) => ({
        path: c.path,
        kind: c.kind
      }));

      const auto = policy.autoApprove;
      const prefixes = auto?.filePathPrefixes ?? [];
      const allowByPrefix =
        prefixes.length > 0
          ? changes.every((c) => prefixes.some((p) => c.path.startsWith(p)))
          : false;
      const engineDecision = await evaluateApprovalConstraintDecision(policy, 'file', {
        toolName: 'file_change_approval',
        accountId: 'local-operator',
        readOnly: policy.sandboxPolicy.type === 'readOnly',
        hasWriteIntent: changes.length > 0,
        hasHumanReviewStep: allowByPrefix,
        introspectionOk: true,
      });

      let decision: any =
        engineDecision.decision === 'allow'
          ? 'acceptForSession'
          : engineDecision.decision === 'block'
            ? 'decline'
            : null;

      if (!decision) {
        if (args.nonInteractive) {
          decision = policy.nonInteractiveDecision;
        } else {
          console.log(`\nApproval requested (file changes):`);
          for (const c of changes.slice(0, 20)) console.log(`- ${c.kind} ${c.path}`);
          if (changes.length > 20) console.log(`- ... (${changes.length - 20} more)`);
          if (reason) console.log(`Reason: ${reason}`);
          const ans = await promptUser('Decision [a=accept for session, d=decline, c=cancel]: ');
          decision = ans === 'c' ? 'cancel' : ans === 'a' ? 'acceptForSession' : 'decline';
        }
      }

      approvalDecisionByItemId.set(itemId, decision);
      if (decision === 'decline' || decision === 'cancel') suppressCompletionLogForItemId.add(itemId);

      logAndon({
        id: `andon_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
        policyId: policy.id,
        kind: 'fileChange',
        phase: 'approval',
        threadId,
        turnId,
        itemId,
        summary: `file change approval (${changes.length} changes)`,
        details: {
          changes,
          reason,
          constraintEngine: {
            decision: engineDecision.decision,
            reason: engineDecision.reason,
            engine: engineDecision.engine,
            evaluationPath: engineDecision.evaluationPath,
            policyHash: engineDecision.policyHash ?? null,
            compilerVersion: engineDecision.compilerVersion ?? null,
            fallbackReason: engineDecision.fallbackReason ?? null
          }
        },
        decision
      });

      client.respond(msg.id as any, { decision });
      return;
    }

    // Notifications.
    if (msg.method === 'item/started') {
      const { item } = msg.params as any;
      items.set(item.id, item);
      if (item.type === 'agentMessage') {
        lastAgentMessageId = item.id;
        agentMessages.set(item.id, item.text ?? '');
        if (args.stream) {
          if (!streamHeaderPrinted) {
            console.log('\n--- Agent Output (streaming) ---\n');
            streamHeaderPrinted = true;
          }
        }
      }
      if (args.verbose) {
        if (item.type === 'commandExecution') console.log(`> ${item.command}`);
        if (item.type === 'fileChange') console.log(`~ fileChange (${(item.changes ?? []).length} changes)`);
      }
      return;
    }

    if (msg.method === 'item/agentMessage/delta') {
      const { itemId, delta } = msg.params as any;
      agentMessages.set(itemId, (agentMessages.get(itemId) ?? '') + delta);
      if (args.stream) process.stdout.write(delta);
      return;
    }

    if (msg.method === 'item/completed') {
      const { item, threadId, turnId } = msg.params as any;
      items.set(item.id, item);
      if (item.type === 'agentMessage') {
        lastAgentMessageId = item.id;
        agentMessages.set(item.id, item.text ?? agentMessages.get(item.id) ?? '');
      }

      // Andon: record approvals + anomalies (failed/declined) without spamming every normal event.
      const approvalDecision = approvalDecisionByItemId.get(item.id) ?? null;
      if (approvalDecision) approvalDecisionByItemId.delete(item.id);

      if (item.type === 'commandExecution') {
        const status = item.status as string | undefined;
        if (suppressCompletionLogForItemId.has(item.id)) return;
        // If the operator declined/cancelled, the approval record already captures the outcome.
        const declined = approvalDecision === 'decline' || approvalDecision === 'cancel';
        if (!declined && status && status !== 'completed') {
          logAndon({
            id: `andon_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            createdAt: new Date().toISOString(),
            policyId: policy.id,
            kind: 'commandExecution',
            phase: 'completed',
            threadId,
            turnId,
            itemId: item.id,
            summary: `command ${status}: ${item.command ?? '<unknown>'}`,
            details: {
              command: item.command,
              commandActions: item.commandActions,
              exitCode: item.exitCode,
              durationMs: item.durationMs
            },
            status
          });
        }
      }

      if (item.type === 'fileChange') {
        const status = item.status as string | undefined;
        if (suppressCompletionLogForItemId.has(item.id)) return;
        const declined = approvalDecision === 'decline' || approvalDecision === 'cancel';
        if (!declined && status && status !== 'completed') {
          const changes: Array<{ path: string; kind: any }> = (item.changes ?? []).map((c: any) => ({
            path: c.path,
            kind: c.kind?.type ?? c.kind
          }));
          logAndon({
            id: `andon_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            createdAt: new Date().toISOString(),
            policyId: policy.id,
            kind: 'fileChange',
            phase: 'completed',
            threadId,
            turnId,
            itemId: item.id,
            summary: `fileChange ${status} (${changes.length} changes)`,
            details: { changes },
            status
          });
        }
      }

      if (args.verbose) {
        if (item.type === 'commandExecution') console.log(`< ${item.status} (exit=${item.exitCode ?? 'null'})`);
        if (item.type === 'fileChange') console.log(`< fileChange ${item.status}`);
      }
      return;
    }

    if (msg.method === 'turn/completed') {
      const { turn, threadId } = msg.params as any;
      if (!args.stream) {
        const finalMsg = (lastAgentMessageId ? agentMessages.get(lastAgentMessageId) : null) ?? [...agentMessages.values()].join('');
        console.log('\n--- Agent Output ---\n');
        console.log((finalMsg ?? '').trim() || '(no agent message captured)');
      } else {
        process.stdout.write('\n');
      }

      if (turn.status && turn.status !== 'completed') {
        logAndon({
          id: `andon_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          createdAt: new Date().toISOString(),
          policyId: policy.id,
          kind: 'turn',
          phase: 'completed',
          threadId,
          turnId: turn.id,
          itemId: turn.id,
          summary: `turn ${turn.status}`,
          details: { error: turn.error ?? null },
          status: turn.status
        });
      }

      if (andonRef.path) console.log(`\nAndon log: ${andonRef.path} (${andonRef.count} records)`);
      if (turn.error?.message) console.log(`Turn error: ${turn.error.message}`);
      console.log(`Turn status: ${turn.status}`);
      client.close();
      resolveTurnDone?.();
      return;
    }
  };

  // Handshake.
  await client.request(
    'initialize',
    {
      clientInfo: { name: 'cs_judgment_layer', title: 'CREATE SOMETHING Judgment Layer', version: '0.1.0' },
      capabilities: { experimentalApi: true }
    },
    { timeoutMs: 15_000 }
  );
  client.notify('initialized');
  if (args.verbose) console.log('Initialized app-server session');

  const threadResult = await client.request(
    'thread/start',
    {
      cwd: args.cwd,
      model: policy.model ?? null,
      approvalPolicy: policy.approvalPolicy,
      developerInstructions: policy.developerInstructions ?? null
    },
    { timeoutMs: 30_000 }
  );

  const threadId = threadResult.thread.id as string;
  if (args.verbose) console.log(`Thread started: ${threadId}`);

  // Expand $CWD placeholders.
  const sandboxPolicy =
    policy.sandboxPolicy.type === 'workspaceWrite'
      ? {
          ...policy.sandboxPolicy,
          writableRoots: (policy.sandboxPolicy.writableRoots ?? ['$CWD']).map((p) => (p === '$CWD' ? args.cwd : p))
        }
      : policy.sandboxPolicy;

  await client.request(
    'turn/start',
    {
      threadId,
      input: [{ type: 'text', text: args.prompt }],
      approvalPolicy: policy.approvalPolicy,
      sandboxPolicy,
      model: policy.model ?? null,
      effort: policy.effort ?? null,
      summary: policy.summary ?? null
    },
    { timeoutMs: 30_000 }
  );

  if (args.verbose) console.log('Turn started');
  await turnDone;
}

async function main() {
  const args = parseArgs(process.argv);
  if ((args.command === 'check' || args.command === 'watch' || args.command === 'route') && !args.mcpExplicit) {
    args.mcpMode = 'inherit';
  }

  if (args.command === 'help') return void printHelp();
  if (args.command === 'init') return void scaffoldInit(args.cwd);
  if (args.command === 'policies') {
    const policies = listPolicies(args.cwd);
    console.log(policies.map(renderPolicyOneLine).join('\n'));
    return;
  }
  if (args.command === 'andon') return void printAndon(args.cwd, args.andonTail ?? 20);
  if (args.command === 'check') return void (await runChecks(args));
  if (args.command === 'watch') return void (await watchChecks(args));
  if (args.command === 'route') return void (await runProblemRoute(args));
  if (args.command === 'run') return void (await runWithPolicy(args));

  console.error(`Unknown command: ${args.command}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

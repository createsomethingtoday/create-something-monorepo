import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import readline from 'node:readline';
import TOML from '@iarna/toml';
import { AppServerClient } from './app-server/client.js';
import { BUILTIN_POLICIES } from './policy/builtin.js';
import { loadProjectPolicies } from './policy/load.js';
import type { LoadedPolicy } from './policy/types.js';
import { appendAndon } from './andon/log.js';

type Args = {
  command: string;
  cwd: string;
  policyId?: string;
  prompt?: string;
  nonInteractive?: boolean;
  verbose?: boolean;
  stream?: boolean;
  andonTail?: number;
  mcpMode: 'minimal' | 'inherit';
};

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2);

  const out: Args = { command: 'help', cwd: process.cwd(), mcpMode: 'minimal' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--cwd') out.cwd = resolve(args[++i] ?? out.cwd);
    else if (a === '--policy') out.policyId = args[++i];
    else if (a === '--prompt') out.prompt = args[++i];
    else if (a === '--non-interactive') out.nonInteractive = true;
    else if (a === '--verbose' || a === '-v') out.verbose = true;
    else if (a === '--stream') out.stream = true;
    else if (a === '--tail') out.andonTail = Number(args[++i] ?? '20');
    else if (a === '--mcp') out.mcpMode = (args[++i] as any) === 'inherit' ? 'inherit' : 'minimal';
    else if (a === '--help' || a === '-h') out.command = 'help';
    else if (!a.startsWith('-') && out.command === 'help') out.command = a;
  }
  return out;
}

function printHelp() {
  console.log(`
CREATE SOMETHING Judgment Layer (prototype)

Usage:
  cs-judge init [--cwd <dir>]
  cs-judge policies [--cwd <dir>]
  cs-judge andon [--cwd <dir>] [--tail <n>]
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
- \`andon.jsonl\` Andon log (ignore this)
`;

  if (!existsSync(join(policiesDir, 'safe.toml'))) writeFileSync(join(policiesDir, 'safe.toml'), safe, 'utf-8');
  if (!existsSync(join(policiesDir, 'standard.toml')))
    writeFileSync(join(policiesDir, 'standard.toml'), standard, 'utf-8');
  if (!existsSync(join(policiesDir, 'power.toml'))) writeFileSync(join(policiesDir, 'power.toml'), power, 'utf-8');
  if (!existsSync(join(root, 'README.md'))) writeFileSync(join(root, 'README.md'), readme, 'utf-8');

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

  return lines;
}

async function runWithPolicy(args: Args) {
  const policies = listPolicies(args.cwd);
  const policyId = args.policyId ?? 'standard';
  const policy = policies.find((p) => p.id === policyId);
  if (!policy) {
    console.error(`Unknown policy: ${policyId}`);
    console.error('Available:\n' + policies.map(renderPolicyOneLine).join('\n'));
    process.exit(1);
  }
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

  const andonRef = { path: '', count: 0 };
  const logAndon = (record: any) => {
    const path = appendAndon(args.cwd, record);
    andonRef.path = path;
    andonRef.count++;
  };

  client.onMessage = async (msg) => {
    if (msg.method === 'error') {
      const { error } = msg.params as any;
      console.error(`\nApp-server error: ${error?.message ?? '(unknown error)'}`);
      client.close();
      process.exit(1);
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

      let decision: any = allowByAction || allowByRegex ? 'acceptForSession' : null;

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
        details: { command, reason, commandActions: actions, proposedExecpolicyAmendment: proposedExecpolicyAmendment ?? null },
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

      let decision: any = allowByPrefix ? 'acceptForSession' : null;

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
        details: { changes, reason },
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
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.command === 'help') return void printHelp();
  if (args.command === 'init') return void scaffoldInit(args.cwd);
  if (args.command === 'policies') {
    const policies = listPolicies(args.cwd);
    console.log(policies.map(renderPolicyOneLine).join('\n'));
    return;
  }
  if (args.command === 'andon') return void printAndon(args.cwd, args.andonTail ?? 20);
  if (args.command === 'run') return void (await runWithPolicy(args));

  console.error(`Unknown command: ${args.command}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

import { buildZellijCommands, formatCommand, shellQuote } from './zellij-agent-lane.mjs';

const DEFAULT_AGENT_COMMAND = 'claude';
const DEFAULT_PANE_NAME = 'claude';
const DEFAULT_SOCKET_DIR = process.env.ZELLIJ_SOCKET_DIR || '/tmp/zellij';
const DEFAULT_AUTONOMY_LEVEL = 'A1';
const DEFAULT_AUTHORITY =
  'Agent may prepare and inspect evidence for Codex/operator review; mutation authority must be supplied by policy or explicit operator instruction.';
const DEFAULT_RECEIPT_CONTRACT =
  'Intent, authority, source of truth, action taken, verification result, rollback or recovery path, and client/operator-facing proof.';
const DEFAULT_ROLLBACK = 'No write authority by default; rollback is no-op unless a bounded mutation is explicitly authorized.';
const DEFAULT_ESCALATION =
  'Escalate when source of truth, authority, verifier, rollback, or required receipt evidence is missing.';

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    issue: null,
    title: null,
    description: null,
    goal: null,
    acceptance: [],
    verification: [],
    policy: [],
    autonomyLevel: DEFAULT_AUTONOMY_LEVEL,
    authority: DEFAULT_AUTHORITY,
    receiptContract: DEFAULT_RECEIPT_CONTRACT,
    rollback: DEFAULT_ROLLBACK,
    escalation: DEFAULT_ESCALATION,
    cwd: process.cwd(),
    sessionName: null,
    paneName: DEFAULT_PANE_NAME,
    agentCommand: DEFAULT_AGENT_COMMAND,
    launch: false,
    sendPrompt: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    else if (arg === '--issue' && next) options.issue = argv[++index];
    else if (arg === '--title' && next) options.title = argv[++index];
    else if (arg === '--description' && next) options.description = argv[++index];
    else if (arg === '--goal' && next) options.goal = argv[++index];
    else if (arg === '--acceptance' && next) options.acceptance.push(argv[++index]);
    else if (arg === '--verification' && next) options.verification.push(argv[++index]);
    else if (arg === '--policy' && next) options.policy.push(argv[++index]);
    else if (arg === '--autonomy-level' && next) options.autonomyLevel = argv[++index];
    else if (arg === '--authority' && next) options.authority = argv[++index];
    else if (arg === '--receipt-contract' && next) options.receiptContract = argv[++index];
    else if (arg === '--rollback' && next) options.rollback = argv[++index];
    else if (arg === '--escalation' && next) options.escalation = argv[++index];
    else if (arg === '--cwd' && next) options.cwd = argv[++index];
    else if (arg === '--name' && next) options.sessionName = argv[++index];
    else if (arg === '--pane-name' && next) options.paneName = argv[++index];
    else if (arg === '--agent-command' && next) options.agentCommand = argv[++index];
    else if (arg === '--launch') options.launch = true;
    else if (arg === '--send-prompt') options.sendPrompt = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.help) return options;
  if (!options.issue && !options.title) throw new Error('Provide --issue or --title so the lane has a stable task identity.');
  if (!options.title && options.issue) options.title = options.issue;
  if (!options.goal) options.goal = options.title;
  if (!options.agentCommand.trim()) throw new Error('--agent-command must not be empty');
  if (!options.paneName.trim()) throw new Error('--pane-name must not be empty');
  if (!options.autonomyLevel.trim()) throw new Error('--autonomy-level must not be empty');
  if (!options.authority.trim()) throw new Error('--authority must not be empty');
  if (!options.receiptContract.trim()) throw new Error('--receipt-contract must not be empty');
  if (!options.rollback.trim()) throw new Error('--rollback must not be empty');
  if (!options.escalation.trim()) throw new Error('--escalation must not be empty');
  options.cwd = path.resolve(options.cwd);
  options.sessionName ||= deriveSessionName(options.issue, options.title);
  return options;
}

function usage() {
  return `Usage:
  pnpm zellij:workflow -- --issue CRE-123 --title "Fix thing" --acceptance "..." --verification "..."
  pnpm zellij:workflow -- --title "Investigate sync" --launch

Builds an agent-run-with-receipts Zellij lane packet from Linear-like task context.
Dry-run is the default. Use --launch to start the lane and --send-prompt to
paste the generated prompt into that launched pane.
`;
}

function slugify(value, { maxLength = 64 } = {}) {
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return (slug || 'task').slice(0, maxLength).replace(/-+$/g, '') || 'task';
}

function deriveSessionName(issue, title) {
  const issuePart = issue ? slugify(issue, { maxLength: 14 }) : 'task';
  const titlePart = title && title !== issue ? slugify(title, { maxLength: 42 }) : 'agent-lane';
  return slugify(`${issuePart}-${titlePart}`, { maxLength: 64 });
}

function bulletList(items, fallback) {
  const values = items.length > 0 ? items : [fallback];
  return values.map((item) => `- ${item}`).join('\n');
}

function buildPrompt(options) {
  const linearLine = options.issue ? `Linear: ${options.issue}` : 'Linear: none, explicit operator task';
  return [
    '# CREATE SOMETHING Zellij Worker Packet',
    '',
    linearLine,
    `Title: ${options.title}`,
    `Working directory: ${options.cwd}`,
    `Autonomy level: ${options.autonomyLevel}`,
    '',
    '## Goal',
    options.goal,
    '',
    '## Agent-Run Operating Model',
    'CREATE SOMETHING is operated as an agent-run-with-receipts business. Agents operate inside explicit authority envelopes; receipts prove the work; humans govern exceptions when the receipt contract cannot be satisfied.',
    '',
    '## Context',
    options.description || 'Use the repository and visible terminal state as the source of truth. Ask only if the finish line changes.',
    '',
    '## Authority',
    options.authority,
    '',
    '## Policy',
    bulletList(
      options.policy,
      'Codex/operator owns the done decision; worker output is evidence and must include exact commands, files, and verification. This applies regardless of the foundation model in the pane.',
    ),
    '',
    '## Receipt Contract',
    options.receiptContract,
    '',
    '## Acceptance Criteria',
    bulletList(options.acceptance, 'Return a concrete result plus the exact evidence needed for Codex/operator review.'),
    '',
    '## Verification',
    bulletList(options.verification, 'Run the narrowest relevant check and report the command plus result.'),
    '',
    '## Rollback',
    options.rollback,
    '',
    '## Escalation',
    options.escalation,
    '',
    '## Stop Conditions',
    '- Stop before public, irreversible, credential, deploy, purchase, send, or third-party mutation actions unless explicitly approved.',
    '- Stop if required access is missing and report the smallest manual evidence needed.',
    '- Stop if verification cannot distinguish success from failure.',
    '',
    '## Closeout',
    '- Summarize observed facts separately from assumptions.',
    '- List files changed or external surfaces inspected.',
    '- Include exact commands, outputs, screenshots, URLs, or readbacks needed for final evidence.',
    '- Do not mark the task done yourself; hand evidence back to Codex/operator.',
  ].join('\n');
}

function buildEvidenceTemplate(options) {
  const issueLine = options.issue ? `Linear ${options.issue}` : 'untracked operator task';
  return [
    `Evidence for ${issueLine}`,
    '',
    '- Zellij session:',
    `  - name: ${options.sessionName}`,
    `  - pane: ${options.paneName}`,
    '- Worker prompt packet reviewed: yes',
    `- Autonomy level: ${options.autonomyLevel}`,
    `- Authority: ${options.authority}`,
    `- Receipt contract: ${options.receiptContract}`,
    '- Readback:',
    '  - command:',
    '  - observed:',
    '- Verification:',
    '  - command:',
    '  - result:',
    `- Rollback / recovery: ${options.rollback}`,
    `- Escalation condition: ${options.escalation}`,
    '- Follow-up / blockers:',
  ].join('\n');
}

function buildWorkflow(options) {
  const prompt = buildPrompt(options);
  const zellijOptions = {
    sessionName: options.sessionName,
    paneName: options.paneName,
    cwd: options.cwd,
    command: options.agentCommand,
  };
  const commands = buildZellijCommands(zellijOptions);
  const sendPrompt = commands.sendText.map((part) => (part === '<pane-id>' ? '<pane-id-from-launch>' : part === '<text>' ? prompt : part));
  const sendEnter = commands.sendEnter.map((part) => (part === '<pane-id>' ? '<pane-id-from-launch>' : part));
  const launchArgs = [
    'pnpm',
    'zellij:agent',
    '--',
    '--name',
    options.sessionName,
    '--pane-name',
    options.paneName,
    '--cwd',
    options.cwd,
    '--command',
    options.agentCommand,
  ];

  return {
    mode: 'zellij-agent-workflow',
    dryRun: !options.launch,
    issue: options.issue,
    title: options.title,
    session: options.sessionName,
    paneName: options.paneName,
    autonomyLevel: options.autonomyLevel,
    authority: options.authority,
    receiptContract: options.receiptContract,
    rollback: options.rollback,
    escalation: options.escalation,
    cwd: options.cwd,
    socketDir: DEFAULT_SOCKET_DIR,
    prompt,
    evidenceTemplate: buildEvidenceTemplate(options),
    commands: {
      launch: `ZELLIJ_SOCKET_DIR=${shellQuote(DEFAULT_SOCKET_DIR)} ${launchArgs.map(shellQuote).join(' ')}`,
      board: 'pnpm zellij:board',
      boardJson: 'pnpm zellij:board -- --json',
      attach: formatCommand(commands.attach),
      inspect: formatCommand(commands.dumpScreen),
      streamJson: formatCommand(commands.streamJson),
      sendPrompt: formatCommand(sendPrompt),
      sendEnter: formatCommand(sendEnter),
      kill: formatCommand(commands.killSession),
      linearComment: options.issue
        ? `pnpm linear:comment -- --issue ${shellQuote(options.issue)} --body ${shellQuote('<paste evidence template after verification>')}`
        : null,
    },
    approvalGates: [
      'Approval safety is enforced by the workflow boundary, not by trusting a specific model family.',
      'The lane is complete only when the receipt contract is satisfied.',
      'Linear mutation is not performed by this workflow; run the printed linear:comment command only after review.',
      'Public, irreversible, credential, deploy, purchase, send, or third-party mutation actions require explicit approval.',
    ],
  };
}

function renderText(workflow) {
  const lines = [
    'CREATE SOMETHING / Zellij Linear Agent Workflow',
    `Issue: ${workflow.issue || 'none'}`,
    `Title: ${workflow.title}`,
    `Session: ${workflow.session}`,
    `Pane: ${workflow.paneName}`,
    `Autonomy: ${workflow.autonomyLevel}`,
    `Socket: ${workflow.socketDir}`,
    '',
    'Launch',
    workflow.commands.launch,
    '',
    'Board / Readback',
    workflow.commands.board,
    workflow.commands.boardJson,
    workflow.commands.attach,
    workflow.commands.inspect,
    workflow.commands.streamJson,
    '',
    'Send Prompt',
    workflow.commands.sendPrompt,
    workflow.commands.sendEnter,
    '',
    'Closeout',
    workflow.commands.linearComment || 'No Linear issue supplied; paste evidence into the owning thread or handoff.',
    workflow.commands.kill,
    '',
    'Prompt Packet',
    workflow.prompt,
    '',
    'Evidence Template',
    workflow.evidenceTemplate,
  ];
  return lines.join('\n');
}

function runLaunch(options) {
  const args = [
    'scripts/zellij-agent-lane.mjs',
    '--name',
    options.sessionName,
    '--pane-name',
    options.paneName,
    '--cwd',
    options.cwd,
    '--command',
    options.agentCommand,
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: { ...process.env, ZELLIJ_SOCKET_DIR: DEFAULT_SOCKET_DIR },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'zellij lane launch failed');
  }
  const launched = JSON.parse(result.stdout);
  if (options.sendPrompt) {
    const prompt = buildPrompt(options);
    const paste = spawnSync('zellij', ['--session', options.sessionName, 'action', 'paste', '--pane-id', launched.paneId, prompt], {
      cwd: options.cwd,
      env: { ...process.env, ZELLIJ_SOCKET_DIR: DEFAULT_SOCKET_DIR },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (paste.status !== 0) throw new Error(paste.stderr.trim() || paste.stdout.trim() || 'zellij paste failed');
    const enter = spawnSync('zellij', ['--session', options.sessionName, 'action', 'send-keys', '--pane-id', launched.paneId, 'Enter'], {
      cwd: options.cwd,
      env: { ...process.env, ZELLIJ_SOCKET_DIR: DEFAULT_SOCKET_DIR },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (enter.status !== 0) throw new Error(enter.stderr.trim() || enter.stdout.trim() || 'zellij send-keys failed');
  }
  return launched;
}

function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(usage());
    return;
  }

  const workflow = buildWorkflow(options);
  if (options.launch) workflow.launchResult = runLaunch(options);

  if (options.json) console.log(JSON.stringify(workflow, null, 2));
  else console.log(renderText(workflow));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

export {
  buildEvidenceTemplate,
  buildPrompt,
  buildWorkflow,
  deriveSessionName,
  parseArgs,
  renderText,
  slugify,
};

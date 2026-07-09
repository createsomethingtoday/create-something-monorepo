#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_SESSION_NAME = 'create-something-agent';
const DEFAULT_PANE_NAME = 'worker';
const DEFAULT_COMMAND = 'zsh';
const DEFAULT_SOCKET_DIR = process.env.ZELLIJ_SOCKET_DIR || '/tmp/zellij';

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    dryRun: false,
    sessionName: DEFAULT_SESSION_NAME,
    paneName: DEFAULT_PANE_NAME,
    cwd: process.cwd(),
    command: DEFAULT_COMMAND,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--name' && next) options.sessionName = argv[++index];
    else if (arg === '--pane-name' && next) options.paneName = argv[++index];
    else if (arg === '--cwd' && next) options.cwd = argv[++index];
    else if (arg === '--command' && next) options.command = argv[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.sessionName.trim()) throw new Error('--name must not be empty');
  if (!options.paneName.trim()) throw new Error('--pane-name must not be empty');
  if (!options.command.trim()) throw new Error('--command must not be empty');

  options.cwd = path.resolve(options.cwd);
  return options;
}

function usage() {
  return `Usage:
  pnpm zellij:agent [--dry-run] [--name <session>] [--pane-name <name>] [--cwd <path>] [--command <shell-command>]
  pnpm zellij:claude [--name <session>] [--command <claude-command>]

Creates a Zellij background session and starts one visible worker pane. Codex can
inspect it with dump-screen or subscribe, and can steer it with paste/send-keys.

Defaults:
  --name      ${DEFAULT_SESSION_NAME}
  --pane-name ${DEFAULT_PANE_NAME}
  --cwd       current working directory
  --command   ${DEFAULT_COMMAND}

Examples:
  pnpm zellij:agent -- --name claude-webflow --pane-name claude --command 'claude'
  pnpm zellij:agent -- --dry-run --command 'echo ready; exec zsh'
`;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function createCommandFile(command, { prefix = 'zellij-agent-lane-' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const filePath = path.join(dir, 'run.zsh');
  fs.writeFileSync(filePath, `#!/bin/zsh\n${command}\n`, { mode: 0o700 });
  return filePath;
}

function buildInnerCommand(options) {
  const lines = [
    `cd ${shellQuote(options.cwd)}`,
    'clear',
    'echo "CREATE SOMETHING / Zellij agent cockpit"',
    `echo "Session: ${options.sessionName}"`,
    `echo "Pane: ${options.paneName}"`,
    `echo "CWD: ${options.cwd}"`,
    `echo "Command: ${options.command}"`,
    'echo "Authority: Codex/operator owns done; worker output requires evidence."',
    'echo',
    'echo "Codex inspect:"',
    `echo "  zellij --session ${shellQuote(options.sessionName)} action dump-screen --pane-id <pane-id> --full"`,
    `echo "  zellij --session ${shellQuote(options.sessionName)} subscribe --pane-id <pane-id> --format json --scrollback 200"`,
    'echo',
    'echo "---"',
    `exec zsh -lc ${shellQuote(options.command)}`,
  ];
  return lines.join('\n');
}

function buildZellijCommands(options, commandFilePath = '/tmp/zellij-agent-lane/run.zsh') {
  return {
    createSession: ['zellij', 'attach', '--create-background', options.sessionName],
    createPane: [
      'zellij',
      '--session',
      options.sessionName,
      'action',
      'new-pane',
      '--name',
      options.paneName,
      '--cwd',
      options.cwd,
      '--',
      'zsh',
      commandFilePath,
    ],
    listSessions: ['zellij', 'list-sessions', '--short', '--no-formatting'],
    attach: ['zellij', 'attach', options.sessionName],
    dumpScreen: ['zellij', '--session', options.sessionName, 'action', 'dump-screen', '--pane-id', '<pane-id>', '--full'],
    streamJson: [
      'zellij',
      '--session',
      options.sessionName,
      'subscribe',
      '--pane-id',
      '<pane-id>',
      '--format',
      'json',
      '--scrollback',
      '200',
    ],
    sendText: ['zellij', '--session', options.sessionName, 'action', 'paste', '--pane-id', '<pane-id>', '<text>'],
    sendEnter: ['zellij', '--session', options.sessionName, 'action', 'send-keys', '--pane-id', '<pane-id>', 'Enter'],
    killSession: ['zellij', 'kill-session', options.sessionName],
  };
}

function formatCommand(parts) {
  return `ZELLIJ_SOCKET_DIR=${shellQuote(DEFAULT_SOCKET_DIR)} ${parts.map(shellQuote).join(' ')}`;
}

function registryPath(cwd = process.cwd()) {
  return path.join(cwd, '.codex', 'zellij-agent-lanes.json');
}

function readRegistry(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed?.lanes) ? parsed.lanes : [];
  } catch {
    return [];
  }
}

function writeRegistry(filePath, lanes) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify({ lanes }, null, 2)}\n`);
}

function upsertRegistryLane(options, paneId, commandFilePath) {
  const filePath = registryPath(options.cwd);
  const lanes = readRegistry(filePath).filter((lane) => lane.session !== options.sessionName);
  lanes.push({
    session: options.sessionName,
    paneId,
    paneName: options.paneName,
    cwd: options.cwd,
    command: options.command,
    commandFile: commandFilePath,
    socketDir: DEFAULT_SOCKET_DIR,
    createdAt: new Date().toISOString(),
    authority: 'Codex/operator owns done; worker output requires evidence before use.',
  });
  writeRegistry(filePath, lanes);
  return filePath;
}

function runChecked(command, args, { cwd = process.cwd() } = {}) {
  fs.mkdirSync(DEFAULT_SOCKET_DIR, { recursive: true });
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ZELLIJ_SOCKET_DIR: DEFAULT_SOCKET_DIR },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    const stdout = result.stdout.trim();
    throw new Error(`${command} ${args.join(' ')} failed${stderr ? `: ${stderr}` : stdout ? `: ${stdout}` : ''}`);
  }
  return result.stdout.trim();
}

function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(usage());
    return;
  }

  const innerCommand = buildInnerCommand(options);
  const dryRunCommands = buildZellijCommands(options);

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: 'zellij-agent-lane',
          dryRun: true,
          socketDir: DEFAULT_SOCKET_DIR,
          commands: dryRunCommands,
          commandFile: '/tmp/zellij-agent-lane/run.zsh',
          commandFileContents: innerCommand,
          safety: 'Codex/operator owns done; worker output requires evidence before use.',
        },
        null,
        2,
      ),
    );
    return;
  }

  const commandFilePath = createCommandFile(innerCommand);
  const commands = buildZellijCommands(options, commandFilePath);
  runChecked('zellij', commands.createSession.slice(1), { cwd: options.cwd });
  const paneId = runChecked('zellij', commands.createPane.slice(1), { cwd: options.cwd });
  const registry = upsertRegistryLane(options, paneId, commandFilePath);

  console.log(
    JSON.stringify(
      {
        mode: 'zellij-agent-lane',
        session: options.sessionName,
        paneId,
        socketDir: DEFAULT_SOCKET_DIR,
        registry,
        commandFile: commandFilePath,
        attach: formatCommand(commands.attach),
        inspect: formatCommand(commands.dumpScreen.map((part) => (part === '<pane-id>' ? paneId : part))),
        streamJson: formatCommand(commands.streamJson.map((part) => (part === '<pane-id>' ? paneId : part))),
        sendTextThenEnter: [
          formatCommand(commands.sendText.map((part) => (part === '<pane-id>' ? paneId : part))),
          formatCommand(commands.sendEnter.map((part) => (part === '<pane-id>' ? paneId : part))),
        ],
        board: 'pnpm zellij:board',
        kill: formatCommand(commands.killSession),
      },
      null,
      2,
    ),
  );
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
  buildInnerCommand,
  buildZellijCommands,
  createCommandFile,
  formatCommand,
  parseArgs,
  registryPath,
  shellQuote,
};
